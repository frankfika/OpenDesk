import { create } from 'zustand'
import type {
  AppSettings,
  ProviderConfig,
  ModelInfo,
  MCPServerConfig,
  MCPTool,
  AgentRole
} from '@shared/types'
import { AGENT_ROLES, getRolePrompt, getRoleName } from '@shared/agent-roles'

let healthListenerRegistered = false


interface SettingsState {
  settings: AppSettings
  loaded: boolean
  mcpTools: MCPTool[]

  load: () => Promise<void>
  update: (next: Partial<AppSettings>) => Promise<boolean>
  saveApiKey: (providerId: string, apiKey: string) => Promise<void>
  addProvider: (config: ProviderConfig, apiKey: string) => Promise<void>
  updateProvider: (id: string, patch: Partial<ProviderConfig>) => Promise<void>
  removeProvider: (id: string) => Promise<void>
  activeProvider: () => ProviderConfig | null
  ensembleProviders: () => ProviderConfig[]
  arbitratorProvider: () => ProviderConfig | null
  fetchModels: (providerId: string) => Promise<ModelInfo[]>
  testProvider: (providerId: string, type: string, model: string, baseUrl?: string, apiKey?: string) => Promise<boolean>
  addMCPServer: (config: MCPServerConfig) => Promise<boolean>
  removeMCPServer: (name: string) => Promise<boolean>
  toggleMCPServer: (name: string) => Promise<boolean>
  refreshMCPTools: () => Promise<void>
  fetchMCPServers: () => Promise<void>
}

