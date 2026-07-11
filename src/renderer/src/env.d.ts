import type {
  AppSettings,
  ChatSendPayload,
  Skill,
  SkillLoadLevel,
  SkillLoadResult,
  SkillImportResult,
  Workspace,
  Thread,
  Message,
  DoctorReport,
  ModelInfo,
  WorkspaceUpdatePayload,
  ThreadCreatePayload,
  ThreadUpdatePayload,
  AgentsMdInfo,
  MCPServerConfig,
  MCPTool,
  ArbitrationResult,
  AgentRole
} from '@shared/types'

interface ChatAPI {
  send: (payload: ChatSendPayload) => void
  abort: (providerId: string) => void
  regenerate: (payload: ChatSendPayload) => void
  editMessage: (payload: ChatSendPayload & { editIndex: number }) => void
  onToken: (cb: (payload: { token: string; threadId?: string }) => void) => () => void
  onToolCall: (
    cb: (payload: { id: string; name: string; arguments: Record<string, unknown>; threadId?: string }) => void
  ) => () => void
  onToolResult: (
    cb: (payload: { toolCallId: string; content: string; isError?: boolean; threadId?: string }) => void
  ) => () => void
  onDone: (
    cb: (meta: {
      regenerate?: boolean
      editIndex?: number
      workspaceId?: string
      threadId?: string
      error?: string
    }) => void
  ) => () => void
  onError: (cb: (error: { message: string; type: string }) => void) => () => void
  onAgentToken: (
    cb: (payload: { runId: string; agentId: string; providerId: string; token: string }) => void
  ) => () => void
  onAgentDone: (
    cb: (payload: {
      runId: string
      agentId: string
      providerId: string
      latencyMs?: number
      inputTokens?: number
      outputTokens?: number
    }) => void
  ) => () => void
  onAgentError: (
    cb: (payload: { runId: string; agentId: string; providerId: string; error: string }) => void
  ) => () => void
  onAgentToolCall: (
    cb: (payload: {
      runId: string
      agentId: string
      providerId: string
      toolCall: { id: string; name: string; arguments: Record<string, unknown> }
    }) => void
  ) => () => void
  onAgentToolResult: (
    cb: (payload: {
      runId: string
      agentId: string
      providerId: string
      toolResult: { toolCallId: string; name: string; content: string; isError?: boolean }
    }) => void
  ) => () => void
  onArbitrationToken: (cb: (payload: { runId: string; token: string }) => void) => () => void
  onArbitrationDone: (cb: (payload: { runId: string; result: ArbitrationResult }) => void) => () => void
  onEnsembleDone: (
    cb: (payload: {
      runId: string
      threadId?: string
      workspaceId?: string
      agentAnswers?: Array<{
        agentId: string
        providerId: string
        model?: string
        role?: AgentRole
        content: string
        timestamp: number
      }>
      arbitrationMode?: string
    }) => void
  ) => () => void
}

