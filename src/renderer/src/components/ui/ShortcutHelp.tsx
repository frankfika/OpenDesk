import { useState, useEffect, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Command, Keyboard } from 'lucide-react'

interface ShortcutCategory {
  name: string
  shortcuts: { keys: string; description: string }[]
}

const SHORTCUTS: ShortcutCategory[] = [
  {
    name: 'General',
    shortcuts: [
      { keys: '⌘K / ⌘⇧F', description: 'Open global search' },
      { keys: '⌘⇧P', description: 'Open command palette' },
      { keys: '⌘,', description: 'Open settings' },
      { keys: '⌘/', description: 'Show keyboard shortcuts' },
      { keys: '⌘N', description: 'New chat' },
      { keys: 'Esc', description: 'Close modal / stop streaming' },
    ]
  },
  {
    name: 'Chat',
    shortcuts: [
      { keys: '⌘↵', description: 'Send message' },
      { keys: '⇧↵', description: 'New line' },
      { keys: '/', description: 'Trigger skill selector' },
      { keys: '@', description: 'Mention file or workspace' },
      { keys: '#', description: 'Reference thread' },
      { keys: '↑', description: 'Edit last message (when input empty)' },
    ]
  },
  {
    name: 'Navigation',
    shortcuts: [
      { keys: '⌘1-9', description: 'Switch workspace' },
      { keys: '⌘[ / ⌘]', description: 'Previous / next thread' },
      { keys: '⌘⇧↑ / ⌘⇧↓', description: 'Focus previous / next message' },
    ]
  },
  {
    name: 'Workspace & Thread',
    shortcuts: [
      { keys: '⌘⇧N', description: 'New workspace' },
      { keys: '⌘⇧D', description: 'Duplicate thread' },
      { keys: '⌘⇧E', description: 'Export thread' },
      { keys: '⌘⇧A', description: 'Archive thread' },
      { keys: '⌘⇧Delete', description: 'Delete thread' },
    ]
  },
  {
    name: 'Settings',
    shortcuts: [
      { keys: '⌘⇧T', description: 'Toggle theme' },
      { keys: '⌘⇧M', description: 'Switch model' },
      { keys: '⌘⇧.', description: 'Toggle sidebar' },
    ]
  }
]

interface ShortcutHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ShortcutHelp({ open, onOpenChange }: ShortcutHelpProps) {
  const [search, setSearch] = useState('')

  const filtered = SHORTCUTS.map(cat => ({
    ...cat,
    shortcuts: cat.shortcuts.filter(s =>
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.keys.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.shortcuts.length > 0)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === '/' || (e.shiftKey && e.key === '?'))) {
      e.preventDefault()
      onOpenChange(!open)
    }
  }, [open, onOpenChange])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2"
          >
            <div className="rounded-2xl bg-[var(--bg-content)]/95 backdrop-blur-2xl border border-[var(--border)] shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
                <Keyboard size={18} className="text-[var(--text-muted)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</h2>
                <div className="flex-1" />
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-1 rounded-md hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="px-5 py-3 border-b border-[var(--border)]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search shortcuts..."
                  className="w-full bg-[var(--bg-sidebar)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border)] focus:border-[var(--text-muted)] transition-colors"
                />
              </div>

              <div className="max-h-[60vh] overflow-y-auto py-2">
                {filtered.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[13px] text-[var(--text-muted)]">
                    No shortcuts found
                  </div>
                ) : (
                  filtered.map((cat) => (
                    <div key={cat.name} className="mb-4">
                      <div className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {cat.name}
                      </div>
                      <div className="px-3">
                        {cat.shortcuts.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--bg-sidebar)] transition-colors"
                          >
                            <span className="text-[13px] text-[var(--text-secondary)]">{s.description}</span>
                            <kbd className="inline-flex items-center gap-0.5 text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-sidebar)] border border-[var(--border)] rounded-md px-2 py-1">
                              {s.keys}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-sidebar)]/30 text-[10px] text-[var(--text-muted)] text-center">
                Press <kbd className="font-mono bg-[var(--bg-sidebar)] border border-[var(--border)] rounded px-1">⌘/</kbd> or <kbd className="font-mono bg-[var(--bg-sidebar)] border border-[var(--border)] rounded px-1">⌘⇧?</kbd> to toggle this dialog
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