const defaultSettings: AppSettings = {
  activeProviderId: null,
  activeWorkspaceId: null,
  activeThreadId: null,
  providers: [],
  mcpServers: [],
  theme: 'system',
  language: 'en',
  startupBehavior: 'restore',
  autoUpdate: true,
  desktopEnabled: false,
  approvalMode: 'auto-edits',
  showThinking: true,
  ensembleProviderIds: [],
  arbitratorProviderId: null,
  ensembleModeDefault: false,
  autoEnsembleForComplexTasks: false,
  agentRoleAssignments: {}
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  loaded: false,
  mcpTools: [],

  load: async () => {
    try {
      if (!window.api?.settings?.get) {
        console.warn('window.api.settings not available (browser mode)')
        set({ loaded: true })
        return
      }
      const s = await window.api.settings.get()
      // Merge with defaults to ensure all fields exist
      const merged = { ...defaultSettings, ...s }
      const validModes: Array<AppSettings['approvalMode']> = ['ask', 'auto-edits', 'auto-all', 'bypass']
      // Migrate legacy approval mode on the renderer side as well
      if (merged.approvalMode === 'ask' || !validModes.includes(merged.approvalMode)) {
        merged.approvalMode = 'auto-edits'
        // Persist the migrated value back to main process
        window.api.settings.set({ approvalMode: 'auto-edits' }).catch(console.error)
      }
      set({ settings: merged, loaded: true })
      // Load MCP tools
      get().refreshMCPTools()
      // Listen for provider health changes from main process (only once)
      if (window.api?.app?.onHealthChanged && !healthListenerRegistered) {
        healthListenerRegistered = true
        window.api.app.onHealthChanged(({ providerId, result }) => {
          const providers = get().settings.providers.map((p) =>
            p.id === providerId ? { ...p, lastTestResult: result, lastTestedAt: Date.now() } : p
          )
          set((s) => ({ settings: { ...s.settings, providers } }))
        })
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
      set({ loaded: true })
    }
  },

  update: async (next) => {
    const previous = get().settings
    try {
      if (window.api?.settings?.set) {
        await window.api.settings.set(next)
      }
      set((s) => ({ settings: { ...s.settings, ...next } }))
      return true
    } catch (e) {
      console.error('Failed to update settings:', e)
      // Roll back local state if the main process failed to persist,
      // so the UI does not drift from the actual persisted settings.
      set({ settings: previous })
      return false
    }
  },

  saveApiKey: async (providerId, apiKey) => {
    try {
      if (window.api?.settings?.setApiKey) {
        await window.api.settings.setApiKey(providerId, apiKey)
      }
    } catch (e) {
      console.error('Failed to save API key:', e)
    }
  },

  addProvider: async (config, apiKey) => {
    const providers = [...get().settings.providers, config]
    const nextActiveId = get().settings.activeProviderId ?? config.id
    try {
      if (window.api?.settings?.set) {
        await window.api.settings.set({ providers, activeProviderId: nextActiveId })
      }
      if (window.api?.settings?.setApiKey) {
        await window.api.settings.setApiKey(config.id, apiKey)
      }
    } catch (e) {
      console.error('Failed to add provider:', e)
    }
    set((s) => ({
      settings: {
        ...s.settings,
        providers,
        activeProviderId: nextActiveId
      }
    }))
  },

  updateProvider: async (id, patch) => {
    const providers = get().settings.providers.map((p) => (p.id === id ? { ...p, ...patch } : p))
    try {
      if (window.api?.settings?.set) {
        await window.api.settings.set({ providers })
      }
    } catch (e) {
      console.error('Failed to update provider:', e)
    }
    set((s) => ({ settings: { ...s.settings, providers } }))
  },

  removeProvider: async (id) => {
    const providers = get().settings.providers.filter((p) => p.id !== id)
    try {
      if (window.api?.settings?.set) {
        await window.api.settings.set({ providers })
      }
    } catch (e) {
      console.error('Failed to remove provider:', e)
    }
    set((s) => ({
      settings: {
        ...s.settings,
        providers,
        activeProviderId: s.settings.activeProviderId === id ? (providers[0]?.id ?? null) : s.settings.activeProviderId
      }
    }))
  },

  activeProvider: () => {
    const { settings } = get()
    return settings.providers.find((p) => p.id === settings.activeProviderId) ?? null
  },

  ensembleProviders: () => {
    const { settings } = get()
    return settings.providers.filter((p) => settings.ensembleProviderIds?.includes(p.id) && p.enabled)
  },

  arbitratorProvider: () => {
    const { settings } = get()
    if (settings.arbitratorProviderId) {
      return settings.providers.find((p) => p.id === settings.arbitratorProviderId && p.enabled) ?? null
    }
    return settings.providers.find((p) => p.enabled) ?? null
  },

  agentRoles: () => AGENT_ROLES,

  getRoleForProvider: (providerId: string) => {
    return get().settings.agentRoleAssignments?.[providerId] ?? 'generalist'
  },

  setRoleForProvider: async (providerId: string, role: AgentRole) => {
    const current = get().settings.agentRoleAssignments ?? {}
    const next = { ...current, [providerId]: role }
    await get().update({ agentRoleAssignments: next })
  },

  // Re-export from @shared/agent-roles so callers don't have to import
  // directly. The previous inline copy drifted from the main-process copy.
  getRolePrompt,

  getRoleName,

  fetchModels: async (providerId) => {
    const provider = get().settings.providers.find((p) => p.id === providerId)
    if (!provider) return []
    try {
      if (!window.api?.settings?.fetchModels) {
        return []
      }
      const models = await window.api.settings.fetchModels(providerId, provider.type, provider.baseUrl)
      // Update provider's models list
      const providers = get().settings.providers.map((p) =>
        p.id === providerId ? { ...p, models: models.map((m) => m.id) } : p
      )
      await window.api.settings.set({ providers })
      set((s) => ({ settings: { ...s.settings, providers } }))
      return models
    } catch (e) {
      console.error('Failed to fetch models:', e)
      return []
    }
  },

  testProvider: async (providerId, type, model, baseUrl, apiKey) => {
    try {
      if (!window.api?.settings?.testProvider) return false
      return await window.api.settings.testProvider(providerId, type, model, baseUrl, apiKey)
    } catch (e) {
      console.error('Failed to test provider:', e)
      return false
    }
  },

  addMCPServer: async (config) => {
    try {
      if (!window.api?.mcp?.addServer) return false
      const success = await window.api.mcp.addServer(config)
      if (success) {
        const mcpServers = [...get().settings.mcpServers, config]
        set((s) => ({ settings: { ...s.settings, mcpServers } }))
        get().refreshMCPTools()
      }
      return success
    } catch (e) {
      console.error('Failed to add MCP server:', e)
      return false
    }
  },

  removeMCPServer: async (name) => {
    try {
      if (!window.api?.mcp?.removeServer) return false
      const success = await window.api.mcp.removeServer(name)
      if (success) {
        const mcpServers = get().settings.mcpServers.filter((s) => s.name !== name)
        set((s) => ({ settings: { ...s.settings, mcpServers } }))
        get().refreshMCPTools()
      }
      return success
    } catch (e) {
      console.error('Failed to remove MCP server:', e)
      return false
    }
  },

  toggleMCPServer: async (name) => {
    try {
      if (!window.api?.mcp?.toggleServer) return false
      const success = await window.api.mcp.toggleServer(name)
      if (success) {
        const mcpServers = get().settings.mcpServers.map((s) => (s.name === name ? { ...s, enabled: !s.enabled } : s))
        set((s) => ({ settings: { ...s.settings, mcpServers } }))
        get().refreshMCPTools()
      }
      return success
    } catch (e) {
      console.error('Failed to toggle MCP server:', e)
      return false
    }
  },

  refreshMCPTools: async () => {
    try {
      if (!window.api?.mcp?.listTools) return
      const tools = await window.api.mcp.listTools()
      set({ mcpTools: tools })
    } catch (e) {
      console.error('Failed to refresh MCP tools:', e)
    }
  },

  fetchMCPServers: async () => {
    try {
      if (!window.api?.mcp?.listServers) return
      const servers = await window.api.mcp.listServers()
      set((s) => ({ settings: { ...s.settings, mcpServers: servers } }))
    } catch (e) {
      console.error('Failed to fetch MCP servers:', e)
    }
  }
}))
