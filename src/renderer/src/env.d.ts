import type { AppSettings, ChatSendPayload, Skill, Workspace, Thread, Message, DoctorReport, FileAttachment, ModelInfo, WorkspaceCreatePayload, WorkspaceUpdatePayload, ThreadCreatePayload, ThreadUpdatePayload, AgentsMdInfo, MCPServerConfig, MCPTool } from '@shared/types'

interface ChatAPI {
  send: (payload: ChatSendPayload) => void
  abort: (providerId: string) => void
  regenerate: (payload: ChatSendPayload) => void
  editMessage: (payload: ChatSendPayload & { editIndex: number }) => void
  onToken: (cb: (token: string) => void) => () => void
  onToolCall: (cb: (toolCall: { id: string; name: string; arguments: Record<string, unknown> }) => void) => () => void
  onToolResult: (cb: (result: { toolCallId: string; content: string; isError?: boolean }) => void) => () => void
  onDone: (cb: (meta?: { regenerate?: boolean; editIndex?: number; workspaceId?: string; threadId?: string }) => void) => () => void
  onError: (cb: (msg: string) => void) => () => void
}

interface SettingsAPI {
  get: () => Promise<AppSettings>
  set: (next: Partial<AppSettings>) => Promise<boolean>
  setApiKey: (providerId: string, apiKey: string) => Promise<boolean>
  getApiKey: (providerId: string) => Promise<string | null>
  testProvider: (type: string, model: string, apiKey: string, baseUrl?: string) => Promise<boolean>
  fetchModels: (type: string, apiKey?: string, baseUrl?: string) => Promise<ModelInfo[]>
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
  capture: () => Promise<string>
  emergencyStop: () => Promise<boolean>
  getWindows: () => Promise<Array<{ id: string; name: string; appIcon?: string }>>
}

interface DoctorAPI {
  run: () => Promise<DoctorReport>
}

declare global {
  interface Window {
    api: {
      chat: ChatAPI
      settings: SettingsAPI
      mcp: MCPAPI
      skills: SkillsAPI
      workspace: WorkspaceAPI
      thread: ThreadAPI
      desktop: DesktopAPI
      doctor: DoctorAPI
      app: {
        onNewChat: (cb: () => void) => () => void
        onOpenSettings: (cb: () => void) => () => void
        onFocusInput: (cb: () => void) => () => void
        onEmergencyStop: (cb: () => void) => () => void
      }
    }
    electron?: {
      openFolder: () => Promise<string | null>
    }
  }
}

export {}
