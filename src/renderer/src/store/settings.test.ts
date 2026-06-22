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

  it('should migrate legacy ask approvalMode to auto-edits', async () => {
    await useSettingsStore.getState().load()
    expect(useSettingsStore.getState().settings.approvalMode).toBe('auto-edits')
  })

  it('should migrate invalid approvalMode to auto-edits', async () => {
    ;(window as unknown as { api: { settings: { get: ReturnType<typeof vi.fn> } } }).api.settings.get.mockResolvedValueOnce({
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
      approvalMode: 'invalid-mode',
      showThinking: true,
      ensembleProviderIds: [],
      arbitratorProviderId: null,
      ensembleModeDefault: false,
      autoEnsembleForComplexTasks: false,
      agentRoleAssignments: {}
    })
    await useSettingsStore.getState().load()
    expect(useSettingsStore.getState().settings.approvalMode).toBe('auto-edits')
  })

  it('should return null arbitratorProvider', () => {
    const provider = useSettingsStore.getState().arbitratorProvider()
    expect(provider).toBeNull()
  })

  it('should roll back local settings when main process update fails', async () => {
    await useSettingsStore.getState().load()
    const originalLanguage = useSettingsStore.getState().settings.language
    ;(window as unknown as { api: { settings: { set: ReturnType<typeof vi.fn> } } }).api.settings.set.mockRejectedValueOnce(
      new Error('disk write failed')
    )
    const result = await useSettingsStore.getState().update({ language: 'fr' })
    expect(result).toBe(false)
    expect(useSettingsStore.getState().settings.language).toBe(originalLanguage)
  })
})
