import { ipcMain, BrowserWindow, safeStorage, app, desktopCapturer, screen, shell } from 'electron'
import { join, resolve, sep } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync } from 'fs'
import { homedir } from 'os'
import { randomUUID } from 'crypto'
import type {
  AppSettings,
  ChatSendPayload,
  Skill,
  SkillLoadLevel,
  SkillLoadResult,
  SkillImportResult,
  Message,
  Thread,
  ThreadCreatePayload,
  ThreadUpdatePayload,
  WorkspaceUpdatePayload,
  DesktopAction,
  DoctorReport,
  ModelInfo,
  MCPServerConfig,
  MCPTool,
  AgentRole,
  ProviderConfig
} from '../../shared/types'
import type { Provider, Tool, ToolCall, ToolResult } from '../providers/base'
import { AnthropicProvider } from '../providers/anthropic'
import { OpenAIProvider } from '../providers/openai'
import { buildProviderById } from '../providers/builder'
import { startHealthChecks } from '../providers/health-checker'
import {
  createWorkspace,
  listWorkspaces,
  updateWorkspace,
  removeWorkspace,
  relinkWorkspace,
  scanWorkspaceAgentsMd,
  pickFolder
} from '../workspace'
import { runDoctor } from '../doctor'
import { readFile, writeFile as writeFileTool, listDirectory, applyPatch } from '../tools/file-tools'
import { mcpBridge } from '../mcp/mcp-bridge'
import { executeTool, buildTools } from '../tools/executor'
import {
  scanAllSkills,
  loadSkill,
  exportSkill,
  importSkillFromFolder,
  importSkillFromGitHub,
  deleteGlobalSkill,
  saveNewSkill,
  executeSkillTool
} from '../skills'
import { runEnsemble, createRunId } from '../orchestration/ensemble'
import { abortRun } from '../orchestration/run-tracker'
import { AGENT_ROLES, getRolePrompt } from '../../shared/agent-roles'
import { createMemoryService } from '../memory/memory-service'

const memoryService = createMemoryService()

const defaultSettings: AppSettings = {
  activeProviderId: null,
  activeWorkspaceId: null,
  activeThreadId: null,
  providers: [] as ProviderConfig[],
  mcpServers: [] as MCPServerConfig[],
  theme: 'dark',
  language: 'en',
  startupBehavior: 'restore',
  autoUpdate: false,
  desktopEnabled: false,
  approvalMode: 'ask',
  showThinking: false
}

let settings: AppSettings = { ...defaultSettings }
const abortControllers = new Map<string, AbortController>()

function scanSkills(): Skill[] {
  // Use the new comprehensive scanner
  return scanAllSkills()
}

function getWorkspacePath(workspaceId?: string): string | null {
  if (!workspaceId) return null
  const workspaces = listWorkspaces()
  const ws = workspaces.find((w) => w.id === workspaceId)
  return ws?.folderPath ?? null
}

function isPathAllowed(filePath: string, workspacePath: string | null): boolean {
  if (!workspacePath) return false
  const resolvedFile = resolve(filePath)
  const resolvedWorkspace = resolve(workspacePath)
  return (
    resolvedFile === resolvedWorkspace ||
    resolvedFile.startsWith(resolvedWorkspace + sep)
  )
}

