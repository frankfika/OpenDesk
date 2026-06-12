import { ipcMain, BrowserWindow, safeStorage, app, desktopCapturer, screen } from 'electron'
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
  MCPTool
} from '../../shared/types'
import { AnthropicProvider } from '../providers/anthropic'
import { OpenAIProvider } from '../providers/openai'
import type { Provider, Tool, ToolCall, ToolResult } from '../providers/base'
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
import { ToolRegistry } from '../tools/registry'
import { registerBuiltins } from '../tools/builtins'
import {
  scanAllSkills,
  loadSkill,
  executeSkillTool,
  getSkillToolAsProviderTool,
  exportSkill,
  importSkillFromFolder,
  importSkillFromGitHub,
  deleteGlobalSkill,
  saveNewSkill
} from '../skills'

const defaultSettings: AppSettings = {
  activeProviderId: null,
  providers: [],
  mcpServers: [],
  theme: 'dark',
  language: 'en',
  startupBehavior: 'restore',
  autoUpdate: false,
  desktopEnabled: false,
  approvalMode: 'suggest',
  showThinking: false
}

let settings: AppSettings = { ...defaultSettings }
const abortControllers = new Map<string, AbortController>()

/* ---------- Tool Registry ---------- */

const toolRegistry = new ToolRegistry()
registerBuiltins(toolRegistry)

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

async function executeBuiltinTool(
  toolCall: ToolCall,
  workspaceId?: string
): Promise<ToolResult> {
  const tool = toolRegistry.get(toolCall.name)
  if (!tool) {
    return {
      toolCallId: toolCall.id,
      content: `Tool '${toolCall.name}' not found`,
      isError: true
    }
  }

  // Security: desktop tools require desktopEnabled
  if (toolCall.name.startsWith('desktop_')) {
    if (!settings.desktopEnabled) {
      return {
        toolCallId: toolCall.id,
        content: 'Desktop control is disabled. Enable it in Settings.',
        isError: true
      }
    }
  }

  // Security: file tools restricted to workspace
  if (
    toolCall.name.startsWith('file_') ||
    toolCall.name === 'apply_patch'
  ) {
    const workspacePath = getWorkspacePath(workspaceId)
    const targetPath = (toolCall.arguments.path as string) || ''
    if (workspacePath && !isPathAllowed(targetPath, workspacePath)) {
      return {
        toolCallId: toolCall.id,
        content: `Path is outside the workspace directory (${workspacePath})`,
        isError: true
      }
    }
  }

  try {
    const result = await tool.handler(toolCall.arguments)
    return { toolCallId: toolCall.id, content: result, isError: false }
  } catch (err) {
    return {
      toolCallId: toolCall.id,
      content: err instanceof Error ? err.message : String(err),
      isError: true
    }
  }
}

async function executeTool(
  toolCall: ToolCall,
  workspaceId?: string
): Promise<ToolResult> {
  // Check if this is a skill tool (format: skillId_toolName)
  const skillToolMatch = toolCall.name.match(/^([^_]+_[^_]+)_(.+)$/)
  if (skillToolMatch) {
    const possibleSkillId = skillToolMatch[1].replace(/_/g, ':')
    const toolName = skillToolMatch[2]
    const allSkills = scanAllSkills(getWorkspacePath(workspaceId) || undefined)
    const skill = allSkills.find((s) => s.id === possibleSkillId || s.id.endsWith(':' + skillToolMatch[1].split('_').pop()))
    if (skill && skill.scripts && skill.scripts[toolName]) {
      const result = await executeSkillTool(skill, toolName, toolCall.arguments)
      return {
        toolCallId: toolCall.id,
        content: result.success ? (result.output || '') : (result.error || 'Unknown error'),
        isError: !result.success
      }
    }
  }

  // Try MCP first, then built-in
  const mcpTools = mcpBridge.getAllTools()
  const isMcpTool = mcpTools.some((t) => t.name === toolCall.name)

  if (isMcpTool) {
    try {
      const result = await mcpBridge.callTool(toolCall.name, toolCall.arguments)
      return { toolCallId: toolCall.id, content: result, isError: false }
    } catch (err) {
      return {
        toolCallId: toolCall.id,
        content: err instanceof Error ? err.message : String(err),
        isError: true
      }
    }
  }

  return executeBuiltinTool(toolCall, workspaceId)
}

