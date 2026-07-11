// Stub window.api when running outside Electron (browser dev preview / Playwright)
if (typeof window !== 'undefined' && !window.api) {
  const noop = () => () => {}
  ;(window as unknown as { api: unknown }).api = {
    settings: {
      get: async () => ({
        activeProviderId: null,
        providers: [],
        theme: 'system',
        language: 'en',
        startupBehavior: 'restore',
        autoUpdate: true,
        desktopEnabled: false,
        approvalMode: 'auto-edits',
        showThinking: true
      }),
      set: async () => true,
      setApiKey: async () => true,
      testProvider: async () => false,
      fetchModels: async () => []
    },
    workspace: {
      list: async () => [],
      add: async () => ({
        id: 'mock-ws-' + Date.now(),
        folderPath: '/Users/demo/project',
        name: 'Mock Workspace',
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // No-op stub in browser mode. The renderer detects missing chat.send
      // and falls through to the in-browser web3Chat agent.
      abort: () => {},
      regenerate: () => {},
      editMessage: () => {},
      onToken: noop,
      onToolCall: noop,
      onToolResult: noop,
      onDone: noop,
      onError: noop,
      onAgentToken: noop,
      onAgentDone: noop,
      onAgentError: noop,
      onAgentToolCall: noop,
      onAgentToolResult: noop,
      onArbitrationToken: noop,
      onArbitrationDone: noop,
      onEnsembleDone: noop
    },
    draft: {
      load: async () => null,
      save: async () => true
    },
    mcp: {
      listServers: async () => [],
      addServer: async () => false,
      removeServer: async () => false,
      toggleServer: async () => false,
      listTools: async () => [],
      callTool: async () => ''
    },
    app: {
      analysis: {
        run: async () => ({ content: '[stub] Configure a provider in Settings to get a real LLM analysis.' })
      },
      onNewChat: noop,
      onOpenSettings: noop,
      onFocusInput: noop,
      onEmergencyStop: noop
    },
    desktop: {
      openPath: async () => ({ success: false, error: 'Not available in browser mode' }),
      capture: async () => '',
      emergencyStop: async () => true,
      getWindows: async () => []
    },
    doctor: {
      run: async () => ({ timestamp: Date.now(), checks: [], overall: 'pass' })
    },
    tools: {
      readFile: async () => ({ success: false, error: 'Not available in browser mode' }),
      writeFile: async () => ({ success: false, error: 'Not available in browser mode' }),
      listDirectory: async () => ({ success: false, error: 'Not available in browser mode' }),
      applyPatch: async () => ({ success: false, error: 'Not available in browser mode' }),
      executeShell: async () => ({ success: false, stdout: '', stderr: 'Not available in browser mode', exitCode: 1 })
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
    },
    stocks: {
      quote: async () => ({ error: 'Not available in browser mode' }),
      search: async () => ({ results: [] }),
      history: async () => ({ history: { symbol: '', candles: [] } }),
      news: async () => ({ items: [] })
    }
  }
}