interface SettingsAPI {
  get: () => Promise<AppSettings>
  set: (next: Partial<AppSettings>) => Promise<boolean>
  setApiKey: (providerId: string, apiKey: string) => Promise<boolean>
  testProvider: (providerId: string, type: string, model: string, baseUrl?: string, apiKey?: string) => Promise<boolean>
  fetchModels: (providerId: string, type: string, baseUrl?: string, apiKey?: string) => Promise<ModelInfo[]>
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
  executeTool: (
    skillId: string,
    toolName: string,
    args: Record<string, unknown>
  ) => Promise<{ success: boolean; output?: string; error?: string }>
  export: (skillId: string, outputPath: string) => Promise<string>
  importFromFolder: (sourcePath: string) => Promise<SkillImportResult>
  importFromGitHub: (repoUrl: string) => Promise<SkillImportResult>
  delete: (skillId: string) => Promise<boolean>
  getBuiltins: () => Promise<Skill[]>
  create: (name: string, description: string, tags: string[]) => Promise<SkillImportResult>
  saveAsTemplate: (skillId: string) => Promise<{ destPath: string; overwritten: boolean }>
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

interface MemoryAPI {
  load: (category: 'user' | 'identity' | 'soul') => Promise<string>
  save: (category: 'user' | 'identity' | 'soul', content: string) => Promise<void>
  append: (entries: Array<{ content: string; timestamp: number; source: string }>) => Promise<void>
  extract: (
    messages: Array<{ role: string; content: string }>
  ) => Promise<Array<{ content: string; timestamp: number; source: string }>>
  onUpdated: (cb: (payload: { count: number; categories: string[] }) => void) => () => void
}

interface ToolsAPI {
  listDirectory: (
    path: string,
    workspacePath?: string
  ) => Promise<{
    success: boolean
    entries?: Array<{ name: string; path: string; isDirectory: boolean; size: number; mtime: number }>
    error?: string
  }>
  readFile: (
    path: string,
    workspacePath?: string
  ) => Promise<{ success: boolean; content?: string; error?: string }>
  writeFile: (path: string, content: string, workspacePath?: string) => Promise<{ success: boolean; error?: string }>
  executeShell: (
    command: string,
    args: string[],
    options?: { timeout?: number; cwd?: string; env?: Record<string, string> }
  ) => Promise<{ success: boolean; stdout?: string; stderr?: string; exitCode?: number; error?: string }>
  getPathForFile: (file: File) => string
  extractPptxText: (filePath: string) => Promise<{ success: boolean; text?: string; error?: string }>
}

interface Web3TxRequest {
  id: string
  chain: string
  chainName: string
  from: string
  to: string
  data?: string
  value?: string
  description: string
}

interface Web3API {
  prepareTx: (payload: {
    chain: string
    from: string
    to: string
    data?: string
    value?: string
    description: string
  }) => Promise<{ txHash?: string; signedTx?: string; error?: string }>
  txResult: (payload: { id: string; result?: unknown; error?: string }) => Promise<{ success: boolean; error?: string }>
  explainCalldata: (payload: {
    chain: string
    data: string
  }) => Promise<{ selector?: string; length?: number; note?: string; error?: string }>
  onTxRequest: (cb: (req: Web3TxRequest) => void) => () => void
}

interface StockQuote {
  symbol: string
  shortName?: string
  longName?: string
  exchange: 'NASDAQ' | 'NYSE' | 'AMEX' | 'OTHER'
  currency: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketTime: number
  marketState: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED'
  preMarketPrice?: number
  postMarketPrice?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  dayHigh?: number
  dayLow?: number
  volume?: number
}

interface StockSearchResult {
  symbol: string
  shortName: string
  longName?: string
  exchange: 'NASDAQ' | 'NYSE' | 'AMEX' | 'OTHER'
  type: string
}

interface StockHistoryCandle {
  t: number
  o: number
  h: number
  l: number
  c: number
  v: number
}

interface StockNewsItem {
  title: string
  link: string
  pubDate: string
  source?: string
}

interface StocksAPI {
  quote: (symbol: string) => Promise<{ quote?: StockQuote; error?: string }>
  search: (query: string, limit?: number) => Promise<{ results?: StockSearchResult[]; error?: string }>
  history: (
    symbol: string,
    range?: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y',
    interval?: '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo'
  ) => Promise<{ history?: { symbol: string; candles: StockHistoryCandle[] }; error?: string }>
  news: (symbol: string) => Promise<{ items: StockNewsItem[] }>
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
      memory: MemoryAPI
      tools: ToolsAPI
      web3: Web3API
      stocks: StocksAPI
      app: {
        analysis: {
          run: (prompt: string) => Promise<{ content?: string; error?: string }>
        }
        onNewChat: (cb: () => void) => () => void
        onOpenSettings: (cb: () => void) => () => void
        onFocusInput: (cb: () => void) => () => void
        onEmergencyStop: (cb: () => void) => () => void
        onToggleSidebar: (cb: () => void) => () => void
        onToggleTheme: (cb: () => void) => () => void
        onFocusModel: (cb: () => void) => () => void
        onHealthChanged: (cb: (payload: { providerId: string; result: boolean }) => void) => () => void
        artifact: {
          export: (args: {
            format: 'docx' | 'xlsx' | 'pptx' | 'md'
            title?: string
            content: string
          }) => Promise<{ ok: true; path: string } | { ok: false; cancelled?: boolean; error?: string }>
        }
        marketplace: {
          list: () => Promise<
            Array<{
              id: string
              name: string
              description: string
              category: string
              tags: string[]
              author: string
              githubPath: string
              skillSubpath: string
              stars?: number
              installs?: number
              version?: string
              verified?: boolean
            }>
          >
          install: (entry: {
            id: string
            name: string
            description: string
            category: string
            tags: string[]
            author: string
            githubPath: string
            skillSubpath: string
            stars?: number
            installs?: number
            version?: string
            verified?: boolean
          }) => Promise<{
            ok: boolean
            skillId?: string
            error?: string
            traceId: string
            record?: {
              id: string
              name: string
              version: string
              installedAt: number
              lastCheckedAt: number
              latestVersion?: string
              updateAvailable?: boolean
              path: string
            }
          }>
          installed: () => Promise<
            Array<{
              id: string
              name: string
              version: string
              installedAt: number
              lastCheckedAt: number
              latestVersion?: string
              updateAvailable?: boolean
              path: string
            }>
          >
          uninstall: (id: string) => Promise<boolean>
          checkUpdates: () => Promise<
            Array<{
              id: string
              name: string
              version: string
              installedAt: number
              lastCheckedAt: number
              latestVersion?: string
              updateAvailable?: boolean
              path: string
            }>
          >
          findInstalled: (id: string) => Promise<{
            id: string
            name: string
            version: string
            installedAt: number
            lastCheckedAt: number
            latestVersion?: string
            updateAvailable?: boolean
            path: string
          } | null>
        }
        claw: {
          getConfig: () => Promise<{
            telegramToken?: string
            allowedChatIds?: number[]
            pollingTimeout?: number
            bindings?: Array<{ chatId: number; label?: string; threadId?: string }>
            enabled?: boolean
          }>
          updateConfig: (patch: {
            telegramToken?: string
            allowedChatIds?: number[]
            pollingTimeout?: number
            bindings?: Array<{ chatId: number; label?: string; threadId?: string }>
            enabled?: boolean
          }) => Promise<{
            telegramToken?: string
            allowedChatIds?: number[]
            pollingTimeout?: number
            bindings?: Array<{ chatId: number; label?: string; threadId?: string }>
            enabled?: boolean
          }>
          start: () => Promise<void>
          stop: () => Promise<void>
          sendMessage: (chatId: number, text: string) => Promise<void>
          isRunning: () => Promise<boolean>
          onMessage: (cb: (m: { chatId: number; text: string; from: string; messageId: number }) => void) => () => void
          onStatus: (cb: (s: { running: boolean; hasToken: boolean; bindingCount: number }) => void) => () => void
          onError: (cb: (e: { message: string }) => void) => () => void
        }
        changelog: {
          record: (entry: {
            threadId?: string | null
            kind: 'file.write' | 'file.read' | 'file.delete' | 'shell' | 'web3.send' | 'skill' | 'ensemble'
            title: string
            detail?: string
            status: 'pending' | 'success' | 'error'
            error?: string
          }) => Promise<{ id: string }>
          update: (
            id: string,
            patch: Partial<{ status: 'pending' | 'success' | 'error'; error: string }>
          ) => Promise<void>
          list: (opts?: { threadId?: string | null; limit?: number; sinceTs?: number }) => Promise<
            Array<{
              id: string
              threadId: string | null
              ts: number
              kind: 'file.write' | 'file.read' | 'file.delete' | 'shell' | 'web3.send' | 'skill' | 'ensemble'
              title: string
              detail: string | null
              status: 'pending' | 'success' | 'error'
              error: string | null
            }>
          >
          clear: (opts?: { threadId?: string }) => Promise<number>
        }
        experts: {
          list: () => Promise<
            Array<{
              id: string
              name: string
              domain: string
              description: string
              icon: string
              color: string
              skillId: string
              systemPrompt: string
              starters: string[]
            }>
          >
          get: (id: string) => Promise<{
            id: string
            name: string
            domain: string
            description: string
            icon: string
            color: string
            skillId: string
            systemPrompt: string
            starters: string[]
          } | null>
        }
        scheduler: {
          list: () => Promise<
            Array<{
              id: string
              name: string
              cron: string
              enabled: boolean
              createdAt: number
              lastRunAt?: number
              lastRunStatus?: 'success' | 'error'
              lastRunError?: string
            }>
          >
          create: (input: {
            name: string
            cron: string
            action: { kind: 'skill'; skillId: string; prompt: string } | { kind: 'prompt'; prompt: string }
          }) => Promise<{
            id: string
            name: string
            cron: string
            enabled: boolean
            createdAt: number
          }>
          update: (
            id: string,
            patch: Partial<{
              name: string
              cron: string
              action: { kind: 'skill'; skillId: string; prompt: string } | { kind: 'prompt'; prompt: string }
              enabled: boolean
            }>
          ) => Promise<unknown>
          delete: (id: string) => Promise<boolean>
          run: (id: string) => Promise<void>
          validate: (expr: string) => Promise<boolean>
          reportFinished: (id: string, status: 'success' | 'error', error?: string) => Promise<void>
          onTaskRunning: (
            cb: (payload: {
              id: string
              action: { kind: 'skill'; skillId: string; prompt: string } | { kind: 'prompt'; prompt: string }
              startedAt: number
            }) => void
          ) => () => void
        }
      }
    }
    electron?: {
      openFolder: () => Promise<string | null>
    }
  }
}

export {}
