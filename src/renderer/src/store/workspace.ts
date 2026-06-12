import { create } from 'zustand'
import type {
  Workspace,
  Thread,
  WorkspaceCreatePayload,
  WorkspaceUpdatePayload,
  ThreadCreatePayload,
  ThreadUpdatePayload,
  AgentsMdInfo
} from '@shared/types'
import { useSettingsStore } from './settings'
import { useChatStore } from './chat'

interface WorkspaceState {
  workspaces: Workspace[]
  threads: Thread[]
  activeWorkspaceId: string | null
  activeThreadId: string | null
  loaded: boolean
  agentsMd: AgentsMdInfo | null

  // Workspace actions
  loadWorkspaces: () => Promise<void>
  addWorkspace: (folderPath: string, name?: string) => Promise<Workspace>
  removeWorkspace: (id: string) => Promise<void>
  updateWorkspace: (id: string, patch: WorkspaceUpdatePayload) => Promise<void>
  relinkWorkspace: (id: string, newPath: string) => Promise<void>
  setActiveWorkspace: (id: string | null) => void
  scanAgentsMd: (folderPath: string) => Promise<void>

  // Thread actions
  loadThreads: (workspaceId: string) => Promise<void>
  createThread: (workspaceId: string, title?: string, skillId?: string) => Promise<Thread>
  updateThread: (id: string, patch: ThreadUpdatePayload) => Promise<void>
  deleteThread: (id: string) => Promise<void>
  setActiveThread: (id: string | null) => void

  // Backward-compatible helpers (used by Sidebar / AppShell)
  addThread: (thread: Thread) => void
  updateThreadTitle: (id: string, title: string) => void
  updateThreadSkill: (id: string, skillId: string) => void

  // Computed helpers
  activeWorkspace: () => Workspace | null
  activeThread: () => Thread | null
  threadsByWorkspace: (workspaceId: string) => Thread[]
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  threads: [],
  activeWorkspaceId: null,
  activeThreadId: null,
  loaded: false,
  agentsMd: null,

  loadWorkspaces: async () => {
    try {
      if (!window.api?.workspace?.list) {
        console.warn('window.api.workspace not available (browser mode)')
        set({ loaded: true })
        return
      }
      const workspaces = await window.api.workspace.list()
      // Restore from settings if available
      const settings = useSettingsStore.getState().settings
      let activeWorkspaceId = settings.activeWorkspaceId
      let activeThreadId = settings.activeThreadId

      // Validate restored IDs still exist
      if (activeWorkspaceId && !workspaces.find(w => w.id === activeWorkspaceId)) {
        activeWorkspaceId = null
        activeThreadId = null
      }

      set({ workspaces, loaded: true, activeWorkspaceId, activeThreadId })

      // Load threads for active workspace
      if (activeWorkspaceId) {
        await get().loadThreads(activeWorkspaceId)
        // Restore active thread
        if (activeThreadId) {
          const threadExists = get().threads.find(t => t.id === activeThreadId)
          if (threadExists) {
            useChatStore.getState().switchThread(activeThreadId)
          }
        }
      } else if (workspaces.length > 0) {
        get().setActiveWorkspace(workspaces[0].id)
      }
    } catch (e) {
      console.error('Failed to load workspaces:', e)
      set({ loaded: true })
    }
  },

  addWorkspace: async (folderPath, name) => {
    const payload: WorkspaceCreatePayload = { folderPath, name }
    if (!window.api?.workspace?.add) {
      const mock: Workspace = {
        id: 'mock-' + Date.now(),
        folderPath,
        name: name ?? folderPath.split('/').pop() ?? 'Untitled',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
        status: 'active'
      }
      set(s => ({ workspaces: [mock, ...s.workspaces] }))
      get().setActiveWorkspace(mock.id)
      return mock
    }
    const workspace = await window.api.workspace.add(payload)
    set(s => ({ workspaces: [workspace, ...s.workspaces] }))
    get().setActiveWorkspace(workspace.id)
    return workspace
  },

  removeWorkspace: async (id) => {
    if (window.api?.workspace?.remove) {
      await window.api.workspace.remove(id)
    }
    set(s => {
      const workspaces = s.workspaces.filter(w => w.id !== id)
      const activeWorkspaceId = s.activeWorkspaceId === id ? (workspaces[0]?.id ?? null) : s.activeWorkspaceId
      return { workspaces, activeWorkspaceId, threads: activeWorkspaceId === id ? [] : s.threads }
    })
  },

  updateWorkspace: async (id, patch) => {
    if (window.api?.workspace?.update) {
      await window.api.workspace.update(id, patch)
    }
    set(s => ({
      workspaces: s.workspaces.map(w =>
        w.id === id ? { ...w, ...patch, updatedAt: Date.now() } : w
      )
    }))
  },

  relinkWorkspace: async (id, newPath) => {
    if (window.api?.workspace?.relink) {
      await window.api.workspace.relink(id, newPath)
    }
    set(s => ({
      workspaces: s.workspaces.map(w =>
        w.id === id ? { ...w, folderPath: newPath, status: 'active', updatedAt: Date.now() } : w
      )
    }))
  },

