import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  ChatSendPayload,
  Skill,
  SkillLoadLevel,
  SkillLoadResult,
  SkillImportResult,
  Workspace,
  WorkspaceUpdatePayload,
  Thread,
  ThreadCreatePayload,
  ThreadUpdatePayload,
  Message,
  AgentsMdInfo,
  DoctorReport,
  ModelInfo,
  MCPServerConfig,
  MCPTool,
  ArbitrationResult
} from '../shared/types'

contextBridge.exposeInMainWorld('api', {
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    set: (next: Partial<AppSettings>): Promise<boolean> =>
      ipcRenderer.invoke('settings:set', next),
    setApiKey: (providerId: string, apiKey: string): Promise<boolean> =>
      ipcRenderer.invoke('settings:setApiKey', providerId, apiKey),
    getApiKey: (providerId: string): Promise<string | null> =>
      ipcRenderer.invoke('settings:getApiKey', providerId),
    testProvider: (type: string, model: string, apiKey: string, baseUrl?: string): Promise<boolean> =>
      ipcRenderer.invoke('settings:testProvider', type, model, apiKey, baseUrl),
    fetchModels: (type: string, apiKey?: string, baseUrl?: string): Promise<ModelInfo[]> =>
      ipcRenderer.invoke('settings:fetchModels', type, apiKey, baseUrl)
  },

  draft: {
    load: (): Promise<{ text: string; threadId: string | null; timestamp: number } | null> =>
      ipcRenderer.invoke('draft:load'),
    save: (draft: { text: string; threadId: string | null }): Promise<boolean> =>
      ipcRenderer.invoke('draft:save', draft)
  },

  mcp: {
    listServers: (): Promise<MCPServerConfig[]> => ipcRenderer.invoke('mcp:listServers'),
    addServer: (config: MCPServerConfig): Promise<boolean> => ipcRenderer.invoke('mcp:addServer', config),
    removeServer: (name: string): Promise<boolean> => ipcRenderer.invoke('mcp:removeServer', name),
    toggleServer: (name: string): Promise<boolean> => ipcRenderer.invoke('mcp:toggleServer', name),
    listTools: (): Promise<MCPTool[]> => ipcRenderer.invoke('mcp:listTools'),
    callTool: (name: string, args: Record<string, unknown>): Promise<string> => ipcRenderer.invoke('mcp:callTool', name, args)
  },

  skills: {
    list: (): Promise<Skill[]> => ipcRenderer.invoke('skills:list'),
    scan: (): Promise<Skill[]> => ipcRenderer.invoke('skills:scan'),
    load: (skillId: string, level: SkillLoadLevel): Promise<SkillLoadResult> =>
      ipcRenderer.invoke('skills:load', skillId, level),
    executeTool: (skillId: string, toolName: string, args: Record<string, unknown>): Promise<{ success: boolean; output?: string; error?: string }> =>
      ipcRenderer.invoke('skills:executeTool', skillId, toolName, args),
    export: (skillId: string, outputPath: string): Promise<string> =>
      ipcRenderer.invoke('skills:export', skillId, outputPath),
    importFromFolder: (sourcePath: string): Promise<SkillImportResult> =>
      ipcRenderer.invoke('skills:importFromFolder', sourcePath),
    importFromGitHub: (repoUrl: string): Promise<SkillImportResult> =>
      ipcRenderer.invoke('skills:importFromGitHub', repoUrl),
    delete: (skillId: string): Promise<boolean> =>
      ipcRenderer.invoke('skills:delete', skillId),
    getBuiltins: (): Promise<Skill[]> =>
      ipcRenderer.invoke('skills:getBuiltins'),
    create: (name: string, description: string, tags: string[]): Promise<SkillImportResult> =>
      ipcRenderer.invoke('skills:create', name, description, tags)
  },

  workspace: {
    list: (): Promise<Workspace[]> => ipcRenderer.invoke('workspace:list'),
    add: (): Promise<Workspace | null> => ipcRenderer.invoke('workspace:add'),
    remove: (id: string): Promise<boolean> => ipcRenderer.invoke('workspace:remove', id),
    update: (id: string, patch: WorkspaceUpdatePayload): Promise<Workspace | null> =>
      ipcRenderer.invoke('workspace:update', id, patch),
    relink: (id: string, newPath?: string): Promise<Workspace | null> => ipcRenderer.invoke('workspace:relink', id, newPath),
    scanAgentsMd: (folderPath: string): Promise<AgentsMdInfo> =>
      ipcRenderer.invoke('workspace:scanAgentsMd', folderPath)
  },

  thread: {
    list: (workspaceId: string): Promise<Thread[]> =>
      ipcRenderer.invoke('thread:list', workspaceId),
    create: (payload: ThreadCreatePayload): Promise<Thread> =>
      ipcRenderer.invoke('thread:create', payload),
    update: (id: string, patch: ThreadUpdatePayload): Promise<Thread | null> =>
      ipcRenderer.invoke('thread:update', id, patch),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('thread:delete', id),
    loadMessages: (threadId: string): Promise<Message[]> =>
      ipcRenderer.invoke('thread:loadMessages', threadId),
    saveMessages: (threadId: string, messages: Message[]): Promise<boolean> =>
      ipcRenderer.invoke('thread:saveMessages', threadId, messages)
  },

  chat: {
    send: (payload: ChatSendPayload): void => ipcRenderer.send('chat:send', payload),
    abort: (sessionId: string): void => ipcRenderer.send('chat:abort', sessionId),
    regenerate: (payload: ChatSendPayload): void => ipcRenderer.send('chat:regenerate', payload),
    editMessage: (payload: ChatSendPayload & { editIndex: number }): void =>
      ipcRenderer.send('chat:editMessage', payload),
    onToken: (cb: (token: string) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, token: string): void => cb(token)
      ipcRenderer.on('chat:token', listener)
      return () => ipcRenderer.removeListener('chat:token', listener)
    },
    onDone: (cb: (meta?: { regenerate?: boolean; editIndex?: number; workspaceId?: string; threadId?: string }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, meta?: unknown): void => cb(meta as { regenerate?: boolean; editIndex?: number; workspaceId?: string; threadId?: string })
      ipcRenderer.on('chat:done', listener)
      return () => ipcRenderer.removeListener('chat:done', listener)
    },
    onError: (cb: (error: { message: string; type: string }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, error: unknown): void => cb(error as { message: string; type: string })
      ipcRenderer.on('chat:error', listener)
      return () => ipcRenderer.removeListener('chat:error', listener)
    },
    onToolCall: (cb: (toolCall: { id: string; name: string; arguments: Record<string, unknown> }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, toolCall: unknown): void => cb(toolCall as { id: string; name: string; arguments: Record<string, unknown> })
      ipcRenderer.on('chat:tool_call', listener)
      return () => ipcRenderer.removeListener('chat:tool_call', listener)
    },
    onToolResult: (cb: (result: { toolCallId: string; content: string; isError?: boolean }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, result: unknown): void => cb(result as { toolCallId: string; content: string; isError?: boolean })
      ipcRenderer.on('chat:tool_result', listener)
      return () => ipcRenderer.removeListener('chat:tool_result', listener)
    },
    onAgentToken: (cb: (payload: { runId: string; agentId: string; providerId: string; token: string }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: unknown): void => cb(payload as { runId: string; agentId: string; providerId: string; token: string })
      ipcRenderer.on('chat:agent:token', listener)
      return () => ipcRenderer.removeListener('chat:agent:token', listener)
    },
    onAgentDone: (cb: (payload: { runId: string; agentId: string; providerId: string; latencyMs?: number; inputTokens?: number; outputTokens?: number }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: unknown): void => cb(payload as { runId: string; agentId: string; providerId: string; latencyMs?: number; inputTokens?: number; outputTokens?: number })
      ipcRenderer.on('chat:agent:done', listener)
      return () => ipcRenderer.removeListener('chat:agent:done', listener)
    },
    onAgentError: (cb: (payload: { runId: string; agentId: string; providerId: string; error: string }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: unknown): void => cb(payload as { runId: string; agentId: string; providerId: string; error: string })
      ipcRenderer.on('chat:agent:error', listener)
      return () => ipcRenderer.removeListener('chat:agent:error', listener)
    },
    onAgentToolCall: (cb: (payload: { runId: string; agentId: string; providerId: string; toolCall: { id: string; name: string; arguments: Record<string, unknown> } }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: unknown): void => cb(payload as { runId: string; agentId: string; providerId: string; toolCall: { id: string; name: string; arguments: Record<string, unknown> } })
      ipcRenderer.on('chat:agent:tool_call', listener)
      return () => ipcRenderer.removeListener('chat:agent:tool_call', listener)
    },
    onAgentToolResult: (cb: (payload: { runId: string; agentId: string; providerId: string; toolResult: { toolCallId: string; name: string; content: string; isError?: boolean } }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: unknown): void => cb(payload as { runId: string; agentId: string; providerId: string; toolResult: { toolCallId: string; name: string; content: string; isError?: boolean } })
      ipcRenderer.on('chat:agent:tool_result', listener)
      return () => ipcRenderer.removeListener('chat:agent:tool_result', listener)
    },
    onArbitrationToken: (cb: (payload: { runId: string; token: string }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: unknown): void => cb(payload as { runId: string; token: string })
      ipcRenderer.on('chat:arbitration:token', listener)
      return () => ipcRenderer.removeListener('chat:arbitration:token', listener)
    },
    onArbitrationDone: (cb: (payload: { runId: string; result: ArbitrationResult }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: unknown): void => cb(payload as { runId: string; result: ArbitrationResult })
      ipcRenderer.on('chat:arbitration:done', listener)
      return () => ipcRenderer.removeListener('chat:arbitration:done', listener)
    },
    onEnsembleDone: (cb: (payload: { runId: string; threadId?: string; workspaceId?: string }) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: unknown): void => cb(payload as { runId: string; threadId?: string; workspaceId?: string })
      ipcRenderer.on('chat:ensemble:done', listener)
      return () => ipcRenderer.removeListener('chat:ensemble:done', listener)
    }
  },

  desktop: {
    openPath: (path: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('desktop:openPath', path),
    capture: (): Promise<string> => ipcRenderer.invoke('desktop:capture'),
    emergencyStop: (): Promise<boolean> => ipcRenderer.invoke('desktop:emergencyStop'),
    getWindows: (): Promise<{ id: string; name: string; appIcon?: string }[]> =>
      ipcRenderer.invoke('desktop:getWindows')
  },

  doctor: {
    run: (): Promise<DoctorReport> => ipcRenderer.invoke('doctor:run')
  },

  tools: {
    readFile: (path: string): Promise<{ success: boolean; content?: string; error?: string }> =>
      ipcRenderer.invoke('tools:readFile', path),
    writeFile: (path: string, content: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('tools:writeFile', path, content),
    listDirectory: (path: string): Promise<{ success: boolean; entries?: Array<{ name: string; path: string; isDirectory: boolean; size: number; mtime: number }>; error?: string }> =>
      ipcRenderer.invoke('tools:listDirectory', path),
    applyPatch: (path: string, patch: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('tools:applyPatch', path, patch)
  },

  app: {
    onNewChat: (cb: () => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('app:new-chat', listener)
      return () => ipcRenderer.removeListener('app:new-chat', listener)
    },
    onOpenSettings: (cb: () => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('app:open-settings', listener)
      return () => ipcRenderer.removeListener('app:open-settings', listener)
    },
    onFocusInput: (cb: () => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('app:focus-input', listener)
      return () => ipcRenderer.removeListener('app:focus-input', listener)
    },
    onEmergencyStop: (cb: () => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('desktop:emergencyStop', listener)
      return () => ipcRenderer.removeListener('desktop:emergencyStop', listener)
    }
  }
})
