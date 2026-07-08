import { useState } from 'react'
import { useWorkspaceStore } from '../../store/workspace'
import {
  Folder,
  FolderOpen,
  Pencil,
  CheckCircle2,
  Trash2
} from 'lucide-react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import FileTree from '../files/FileTree'

const EMOJI_ICONS = [
  '📁',
  '💼',
  '📂',
  '🗂️',
  '📊',
  '📈',
  '📉',
  '💻',
  '🔧',
  '🎨',
  '📝',
  '🔬',
  '🚀',
  '🏠',
  '🌐',
  '⚙️',
  '🔒',
  '🔑',
  '📦',
  '📚'
]

export default function LeftColumn() {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    removeWorkspace,
    updateWorkspace,
    relinkWorkspace,
    addWorkspace
  } = useWorkspaceStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null)

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
    const ws = workspaces.find((w) => w.id === id)
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

  function handleCopyPath(path: string) {
    navigator.clipboard.writeText(path).catch(console.error)
  }

  function handleChangeIcon(id: string, icon: string) {
    updateWorkspace(id, { icon })
    setShowIconPicker(null)
  }

  async function handleRelink(id: string) {
    if (!window.api?.workspace?.relink) return
    try {
      const result = await window.api.workspace.relink(id)
      if (result) relinkWorkspace(id, result.folderPath)
    } catch (e) {
      console.error('Failed to relink workspace:', e)
    }
  }

  return (
    <aside
      aria-label="Workspace and files"
      className="flex flex-col shrink-0 h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border)] backdrop-blur-2xl"
      style={{ width: 240 }}
    >
      {/* Title bar drag region */}
      <div
        className="drag-region shrink-0 flex items-center px-4"
        style={{ height: 'var(--titlebar-height)' }}
      >
        <div className="no-drag flex items-center gap-2 mt-1" style={{ marginLeft: 72 }}>
          <div
            className="flex items-center justify-center rounded-md overflow-hidden shrink-0"
            style={{
              width: 22,
              height: 22,
              background:
                'linear-gradient(135deg, rgba(29,140,128,0.18) 0%, rgba(29,140,128,0.06) 100%)',
              border: '1px solid rgba(29,140,128,0.35)'
            }}
            aria-hidden="true"
          >
            <img
              src="../../../resources/logo-1024.png"
              alt=""
              width={16}
              height={16}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <span className="text-[13px] font-bold tracking-tight text-[var(--text-primary)]">OpenDesk</span>
        </div>
      </div>

      {/* Workspace list header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Workspaces
        </span>
        <button
          type="button"
          onClick={handleOpenFolder}
          className="no-drag p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
          title="Open folder"
          aria-label="Open folder"
        >
          <FolderOpen size={14} />
        </button>
      </div>

      {/* Workspace list */}
      <div className="shrink-0 max-h-[40%] overflow-y-auto px-2 pb-2">
        {workspaces.length === 0 ? (
          <button
            type="button"
            onClick={handleOpenFolder}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors border border-dashed border-[var(--border)]"
          >
            <FolderOpen size={14} />
            Open a folder
          </button>
        ) : (
          <div className="flex flex-col gap-0.5">
            {workspaces.map((ws) => {
              const isActive = activeWorkspaceId === ws.id
              return (
                <ContextMenu.Root key={ws.id}>
                  <ContextMenu.Trigger asChild>
                    <div
                      className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[var(--bg-content)]/60 border border-[var(--border)]'
                          : 'hover:bg-[var(--border)] border border-transparent'
                      }`}
                      onClick={() => setActiveWorkspace(ws.id)}
                    >
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
                            if (e.key === 'Escape') {
                              setEditingId(null)
                              setEditValue('')
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className={`flex-1 min-w-0 text-sm truncate ${
                            isActive ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {ws.icon ? <span className="mr-1.5">{ws.icon}</span> : null}
                          {ws.name || ws.folderPath.split('/').pop() || 'Untitled'}
                        </span>
                      )}
                      {isActive && <CheckCircle2 size={12} className="text-[var(--accent)] shrink-0" />}
                    </div>
                  </ContextMenu.Trigger>
                  <ContextMenu.Portal>
                    <ContextMenu.Content
                      className="z-50 min-w-[160px] rounded-lg overflow-hidden bg-[var(--bg-content)] border border-[var(--border)] shadow-xl py-1"
                    >
                      <ContextMenu.Group>
                        <ContextMenu.Item
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none"
                          onSelect={() => handleRename(ws.id)}
                        >
                          <Pencil size={12} />
                          Rename
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none"
                          onSelect={() => setShowIconPicker(ws.id)}
                        >
                          <span className="text-xs">😊</span>
                          Change icon
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none"
                          onSelect={() => handleCopyPath(ws.folderPath)}
                        >
                          <span className="text-xs">📋</span>
                          Copy path
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none"
                          onSelect={() => handleRelink(ws.id)}
                        >
                          <span className="text-xs">🔗</span>
                          Relink folder
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--error)] hover:bg-[var(--error-bg)]/10 cursor-pointer outline-none"
                          onSelect={() => handleRemoveWorkspace(ws.id)}
                        >
                          <Trash2 size={12} />
                          Remove
                        </ContextMenu.Item>
                      </ContextMenu.Group>
                    </ContextMenu.Content>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              )
            })}
          </div>
        )}
      </div>

      <div className="h-px bg-[var(--border)] mx-3 my-1" />

      {/* File tree */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <FileTree />
      </div>

      {/* Icon picker modal */}
      {showIconPicker && (
        <div
          className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setShowIconPicker(null)}
        >
          <div
            className="bg-[var(--bg-content)] rounded-2xl border border-[var(--border)] shadow-2xl p-5 max-w-xs w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Choose Icon</h3>
            <div className="grid grid-cols-5 gap-2">
              {EMOJI_ICONS.map((icon) => (
                <button
                  type="button"
                  key={icon}
                  onClick={() => handleChangeIcon(showIconPicker!, icon)}
                  className="w-10 h-10 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors flex items-center justify-center text-lg"
                  aria-label={`Select icon ${icon}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