  setActiveWorkspace: (id) => {
    if (id === get().activeWorkspaceId) return
    set({ activeWorkspaceId: id, activeThreadId: null, threads: [] })
    // Save to settings for crash recovery
    useSettingsStore.getState().update({ activeWorkspaceId: id, activeThreadId: null })
    if (id) {
      get().loadThreads(id)
    } else {
      useChatStore.getState().switchThread(null)
    }
  },

  scanAgentsMd: async (folderPath) => {
    try {
      if (!window.api?.workspace?.scanAgentsMd) {
        set({ agentsMd: { loaded: false, paths: [], content: '', tokenCount: 0 } })
        return
      }
      const info = await window.api.workspace.scanAgentsMd(folderPath)
      set({ agentsMd: info })
    } catch (e) {
      console.error('Failed to scan agents.md:', e)
    }
  },

  loadThreads: async (workspaceId) => {
    try {
      if (!window.api?.thread?.list) {
        set({ threads: [] })
        return
      }
      const threads = await window.api.thread.list(workspaceId)
      set({ threads: threads.sort((a, b) => b.updatedAt - a.updatedAt) })
    } catch (e) {
      console.error('Failed to load threads:', e)
    }
  },

  createThread: async (workspaceId, title, skillId) => {
    const settings = useSettingsStore.getState()
    const provider = settings.activeProvider()
    const payload: ThreadCreatePayload = {
      workspaceId,
      title: title ?? 'New conversation',
      providerId: provider?.id,
      model: provider?.model,
      skillId
    }

    if (!window.api?.thread?.create) {
      const mock: Thread = {
        id: 'mock-thread-' + Date.now(),
        workspaceId,
        title: payload.title!,
        providerId: payload.providerId ?? 'mock',
        model: payload.model ?? 'mock',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalInputTokens: 0,
        totalOutputTokens: 0,
        status: 'active',
        skillId
      }
      set(s => ({ threads: [mock, ...s.threads], activeThreadId: mock.id }))
      useChatStore.getState().switchThread(mock.id)
      return mock
    }

    const thread = await window.api.thread.create(payload)
    set(s => ({ threads: [thread, ...s.threads], activeThreadId: thread.id }))
    useChatStore.getState().switchThread(thread.id)
    return thread
  },

  updateThread: async (id, patch) => {
    if (window.api?.thread?.update) {
      await window.api.thread.update(id, patch)
    }
    set(s => ({
      threads: s.threads.map(t =>
        t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t
      )
    }))
  },

  deleteThread: async (id) => {
    if (window.api?.thread?.delete) {
      await window.api.thread.delete(id)
    }
    set(s => ({
      threads: s.threads.filter(t => t.id !== id),
      activeThreadId: s.activeThreadId === id ? null : s.activeThreadId
    }))
    if (get().activeThreadId === id) {
      useChatStore.getState().switchThread(null)
    }
  },

  setActiveThread: (id) => {
    const currentId = get().activeThreadId
    if (id === currentId) return
    set({ activeThreadId: id })
    // Save to settings for crash recovery
    useSettingsStore.getState().update({ activeThreadId: id })
    if (id) {
      useChatStore.getState().switchThread(id)
    } else {
      useChatStore.getState().switchThread(null)
    }
  },

  // Backward-compatible: addThread fills in defaults and syncs chat store
  addThread: (thread) => {
    const settings = useSettingsStore.getState()
    const provider = settings.activeProvider()
    const completeThread: Thread = {
      ...thread,
      workspaceId: thread.workspaceId ?? get().activeWorkspaceId ?? 'default',
      providerId: thread.providerId ?? provider?.id ?? 'default',
      model: thread.model ?? provider?.model ?? 'default',
      totalInputTokens: thread.totalInputTokens ?? 0,
      totalOutputTokens: thread.totalOutputTokens ?? 0,
      status: thread.status ?? 'active',
      createdAt: thread.createdAt ?? Date.now(),
      updatedAt: thread.updatedAt ?? Date.now()
    }
    set(s => ({
      threads: [completeThread, ...s.threads],
      activeThreadId: completeThread.id
    }))
    // Persist via IPC (fire-and-forget)
    if (window.api?.thread?.create) {
      window.api.thread.create({
        workspaceId: completeThread.workspaceId,
        title: completeThread.title,
        providerId: completeThread.providerId,
        model: completeThread.model,
        skillId: completeThread.skillId
      }).catch(console.error)
    }
    useChatStore.getState().switchThread(completeThread.id)
  },

  updateThreadTitle: (id, title) => {
    get().updateThread(id, { title })
  },

  updateThreadSkill: (id, skillId) => {
    get().updateThread(id, { skillId })
  },

  activeWorkspace: () => {
    const { workspaces, activeWorkspaceId } = get()
    return workspaces.find(w => w.id === activeWorkspaceId) ?? null
  },

  activeThread: () => {
    const { threads, activeThreadId } = get()
    return threads.find(t => t.id === activeThreadId) ?? null
  },

  threadsByWorkspace: (workspaceId) => {
    return get().threads.filter(t => t.workspaceId === workspaceId)
  }
}))
