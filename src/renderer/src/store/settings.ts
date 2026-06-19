import { create } from 'zustand'
import type { AppSettings, ProviderConfig, ModelInfo, MCPServerConfig, MCPTool, AgentRole, AgentRoleConfig } from '@shared/types'

let healthListenerRegistered = false

const AGENT_ROLES: AgentRoleConfig[] = [
  { id: 'generalist', name: 'Generalist', prompt: 'You are a helpful general-purpose assistant. Provide a balanced, accurate answer.' },
  { id: 'coder', name: 'Coder', prompt: 'You are an expert software engineer. Focus on code correctness, best practices, and edge cases. Always reason through the code carefully.' },
  { id: 'reviewer', name: 'Reviewer', prompt: 'You are a skeptical reviewer. Your job is to find mistakes, omissions, and weaknesses in the proposed solution. Be concise and critical.' },
  { id: 'researcher', name: 'Researcher', prompt: 'You are a thorough researcher. Gather context, compare alternatives, and cite relevant facts. Be comprehensive.' },
  { id: 'writer', name: 'Writer', prompt: 'You are a clear technical writer. Produce well-structured, easy-to-read output with good examples.' }
]

interface SettingsState {
  settings: AppSettings
  loaded: boolean
  mcpTools: MCPTool[]

  load: () => Promise<void>
  update: (next: Partial<AppSettings>) => Promise<void>
  saveApiKey: (providerId: string, apiKey: string) => Promise<void>
  addProvider: (config: ProviderConfig, apiKey: string) => Promise<void>
  updateProvider: (id: string, patch: Partial<ProviderConfig>) => Promise<void>
  removeProvider: (id: string) => Promise<void>
  activeProvider: () => ProviderConfig | null
  ensembleProviders: () => ProviderConfig[]
  arbitratorProvider: () => ProviderConfig | null
  fetchModels: (providerId: string) => Promise<ModelInfo[]>
  testProvider: (type: string, model: string, apiKey: string, baseUrl?: string) => Promise<boolean>
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
  approvalMode: 'ask',
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
      set({ settings: merged, loaded: true })
      // Load MCP tools
      get().refreshMCPTools()
      // Listen for provider health changes from main process (only once)
      if (window.api?.app?.onHealthChanged && !healthListenerRegistered) {
        healthListenerRegistered = true
        window.api.app.onHealthChanged(({ providerId, result }) => {
          const providers = get().settings.providers.map(p =>
            p.id === providerId ? { ...p, lastTestResult: result, lastTestedAt: Date.now() } : p
          )
          set(s => ({ settings: { ...s.settings, providers } }))
        })
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
      set({ loaded: true })
    }
  },

  update: async (next) => {
    try {
      if (window.api?.settings?.set) {
        await window.api.settings.set(next)
      }
      set(s => ({ settings: { ...s.settings, ...next } }))
    } catch (e) {
      console.error('Failed to update settings:', e)
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
    try {
      if (window.api?.settings?.set) {
        await window.api.settings.set({ providers })
      }
      if (window.api?.settings?.setApiKey) {
        await window.api.settings.setApiKey(config.id, apiKey)
      }
    } catch (e) {
      console.error('Failed to add provider:', e)
    }
    set(s => ({
      settings: {
        ...s.settings,
        providers,
        activeProviderId: s.settings.activeProviderId ?? config.id
      }
    }))
  },

  updateProvider: async (id, patch) => {
    const providers = get().settings.providers.map(p =>
      p.id === id ? { ...p, ...patch } : p
    )
    try {
      if (window.api?.settings?.set) {
        await window.api.settings.set({ providers })
      }
    } catch (e) {
      console.error('Failed to update provider:', e)
    }
    set(s => ({ settings: { ...s.settings, providers } }))
  },

  removeProvider: async (id) => {
    const providers = get().settings.providers.filter(p => p.id !== id)
    try {
      if (window.api?.settings?.set) {
        await window.api.settings.set({ providers })
      }
    } catch (e) {
      console.error('Failed to remove provider:', e)
    }
    set(s => ({
      settings: {
        ...s.settings,
        providers,
        activeProviderId: s.settings.activeProviderId === id ? (providers[0]?.id ?? null) : s.settings.activeProviderId
      }
    }))
  },

  activeProvider: () => {
    const { settings } = get()
    return settings.providers.find(p => p.id === settings.activeProviderId) ?? null
  },

  ensembleProviders: () => {
    const { settings } = get()
    return settings.providers.filter(p => settings.ensembleProviderIds?.includes(p.id) && p.enabled)
  },

  arbitratorProvider: () => {
    const { settings } = get()
    if (settings.arbitratorProviderId) {
      return settings.providers.find(p => p.id === settings.arbitratorProviderId && p.enabled) ?? null
    }
    return settings.providers.find(p => p.enabled) ?? null
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

  getRolePrompt: (role: AgentRole) => {
    return AGENT_ROLES.find(r => r.id === role)?.prompt ?? ''
  },

  fetchModels: async (providerId) => {
    const provider = get().settings.providers.find(p => p.id === providerId)
    if (!provider) return []
    try {
      if (!window.api?.settings?.fetchModels || !window.api?.settings?.getApiKey) {
        return []
      }
      const apiKey = (await window.api.settings.getApiKey(providerId)) ?? ''
      const models = await window.api.settings.fetchModels(provider.type, apiKey, provider.baseUrl)
      // Update provider's models list
      const providers = get().settings.providers.map(p =>
        p.id === providerId ? { ...p, models: models.map(m => m.id) } : p
      )
      await window.api.settings.set({ providers })
      set(s => ({ settings: { ...s.settings, providers } }))
      return models
    } catch (e) {
      console.error('Failed to fetch models:', e)
      return []
    }
  },

  testProvider: async (type, model, apiKey, baseUrl) => {
    try {
      if (!window.api?.settings?.testProvider) return false
      return await window.api.settings.testProvider(type, model, apiKey, baseUrl)
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
        set(s => ({ settings: { ...s.settings, mcpServers } }))
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
        const mcpServers = get().settings.mcpServers.filter(s => s.name !== name)
        set(s => ({ settings: { ...s.settings, mcpServers } }))
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
        const mcpServers = get().settings.mcpServers.map(s =>
          s.name === name ? { ...s, enabled: !s.enabled } : s
        )
        set(s => ({ settings: { ...s.settings, mcpServers } }))
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
      set(s => ({ settings: { ...s.settings, mcpServers: servers } }))
    } catch (e) {
      console.error('Failed to fetch MCP servers:', e)
    }
  }
}))