function getConfigDir(): string {
  const dir = join(app.getPath('userData'), 'opendesk')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getSettingsPath(): string {
  return join(getConfigDir(), 'settings.json')
}

function getKeysPath(): string {
  return join(getConfigDir(), 'keys.bin')
}

function getMessagesDir(): string {
  const dir = join(getConfigDir(), 'messages')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getThreadsPath(): string {
  return join(getConfigDir(), 'threads.json')
}

function getDraftPath(): string {
  return join(getConfigDir(), 'draft.json')
}

function loadDraft(): { text: string; threadId: string | null; timestamp: number } | null {
  try {
    const p = getDraftPath()
    if (!existsSync(p)) return null
    return JSON.parse(readFileSync(p, 'utf-8')) as { text: string; threadId: string | null; timestamp: number }
  } catch {
    return null
  }
}

function saveDraft(draft: { text: string; threadId: string | null; timestamp: number }): void {
  try {
    writeFileSync(getDraftPath(), JSON.stringify(draft))
  } catch {
    // ignore
  }
}

function loadSettingsFromDisk(): AppSettings {
  const p = getSettingsPath()
  if (!existsSync(p)) return { ...defaultSettings }
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as AppSettings
  } catch {
    return { ...defaultSettings }
  }
}

function saveSettingsToDisk(s: AppSettings): void {
  writeFileSync(getSettingsPath(), JSON.stringify(s, null, 2), 'utf-8')
}

function loadKeys(): Record<string, string> {
  const p = getKeysPath()
  if (!existsSync(p)) return {}
  try {
    const buf = readFileSync(p)
    const decrypted = safeStorage.decryptString(buf)
    return JSON.parse(decrypted) as Record<string, string>
  } catch {
    return {}
  }
}

function saveKeys(keys: Record<string, string>): void {
  const encrypted = safeStorage.encryptString(JSON.stringify(keys))
  writeFileSync(getKeysPath(), encrypted)
}

function buildProvider(providerId: string, apiKey: string): Provider | null {
  return buildProviderById(settings.providers, providerId, apiKey)
}

/* ---------- Thread persistence ---------- */

function loadThreads(): Thread[] {
  const p = getThreadsPath()
  if (!existsSync(p)) return []
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as Thread[]
  } catch {
    return []
  }
}

function saveThreads(threads: Thread[]): void {
  writeFileSync(getThreadsPath(), JSON.stringify(threads, null, 2), 'utf-8')
}

function getMessagesPath(threadId: string): string {
  return join(getMessagesDir(), `${threadId}.json`)
}

function loadMessages(threadId: string): Message[] {
  const p = getMessagesPath(threadId)
  if (!existsSync(p)) return []
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as Message[]
  } catch {
    return []
  }
}

function saveMessages(threadId: string, messages: Message[]): void {
  writeFileSync(getMessagesPath(threadId), JSON.stringify(messages, null, 2), 'utf-8')
}

/* ---------- Model fetching ---------- */

async function fetchModels(type: string, baseUrl?: string, apiKey?: string): Promise<ModelInfo[]> {
  try {
    // Anthropic — no public models endpoint, return hardcoded list
    if (type === 'anthropic') {
      return [
        { id: 'claude-opus-4-5', displayName: 'Claude Opus 4.5', contextWindow: 200000, supportsVision: true, supportsTools: true },
        { id: 'claude-sonnet-4-5', displayName: 'Claude Sonnet 4.5', contextWindow: 200000, supportsVision: true, supportsTools: true },
        { id: 'claude-haiku-4-5', displayName: 'Claude Haiku 4.5', contextWindow: 200000, supportsVision: true, supportsTools: true },
      ]
    }

    // Ollama — uses /api/tags
    if (type === 'ollama') {
      const base = (baseUrl || 'http://localhost:11434').replace(/\/v1$/, '')
      const res = await fetch(`${base}/api/tags`)
      if (!res.ok) return []
      const data = await res.json() as { models?: Array<{ name: string }> }
      return (data.models || []).map((m) => ({ id: m.name, displayName: m.name }))
    }

    // All other types: OpenAI-compatible /v1/models
    const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '') + '/models'
    const headers: Record<string, string> = {}
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json() as { data?: Array<{ id: string }> }
    return (data.data || []).map((m) => ({ id: m.id, displayName: m.id }))
  } catch {
    return []
  }
}

/* ---------- Desktop helpers ---------- */

