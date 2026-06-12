// Stub window.api when running outside Electron (browser dev preview / Playwright)
if (typeof window !== 'undefined' && !window.api) {
  const noop = () => () => {}
  ;(window as any).api = {
    settings: {
      get: async () => ({
        activeProviderId: null,
        providers: [],
        theme: 'system',
        language: 'en',
        startupBehavior: 'restore',
        autoUpdate: true,
        desktopEnabled: false,
        approvalMode: 'suggest',
        showThinking: true
      }),
      set: async () => true,
      setApiKey: async () => true,
      getApiKey: async () => null,
      testProvider: async () => false,
      fetchModels: async () => []
    },
    workspace: {
      list: async () => [],
      add: async (payload: any) => ({
        id: 'mock-ws-' + Date.now(),
        folderPath: payload.folderPath,
        name: payload.name ?? 'Mock Workspace',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        status: 'active'
      }),
      remove: async () => true,
      update: async () => true,
      relink: async () => true,
      scanAgentsMd: async () => ({ loaded: false, paths: [], content: '', tokenCount: 0 })
    },
    thread: {
      list: async () => [],
      create: async (payload: any) => ({
        id: 'mock-thread-' + Date.now(),
        workspaceId: payload.workspaceId,
        title: payload.title ?? 'New conversation',
        providerId: payload.providerId ?? 'mock',
        model: payload.model ?? 'mock',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalInputTokens: 0,
        totalOutputTokens: 0,
        status: 'active',
        skillId: payload.skillId
      }),
      update: async () => true,
      delete: async () => true,
      loadMessages: async () => [],
      saveMessages: async () => true
    },
    chat: {
      send: () => {},
      abort: () => {},
      regenerate: () => {},
      editMessage: () => {},
      onToken: noop,
      onDone: noop,
      onError: noop
    },
    desktop: {
      capture: async () => '',
      emergencyStop: async () => true,
      getWindows: async () => []
    },
    doctor: {
      run: async () => ({ timestamp: Date.now(), checks: [], overall: 'pass' })
    },
    skills: {
      list: async () => [],
      scan: async () => [],
      load: async () => ({ level: 1, tokens: 0, content: '' }),
      executeTool: async () => ({ success: false, error: 'Not available in browser mode' }),
      export: async () => '',
      importFromFolder: async () => ({ success: false, error: 'Not available in browser mode' }),
      importFromGitHub: async () => ({ success: false, error: 'Not available in browser mode' }),
      delete: async () => false,
      getBuiltins: async () => [],
      create: async () => ({ success: false, error: 'Not available in browser mode' })
    }
  }
}
