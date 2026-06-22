import { describe, it, expect, vi } from 'vitest'
import { create } from 'zustand'
import type { Message } from '@shared/types'

// Mock the stores that chat.ts imports to avoid circular dependency issues
vi.mock('../../store/settings', () => ({
  useSettingsStore: create(() => ({
    settings: { providers: [], activeProviderId: null },
    activeProvider: () => null,
    ensembleProviders: () => [],
    arbitratorProvider: () => null
  }))
}))

vi.mock('../../store/workspace', () => ({
  useWorkspaceStore: create(() => ({
    activeThreadId: null,
    activeWorkspace: () => null,
    createThread: vi.fn(),
    updateThread: vi.fn(),
    workspaces: [],
    threads: [],
    loadWorkspaces: vi.fn()
  }))
}))

describe('chat store', () => {
  it('should add a message', async () => {
    const { useChatStore } = await import('./chat')
    const store = useChatStore.getState()

    const msg: Message = {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now()
    }

    store.addMessage(msg)
    const messages = useChatStore.getState().messages
    expect(messages).toHaveLength(1)
    expect(messages[0].content).toBe('Hello')
  })

  it('should clear messages', async () => {
    const { useChatStore } = await import('./chat')
    const store = useChatStore.getState()

    store.addMessage({ id: 'msg-1', role: 'user', content: 'Hi', timestamp: Date.now() })
    store.clearMessages()

    expect(useChatStore.getState().messages).toHaveLength(0)
  })

  it('should set streaming state', async () => {
    const { useChatStore } = await import('./chat')
    const store = useChatStore.getState()

    expect(store.streaming).toBe(false)
    store.setStreaming(true)
    expect(useChatStore.getState().streaming).toBe(true)
  })

  it('should set error state', async () => {
    const { useChatStore } = await import('./chat')
    const store = useChatStore.getState()

    store.setError('Network error', 'network')
    const state = useChatStore.getState()
    expect(state.error).toBe('Network error')
    expect(state.errorType).toBe('network')
  })

  it('should manage mode', async () => {
    const { useChatStore } = await import('./chat')
    const store = useChatStore.getState()

    store.setMode('ensemble')
    expect(useChatStore.getState().mode).toBe('ensemble')

    store.setMode('single')
    expect(useChatStore.getState().mode).toBe('single')
  })

  it('should manage attachments', async () => {
    const { useChatStore } = await import('./chat')
    const store = useChatStore.getState()

    const att = {
      id: 'att-1',
      name: 'test.txt',
      path: 'test.txt',
      size: 100,
      mimeType: 'text/plain',
      type: 'text' as const
    }

    store.addAttachment(att)
    expect(useChatStore.getState().attachments).toHaveLength(1)

    store.removeAttachment('att-1')
    expect(useChatStore.getState().attachments).toHaveLength(0)
  })
})
