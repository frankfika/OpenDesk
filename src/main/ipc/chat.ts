import { ipcMain, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import type { ChatSendPayload, Message, AgentRole } from '../../shared/types'
import type { Provider, ToolCall, ToolResult } from '../providers/base'
import { buildProviderById } from '../providers/builder'
import { executeTool, buildTools } from '../tools/executor'
import { runEnsemble, createRunId } from '../orchestration/ensemble'
import { abortRun } from '../orchestration/run-tracker'
import { AGENT_ROLES, getRolePrompt } from '../../shared/agent-roles'
import { OLLAMA_BASE_URL } from '../../shared/providers'
import { scanAllSkills, loadSkill } from '../skills'
import { memoryService } from './memory'
import { abortControllers } from './abort'
import { loadKeys, loadThreads } from '../persistence'
import { getWorkspacePath } from './workspace'
import { getSettings } from '../app-state'

import { normalizeToolMessages } from '../orchestration/message-utils'

const channels = ['chat:send', 'chat:abort', 'chat:regenerate', 'chat:editMessage']

function removeStaleListeners(): void {
  for (const ch of channels) {
    ipcMain.removeAllListeners(ch)
  }
}

function buildProvider(providerId: string, apiKey: string): Provider | null {
  return buildProviderById(getSettings().providers, providerId, apiKey)
}

async function doChatStream(
  win: BrowserWindow,
  payload: ChatSendPayload,
  regenerate = false,
  editIndex?: number
): Promise<void> {
  const { messages, providerId, systemPrompt, workspaceId, threadId, sessionId } = payload
  if (!providerId) {
    win.webContents.send('chat:error', { message: 'No provider selected', type: 'provider' })
    return
  }
  const apiKey = loadKeys()[providerId] ?? ''
  const provider = buildProvider(providerId, apiKey)

  if (!provider) {
    win.webContents.send('chat:error', { message: 'Provider not found or not configured', type: 'provider' })
    return
  }

  let skillSystemContent = ''
  const activeSkillIds: string[] = payload.activeSkillIds ? [...payload.activeSkillIds] : []
  if (threadId) {
    const threads = loadThreads()
    const thread = threads.find((t) => t.id === threadId)
    if (thread?.skillId && !activeSkillIds.includes(thread.skillId)) {
      activeSkillIds.push(thread.skillId)
    }
  }

  const allSkills = scanAllSkills(getWorkspacePath(workspaceId) || undefined)
  for (const skill of allSkills) {
    if (activeSkillIds.includes(skill.id)) {
      const l1 = loadSkill(skill, 1)
      skillSystemContent += `\n\n${l1.content}`
    }
  }

  // Normalize legacy frontend messages where tool calls were stored as standalone
  // kind='tool_call' assistant messages without metadata.toolCalls. OpenAI-compatible
  // providers require a single assistant message with tool_calls followed by tool results.
  const normalizedMessages = normalizeToolMessages(messages)
  let finalMessages = normalizedMessages
  let combinedSystemPrompt = systemPrompt || ''
  if (skillSystemContent) {
    combinedSystemPrompt += (combinedSystemPrompt ? '\n\n' : '') + skillSystemContent
  }

  const workspacePath = getWorkspacePath(workspaceId)
  if (workspacePath) {
    combinedSystemPrompt +=
      (combinedSystemPrompt ? '\n\n' : '') +
      `You are working inside the workspace: ${workspacePath}. You can read, write, list, and patch files within this workspace or the user's home directory using the available tools. Always use absolute paths when calling file tools. Avoid system directories.`
  }

  const memory = memoryService.getMemory()
  const memorySections: string[] = []
  if (memory.user.trim()) {
    memorySections.push(`## User Preferences & Habits\n${memory.user.slice(0, 2000)}`)
  }
  if (memory.identity.trim()) {
    memorySections.push(`## Workspace Identity & Conventions\n${memory.identity.slice(0, 2000)}`)
  }
  if (memory.soul.trim()) {
    memorySections.push(`## Cross-Project Knowledge\n${memory.soul.slice(0, 2000)}`)
  }
  if (memorySections.length > 0) {
    combinedSystemPrompt += (combinedSystemPrompt ? '\n\n' : '') + `---\n${memorySections.join('\n\n')}\n---`
  }

  if (combinedSystemPrompt) {
    finalMessages = [
      { id: 'system', role: 'system', content: combinedSystemPrompt, timestamp: Date.now() },
      ...normalizedMessages
    ]
  }

  const ac = new AbortController()
  const abortKey = sessionId || providerId
  abortControllers.set(abortKey, ac)

  const availableTools = buildTools(workspaceId)

  try {
    let currentMessages = finalMessages
    let iteration = 0
    const maxIterations = 5

    while (iteration < maxIterations && !ac.signal.aborted) {
      iteration++
      const stream = provider.stream(currentMessages, ac.signal, availableTools.length > 0 ? availableTools : undefined)

      let assistantContent = ''
      const pendingToolCalls: ToolCall[] = []
      const assistantMessageId = randomUUID()

      for await (const chunk of stream) {
        if (ac.signal.aborted) break

        if (typeof chunk === 'string') {
          assistantContent += chunk
          win.webContents.send('chat:token', { token: chunk, threadId })
        } else {
          pendingToolCalls.push(chunk)
          win.webContents.send('chat:tool_call', {
            id: chunk.id,
            name: chunk.name,
            arguments: chunk.arguments,
            threadId
          })
        }
      }

      if (pendingToolCalls.length === 0) {
        break
      }

      currentMessages.push({
        id: assistantMessageId,
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
        metadata: {
          toolCalls: pendingToolCalls
        }
      })

      for (const tc of pendingToolCalls) {
        const result: ToolResult = await executeTool(tc, workspaceId, {
          desktopEnabled: getSettings().desktopEnabled,
          approvalMode: getSettings().approvalMode
        })
        win.webContents.send('chat:tool_result', {
          toolCallId: result.toolCallId,
          content: result.content,
          isError: result.isError,
          threadId
        })
        currentMessages.push({
          id: randomUUID(),
          role: 'tool',
          content: result.content,
          timestamp: Date.now(),
          kind: 'tool_result',
          toolCallId: tc.id,
          metadata: { toolName: tc.name, isError: result.isError }
        } as Message)
      }
    }

    win.webContents.send('chat:done', { regenerate, editIndex, workspaceId, threadId })

      try {
      const recentMessages = normalizedMessages.slice(-10)
      const entries = memoryService.extractFromMessages(recentMessages)
      if (entries.length > 0) {
        memoryService.appendExtracted(entries)
        const categories = new Set<string>()
        for (const e of entries) {
          const lower = e.content.toLowerCase()
          if (lower.includes('user preference') || lower.includes('user mentioned')) {
            categories.add('user')
          } else if (
            lower.includes('ai role') ||
            lower.includes('tone') ||
            lower.includes('convention') ||
            lower.includes('project convention') ||
            lower.includes('workspace identity')
          ) {
            categories.add('identity')
          } else if (
            lower.includes('lesson learned') ||
            lower.includes('best practice') ||
            lower.includes('pattern')
          ) {
            categories.add('soul')
          } else {
            // Don't file uncategorised entries — the previous catch-all that
            // dumped everything into `soul` caused unbounded growth of the
            // cross-project file with low-signal noise. Log so the
            // categoriser can be improved without silently losing entries.
            console.debug('[Memory] Uncategorised entry:', e.content)
          }
        }
        win.webContents.send('memory:updated', { count: entries.length, categories: Array.from(categories) })
      }
    } catch (memErr) {
      console.error('[Memory] Extraction failed:', memErr)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    let type: 'auth' | 'network' | 'model' | 'provider' | 'workspace' | 'ollama' | 'generic' = 'generic'
    const lower = msg.toLowerCase()
    if (
      lower.includes('api key') ||
      lower.includes('unauthorized') ||
      lower.includes('401') ||
      lower.includes('authentication') ||
      lower.includes('invalid key')
    ) {
      type = 'auth'
    } else if (
      lower.includes('network') ||
      lower.includes('fetch') ||
      lower.includes('connect') ||
      lower.includes('timeout') ||
      lower.includes('econnrefused') ||
      lower.includes('enotfound')
    ) {
      type = 'network'
    } else if (lower.includes('model') || lower.includes('not found') || lower.includes('does not exist')) {
      type = 'model'
    } else if (lower.includes('ollama') || lower.includes('localhost:11434') || lower.includes(OLLAMA_BASE_URL)) {
      type = 'ollama'
    } else if (lower.includes('workspace') || lower.includes('directory') || lower.includes('path')) {
      type = 'workspace'
    }
    win.webContents.send('chat:error', { message: msg, type })
  } finally {
    abortControllers.delete(abortKey)
  }
}

async function doEnsembleChat(win: BrowserWindow, payload: ChatSendPayload): Promise<void> {
  const runId = payload.sessionId || createRunId()
  const apiKeys = loadKeys()

  try {
    await runEnsemble({
      runId,
      payload,
      providers: getSettings().providers,
      apiKeys,
      desktopEnabled: getSettings().desktopEnabled,
      approvalMode: getSettings().approvalMode,
      agentRoleAssignments: payload.agentRoleAssignments,
      rolePrompts: Object.fromEntries(AGENT_ROLES.map((r) => [r.id, getRolePrompt(r.id)])) as Record<AgentRole, string>,
      callbacks: {
        onAgentToken: ({ agentId, providerId, token }) => {
          win.webContents.send('chat:agent:token', { runId, agentId, providerId, token })
        },
        onAgentToolCall: ({ agentId, providerId, toolCall }) => {
          win.webContents.send('chat:agent:tool_call', { runId, agentId, providerId, toolCall })
        },
        onAgentToolResult: ({ agentId, providerId, toolResult }) => {
          win.webContents.send('chat:agent:tool_result', { runId, agentId, providerId, toolResult })
        },
        onAgentDone: ({ agentId, providerId, latencyMs, inputTokens, outputTokens }) => {
          win.webContents.send('chat:agent:done', { runId, agentId, providerId, latencyMs, inputTokens, outputTokens })
        },
        onAgentError: ({ agentId, providerId, error }) => {
          win.webContents.send('chat:agent:error', { runId, agentId, providerId, error })
        },
        onArbitrationToken: ({ token }) => {
          win.webContents.send('chat:arbitration:token', { runId, token })
        },
        onArbitrationDone: ({ result }) => {
          win.webContents.send('chat:arbitration:done', { runId, result })
        },
        onEnsembleDone: ({ threadId, workspaceId, agentAnswers }) => {
          win.webContents.send('chat:ensemble:done', { runId, threadId, workspaceId, agentAnswers })
        },
        onError: ({ error }) => {
          win.webContents.send('chat:error', { message: error, type: 'generic' })
        }
      }
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    win.webContents.send('chat:error', { message: msg, type: 'generic' })
  }
}

export function registerChatHandlers(win: BrowserWindow): void {
  removeStaleListeners()

  ipcMain.on('chat:send', async (_event, payload: ChatSendPayload) => {
    if (payload.mode === 'ensemble' || (payload.providerIds && payload.providerIds.length > 1)) {
      await doEnsembleChat(win, payload)
    } else {
      await doChatStream(win, payload)
    }
  })

  ipcMain.on('chat:abort', (_e, sessionId: string) => {
    abortControllers.get(sessionId)?.abort()
    abortRun(sessionId)
  })

  ipcMain.on('chat:regenerate', async (_e, payload: ChatSendPayload) => {
    if (payload.mode === 'ensemble' || payload.mode === 'agent' || (payload.providerIds && payload.providerIds.length > 1)) {
      await doEnsembleChat(win, payload)
    } else {
      await doChatStream(win, payload, true)
    }
  })

  ipcMain.on('chat:editMessage', async (_e, payload: ChatSendPayload & { editIndex: number }) => {
    const { editIndex, ...chatPayload } = payload
    await doChatStream(win, chatPayload, false, editIndex)
  })
}