async function captureScreenshot(): Promise<string> {
  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: primaryDisplay.size
    })
    const primarySource = sources.find((s) => s.display_id === String(primaryDisplay.id)) || sources[0]
    if (!primarySource) throw new Error('No screen source found')
    return primarySource.thumbnail.toPNG().toString('base64')
  } catch (err) {
    throw new Error(`Screenshot failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/* ---------- IPC Registration ---------- */

export function registerIpcHandlers(win: BrowserWindow): void {
  // Load persisted settings on startup
  settings = loadSettingsFromDisk()

  // Connect enabled MCP servers on startup
  for (const server of settings.mcpServers) {
    if (server.enabled) {
      mcpBridge.connectServer(server).catch((err) => {
        console.error(`Failed to connect MCP server ${server.name} on startup:`, err)
      })
    }
  }

  // Remove any stale listeners before re-registering (prevents duplicates on reload)
  const channelsToRemove = [
    'chat:send',
    'chat:abort',
    'chat:regenerate',
    'chat:editMessage',
    'skills:scan',
    'skills:load',
    'skills:executeTool',
    'skills:export',
    'skills:importFromFolder',
    'skills:importFromGitHub',
    'skills:delete',
    'skills:getBuiltins',
    'skills:create'
  ]
  for (const ch of channelsToRemove) {
    ipcMain.removeAllListeners(ch)
  }

  /* ===== Memory ===== */
  ipcMain.handle('memory:load', (_e, category: 'user' | 'identity' | 'soul') => {
    return memoryService.getMemory()[category]
  })

  ipcMain.handle('memory:save', (_e, category: 'user' | 'identity' | 'soul', content: string) => {
    memoryService.updateMemory(category, content)
  })

  ipcMain.handle('memory:append', (_e, entries: Array<{ content: string; timestamp: number; source: string }>) => {
    memoryService.appendExtracted(entries)
  })

  ipcMain.handle('memory:extract', (_e, messages: Array<{ role: string; content: string }>) => {
    return memoryService.extractFromMessages(messages as Message[])
  })

  /* ===== Settings ===== */
  ipcMain.handle('settings:get', () => ({ ...settings }))

  ipcMain.handle('settings:set', (_e, next: Partial<AppSettings>) => {
    settings = { ...settings, ...next }
    saveSettingsToDisk(settings)
    return true
  })

  ipcMain.handle('settings:setApiKey', (_e, providerId: string, apiKey: string) => {
    const keys = loadKeys()
    keys[providerId] = apiKey
    saveKeys(keys)
    return true
  })

  ipcMain.handle('settings:getApiKey', (_e, providerId: string) => {
    return loadKeys()[providerId] ?? null
  })

  ipcMain.handle('settings:testProvider', async (_e, type: string, model: string, apiKey: string, baseUrl?: string) => {
    let provider: Provider | null = null
    if (type === 'anthropic') {
      provider = new AnthropicProvider(apiKey, model)
    } else {
      // All other types are OpenAI-compatible (openai, ollama, deepseek, groq, gemini, etc.)
      const url = baseUrl || (type === 'ollama' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1')
      const key = apiKey || (type === 'ollama' ? 'ollama' : '')
      provider = new OpenAIProvider(key, model, url)
    }
    try {
      if (!provider) return false
      return await provider.test()
    } catch {
      return false
    }
  })

  /* ===== Draft ===== */
  ipcMain.handle('draft:load', () => loadDraft())
  ipcMain.handle('draft:save', (_e, draft: { text: string; threadId: string | null }) => {
    saveDraft({ ...draft, timestamp: Date.now() })
    return true
  })

  ipcMain.handle('settings:fetchModels', async (_e, type: string, apiKey?: string, baseUrl?: string) => {
    return fetchModels(type, baseUrl, apiKey)
  })

  /* ===== MCP ===== */
  ipcMain.handle('mcp:listServers', () => {
    return settings.mcpServers.map((s) => ({
      ...s,
      status: mcpBridge.getServerStatus(s.name)
    }))
  })

  ipcMain.handle('mcp:addServer', (_e, config: MCPServerConfig) => {
    const exists = settings.mcpServers.find((s) => s.name === config.name)
    if (exists) return false
    settings.mcpServers.push(config)
    saveSettingsToDisk(settings)
    if (config.enabled) {
      mcpBridge.connectServer(config).catch((err) => {
        console.error(`Failed to connect MCP server ${config.name}:`, err)
      })
    }
    return true
  })

  ipcMain.handle('mcp:removeServer', async (_e, name: string) => {
    await mcpBridge.disconnectServer(name)
    settings.mcpServers = settings.mcpServers.filter((s) => s.name !== name)
    saveSettingsToDisk(settings)
    return true
  })

  ipcMain.handle('mcp:toggleServer', async (_e, name: string) => {
    const server = settings.mcpServers.find((s) => s.name === name)
    if (!server) return false
    server.enabled = !server.enabled
    saveSettingsToDisk(settings)
    if (server.enabled) {
      await mcpBridge.connectServer(server).catch((err) => {
        console.error(`Failed to connect MCP server ${name}:`, err)
      })
    } else {
      await mcpBridge.disconnectServer(name)
    }
    return true
  })

  ipcMain.handle('mcp:listTools', () => {
    return mcpBridge.getAllTools()
  })

  ipcMain.handle('mcp:callTool', async (_e, name: string, args: Record<string, unknown>) => {
    return mcpBridge.callTool(name, args)
  })

  /* ===== Skills ===== */
  ipcMain.handle('skills:scan', () => {
    return scanAllSkills()
  })

  ipcMain.handle('skills:list', () => {
    return scanAllSkills()
  })

  ipcMain.handle('skills:load', (_e, skillId: string, level: SkillLoadLevel) => {
    const allSkills = scanAllSkills()
    const skill = allSkills.find((s) => s.id === skillId)
    if (!skill) {
      return { level, tokens: 0, content: '' } as SkillLoadResult
    }
    return loadSkill(skill, level)
  })

  ipcMain.handle('skills:executeTool', async (_e, skillId: string, toolName: string, args: Record<string, unknown>) => {
    const allSkills = scanAllSkills()
    const skill = allSkills.find((s) => s.id === skillId)
    if (!skill) {
      return { success: false, error: `Skill '${skillId}' not found` }
    }
    return executeSkillTool(skill, toolName, args)
  })

  ipcMain.handle('skills:export', async (_e, skillId: string, outputPath: string) => {
    const allSkills = scanAllSkills()
    const skill = allSkills.find((s) => s.id === skillId)
    if (!skill) {
      throw new Error(`Skill '${skillId}' not found`)
    }
    return exportSkill(skill.path, outputPath)
  })

  ipcMain.handle('skills:importFromFolder', async (_e, sourcePath: string) => {
    return importSkillFromFolder(sourcePath)
  })

  ipcMain.handle('skills:importFromGitHub', async (_e, repoUrl: string) => {
    return importSkillFromGitHub(repoUrl)
  })

  ipcMain.handle('skills:delete', async (_e, skillId: string) => {
    return deleteGlobalSkill(skillId)
  })

  ipcMain.handle('skills:getBuiltins', () => {
    return scanAllSkills().filter((s) => s.isBuiltIn)
  })

  ipcMain.handle('skills:create', async (_e, name: string, description: string, tags: string[]) => {
    return saveNewSkill(name, description, tags)
  })

  /* ===== Workspace ===== */
  ipcMain.handle('workspace:list', () => {
    return listWorkspaces()
  })

  ipcMain.handle('workspace:add', async () => {
    const folderPath = await pickFolder()
    if (!folderPath) return null
    // Check duplicate
    const existing = listWorkspaces().find((w) => w.folderPath === folderPath)
    if (existing) return existing
    return createWorkspace({ folderPath })
  })

  ipcMain.handle('workspace:remove', (_e, id: string) => {
    return removeWorkspace(id)
  })

  ipcMain.handle('workspace:update', (_e, id: string, patch: WorkspaceUpdatePayload) => {
    return updateWorkspace(id, patch)
  })

  ipcMain.handle('workspace:relink', async (_e, id: string, newPath?: string) => {
    const path = newPath || await pickFolder()
    if (!path) return null
    return relinkWorkspace(id, path)
  })

  ipcMain.handle('workspace:scanAgentsMd', (_e, folderPath: string) => {
    return scanWorkspaceAgentsMd(folderPath)
  })

  /* ===== Thread ===== */
  ipcMain.handle('thread:list', (_e, workspaceId: string) => {
    const threads = loadThreads()
    return threads.filter((t) => t.workspaceId === workspaceId)
  })

  ipcMain.handle('thread:create', (_e, payload: ThreadCreatePayload) => {
    const now = Date.now()
    const thread: Thread = {
      id: randomUUID(),
      workspaceId: payload.workspaceId,
      title: payload.title || 'New Chat',
      createdAt: now,
      updatedAt: now,
      providerId: payload.providerId || settings.activeProviderId || '',
      model: payload.model || '',
      totalInputTokens: 0,
      totalOutputTokens: 0,
      status: 'active',
      skillId: payload.skillId,
      mode: payload.mode,
      ensembleProviderIds: payload.ensembleProviderIds,
      arbitratorProviderId: payload.arbitratorProviderId
    }
    const threads = loadThreads()
    threads.push(thread)
    saveThreads(threads)
    return thread
  })

  ipcMain.handle('thread:update', (_e, id: string, patch: ThreadUpdatePayload) => {
    const threads = loadThreads()
    const idx = threads.findIndex((t) => t.id === id)
    if (idx === -1) return null
    threads[idx] = { ...threads[idx], ...patch, updatedAt: Date.now() }
    saveThreads(threads)
    return threads[idx]
  })

  ipcMain.handle('thread:delete', (_e, id: string) => {
    const threads = loadThreads()
    const filtered = threads.filter((t) => t.id !== id)
    if (filtered.length === threads.length) return false
    saveThreads(filtered)
    // Also delete messages file
    const msgPath = getMessagesPath(id)
    if (existsSync(msgPath)) {
      try { rmSync(msgPath) } catch { /* ignore */ }
    }
    return true
  })

  ipcMain.handle('thread:loadMessages', (_e, threadId: string) => {
    return loadMessages(threadId)
  })

  ipcMain.handle('thread:saveMessages', (_e, threadId: string, messages: Message[]) => {
    saveMessages(threadId, messages)
    return true
  })

  /* ===== Chat ===== */
  async function doChatStream(payload: ChatSendPayload, regenerate = false, editIndex?: number) {
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

    // Collect active skills for this thread
    let skillSystemContent = ''
    const activeSkillIds: string[] = []
    if (threadId) {
      const threads = loadThreads()
      const thread = threads.find((t) => t.id === threadId)
      if (thread?.skillId) {
        activeSkillIds.push(thread.skillId)
      }
    }

    // Also scan workspace-level skills that might be auto-activated
    const allSkills = scanAllSkills(getWorkspacePath(workspaceId) || undefined)
    for (const skill of allSkills) {
      if (activeSkillIds.includes(skill.id)) {
        // Load L1 (meta info) for active skills
        const l1 = loadSkill(skill, 1)
        skillSystemContent += `\n\n${l1.content}`
      }
    }

    let finalMessages = messages
    let combinedSystemPrompt = systemPrompt || ''
    if (skillSystemContent) {
      combinedSystemPrompt += (combinedSystemPrompt ? '\n\n' : '') + skillSystemContent
    }

    // Add workspace context so AI knows the project root and available file tools
    const workspacePath = getWorkspacePath(workspaceId)
    if (workspacePath) {
      combinedSystemPrompt += (combinedSystemPrompt ? '\n\n' : '') + `You are working inside the workspace: ${workspacePath}. You can read, write, list, and patch files within this workspace using the available tools. Always use absolute paths when calling file tools.`
    }

    // Inject memory context into system prompt (up to ~2000 chars per category)
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
        ...messages
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
        const stream = provider.stream(
          currentMessages,
          ac.signal,
          availableTools.length > 0 ? availableTools : undefined
        )

        let assistantContent = ''
        const pendingToolCalls: ToolCall[] = []
        let assistantMessageId = randomUUID()

        for await (const chunk of stream) {
          if (ac.signal.aborted) break

          if (typeof chunk === 'string') {
            assistantContent += chunk
            win.webContents.send('chat:token', chunk)
          } else {
            // ToolCall
            pendingToolCalls.push(chunk)
            win.webContents.send('chat:tool_call', {
              id: chunk.id,
              name: chunk.name,
              arguments: chunk.arguments
            })
          }
        }

        if (pendingToolCalls.length === 0) {
          // No tool calls, stream finished normally
          break
        }

        // Add assistant message with tool calls
        currentMessages.push({
          id: assistantMessageId,
          role: 'assistant',
          content: assistantContent,
          timestamp: Date.now(),
          metadata: {
            toolCalls: pendingToolCalls
          }
        })

        // Execute each tool call
        for (const tc of pendingToolCalls) {
          const result = await executeTool(tc, workspaceId, { desktopEnabled: settings.desktopEnabled })
          win.webContents.send('chat:tool_result', {
            toolCallId: result.toolCallId,
            content: result.content,
            isError: result.isError
          })
          currentMessages.push({
            id: randomUUID(),
            role: 'tool',
            content: result.content,
            timestamp: Date.now(),
            kind: 'tool_result',
            toolCallId: tc.id,
            metadata: { toolName: tc.name, isError: result.isError }
          })
        }
      }

      win.webContents.send('chat:done', { regenerate, editIndex, workspaceId, threadId })

      // After successful response, extract and append memory entries
      try {
        const recentMessages = messages.slice(-10)
        const entries = memoryService.extractFromMessages(recentMessages)
        if (entries.length > 0) {
          memoryService.appendExtracted(entries)
        }
      } catch (memErr) {
        console.error('[Memory] Extraction failed:', memErr)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      let type: 'auth' | 'network' | 'model' | 'provider' | 'workspace' | 'ollama' | 'generic' = 'generic'
      const lower = msg.toLowerCase()
      if (lower.includes('api key') || lower.includes('unauthorized') || lower.includes('401') || lower.includes('authentication') || lower.includes('invalid key')) {
        type = 'auth'
      } else if (lower.includes('network') || lower.includes('fetch') || lower.includes('connect') || lower.includes('timeout') || lower.includes('econnrefused') || lower.includes('ENOTFOUND')) {
        type = 'network'
      } else if (lower.includes('model') || lower.includes('not found') || lower.includes('does not exist')) {
        type = 'model'
      } else if (lower.includes('ollama') || lower.includes('localhost:11434')) {
        type = 'ollama'
      } else if (lower.includes('workspace') || lower.includes('directory') || lower.includes('path')) {
        type = 'workspace'
      }
      win.webContents.send('chat:error', { message: msg, type })
    } finally {
      abortControllers.delete(abortKey)
    }
  }

  async function doEnsembleChat(payload: ChatSendPayload) {
    const runId = createRunId()
    const apiKeys = loadKeys()

    try {
      await runEnsemble({
        runId,
        payload,
        providers: settings.providers,
        apiKeys,
        desktopEnabled: settings.desktopEnabled,
        agentRoleAssignments: payload.agentRoleAssignments,
        rolePrompts: Object.fromEntries(AGENT_ROLES.map(r => [r.id, getRolePrompt(r.id)])) as Record<AgentRole, string>,
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
          onEnsembleDone: ({ threadId, workspaceId }) => {
            win.webContents.send('chat:ensemble:done', { runId, threadId, workspaceId })
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

  ipcMain.on('chat:send', async (_event, payload: ChatSendPayload) => {
    if (payload.mode === 'ensemble' || (payload.providerIds && payload.providerIds.length > 1)) {
      await doEnsembleChat(payload)
    } else {
      await doChatStream(payload)
    }
  })

  ipcMain.on('chat:abort', (_e, sessionId: string) => {
    abortControllers.get(sessionId)?.abort()
    abortRun(sessionId)
  })

  ipcMain.on('chat:regenerate', async (_e, payload: ChatSendPayload) => {
    await doChatStream(payload, true)
  })

  ipcMain.on('chat:editMessage', async (_e, payload: ChatSendPayload & { editIndex: number }) => {
    const { editIndex, ...chatPayload } = payload
    await doChatStream(chatPayload, false, editIndex)
  })

  /* ===== Desktop ===== */
  ipcMain.handle('desktop:openPath', async (_e, filePath: string) => {
    try {
      const result = await shell.openPath(filePath)
      return { success: result === '', error: result || undefined }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('desktop:capture', async () => {
    const base64 = await captureScreenshot()
    return base64
  })

  ipcMain.handle('desktop:emergencyStop', () => {
    // Abort all active controllers
    for (const [id, ac] of abortControllers.entries()) {
      ac.abort()
    }
    abortControllers.clear()
    win.webContents.send('desktop:emergencyStop')
    return true
  })

  ipcMain.handle('desktop:getWindows', async () => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 0, height: 0 } })
      return sources.map((s) => ({
        id: s.id,
        name: s.name,
        appIcon: s.appIcon ? s.appIcon.toPNG().toString('base64') : undefined
      }))
    } catch (err) {
      return []
    }
  })

  /* ===== Doctor ===== */
  ipcMain.handle('doctor:run', (): DoctorReport => {
    return runDoctor()
  })

  /* ===== File Tools (internal, not exposed to renderer directly) ===== */
  ipcMain.handle('tools:readFile', (_e, path: string) => readFile(path))
  ipcMain.handle('tools:writeFile', (_e, path: string, content: string) => writeFileTool(path, content))
  ipcMain.handle('tools:listDirectory', (_e, path: string) => listDirectory(path))
  ipcMain.handle('tools:applyPatch', (_e, path: string, patch: string) => applyPatch(path, patch))

  /* ===== Health Checks ===== */
  startHealthChecks(() => settings, (providerId, result) => {
    const idx = settings.providers.findIndex(p => p.id === providerId)
    if (idx !== -1) {
      settings.providers[idx] = { ...settings.providers[idx], lastTestResult: result, lastTestedAt: Date.now() }
      saveSettingsToDisk(settings)
      // Notify renderer of health change
      win.webContents.send('provider:healthChanged', { providerId, result })
    }
  })
}
