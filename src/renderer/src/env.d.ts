import type { AppSettings, ChatSendPayload, Skill, SkillLoadLevel, SkillLoadResult, SkillImportResult, Workspace, Thread, Message, DoctorReport, FileAttachment, ModelInfo, WorkspaceCreatePayload, WorkspaceUpdatePayload, ThreadCreatePayload, ThreadUpdatePayload, AgentsMdInfo, MCPServerConfig, MCPTool, ArbitrationResult, AgentRole } from '@shared/types'

interface ChatAPI {
  send: (payload: ChatSendPayload) => void
  abort: (providerId: string) => void
  regenerate: (payload: ChatSendPayload) => void
  editMessage: (payload: ChatSendPayload & { editIndex: number }) => void
  onToken: (cb: (token: string) => void) => () => void
  onToolCall: (cb: (toolCall: { id: string; name: string; arguments: Record<string, unknown> }) => void) => () => void
  onToolResult: (cb: (result: { toolCallId: string; content: string; isError?: boolean }) => void) => () => void
  onDone: (cb: (meta?: { regenerate?: boolean; editIndex?: number; workspaceId?: string; threadId?: string }) => void) => () => void
  onError: (cb: (error: { message: string; type: string }) => void) => () => void
  onAgentToken: (cb: (payload: { runId: string; agentId: string; providerId: string; token: string }) => void) => () => void
  onAgentDone: (cb: (payload: { runId: string; agentId: string; providerId: string; latencyMs?: number; inputTokens?: number; outputTokens?: number }) => void) => () => void
  onAgentError: (cb: (payload: { runId: string; agentId: string; providerId: string; error: string }) => void) => () => void
  onAgentToolCall: (cb: (payload: { runId: string; agentId: string; providerId: string; toolCall: { id: string; name: string; arguments: Record<string, unknown> } }) => void) => () => void
  onAgentToolResult: (cb: (payload: { runId: string; agentId: string; providerId: string; toolResult: { toolCallId: string; name: string; content: string; isError?: boolean } }) => void) => () => void
  onArbitrationToken: (cb: (payload: { runId: string; token: string }) => void) => () => void
  onArbitrationDone: (cb: (payload: { runId: string; result: ArbitrationResult }) => void) => () => void
  onEnsembleDone: (cb: (payload: { runId: string; threadId?: string; workspaceId?: string; agentAnswers?: Array<{ agentId: string; providerId: string; model?: string; role?: AgentRole; content: string; timestamp: number }>; arbitrationMode?: string }) => void) => () => void
}

interface SettingsAPI {
  get: () => Promise<AppSettings>
  set: (next: Partial<AppSettings>) => Promise<boolean>
  setApiKey: (providerId: string, apiKey: string) => Promise<boolean>
  getApiKey: (providerId: string) => Promise<string | null>
  testProvider: (type: string, model: string, apiKey: string, baseUrl?: string) => Promise<boolean>
  fetchModels: (type: string, apiKey?: string, baseUrl?: string) => Promise<ModelInfo[]>
}

interface DraftAPI {
  load: () => Promise<{ text: string; threadId: string | null; timestamp: number } | null>
  save: (draft: { text: string; threadId: string | null }) => Promise<boolean>
}

interface MCPAPI {
  listServers: () => Promise<MCPServerConfig[]>
  addServer: (config: MCPServerConfig) => Promise<boolean>
  removeServer: (name: string) => Promise<boolean>
  toggleServer: (name: string) => Promise<boolean>
  listTools: () => Promise<MCPTool[]>
  callTool: (name: string, args: Record<string, unknown>) => Promise<string>
}

interface SkillsAPI {
  list: () => Promise<Skill[]>
  scan: () => Promise<Skill[]>
  load: (skillId: string, level: SkillLoadLevel) => Promise<SkillLoadResult>
  executeTool: (skillId: string, toolName: string, args: Record<string, unknown>) => Promise<{ success: boolean; output?: string; error?: string }>
  export: (skillId: string, outputPath: string) => Promise<string>
  importFromFolder: (sourcePath: string) => Promise<SkillImportResult>
  importFromGitHub: (repoUrl: string) => Promise<SkillImportResult>
  delete: (skillId: string) => Promise<boolean>
  getBuiltins: () => Promise<Skill[]>
  create: (name: string, description: string, tags: string[]) => Promise<SkillImportResult>
}

interface WorkspaceAPI {
  list: () => Promise<Workspace[]>
  add: () => Promise<Workspace | null>
  remove: (id: string) => Promise<boolean>
  update: (id: string, payload: WorkspaceUpdatePayload) => Promise<Workspace | null>
  relink: (id: string, newPath?: string) => Promise<Workspace | null>
  scanAgentsMd: (folderPath: string) => Promise<AgentsMdInfo>
}

interface ThreadAPI {
  list: (workspaceId: string) => Promise<Thread[]>
  create: (payload: ThreadCreatePayload) => Promise<Thread>
  update: (id: string, payload: ThreadUpdatePayload) => Promise<Thread | null>
  delete: (id: string) => Promise<boolean>
  loadMessages: (threadId: string) => Promise<Message[]>
  saveMessages: (threadId: string, messages: Message[]) => Promise<boolean>
}

interface DesktopAPI {
  openPath: (path: string) => Promise<{ success: boolean; error?: string }>
  capture: () => Promise<string>
  emergencyStop: () => Promise<boolean>
  getWindows: () => Promise<Array<{ id: string; name: string; appIcon?: string }>>
}

interface DoctorAPI {
  run: () => Promise<DoctorReport>
}

interface ToolsAPI {
  readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>
  writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>
  listDirectory: (path: string) => Promise<{ success: boolean; entries?: Array<{ name: string; path: string; isDirectory: boolean; size: number; mtime: number }>; error?: string }>
  applyPatch: (path: string, patch: string) => Promise<{ success: boolean; error?: string }>
}

interface MemoryAPI {
  load: (category: 'user' | 'identity' | 'soul') => Promise<string>
  save: (category: 'user' | 'identity' | 'soul', content: string) => Promise<void>
  append: (entries: Array<{ content: string; timestamp: number; source: string }>) => Promise<void>
  extract: (messages: Array<{ role: string; content: string }>) => Promise<Array<{ content: string; timestamp: number; source: string }>>
}

declare global {
  interface Window {
    api: {
      chat: ChatAPI
      settings: SettingsAPI
      draft: DraftAPI
      mcp: MCPAPI
      skills: SkillsAPI
      workspace: WorkspaceAPI
      thread: ThreadAPI
      desktop: DesktopAPI
      doctor: DoctorAPI
      tools: ToolsAPI
      memory: MemoryAPI
      app: {
        onNewChat: (cb: () => void) => () => void
        onOpenSettings: (cb: () => void) => () => void
        onFocusInput: (cb: () => void) => () => void
        onEmergencyStop: (cb: () => void) => () => void
        onToggleSidebar: (cb: () => void) => () => void
        onToggleTheme: (cb: () => void) => () => void
        onFocusModel: (cb: () => void) => () => void
        onHealthChanged: (cb: (payload: { providerId: string; result: boolean }) => void) => () => void
      }
    }
    electron?: {
      openFolder: () => Promise<string | null>
    }
  }
}

export {}
