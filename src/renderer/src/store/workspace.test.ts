import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkspaceStore } from './workspace'
import type { Thread } from '@shared/types'

// Mock window.api - note: we intentionally do NOT provide workspace.add
// so that addWorkspace falls through to its browser-mode mock path
beforeEach(() => {
  vi.stubGlobal('window', {
    api: {
      workspace: {
        list: vi.fn().mockResolvedValue([]),
        remove: vi.fn().mockImplementation(async (id: string) => {
          useWorkspaceStore.setState((s) => ({
            workspaces: s.workspaces.filter((w) => w.id !== id)
          }))
          return true
        }),
        update: vi.fn().mockResolvedValue(true)
      },
      thread: {
        list: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(async (payload) => ({
          id: 'thread-' + Date.now(),
          workspaceId: payload.workspaceId,
          title: payload.title || 'New Thread',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          providerId: '',
          model: '',
          totalInputTokens: 0,
          totalOutputTokens: 0,
          status: 'active' as const
        })),
        delete: vi.fn().mockImplementation(async (id: string) => {
          useWorkspaceStore.setState((s) => ({
            threads: s.threads.filter((t) => t.id !== id)
          }))
          return true
        })
      }
    }
  })
  // Reset store state between tests
  useWorkspaceStore.setState({
    workspaces: [],
    threads: [],
    activeWorkspaceId: null,
    activeThreadId: null,
    loaded: false,
    agentsMd: null
  })
})

describe('workspace store', () => {
  it('should initialize empty', () => {
    const state = useWorkspaceStore.getState()
    expect(state.workspaces).toEqual([])
    expect(state.threads).toEqual([])
    expect(state.activeWorkspaceId).toBeNull()
    expect(state.activeThreadId).toBeNull()
  })

  it('should add a workspace in browser mode', async () => {
    const store = useWorkspaceStore.getState()
    const ws = await store.addWorkspace('/test/path', 'Test Workspace')
    expect(ws.folderPath).toBe('/test/path')
    expect(ws.name).toBe('Test Workspace')
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1)
  })

  it('should set active workspace', async () => {
    const store = useWorkspaceStore.getState()
    await store.setActiveWorkspace('ws-123')
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws-123')
  })

  it('should create a thread', async () => {
    const store = useWorkspaceStore.getState()
    const thread = await store.createThread('ws-123', 'Test Thread')
    expect(thread.title).toBe('Test Thread')
    expect(thread.workspaceId).toBe('ws-123')
    expect(useWorkspaceStore.getState().threads).toHaveLength(1)
  })

  it('should set active thread', async () => {
    const store = useWorkspaceStore.getState()
    await store.setActiveThread('thread-456')
    expect(useWorkspaceStore.getState().activeThreadId).toBe('thread-456')
  })

  it('should update thread title', async () => {
    const store = useWorkspaceStore.getState()
    const thread = await store.createThread('ws-123', 'Old Title')
    await store.updateThreadTitle(thread.id, 'New Title')
    const updated = useWorkspaceStore.getState().threads.find((t) => t.id === thread.id)
    expect(updated?.title).toBe('New Title')
  })

  it('should delete a thread', async () => {
    const store = useWorkspaceStore.getState()
    const thread = await store.createThread('ws-123', 'To Delete')
    await store.deleteThread(thread.id)
    expect(useWorkspaceStore.getState().threads).toHaveLength(0)
  })

  it('should remove a workspace', async () => {
    const store = useWorkspaceStore.getState()
    const ws = await store.addWorkspace('/remove/me', 'Remove Me')
    await store.removeWorkspace(ws.id)
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(0)
  })

  it('should compute activeWorkspace helper', () => {
    const store = useWorkspaceStore.getState()
    expect(store.activeWorkspace()).toBeNull()
  })

  it('should compute activeThread helper', () => {
    const store = useWorkspaceStore.getState()
    expect(store.activeThread()).toBeNull()
  })

  it('should compute threadsByWorkspace', async () => {
    const store = useWorkspaceStore.getState()
    await store.createThread('ws-1', 'Thread 1')
    await store.createThread('ws-1', 'Thread 2')
    await store.createThread('ws-2', 'Thread 3')
    expect(store.threadsByWorkspace('ws-1')).toHaveLength(2)
    expect(store.threadsByWorkspace('ws-2')).toHaveLength(1)
    expect(store.threadsByWorkspace('ws-999')).toHaveLength(0)
  })

  it('should not switch workspace when settings persist fails', async () => {
    vi.stubGlobal('window', {
      api: {
        ...window.api,
        settings: {
          set: vi.fn().mockRejectedValue(new Error('disk write failed'))
        }
      }
    })
    const store = useWorkspaceStore.getState()
    await store.setActiveWorkspace('ws-123')
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull()
  })

  it('should ignore stale thread results when workspace changes during load', async () => {
    let resolveA: (threads: Thread[]) => void = () => {}
    vi.stubGlobal('window', {
      api: {
        ...window.api,
        thread: {
          ...window.api.thread,
          list: vi.fn().mockImplementation(async (workspaceId: string) => {
            if (workspaceId === 'ws-a') {
              return new Promise<Thread[]>((resolve) => {
                resolveA = resolve
              })
            }
            return []
          })
        },
        settings: {
          set: vi.fn().mockResolvedValue(true)
        }
      }
    })
    const store = useWorkspaceStore.getState()
    // Add workspaces locally so setActiveWorkspace can find them
    useWorkspaceStore.setState({
      workspaces: [
        { id: 'ws-a', folderPath: '/a', name: 'A', createdAt: 0, updatedAt: 0, tags: [], status: 'active' },
        { id: 'ws-b', folderPath: '/b', name: 'B', createdAt: 0, updatedAt: 0, tags: [], status: 'active' }
      ]
    })
    const switchA = store.setActiveWorkspace('ws-a')
    // Switch to B before A's threads resolve
    await store.setActiveWorkspace('ws-b')
    // Now resolve A's threads
    resolveA([
      {
        id: 'thread-a',
        workspaceId: 'ws-a',
        title: 'Thread A',
        createdAt: 0,
        updatedAt: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        status: 'active',
        providerId: 'openai',
        model: 'gpt-4o'
      }
    ])
    await switchA
    // State should reflect ws-b, not ws-a's stale threads
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws-b')
    expect(useWorkspaceStore.getState().threads).toHaveLength(0)
  })
})
