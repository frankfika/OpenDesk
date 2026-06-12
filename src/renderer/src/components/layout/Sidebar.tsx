import { useState, useEffect, useCallback, useRef } from 'react'
import { useChatStore } from '../../store/chat'
import { useWorkspaceStore } from '../../store/workspace'
import { useSettingsStore } from '../../store/settings'
import { useSkillsStore } from '../../store/skills'
import { useThemeStore } from '../../store/theme'
import type { Thread, Workspace } from '@shared/types'
import {
  MessageSquare, Library, Zap, Settings, Plus, Hexagon,
  Folder, FolderOpen, ChevronRight, ChevronDown, Sun, Moon, Monitor,
  MoreVertical, Trash2, FolderInput, Pencil, Copy, Star, Pin,
  Archive, ExternalLink, Smile, CheckCircle2, ArrowUpCircle
} from 'lucide-react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { motion, AnimatePresence } from 'framer-motion'

interface SidebarProps {
  onOpenSettings: () => void
  onNewThread: () => void
  onOpenSkills: () => void
}

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const NAV_ITEMS = [
  { icon: MessageSquare, label: 'Chats' },
  { icon: Library, label: 'Skills' },
  { icon: Zap, label: 'Automations' }
]

const EMOJI_ICONS = ['📁', '💼', '📂', '🗂️', '📊', '📈', '📉', '💻', '🔧', '🎨', '📝', '🔬', '🚀', '🏠', '🌐', '⚙️', '🔒', '🔑', '📦', '📚']

