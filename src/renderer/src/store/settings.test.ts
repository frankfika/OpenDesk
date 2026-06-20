import { describe, it, expect, vi } from 'vitest'
import { useSettingsStore } from './settings'

vi.stubGlobal('window', {
  api: {
    settings: {
      get: vi.fn().mockResolvedValue({
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
      }),
      set: vi.fn().mockResolvedValue(true)
    }
  }
})

describe('settings store', () => {
  it('should initialize with defaults', () => {
    const state = useSettingsStore.getState()
    expect(state.settings.theme).toBe('system')
    expect(state.settings.language).toBe('en')
    expect(state.settings.providers).toEqual([])
    expect(state.loaded).toBe(false)
  })

  it('should load settings', async () => {
    await useSettingsStore.getState().load()
    expect(useSettingsStore.getState().loaded).toBe(true)
  })

  it('should update settings', async () => {
    await useSettingsStore.getState().load()
    await useSettingsStore.getState().update({ language: 'zh' })
    expect(useSettingsStore.getState().settings.language).toBe('zh')
  })

  it('should return null activeProvider when no providers', () => {
    const provider = useSettingsStore.getState().activeProvider()
    expect(provider).toBeNull()
  })

  it('should return empty ensembleProviders', () => {
    const providers = useSettingsStore.getState().ensembleProviders()
    expect(providers).toEqual([])
  })

  it('should return null arbitratorProvider', () => {
    const provider = useSettingsStore.getState().arbitratorProvider()
    expect(provider).toBeNull()
  })
})
