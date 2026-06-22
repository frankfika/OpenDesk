import { create } from 'zustand'
import type {
  Workspace,
  Thread,
  WorkspaceUpdatePayload,
  ThreadCreatePayload,
  ThreadUpdatePayload,
  AgentsMdInfo
} from '@shared/types'
import { useSettingsStore } from './settings'
import { switchThread, setMode } from './chat-actions'

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  mtime: number
}

export interface DirectoryNode {
  name: string
  path: string
  isDirectory: boolean
  children?: DirectoryNode[]
  expanded?: boolean
}

interface WorkspaceState {
  workspaces: Workspace[]
  threads: Thread[]
  activeWorkspaceId: string | null
  activeThreadId: string | null
  loaded: boolean
  agentsMd: AgentsMdInfo | null

  // File tree state (lifted from FilePanel)
  fileTree: DirectoryNode[]
  fileTreeLoading: boolean
  fileTreeError: string | null
  expandedPaths: Set<string>
  totalFiles: number
  selectedFile: string | null
  fileContent: string
  fileSaveStatus: 'idle' | 'saving' | 'saved' | 'error'
  fileReadError: string | null

  // Workspace actions
  loadWorkspaces: () => Promise<void>
  addWorkspace: (folderPath: string, name?: string) => Promise<Workspace>
  removeWorkspace: (id: string) => Promise<void>
  updateWorkspace: (id: string, patch: WorkspaceUpdatePayload) => Promise<void>
  relinkWorkspace: (id: string, newPath: string) => Promise<void>
  setActiveWorkspace: (id: string | null) => Promise<void>
  scanAgentsMd: (folderPath: string) => Promise<void>

  // File tree actions
  loadFileTree: () => Promise<void>
  toggleExpandedPath: (path: string) => void
  selectFile: (path: string | null) => void
  readSelectedFile: () => Promise<void>
  saveSelectedFile: () => Promise<void>
  setFileContent: (content: string) => void
  clearFileTree: () => void

  // Thread actions
  loadThreads: (workspaceId: string) => Promise<void>
  createThread: (workspaceId: string, title?: string, skillId?: string) => Promise<Thread>
  updateThread: (id: string, patch: ThreadUpdatePayload) => Promise<void>
  deleteThread: (id: string) => Promise<void>
  setActiveThread: (id: string | null) => Promise<void>

  // Backward-compatible helpers (used by Sidebar / AppShell)
  addThread: (thread: Thread) => Promise<void>
  updateThreadTitle: (id: string, title: string) => Promise<void>
  updateThreadSkill: (id: string, skillId: string) => Promise<void>

  // Computed helpers
  activeWorkspace: () => Workspace | null
  activeThread: () => Thread | null
  threadsByWorkspace: (workspaceId: string) => Thread[]
}

const MAX_TREE_DEPTH = 6
const MAX_TREE_FILES = 1000

