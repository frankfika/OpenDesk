export type Role = 'user' | 'assistant' | 'system' | 'tool'

export type MessageKind = 'user_message' | 'assistant_message' | 'reasoning' | 'tool_call' | 'tool_result' | 'error' | 'desktop_action' | 'screenshot'

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: number
  kind?: MessageKind
  metadata?: Record<string, unknown>
  toolCallId?: string
}

export interface Workspace {
  id: string
  folderPath: string
  name: string
  createdAt: number
  updatedAt: number
  description?: string
  defaultProviderId?: string
  defaultModel?: string
  tags: string[]
  status: 'active' | 'missing' | 'archived'
}

export interface Thread {
  id: string
  workspaceId: string
  title: string
  createdAt: number
  updatedAt: number
  providerId: string
  model: string
  totalInputTokens: number
  totalOutputTokens: number
  status: 'active' | 'archived'
  skillId?: string
}

export interface ProviderConfig {
  id: string
  name: string
  type: 'anthropic' | 'openai' | 'openai-compatible' | 'ollama' | 'google' | 'generic'
  model: string
  baseUrl?: string
  enabled: boolean
  models?: string[]
  lastTestedAt?: number
  lastTestResult?: boolean
}

export interface AppSettings {
  activeProviderId: string | null
  activeWorkspaceId: string | null
  activeThreadId: string | null
  providers: ProviderConfig[]
  mcpServers: MCPServerConfig[]
  theme: 'dark' | 'light' | 'system'
  language: string
  startupBehavior: 'restore' | 'new' | 'tray'
  autoUpdate: boolean
  desktopEnabled: boolean
  approvalMode: 'auto' | 'suggest' | 'full'
  showThinking: boolean
  agentsMd?: AgentsMdInfo
}

export interface ChatSendPayload {
  messages: Message[]
  providerId: string
  systemPrompt?: string
  workspaceId?: string
  threadId?: string
}

export type SkillSource = 'global' | 'workspace' | 'codex' | 'claude' | 'marketplace' | 'github' | 'builtin'

export interface SkillToolDefinition {
  name: string
  description: string
  parameters?: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required?: string[]
  }
}

export interface Skill {
  id: string
  name: string
  description: string
  content: string
  path: string
  source: SkillSource
  version?: string
  author?: string
  tags?: string[]
  hasReference: boolean
  hasScripts: boolean
  hasAssets: boolean
  scripts?: Record<string, string>
  references?: string[]
  tools?: SkillToolDefinition[]
  installedAt: number
  updatedAt: number
  usageCount: number
  isBuiltIn: boolean
}

export type SkillLoadLevel = 1 | 2 | 3

export interface SkillLoadResult {
  level: SkillLoadLevel
  tokens: number
  content: string
  scriptsLoaded?: string[]
}

export interface SkillImportResult {
  success: boolean
  skill?: Skill
  error?: string
}

export interface SkillExportPayload {
  skillId: string
  format: 'zip' | 'tar' | 'folder'
  outputPath: string
}

export interface SkillToolCall {
  skillId: string
  toolName: string
  arguments: Record<string, unknown>
}

export interface AgentsMdInfo {
  loaded: boolean
  paths: string[]
  content: string
  tokenCount: number
}

export interface MCPServerConfig {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
  enabled: boolean
  status?: MCPConnectionStatus
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  serverName: string
}

export type MCPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface DesktopAction {
  type: 'capture' | 'click' | 'type' | 'key' | 'scroll' | 'windows' | 'activate'
  params: Record<string, unknown>
  result?: string
}

export interface DoctorReport {
  timestamp: number
  checks: DoctorCheck[]
  overall: 'pass' | 'warn' | 'fail'
}

export interface DoctorCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  detail?: string
}

export interface WorkspaceCreatePayload {
  folderPath: string
  name?: string
}

export interface WorkspaceUpdatePayload {
  name?: string
  description?: string
  defaultProviderId?: string
  defaultModel?: string
  tags?: string[]
  status?: 'active' | 'missing' | 'archived'
  folderPath?: string
}

export interface ThreadCreatePayload {
  workspaceId: string
  title?: string
  providerId?: string
  model?: string
  skillId?: string
}

export interface ThreadUpdatePayload {
  title?: string
  status?: 'active' | 'archived'
  skillId?: string
}

export interface FileAttachment {
  id: string
  name: string
  path: string
  size: number
  mimeType: string
  content?: string
}

export interface ModelInfo {
  id: string
  displayName?: string
  contextWindow?: number
  supportsVision?: boolean
  supportsTools?: boolean
}
