import { useState } from 'react'
import { useWorkspaceStore } from '../../store/workspace'
import { MessageSquare, Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'

interface MiddleColumnProps {
  onNewThread: () => void
}

export default function MiddleColumn({ onNewThread }: MiddleColumnProps) {
  const {
    activeWorkspaceId,
    activeThreadId,
    threads,
    threadsByWorkspace,
    setActiveWorkspace,
    setActiveThread,
    deleteThread,
    updateThread
  } = useWorkspaceStore()

  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [editThreadValue, setEditThreadValue] = useState('')

  const wsThreads = activeWorkspaceId ? threadsByWorkspace(activeWorkspaceId) : []

  function handleThreadRename(id: string) {
    const t = threads.find((th) => th.id === id)
    if (t) {
      setEditingThreadId(id)
      setEditThreadValue(t.title)
    }
  }

  function handleThreadRenameSubmit(id: string) {
    if (editThreadValue.trim()) updateThread(id, { title: editThreadValue.trim() })
    setEditingThreadId(null)
    setEditThreadValue('')
  }

  function handleThreadDelete(id: string) {
    if (confirm('Delete this conversation?')) deleteThread(id)
  }

  return (
    <aside
      aria-label="Threads"
      className="flex flex-col shrink-0 h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border)] backdrop-blur-2xl"
      style={{ width: 240 }}
    >
      <div
        className="drag-region shrink-0"
        style={{ height: 'var(--titlebar-height)' }}
      />

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onNewThread}
          className="no-drag w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 bg-[var(--bg-content)] text-[var(--text-primary)] border border-[var(--border)] shadow-sm hover:shadow-md hover:border-[var(--border-strong)]"
        >
          <Plus size={16} />
          New chat
          <span className="ml-auto text-[10px] text-[var(--text-muted)] font-medium px-1.5 py-0.5 rounded-md bg-[var(--bg-sidebar)] border border-[var(--border)]">
            ⌘N
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {!activeWorkspaceId ? (
          <p className="px-2 py-4 text-[12px] text-[var(--text-muted)] text-center">
            Select a workspace to see conversations
          </p>
        ) : wsThreads.length === 0 ? (
          <p className="px-2 py-4 text-[12px] text-[var(--text-muted)] text-center">No conversations yet</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            <AnimatePresence initial={false}>
              {wsThreads.map((t) => {
                const isActiveThread = activeThreadId === t.id
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="group relative flex items-center"
                  >
                    {editingThreadId === t.id ? (
                      <input
                        autoFocus
                        className="flex-1 min-w-0 text-[12px] px-2 py-1.5 rounded bg-transparent outline-none text-[var(--text-primary)] border-b border-[var(--accent)]"
                        value={editThreadValue}
                        onChange={(e) => setEditThreadValue(e.target.value)}
                        onBlur={() => handleThreadRenameSubmit(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleThreadRenameSubmit(t.id)
                          if (e.key === 'Escape') setEditingThreadId(null)
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (activeWorkspaceId) setActiveWorkspace(activeWorkspaceId)
                          setActiveThread(t.id)
                        }}
                        className={`flex-1 min-w-0 text-left text-[13px] px-2.5 py-2 rounded-lg transition-all truncate flex items-center gap-2.5 ${
                          isActiveThread
                            ? 'bg-[var(--bg-content)] text-[var(--text-primary)] font-medium shadow-sm border border-[var(--border)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--border)] border border-transparent'
                        }`}
                      >
                        <MessageSquare size={11} className="shrink-0 text-[var(--text-muted)]" />
                        <span className="truncate">{t.title}</span>
                      </button>
                    )}
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="no-drag opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                          aria-label="Thread actions"
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
                            aria-label="Rename thread"
                          >
                            <Pencil size={12} />
                            Rename
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--error)] hover:bg-[var(--error-bg)]/10 cursor-pointer outline-none"
                            onSelect={() => handleThreadDelete(t.id)}
                            aria-label="Delete thread"
                          >
                            <Trash2 size={12} />
                            Delete
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </aside>
  )
}