async function buildTreeRecursively(
  path: string,
  depth: number,
  countRef: { value: number }
): Promise<DirectoryNode[]> {
  if (depth > MAX_TREE_DEPTH || countRef.value > MAX_TREE_FILES) return []
  if (!window.api?.tools?.listDirectory) return []

  try {
    const result = await window.api.tools.listDirectory(path)
    if (!result.success || !result.entries) return []

    const sorted = result.entries.sort((a: FileEntry, b: FileEntry) =>
      a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1
    )

    const nodes: DirectoryNode[] = []

    for (const entry of sorted) {
      if (!entry.isDirectory) {
        countRef.value++
        if (countRef.value > MAX_TREE_FILES) break
      }

      const node: DirectoryNode = {
        name: entry.name,
        path: entry.path,
        isDirectory: entry.isDirectory,
        expanded: depth === 0
      }

      if (entry.isDirectory && depth < MAX_TREE_DEPTH) {
        node.children = await buildTreeRecursively(entry.path, depth + 1, countRef)
      }

      nodes.push(node)
    }

    return nodes
  } catch {
    return []
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  threads: [],
  activeWorkspaceId: null,
  activeThreadId: null,
  loaded: false,
  agentsMd: null,

  // File tree initial state
  fileTree: [],
  fileTreeLoading: false,
  fileTreeError: null,
  expandedPaths: new Set(),
  totalFiles: 0,
  selectedFile: null,
  fileContent: '',
  fileSaveStatus: 'idle',
  fileReadError: null,

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
      if (activeWorkspaceId && !workspaces.find((w) => w.id === activeWorkspaceId)) {
        activeWorkspaceId = null
        activeThreadId = null
      }

      set({ workspaces, loaded: true, activeWorkspaceId, activeThreadId })

      // Load threads for active workspace
      if (activeWorkspaceId) {
        await get().loadThreads(activeWorkspaceId)
        await get().loadFileTree()
        const activeWs = workspaces.find((w) => w.id === activeWorkspaceId)
        if (activeWs) await get().scanAgentsMd(activeWs.folderPath)
        // Restore active thread
        if (activeThreadId) {
          const threadExists = get().threads.find((t) => t.id === activeThreadId)
          if (threadExists) {
            switchThread(activeThreadId)
            setMode(threadExists.mode || 'single')
          }
        }
      } else if (workspaces.length > 0) {
        // Auto-select the first workspace on first launch, but do it locally
        // without persisting yet; setActiveWorkspace will persist when the user
        // explicitly chooses a workspace.
        const firstId = workspaces[0].id
        set({ activeWorkspaceId: firstId })
        await get().loadThreads(firstId)
        await get().loadFileTree()
        await get().scanAgentsMd(workspaces[0].folderPath)
      }
    } catch (e) {
      console.error('Failed to load workspaces:', e)
      set({ loaded: true })
    }
  },

  addWorkspace: async (folderPath, name) => {
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
      set((s) => ({ workspaces: [mock, ...s.workspaces] }))
      await get().setActiveWorkspace(mock.id)
      return mock
    }
    // workspace.add() opens a folder picker and returns the new workspace
    const workspace = await window.api.workspace.add()
    if (!workspace) throw new Error('No folder selected')
    set((s) => ({ workspaces: [workspace, ...s.workspaces] }))
    await get().setActiveWorkspace(workspace.id)
    return workspace
  },

  removeWorkspace: async (id) => {
    if (window.api?.workspace?.remove) {
      await window.api.workspace.remove(id)
    }
    const wasActive = get().activeWorkspaceId === id
    set((s) => {
      const workspaces = s.workspaces.filter((w) => w.id !== id)
      const activeWorkspaceId = s.activeWorkspaceId === id ? (workspaces[0]?.id ?? null) : s.activeWorkspaceId
      return { workspaces, activeWorkspaceId, threads: s.activeWorkspaceId === id ? [] : s.threads }
    })
    // Clear persisted active IDs when the active workspace is removed
    if (wasActive) {
      await useSettingsStore.getState().update({
        activeWorkspaceId: get().activeWorkspaceId,
        activeThreadId: null
      })
      if (!get().activeWorkspaceId) {
        switchThread(null)
      }
    }
  },

  updateWorkspace: async (id, patch) => {
    if (window.api?.workspace?.update) {
      await window.api.workspace.update(id, patch)
    }
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: Date.now() } : w))
    }))
  },

  relinkWorkspace: async (id, newPath) => {
    if (window.api?.workspace?.relink) {
      await window.api.workspace.relink(id, newPath)
    }
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === id ? { ...w, folderPath: newPath, status: 'active', updatedAt: Date.now() } : w
      )
    }))
  },

  setActiveWorkspace: async (id) => {
    if (id === get().activeWorkspaceId) return

    // Persist first so the main process is the source of truth; only update the
    // local UI after a successful save. This prevents the renderer and persisted
    // state from drifting.
    const ok = await useSettingsStore.getState().update({
      activeWorkspaceId: id,
      activeThreadId: null
    })
    if (!ok) return

    set({
      activeWorkspaceId: id,
      activeThreadId: null,
      threads: [],
      fileTree: [],
      fileTreeError: null,
      selectedFile: null,
      fileContent: '',
      fileSaveStatus: 'idle',
      fileReadError: null
    })
    switchThread(null)

    if (id) {
      await get().loadThreads(id)
      // Abort if the user already switched away while threads were loading
      if (get().activeWorkspaceId !== id) return
      await get().loadFileTree()
      if (get().activeWorkspaceId !== id) return
      const ws = get().workspaces.find((w) => w.id === id)
      if (ws) await get().scanAgentsMd(ws.folderPath)
    }
  },

  scanAgentsMd: async (folderPath) => {
    try {
      if (!window.api?.workspace?.scanAgentsMd) {
        set({ agentsMd: { loaded: false, paths: [], content: '', tokenCount: 0 } })
        return
      }
      const info = await window.api.workspace.scanAgentsMd(folderPath)
      // Ignore stale results if the user switched workspaces while scanning
      const ws = get().activeWorkspace()
      if (ws?.folderPath === folderPath) {
        set({ agentsMd: info })
      }
    } catch (e) {
      console.error('Failed to scan agents.md:', e)
    }
  },

  loadFileTree: async () => {
    const ws = get().activeWorkspace()
    if (!ws) {
      set({ fileTree: [], totalFiles: 0, fileTreeLoading: false, fileTreeError: null })
      return
    }

    const targetId = ws.id
    set({ fileTreeLoading: true, fileTreeError: null })
    try {
      const countRef = { value: 0 }
      const tree = await buildTreeRecursively(ws.folderPath, 0, countRef)
      // Ignore stale results if the user switched workspaces while loading
      if (get().activeWorkspaceId !== targetId) return
      const expandedPaths = new Set<string>()
      const collectDirs = (nodes: DirectoryNode[]) => {
        for (const node of nodes) {
          if (node.isDirectory && node.children && node.children.length > 0) {
            expandedPaths.add(node.path)
            collectDirs(node.children)
          }
        }
      }
      collectDirs(tree)
      set({ fileTree: tree, totalFiles: countRef.value, expandedPaths, fileTreeLoading: false })
    } catch (e) {
      console.error('Failed to load file tree:', e)
      set({ fileTreeError: e instanceof Error ? e.message : String(e), fileTreeLoading: false })
    }
  },

  toggleExpandedPath: (path) => {
    set((s) => {
      const next = new Set(s.expandedPaths)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return { expandedPaths: next }
    })
  },

  selectFile: (path) => {
    set({ selectedFile: path, fileContent: '', fileSaveStatus: 'idle', fileReadError: null })
    if (path) {
      get().readSelectedFile()
    }
  },

  readSelectedFile: async () => {
    const path = get().selectedFile
    if (!path) return
    try {
      if (!window.api?.tools?.readFile) {
        set({ fileContent: '', fileSaveStatus: 'idle', fileReadError: null })
        return
      }
      const result = await window.api.tools.readFile(path)
      if (result.success && typeof result.content === 'string') {
        set({ fileContent: result.content, fileSaveStatus: 'idle', fileReadError: null })
      } else {
        set({
          fileContent: '',
          fileSaveStatus: 'error',
          fileReadError: result.error || 'Failed to read file'
        })
        console.error('Failed to read file:', result.error)
      }
    } catch (e) {
      console.error('Failed to read file:', e)
      set({
        fileContent: '',
        fileSaveStatus: 'error',
        fileReadError: e instanceof Error ? e.message : String(e)
      })
    }
  },

  saveSelectedFile: async () => {
    const path = get().selectedFile
    const content = get().fileContent
    const ws = get().activeWorkspace()
    if (!path || !ws) return
    set({ fileSaveStatus: 'saving' })
    try {
      if (!window.api?.tools?.writeFile) {
        set({ fileSaveStatus: 'error' })
        return
      }
      const result = await window.api.tools.writeFile(path, content, ws.folderPath)
      if (result.success) {
        set({ fileSaveStatus: 'saved' })
        setTimeout(() => set({ fileSaveStatus: 'idle' }), 1500)
      } else {
        set({ fileSaveStatus: 'error' })
        console.error('Failed to save file:', result.error)
      }
    } catch (e) {
      console.error('Failed to save file:', e)
      set({ fileSaveStatus: 'error' })
    }
  },

  setFileContent: (content) => set({ fileContent: content }),

  clearFileTree: () => {
    set({
      fileTree: [],
      fileTreeLoading: false,
      fileTreeError: null,
      expandedPaths: new Set(),
      totalFiles: 0,
      selectedFile: null,
      fileContent: '',
      fileSaveStatus: 'idle',
      fileReadError: null
    })
  },

  loadThreads: async (workspaceId) => {
    try {
      if (!window.api?.thread?.list) {
        if (get().activeWorkspaceId === workspaceId) {
          set({ threads: [] })
        }
        return
      }
      const threads = await window.api.thread.list(workspaceId)
      // Ignore stale results if the user switched workspaces while loading
      if (get().activeWorkspaceId === workspaceId) {
        set({ threads: threads.sort((a, b) => b.updatedAt - a.updatedAt) })
      }
    } catch (e) {
      console.error('Failed to load threads:', e)
    }
  },

  createThread: async (workspaceId, title, skillId) => {
    const settingsState = useSettingsStore.getState()
    const settings = settingsState.settings
    const provider = settingsState.activeProvider()
    const ensProviders = settingsState.ensembleProviders()
    const arbProvider = settingsState.arbitratorProvider()
    const isEnsemble = settings.ensembleModeDefault || ensProviders.length > 0

    const payload: ThreadCreatePayload = {
      workspaceId,
      title: title ?? 'New conversation',
      providerId: provider?.id,
      model: provider?.model,
      skillId,
      mode: isEnsemble ? 'ensemble' : 'single',
      ensembleProviderIds: isEnsemble ? ensProviders.map((p) => p.id) : undefined,
      arbitratorProviderId: isEnsemble ? arbProvider?.id : undefined,
      agentRoleAssignments: isEnsemble ? settings.agentRoleAssignments : undefined
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
        skillId,
        mode: payload.mode,
        ensembleProviderIds: payload.ensembleProviderIds,
        arbitratorProviderId: payload.arbitratorProviderId,
        agentRoleAssignments: payload.agentRoleAssignments
      }
      set((s) => ({ threads: [mock, ...s.threads], activeThreadId: mock.id }))
      switchThread(mock.id)
      return mock
    }

    const thread = await window.api.thread.create(payload)
    set((s) => ({ threads: [thread, ...s.threads], activeThreadId: thread.id }))
    switchThread(thread.id)
    // Persist the newly active thread for crash recovery
    await useSettingsStore.getState().update({ activeThreadId: thread.id })
    return thread
  },

  updateThread: async (id, patch) => {
    if (window.api?.thread?.update) {
      await window.api.thread.update(id, patch)
    }
    set((s) => ({
      threads: s.threads.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t))
    }))
  },

  deleteThread: async (id) => {
    if (window.api?.thread?.delete) {
      await window.api.thread.delete(id)
    }
    const wasActive = get().activeThreadId === id
    set((s) => ({
      threads: s.threads.filter((t) => t.id !== id),
      activeThreadId: s.activeThreadId === id ? null : s.activeThreadId
    }))
    if (wasActive) {
      await useSettingsStore.getState().update({ activeThreadId: null })
      switchThread(null)
    }
  },

  setActiveThread: async (id) => {
    const currentId = get().activeThreadId
    if (id === currentId) return

    // Persist first so the main process stays the source of truth.
    const ok = await useSettingsStore.getState().update({ activeThreadId: id })
    if (!ok) return

    set({ activeThreadId: id })
    if (id) {
      switchThread(id)
      const thread = get().threads.find((t) => t.id === id)
      setMode(thread?.mode || 'single')
    } else {
      switchThread(null)
      setMode('single')
    }
  },

  // Backward-compatible: addThread fills in defaults and syncs chat store
  addThread: async (thread) => {
    const settingsState = useSettingsStore.getState()
    const settings = settingsState.settings
    const provider = settingsState.activeProvider()
    const completeThread: Thread = {
      ...thread,
      workspaceId: thread.workspaceId ?? get().activeWorkspaceId ?? 'default',
      providerId: thread.providerId ?? provider?.id ?? 'default',
      model: thread.model ?? provider?.model ?? 'default',
      totalInputTokens: thread.totalInputTokens ?? 0,
      totalOutputTokens: thread.totalOutputTokens ?? 0,
      status: thread.status ?? 'active',
      createdAt: thread.createdAt ?? Date.now(),
      updatedAt: thread.updatedAt ?? Date.now(),
      mode: thread.mode ?? (settings.ensembleModeDefault ? 'ensemble' : 'single'),
      ensembleProviderIds:
        thread.ensembleProviderIds ?? (settings.ensembleModeDefault ? settings.ensembleProviderIds : undefined),
      arbitratorProviderId:
        thread.arbitratorProviderId ??
        (settings.ensembleModeDefault ? (settings.arbitratorProviderId ?? undefined) : undefined),
      agentRoleAssignments:
        thread.agentRoleAssignments ?? (settings.ensembleModeDefault ? settings.agentRoleAssignments : undefined)
    }
    set((s) => ({
      threads: [completeThread, ...s.threads],
      activeThreadId: completeThread.id
    }))
    // Persist via IPC
    try {
      if (window.api?.thread?.create) {
        await window.api.thread.create({
          workspaceId: completeThread.workspaceId,
          title: completeThread.title,
          providerId: completeThread.providerId,
          model: completeThread.model,
          skillId: completeThread.skillId,
          mode: completeThread.mode,
          ensembleProviderIds: completeThread.ensembleProviderIds,
          arbitratorProviderId: completeThread.arbitratorProviderId,
          agentRoleAssignments: completeThread.agentRoleAssignments
        })
      }
      await useSettingsStore.getState().update({ activeThreadId: completeThread.id })
    } catch (e) {
      console.error('Failed to persist added thread:', e)
    }
    switchThread(completeThread.id)
  },

  updateThreadTitle: async (id, title) => {
    await get().updateThread(id, { title })
  },

  updateThreadSkill: async (id, skillId) => {
    await get().updateThread(id, { skillId })
  },

  activeWorkspace: () => {
    const { workspaces, activeWorkspaceId } = get()
    return workspaces.find((w) => w.id === activeWorkspaceId) ?? null
  },

  activeThread: () => {
    const { threads, activeThreadId } = get()
    return threads.find((t) => t.id === activeThreadId) ?? null
  },

  threadsByWorkspace: (workspaceId) => {
    return get().threads.filter((t) => t.workspaceId === workspaceId)
  }
}))
