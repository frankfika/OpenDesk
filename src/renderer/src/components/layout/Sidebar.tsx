import { useState, useEffect, useRef } from 'react'
import { useWorkspaceStore } from '../../store/workspace'
import { useSettingsStore } from '../../store/settings'
import { useSkillsStore } from '../../store/skills'
import { useThemeStore } from '../../store/theme'
import {
  MessageSquare, Library, Folder, Settings, Plus, Hexagon,
  FolderOpen, Sun, Moon, Pencil, Copy, Smile, CheckCircle2,
  FolderInput, Trash2, ChevronRight, MoreHorizontal
} from 'lucide-react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'

interface SidebarProps {
  onOpenSettings: () => void
  onNewThread: () => void
  onOpenSkills: () => void
  onOpenFiles: () => void
}

const NAV_ITEMS = [
  { icon: MessageSquare, label: 'Chats' },
  { icon: Library, label: 'Skills' },
  { icon: Folder, label: 'Files' }
]

const EMOJI_ICONS = ['📁', '💼', '📂', '🗂️', '📊', '📈', '📉', '💻', '🔧', '🎨', '📝', '🔬', '🚀', '🏠', '🌐', '⚙️', '🔒', '🔑', '📦', '📚']

export default function Sidebar({ onOpenSettings, onNewThread, onOpenSkills, onOpenFiles }: SidebarProps) {
  const {
    workspaces, activeWorkspaceId, threads, activeThreadId,
    setActiveWorkspace, removeWorkspace, updateWorkspace, relinkWorkspace, loadWorkspaces,
    addWorkspace, setActiveThread, deleteThread, updateThread
  } = useWorkspaceStore()
  const { load: loadSettings, loaded: settingsLoaded } = useSettingsStore()
  const { load: loadSkills, loaded: skillsLoaded } = useSkillsStore()
  const { resolvedTheme, toggleTheme } = useThemeStore()
  const [activeNav, setActiveNav] = useState('Chats')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null)
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set())
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [editThreadValue, setEditThreadValue] = useState('')

  useEffect(() => {
    if (!settingsLoaded) loadSettings()
    if (!skillsLoaded) loadSkills()
  }, [settingsLoaded, loadSettings, skillsLoaded, loadSkills])

  // Auto-expand active workspace
  useEffect(() => {
    if (activeWorkspaceId) {
      setExpandedWorkspaces(s => new Set([...s, activeWorkspaceId]))
    }
  }, [activeWorkspaceId])

  function handleNavClick(label: string) {
    if (label === 'Skills') {
      onOpenSkills()
      return
    }
    if (label === 'Files') {
      onOpenFiles()
      return
    }
    setActiveNav(label)
  }

  function toggleWorkspaceExpand(id: string) {
    setExpandedWorkspaces(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleThreadRename(id: string) {
    const t = threads.find(th => th.id === id)
    if (t) { setEditingThreadId(id); setEditThreadValue(t.title) }
  }

  function handleThreadRenameSubmit(id: string) {
    if (editThreadValue.trim()) updateThread(id, { title: editThreadValue.trim() })
    setEditingThreadId(null)
    setEditThreadValue('')
  }

  function handleThreadDelete(id: string) {
    if (confirm('Delete this conversation?')) deleteThread(id)
  }

  async function handleOpenFolder() {
    if (window.api?.workspace?.add) {
      try {
        const ws = await window.api.workspace.add()
        if (ws) setActiveWorkspace(ws.id)
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

  function handleRename(id: string) {
    const ws = workspaces.find(w => w.id === id)
    if (ws) {
      setEditingId(id)
      setEditValue(ws.name)
    }
  }

  function handleSubmitRename(id: string) {
    if (editValue.trim()) updateWorkspace(id, { name: editValue.trim() })
    setEditingId(null)
    setEditValue('')
  }

  function handleRemoveWorkspace(id: string) {
    if (confirm('Remove this workspace?')) removeWorkspace(id)
  }

  function handleSetDefaultWorkspace(id: string) {
    const { update } = useSettingsStore.getState()
    update({ activeWorkspaceId: id })
  }

  function handleCopyPath(path: string) {
    navigator.clipboard.writeText(path).catch(console.error)
  }

  function handleChangeIcon(id: string, icon: string) {
    updateWorkspace(id, { name: icon + ' ' + (workspaces.find(w => w.id === id)?.name || '') })
    setShowIconPicker(null)
  }

  return (
    <aside
      className="flex flex-col shrink-0 h-screen bg-[var(--bg-sidebar)]"
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

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-2 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Workspaces</span>
            <button
              onClick={handleOpenFolder}
              className="no-drag p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
              title="Open folder"
            >
              <FolderOpen size={14} />
            </button>
          </div>

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
              const isActive = activeWorkspaceId === ws.id
              const isExpanded = expandedWorkspaces.has(ws.id)
              const wsThreads = threads.filter(t => t.workspaceId === ws.id)
              return (
                <div key={ws.id}>
                  <ContextMenu.Root>
                    <ContextMenu.Trigger asChild>
                      <div
                        className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors cursor-pointer ${
                          isActive ? 'bg-[var(--bg-content)]/60 border border-[var(--border)]' : 'hover:bg-[var(--border)] border border-transparent'
                        }`}
                        onClick={() => {
                          setActiveWorkspace(ws.id)
                          toggleWorkspaceExpand(ws.id)
                        }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleWorkspaceExpand(ws.id) }}
                          className="shrink-0 p-0.5 rounded hover:bg-[var(--border)] transition-colors"
                        >
                          <ChevronRight
                            size={12}
                            className={`text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </button>
                        <Folder size={14} className="text-[var(--text-muted)] shrink-0" />
                        {editingId === ws.id ? (
                          <input
                            autoFocus
                            className="flex-1 min-w-0 text-sm bg-transparent outline-none text-[var(--text-primary)] border-b border-[var(--accent)]"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSubmitRename(ws.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSubmitRename(ws.id)
                              if (e.key === 'Escape') { setEditingId(null); setEditValue('') }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className={`flex-1 min-w-0 text-sm truncate ${isActive ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                            {ws.name || ws.folderPath.split('/').pop() || 'Untitled'}
                          </span>
                        )}
                        {wsThreads.length > 0 && (
                          <span className="shrink-0 text-[10px] text-[var(--text-muted)] font-mono">{wsThreads.length}</span>
                        )}
                      </div>
                    </ContextMenu.Trigger>

                    <ContextMenu.Portal>
                      <ContextMenu.Content
                        className="z-50 min-w-[200px] rounded-lg overflow-hidden bg-[var(--bg-content)] border border-[var(--border)] shadow-xl py-1"
                      >
                        <ContextMenu.Item
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                          onSelect={() => onOpenFiles()}
                        >
                          <FolderOpen size={13} />
                          Browse Files
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
                          onSelect={() => handleRename(ws.id)}
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

                  {/* Thread list */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 pl-2 border-l border-[var(--border)] flex flex-col gap-0.5 py-1">
                          {wsThreads.length === 0 ? (
                            <p className="text-[11px] text-[var(--text-muted)] px-2 py-1">No conversations yet</p>
                          ) : (
                            wsThreads.map(t => {
                              const isActiveThread = activeThreadId === t.id
                              return (
                                <div key={t.id} className="group relative flex items-center">
                                  {editingThreadId === t.id ? (
                                    <input
                                      autoFocus
                                      className="flex-1 min-w-0 text-[12px] px-2 py-1.5 rounded bg-transparent outline-none text-[var(--text-primary)] border-b border-[var(--accent)]"
                                      value={editThreadValue}
                                      onChange={e => setEditThreadValue(e.target.value)}
                                      onBlur={() => handleThreadRenameSubmit(t.id)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleThreadRenameSubmit(t.id)
                                        if (e.key === 'Escape') { setEditingThreadId(null) }
                                      }}
                                      onClick={e => e.stopPropagation()}
                                    />
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setActiveWorkspace(ws.id)
                                        setActiveThread(t.id)
                                      }}
                                      className={`flex-1 min-w-0 text-left text-[12px] px-2 py-1.5 rounded-md transition-colors truncate flex items-center gap-1.5 ${
                                        isActiveThread
                                          ? 'bg-[var(--accent)]/10 text-[var(--text-primary)] font-medium'
                                          : 'text-[var(--text-secondary)] hover:bg-[var(--border)]'
                                      }`}
                                    >
                                      <MessageSquare size={11} className="shrink-0 text-[var(--text-muted)]" />
                                      <span className="truncate">{t.title}</span>
                                    </button>
                                  )}
                                  {/* Thread actions on hover */}
                                  <DropdownMenu.Root>
                                    <DropdownMenu.Trigger asChild>
                                      <button
                                        onClick={e => e.stopPropagation()}
                                        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                                      >
                                        <MoreHorizontal size={12} />
                                      </button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Portal>
                                      <DropdownMenu.Content
                                        className="z-50 min-w-[160px] rounded-lg overflow-hidden bg-[var(--bg-content)] border border-[var(--border)] shadow-xl py-1"
                                        side="right"
                                        align="start"
                                      >
                                        <DropdownMenu.Item
                                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none"
                                          onSelect={() => handleThreadRename(t.id)}
                                        >
                                          <Pencil size={12} />
                                          Rename
                                        </DropdownMenu.Item>
                                        <DropdownMenu.Item
                                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50/10 cursor-pointer outline-none"
                                          onSelect={() => handleThreadDelete(t.id)}
                                        >
                                          <Trash2 size={12} />
                                          Delete
                                        </DropdownMenu.Item>
                                      </DropdownMenu.Content>
                                    </DropdownMenu.Portal>
                                  </DropdownMenu.Root>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-sidebar)]/50">
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
            className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center"
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