export default function Sidebar({ onOpenSettings, onNewThread, onOpenSkills }: SidebarProps) {
  const { newThread } = useChatStore()
  const {
    workspaces, threads, activeWorkspaceId, activeThreadId,
    setActiveWorkspace, setActiveThread, createThread, deleteThread,
    updateThread, removeWorkspace, updateWorkspace, loadWorkspaces,
    addWorkspace, relinkWorkspace
  } = useWorkspaceStore()
  const { load: loadSettings, loaded: settingsLoaded } = useSettingsStore()
  const { skills, load: loadSkills, loaded: skillsLoaded } = useSkillsStore()
  const { resolvedTheme, toggleTheme } = useThemeStore()
  const [activeNav, setActiveNav] = useState('Chats')
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragOverType, setDragOverType] = useState<'workspace' | 'thread' | null>(null)
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null)
  const [unreadThreads, setUnreadThreads] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!settingsLoaded) loadSettings()
    if (!skillsLoaded) loadSkills()
  }, [settingsLoaded, loadSettings, skillsLoaded, loadSkills])

  // Auto-expand active workspace
  useEffect(() => {
    if (activeWorkspaceId) {
      setExpandedWorkspaces(prev => new Set([...prev, activeWorkspaceId]))
    }
  }, [activeWorkspaceId])

  // Mark thread as read when selected
  useEffect(() => {
    if (activeThreadId) {
      setUnreadThreads(prev => {
        const next = new Set(prev)
        next.delete(activeThreadId)
        return next
      })
    }
  }, [activeThreadId])

  function handleSelectThread(id: string) {
    setActiveThread(id)
  }

  function handleNavClick(label: string) {
    if (label === 'Skills') {
      onOpenSkills()
      return
    }
    setActiveNav(label)
  }

  function toggleWorkspace(wsId: string) {
    setExpandedWorkspaces(prev => {
      const next = new Set(prev)
      if (next.has(wsId)) {
        next.delete(wsId)
      } else {
        next.add(wsId)
      }
      return next
    })
  }

  function handleNewThreadInWorkspace(workspaceId: string) {
    createThread(workspaceId).then(() => {
      setExpandedWorkspaces(prev => new Set([...prev, workspaceId]))
    })
  }

  async function handleOpenFolder() {
    if (window.api?.workspace?.add) {
      try {
        const ws = await window.api.workspace.add()
        if (ws) {
          setActiveWorkspace(ws.id)
        }
      } catch (e) {
        console.error('Failed to open folder:', e)
      }
    } else {
      const path = prompt('Enter folder path (browser mode):', '/Users/demo/project')
      if (path) {
        const ws = await addWorkspace(path)
        setActiveWorkspace(ws.id)
      }
    }
  }

  function handleRename(type: 'workspace' | 'thread', id: string) {
    const item = type === 'workspace'
      ? workspaces.find(w => w.id === id)
      : threads.find(t => t.id === id)
    if (item) {
      setEditingId(id)
      setEditValue(item.name || item.title)
    }
  }

  function handleSubmitRename(type: 'workspace' | 'thread', id: string) {
    if (editValue.trim()) {
      if (type === 'workspace') {
        updateWorkspace(id, { name: editValue.trim() })
      } else {
        updateThread(id, { title: editValue.trim() })
      }
    }
    setEditingId(null)
    setEditValue('')
  }

  function handleDeleteThread(id: string) {
    if (confirm('Delete this conversation?')) {
      deleteThread(id)
    }
  }

  function handleRemoveWorkspace(id: string) {
    if (confirm('Remove this workspace? Conversations will be preserved.')) {
      removeWorkspace(id)
    }
  }

  function handleDuplicateThread(id: string) {
    const t = threads.find(th => th.id === id)
    if (!t || !t.workspaceId) return
    createThread(t.workspaceId, t.title + ' (copy)', t.skillId)
  }

  function handleExportThread(id: string, format: 'markdown' | 'json') {
    const t = threads.find(th => th.id === id)
    if (!t) return
    const data = format === 'json'
      ? JSON.stringify(t, null, 2)
      : `# ${t.title}\n\nExported from OpenDesk\n`
    navigator.clipboard.writeText(data).catch(console.error)
    alert(`Thread exported as ${format.toUpperCase()} to clipboard`)
  }

  function handleArchiveThread(id: string) {
    updateThread(id, { status: 'archived' })
  }

  function handlePinThread(id: string) {
    // In a real app, would have a pinned field
    updateThread(id, { title: threads.find(t => t.id === id)?.title + '' })
  }

  function handleSetDefaultWorkspace(id: string) {
    // Save to settings
    const { update } = useSettingsStore.getState()
    update({ activeProviderId: undefined })
  }

  function handleOpenInFinder(path: string) {
    if (window.api?.workspace?.openInFinder) {
      window.api.workspace.openInFinder(path)
    } else {
      console.log('Open in finder:', path)
    }
  }

  function handleCopyPath(path: string) {
    navigator.clipboard.writeText(path).catch(console.error)
  }

  function handleChangeIcon(id: string, icon: string) {
    updateWorkspace(id, { name: icon + ' ' + (workspaces.find(w => w.id === id)?.name || '') })
    setShowIconPicker(null)
  }

  // Drag and drop
  function handleDragStart(e: React.DragEvent, id: string, type: 'workspace' | 'thread') {
    setDraggingId(id)
    e.dataTransfer.setData('type', type)
    e.dataTransfer.setData('id', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, id: string, type: 'workspace' | 'thread') {
    e.preventDefault()
    e.stopPropagation()
    if (draggingId === id) return
    setDragOverId(id)
    setDragOverType(type)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOverId(null)
    setDragOverType(null)
  }

  function handleDrop(e: React.DragEvent, targetId: string, targetType: 'workspace' | 'thread') {
    e.preventDefault()
    e.stopPropagation()
    const sourceId = e.dataTransfer.getData('id')
    const sourceType = e.dataTransfer.getData('type') as 'workspace' | 'thread'
    setDraggingId(null)
    setDragOverId(null)
    setDragOverType(null)

    if (!sourceId || sourceId === targetId) return

    if (sourceType === 'workspace' && targetType === 'workspace') {
      // Reorder workspaces
      const wsList = [...workspaces]
      const fromIdx = wsList.findIndex(w => w.id === sourceId)
      const toIdx = wsList.findIndex(w => w.id === targetId)
      if (fromIdx !== -1 && toIdx !== -1) {
        const [moved] = wsList.splice(fromIdx, 1)
        wsList.splice(toIdx, 0, moved)
        // In real app, persist order
      }
    } else if (sourceType === 'thread' && targetType === 'thread') {
      // Reorder threads within workspace
      const threadList = threads.filter(t => t.workspaceId === activeWorkspaceId)
      const fromIdx = threadList.findIndex(t => t.id === sourceId)
      const toIdx = threadList.findIndex(t => t.id === targetId)
      if (fromIdx !== -1 && toIdx !== -1) {
        // In real app, persist order
      }
    } else if (sourceType === 'thread' && targetType === 'workspace') {
      // Move thread to different workspace
      updateThread(sourceId, { workspaceId: targetId })
    }
  }

  const wsThreads = (wsId: string) => threads.filter(t => t.workspaceId === wsId).sort((a, b) => b.updatedAt - a.updatedAt)

  // Unread counts
  const workspaceUnread = (wsId: string) => {
    return wsThreads(wsId).filter(t => unreadThreads.has(t.id)).length
  }

  return (
    <aside
      className="flex flex-col shrink-0 h-screen bg-[var(--bg-sidebar)] backdrop-blur-2xl"
      style={{ width: 'var(--sidebar-width)' }}
    >
      {/* Title bar drag region */}
      <div className="drag-region shrink-0 flex items-center px-4" style={{ height: 'var(--titlebar-height)' }}>
        <div className="no-drag flex items-center gap-2 mt-1" style={{ marginLeft: 68 }}>
          <Hexagon size={16} className="text-[var(--text-primary)]" />
          <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">OpenDesk</span>
        </div>
      </div>

      {/* New chat button */}
      <div className="px-4 pb-3 mt-2">
        <button
          onClick={onNewThread}
          className="no-drag w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 bg-[var(--bg-content)]/80 hover:bg-[var(--border)] text-[var(--text-primary)] border border-[var(--border)] shadow-sm hover:shadow"
        >
          <Plus size={16} />
          New chat
          <span className="ml-auto text-[11px] text-[var(--text-muted)] font-mono px-1.5 py-0.5 rounded-md bg-[var(--bg-sidebar)] border border-[var(--border)]">⌘N</span>
        </button>
      </div>

      {/* Nav items */}
      <nav className="px-3 pb-2 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeNav === item.label
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.label)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? "bg-[var(--bg-content)] text-[var(--text-primary)] font-medium shadow-sm border border-[var(--border)]" : "text-[var(--text-secondary)] hover:bg-[var(--border)] border border-transparent"
              }`}
            >
              <Icon size={15} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="h-px bg-[var(--border)] mx-3 my-2" />

      {/* Content list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {activeNav === 'Chats' && (
          <div className="flex flex-col gap-1">
            {/* Workspaces header */}
            <div className="flex items-center justify-between px-2 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Workspaces
              </span>
              <button
                onClick={handleOpenFolder}
                className="no-drag p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                title="Open folder"
              >
                <FolderOpen size={14} />
              </button>
            </div>

            {/* Workspace list */}
            {workspaces.length === 0 ? (
              <button
                onClick={handleOpenFolder}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors border border-dashed border-[var(--border)]"
              >
                <FolderOpen size={14} />
                Open a folder
              </button>
            ) : (
              workspaces.map((ws) => {
                const isExpanded = expandedWorkspaces.has(ws.id)
                const isActive = activeWorkspaceId === ws.id
                const threadsInWs = wsThreads(ws.id)
                const unreadCount = workspaceUnread(ws.id)
                const isDragOver = dragOverId === ws.id && dragOverType === 'workspace'

                return (
                  <ContextMenu.Root key={ws.id}>
                    <ContextMenu.Trigger asChild>
                      <div
                        className={`flex flex-col ${isDragOver ? 'bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-lg' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ws.id, 'workspace')}
                        onDragOver={(e) => handleDragOver(e, ws.id, 'workspace')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, ws.id, 'workspace')}
                      >
                        {/* Workspace header */}
                        <div
                          className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors cursor-pointer group ${
                            isActive ? 'bg-[var(--bg-content)]/60 border border-[var(--border)]' : 'hover:bg-[var(--border)] border border-transparent'
                          } ${draggingId === ws.id ? 'opacity-50 scale-[1.02]' : ''}`}
                          onClick={() => {
                            setActiveWorkspace(ws.id)
                            toggleWorkspace(ws.id)
                          }}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleWorkspace(ws.id) }}
                            className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <Folder size={14} className="text-[var(--text-muted)] shrink-0" />
                          {editingId === ws.id ? (
                            <input
                              autoFocus
                              className="flex-1 min-w-0 text-sm bg-transparent outline-none text-[var(--text-primary)] border-b border-[var(--accent)]"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleSubmitRename('workspace', ws.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSubmitRename('workspace', ws.id)
                                if (e.key === 'Escape') { setEditingId(null); setEditValue('') }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className={`flex-1 min-w-0 text-sm truncate ${isActive ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                              {ws.name || ws.folderPath.split('/').pop() || 'Untitled'}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {unreadCount > 0 && (
                              <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                                {unreadCount}
                              </span>
                            )}
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {threadsInWs.length}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleNewThreadInWorkspace(ws.id) }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                            title="New thread"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Threads under workspace */}
                        {isExpanded && threadsInWs.length > 0 && (
                          <div className="ml-4 pl-2 border-l border-[var(--border)] mt-0.5 flex flex-col gap-0.5">
                            {threadsInWs.map((t) => {
                              const isUnread = unreadThreads.has(t.id)
                              const isThreadDragOver = dragOverId === t.id && dragOverType === 'thread'
                              return (
                                <ContextMenu.Root key={t.id}>
                                  <ContextMenu.Trigger asChild>
                                    <div
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, t.id, 'thread')}
                                      onDragOver={(e) => handleDragOver(e, t.id, 'thread')}
                                      onDragLeave={handleDragLeave}
                                      onDrop={(e) => handleDrop(e, t.id, 'thread')}
                                      className={`${isThreadDragOver ? 'bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-md' : ''}`}
                                    >
                                      <div
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors group ${
                                          activeThreadId === t.id
                                            ? 'bg-[var(--bg-content)] border border-[var(--border)] shadow-sm'
                                            : 'hover:bg-[var(--border)] border border-transparent'
                                        } ${draggingId === t.id ? 'opacity-50 scale-[1.02]' : ''}`}
                                        onClick={() => handleSelectThread(t.id)}
                                      >
                                        <MessageSquare size={12} className="text-[var(--text-muted)] shrink-0" />
                                        {editingId === t.id ? (
                                          <input
                                            autoFocus
                                            className="flex-1 min-w-0 text-xs bg-transparent outline-none text-[var(--text-primary)] border-b border-[var(--accent)]"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => handleSubmitRename('thread', t.id)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSubmitRename('thread', t.id)
                                              if (e.key === 'Escape') { setEditingId(null); setEditValue('') }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        ) : (
                                          <span className={`flex-1 min-w-0 text-xs truncate ${activeThreadId === t.id ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                                            {t.title}
                                          </span>
                                        )}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {isUnread && (
                                            <span className="w-2 h-2 rounded-full bg-red-500" />
                                          )}
                                          <span className="text-[10px] shrink-0 opacity-0 group-hover:opacity-100 text-[var(--text-muted)]">
                                            {timeAgo(t.updatedAt)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </ContextMenu.Trigger>

                                  <ContextMenu.Portal>
                                    <ContextMenu.Content
                                      className="z-50 min-w-[180px] rounded-lg overflow-hidden bg-[var(--bg-content)] backdrop-blur-2xl border border-[var(--border)] shadow-xl py-1"
                                      sideOffset={4}
                                      align="start"
                                    >
                                      <ContextMenu.Item
                                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                                        onSelect={() => handleSelectThread(t.id)}
                                      >
                                        <MessageSquare size={13} />
                                        Continue Conversation
                                      </ContextMenu.Item>
                                      <ContextMenu.Item
                                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                                        onSelect={() => handleRename('thread', t.id)}
                                      >
                                        <Pencil size={13} />
                                        Rename
                                        <span className="ml-auto text-[10px] text-[var(--text-muted)]">⌘⇧R</span>
                                      </ContextMenu.Item>
                                      <ContextMenu.Item
                                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                                        onSelect={() => handleDuplicateThread(t.id)}
                                      >
                                        <Copy size={13} />
                                        Duplicate
                                        <span className="ml-auto text-[10px] text-[var(--text-muted)]">⌘⇧D</span>
                                      </ContextMenu.Item>
                                      <ContextMenu.Item
                                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                                        onSelect={() => handlePinThread(t.id)}
                                      >
                                        <Pin size={13} />
                                        Pin to Top
                                      </ContextMenu.Item>
                                      <ContextMenu.Separator className="h-px bg-[var(--border)] my-1" />
                                      <ContextMenu.Item
                                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                                        onSelect={() => handleExportThread(t.id, 'markdown')}
                                      >
                                        <ExternalLink size={13} />
                                        Export as Markdown
                                      </ContextMenu.Item>
                                      <ContextMenu.Item
                                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                                        onSelect={() => handleExportThread(t.id, 'json')}
                                      >
                                        <ExternalLink size={13} />
                                        Export as JSON
                                      </ContextMenu.Item>
                                      <ContextMenu.Separator className="h-px bg-[var(--border)] my-1" />
                                      <ContextMenu.Item
                                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                                        onSelect={() => handleArchiveThread(t.id)}
                                      >
                                        <Archive size={13} />
                                        Archive
                                        <span className="ml-auto text-[10px] text-[var(--text-muted)]">⌘⇧A</span>
                                      </ContextMenu.Item>
                                      <ContextMenu.Item
                                        className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50/10 cursor-pointer outline-none transition-colors"
                                        onSelect={() => handleDeleteThread(t.id)}
                                      >
                                        <Trash2 size={13} />
                                        Delete
                                        <span className="ml-auto text-[10px] text-red-400">⌘⇧Delete</span>
                                      </ContextMenu.Item>
                                    </ContextMenu.Content>
                                  </ContextMenu.Portal>
                                </ContextMenu.Root>
                              )
                            })}
                          </div>
                        )}

                        {isExpanded && threadsInWs.length === 0 && (
                          <div className="ml-4 pl-2 border-l border-[var(--border)] py-2">
                            <span className="text-[11px] text-[var(--text-muted)] px-2">No conversations yet</span>
                          </div>
                        )}
                      </div>
                    </ContextMenu.Trigger>

                    <ContextMenu.Portal>
                      <ContextMenu.Content
                        className="z-50 min-w-[200px] rounded-lg overflow-hidden bg-[var(--bg-content)] backdrop-blur-2xl border border-[var(--border)] shadow-xl py-1"
                        sideOffset={4}
                        align="start"
                      >
                        <ContextMenu.Item
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                          onSelect={() => handleOpenInFinder(ws.folderPath)}
                        >
                          <ExternalLink size={13} />
                          Open in Finder
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                          onSelect={() => handleCopyPath(ws.folderPath)}
                        >
                          <Copy size={13} />
                          Copy Path
                        </ContextMenu.Item>
                        <ContextMenu.Separator className="h-px bg-[var(--border)] my-1" />
                        <ContextMenu.Item
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                          onSelect={() => handleRename('workspace', ws.id)}
                        >
                          <Pencil size={13} />
                          Rename
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                          onSelect={() => setShowIconPicker(ws.id)}
                        >
                          <Smile size={13} />
                          Change Icon
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                          onSelect={() => handleSetDefaultWorkspace(ws.id)}
                        >
                          <CheckCircle2 size={13} />
                          Set as Default
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                          onSelect={() => {
                            const path = prompt('New folder path:', ws.folderPath)
                            if (path) relinkWorkspace(ws.id, path)
                          }}
                        >
                          <FolderInput size={13} />
                          Relink Folder
                        </ContextMenu.Item>
                        <ContextMenu.Separator className="h-px bg-[var(--border)] my-1" />
                        <ContextMenu.Item
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50/10 cursor-pointer outline-none transition-colors"
                          onSelect={() => handleRemoveWorkspace(ws.id)}
                        >
                          <Trash2 size={13} />
                          Remove
                        </ContextMenu.Item>
                      </ContextMenu.Content>
                    </ContextMenu.Portal>
                  </ContextMenu.Root>
                )
              })
            )}
          </div>
        )}

        {activeNav === 'Skills' && (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="p-4 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--border)] mb-3">
              <Library size={24} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
              Skills Management
            </p>
            <p className="text-[11px] text-[var(--text-muted)] max-w-[200px] mb-3">
              Click the Skills button above to open the full skills panel
            </p>
            <button
              onClick={onOpenSkills}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              Open Skills Panel
            </button>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-sidebar)]/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            className="no-drag flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]"
            onClick={onOpenSettings}
          >
            <Settings size={16} />
            Settings
            <span className="ml-auto text-[var(--text-muted)] text-[11px] font-mono">⌘,</span>
          </button>
          <button
            onClick={toggleTheme}
            className="no-drag p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            title="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Icon picker modal */}
      <AnimatePresence>
        {showIconPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setShowIconPicker(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--bg-content)] rounded-2xl border border-[var(--border)] shadow-2xl p-5 max-w-xs w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Choose Icon</h3>
              <div className="grid grid-cols-5 gap-2">
                {EMOJI_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => handleChangeIcon(showIconPicker!, icon)}
                    className="w-10 h-10 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors flex items-center justify-center text-lg"
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}
