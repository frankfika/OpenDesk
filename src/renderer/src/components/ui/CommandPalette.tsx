import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import {
  MessageSquare,
  Folder,
  Settings,
  Sun,
  Moon,
  Search,
  Plus,
  ArrowUpRight,
  FileText,
  Plug,
  Wrench
} from 'lucide-react'
import { useChatStore } from '../../store/chat'
import { useWorkspaceStore } from '../../store/workspace'
import { useSettingsStore } from '../../store/settings'
import { useThemeStore } from '../../store/theme'
import { cn } from '../../lib/utils'

interface CommandItem {
  id: string
  group: string
  icon: React.ElementType
  label: string
  shortcut?: string
  action: () => void
}

interface CommandPaletteProps {
  onOpenSettings?: () => void
  onOpenSkills?: () => void
}

export default function CommandPalette({ onOpenSettings }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const newThread = useChatStore((state) => state.newThread)
  const messages = useChatStore((state) => state.messages)
  const { workspaces, activeWorkspaceId, setActiveWorkspace, threads, setActiveThread, createThread } =
    useWorkspaceStore()
  const _settings = useSettingsStore((state) => state.settings)
  const { theme, toggleTheme } = useThemeStore()

  const commands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = []

    // Recent
    const lastThread = threads[0]
    if (lastThread) {
      list.push({
        id: 'recent-continue',
        group: 'Recent',
        icon: MessageSquare,
        label: 'Continue last conversation',
        shortcut: '↵',
        action: () => setActiveThread(lastThread.id)
      })
    }
    const lastWorkspace = workspaces[0]
    if (lastWorkspace) {
      list.push({
        id: 'recent-ws',
        group: 'Recent',
        icon: Folder,
        label: `Open last workspace: ${lastWorkspace.name || lastWorkspace.folderPath.split('/').pop()}`,
        action: () => setActiveWorkspace(lastWorkspace.id)
      })
    }

    // Workspaces
    workspaces.forEach((ws) => {
      list.push({
        id: `ws-${ws.id}`,
        group: 'Workspaces',
        icon: Folder,
        label: `Switch to ${ws.name || ws.folderPath.split('/').pop()}`,
        action: () => setActiveWorkspace(ws.id)
      })
    })
    list.push({
      id: 'ws-new',
      group: 'Workspaces',
      icon: Plus,
      label: 'Open new folder...',
      action: () => {
        // Triggered via workspace store
        const path = prompt('Enter folder path:')
        if (path) {
          useWorkspaceStore.getState().addWorkspace(path)
        }
      }
    })

    // Threads
    list.push({
      id: 'thread-new',
      group: 'Threads',
      icon: MessageSquare,
      label: 'New chat in current workspace',
      shortcut: '⌘N',
      action: () => {
        const wsId = activeWorkspaceId
        if (wsId) {
          createThread(wsId)
        } else {
          newThread()
        }
      }
    })
    list.push({
      id: 'thread-search',
      group: 'Threads',
      icon: Search,
      label: 'Search conversations...',
      action: () => {
        // Focus search in sidebar
        setOpen(false)
      }
    })

    // Actions
    list.push({
      id: 'action-screenshot',
      group: 'Actions',
      icon: ArrowUpRight,
      label: 'Capture screenshot',
      action: () => {
        window.api?.desktop?.capture?.().catch(console.error)
        setOpen(false)
      }
    })
    list.push({
      id: 'action-diagnostics',
      group: 'Actions',
      icon: Wrench,
      label: 'Run diagnostics',
      action: () => {
        setOpen(false)
        window.api?.doctor?.run?.().catch(console.error)
      }
    })
    list.push({
      id: 'action-export',
      group: 'Actions',
      icon: FileText,
      label: 'Export current thread',
      action: () => {
        setOpen(false)
        const msgs = messages
        if (!msgs.length) return
        const markdown = msgs
          .map((m) => {
            const role = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Assistant' : m.role
            return `### ${role}\n\n${m.content}\n`
          })
          .join('\n---\n\n')
        const blob = new Blob([markdown], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `thread-export-${new Date().toISOString().slice(0, 10)}.md`
        a.click()
        URL.revokeObjectURL(url)
      }
    })

    // Settings
    list.push({
      id: 'settings-open',
      group: 'Settings',
      icon: Settings,
      label: 'Open Settings',
      shortcut: '⌘,',
      action: () => {
        setOpen(false)
        onOpenSettings?.()
      }
    })
    list.push({
      id: 'settings-theme',
      group: 'Settings',
      icon: theme === 'dark' ? Sun : Moon,
      label: 'Toggle theme',
      action: () => {
        toggleTheme()
        setOpen(false)
      }
    })
    list.push({
      id: 'settings-provider',
      group: 'Settings',
      icon: Plug,
      label: 'Add provider...',
      action: () => {
        setOpen(false)
        onOpenSettings?.()
      }
    })

    return list
  }, [
    workspaces,
    threads,
    activeWorkspaceId,
    theme,
    onOpenSettings,
    newThread,
    setActiveWorkspace,
    setActiveThread,
    createThread,
    toggleTheme,
    messages
  ])

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q))
  }, [commands, query])

  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    filtered.forEach((c) => {
      if (!map.has(c.group)) map.set(c.group, [])
      map.get(c.group)!.push(c)
    })
    return Array.from(map.entries())
  }, [filtered])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey
      if (isCmd && (e.key === 'k' || (e.shiftKey && e.key === 'p'))) {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Navigation inside palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtered[selectedIndex]
        if (item) {
          item.action()
          setOpen(false)
          setQuery('')
        }
      }
    },
    [filtered, selectedIndex]
  )

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  let flatIndex = 0

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-[90] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            className="fixed z-[91] left-1/2 top-[20%] -translate-x-1/2 w-full max-w-[560px]"
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
          >
            <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
            <div className="bg-[var(--bg-content)]/95 border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]">
                <Search size={18} className="text-[var(--text-muted)] shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                />
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-sidebar)] border border-[var(--border)]">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="flex-1 overflow-y-auto py-2">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-[var(--text-muted)]">
                    No commands found for "{query}"
                  </div>
                ) : (
                  grouped.map(([group, items]) => (
                    <div key={group} className="mb-1">
                      <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {group}
                      </div>
                      {items.map((item) => {
                        const isSelected = flatIndex === selectedIndex
                        const Icon = item.icon
                        const idx = flatIndex++
                        return (
                          <button
                            type="button"
                            key={item.id}
                            data-index={idx}
                            onClick={() => {
                              item.action()
                              setOpen(false)
                              setQuery('')
                            }}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150',
                              isSelected
                                ? 'bg-[var(--accent)]/8 text-[var(--text-primary)]'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)]/60'
                            )}
                          >
                            <Icon
                              size={15}
                              className={cn(
                                'shrink-0',
                                isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                              )}
                            />
                            <span className="flex-1 text-[13px] font-medium truncate">{item.label}</span>
                            {item.shortcut && (
                              <kbd className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-sidebar)] border border-[var(--border)]">
                                {item.shortcut}
                              </kbd>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-[var(--border)] flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 rounded bg-[var(--bg-sidebar)] border border-[var(--border)]">↑↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 rounded bg-[var(--bg-sidebar)] border border-[var(--border)]">↵</kbd>
                  <span>Select</span>
                </span>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