function buildTools(workspaceId?: string): Tool[] {
  const mcpTools = mcpBridge.getAllTools()
  const builtinTools = toolRegistry.toProviderTools()
  const tools: Tool[] = [
    ...builtinTools,
    ...mcpTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema
    }))
  ]

  // Add skill-defined tools
  const allSkills = scanAllSkills(getWorkspacePath(workspaceId) || undefined)
  for (const skill of allSkills) {
    const skillTools = getSkillToolAsProviderTool(skill)
    tools.push(...skillTools)
  }

  return tools
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
  const config = settings.providers.find((p) => p.id === providerId)
  if (!config) return null
  if (config.type === 'anthropic') return new AnthropicProvider(apiKey, config.model)
  if (config.type === 'openai' || config.type === 'openai-compatible')
    return new OpenAIProvider(apiKey, config.model, config.baseUrl)
  if (config.type === 'ollama')
    return new OpenAIProvider(apiKey || 'ollama', config.model, config.baseUrl || 'http://localhost:11434/v1')
  return null
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
    let url: string
    let headers: Record<string, string> = {}

    if (type === 'ollama') {
      url = (baseUrl || 'http://localhost:11434') + '/api/tags'
    } else if (type === 'openai-compatible' || type === 'openai') {
      url = (baseUrl || 'https://api.openai.com') + '/v1/models'
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
    } else if (type === 'anthropic') {
      // Anthropic does not expose a public models endpoint; return hardcoded list
      return [
        { id: 'claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet', contextWindow: 200000, supportsVision: true, supportsTools: true },
        { id: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku', contextWindow: 200000, supportsVision: false, supportsTools: true },
        { id: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus', contextWindow: 200000, supportsVision: true, supportsTools: true }
      ]
    } else {
      return []
    }

    const res = await fetch(url, { headers })
    if (!res.ok) return []

    const data = await res.json()

    if (type === 'ollama') {
      const models = data.models || []
      return models.map((m: { name: string; model?: string }) => ({
        id: m.name || m.model,
        displayName: m.name || m.model
      }))
    }

    const models = data.data || []
    return models.map((m: { id: string }) => ({
      id: m.id,
      displayName: m.id
    }))
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
    if (type === 'anthropic') provider = new AnthropicProvider(apiKey, model)
    else if (type === 'openai') provider = new OpenAIProvider(apiKey, model)
    else if (type === 'openai-compatible') provider = new OpenAIProvider(apiKey, model, baseUrl)
    else if (type === 'ollama') provider = new OpenAIProvider(apiKey || 'ollama', model, baseUrl || 'http://localhost:11434/v1')
    if (!provider) return false
    return provider.test()
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
      skillId: payload.skillId
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
    const { messages, providerId, systemPrompt, workspaceId, threadId } = payload
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

    if (combinedSystemPrompt) {
      finalMessages = [
        { id: 'system', role: 'system', content: combinedSystemPrompt, timestamp: Date.now() },
        ...messages
      ]
    }

    const ac = new AbortController()
    abortControllers.set(providerId, ac)

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
          const result = await executeTool(tc, workspaceId)
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
      abortControllers.delete(providerId)
    }
  }

  ipcMain.on('chat:send', async (_event, payload: ChatSendPayload) => {
    await doChatStream(payload)
  })

  ipcMain.on('chat:abort', (_e, providerId: string) => {
    abortControllers.get(providerId)?.abort()
  })

  ipcMain.on('chat:regenerate', async (_e, payload: ChatSendPayload) => {
    await doChatStream(payload, true)
  })

  ipcMain.on('chat:editMessage', async (_e, payload: ChatSendPayload & { editIndex: number }) => {
    const { editIndex, ...chatPayload } = payload
    await doChatStream(chatPayload, false, editIndex)
  })

  /* ===== Desktop ===== */
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
}
