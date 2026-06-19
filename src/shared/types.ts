export type Role = 'user' | 'assistant' | 'system' | 'tool'

export type MessageKind = 'user_message' | 'assistant_message' | 'reasoning' | 'tool_call' | 'tool_result' | 'error' | 'desktop_action' | 'screenshot' | 'compare_results'

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: number
  kind?: MessageKind
  metadata?: Record<string, unknown>
  toolCallId?: string
  // Ensemble / multi-agent fields
  sourceProviderId?: string
  sourceModel?: string
  agentId?: string
  runId?: string
  isArbitration?: boolean
  arbitrationReason?: string
  arbitrationConfidence?: number
}

export interface Workspace {
  id: string
  folderPath: string
  name: string
  icon?: string
  createdAt: number
  updatedAt: number
  description?: string
  defaultProviderId?: string
  defaultModel?: string
  tags: string[]
  status: 'active' | 'missing' | 'archived'
}

export type ChatMode = 'single' | 'agent' | 'ensemble' | 'compare'

export type ArbitrationMode = 'auto' | 'manual'

export type ApprovalMode = 'ask' | 'auto-edits' | 'auto-all' | 'bypass'

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
  // Chat / ensemble / compare mode fields
  mode?: ChatMode
  ensembleProviderIds?: string[]
  arbitratorProviderId?: string
  arbitrationMode?: ArbitrationMode
  agentRoleAssignments?: Record<string, AgentRole>
  agentAnswers?: AgentAnswerSnapshot[]
  selectedAnswerId?: string
}

export type AgentRole = 'coder' | 'reviewer' | 'researcher' | 'writer' | 'generalist'

export interface AgentRoleConfig {
  id: AgentRole
  name: string
  prompt: string
}

export interface AgentAnswerSnapshot {
  agentId: string
  providerId: string
  model?: string
  role?: AgentRole
  content: string
  timestamp: number
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
  approvalMode: ApprovalMode
  showThinking: boolean
  agentsMd?: AgentsMdInfo
  // Ensemble settings
  ensembleProviderIds?: string[]
  arbitratorProviderId?: string | null
  ensembleModeDefault?: boolean
  autoEnsembleForComplexTasks?: boolean
  agentRoleAssignments?: Record<string, AgentRole>
}

export interface ChatSendPayload {
  messages: Message[]
  providerId?: string
  providerIds?: string[]
  arbitratorProviderId?: string
  arbitrationMode?: ArbitrationMode
  agentRoleAssignments?: Record<string, AgentRole>
  mode?: ChatMode
  systemPrompt?: string
  workspaceId?: string
  threadId?: string
  sessionId?: string
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
  icon?: string
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
  mode?: ChatMode
  ensembleProviderIds?: string[]
  arbitratorProviderId?: string
  arbitrationMode?: ArbitrationMode
  agentRoleAssignments?: Record<string, AgentRole>
}

export interface ThreadUpdatePayload {
  title?: string
  status?: 'active' | 'archived'
  skillId?: string
  mode?: ChatMode
  ensembleProviderIds?: string[]
  arbitratorProviderId?: string
  arbitrationMode?: ArbitrationMode
  agentRoleAssignments?: Record<string, AgentRole>
  agentAnswers?: AgentAnswerSnapshot[]
  selectedAnswerId?: string
  totalInputTokens?: number
  totalOutputTokens?: number
}

export interface FileAttachment {
  id: string
  name: string
  path: string
  size: number
  mimeType: string
  content?: string
  file?: {
    readonly name: string
    readonly type: string
    readonly size: number
    text(): Promise<string>
    arrayBuffer(): Promise<ArrayBuffer>
  }
  type?: 'text' | 'image' | 'code' | 'pdf'
}

export interface ModelInfo {
  id: string
  displayName?: string
  contextWindow?: number
  supportsVision?: boolean
  supportsTools?: boolean
}

// Ensemble / multi-agent orchestration types

export type AgentRunStatus = 'running' | 'done' | 'error'

export interface AgentRun {
  runId: string
  agentId: string
  providerId: string
  model?: string
  role?: AgentRole
  status: AgentRunStatus
  messages: Message[]
  content: string
  toolCalls: ToolCall[]
  error?: string
  startedAt: number
  finishedAt?: number
}

export interface ArbitrationResult {
  finalContent: string
  reason: string
  confidence: number
  sourceRuns: AgentRun[]
  startedAt: number
  finishedAt?: number
}

export interface EnsembleConfig {
  providerIds: string[]
  arbitratorProviderId: string
  maxIterations: number
  shareToolResults: boolean
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface MemoryEntry {
  content: string
  timestamp: number
  source: string
}

export interface MemoryStore {
  load(category: 'user' | 'identity' | 'soul'): string
  save(category: 'user' | 'identity' | 'soul', content: string): void
  append(category: 'user' | 'identity' | 'soul', entry: MemoryEntry): void
}
