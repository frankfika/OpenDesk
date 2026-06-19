import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Folder,
  MessageSquare,
  FileText,
  Zap,
  ArrowUp,
  ArrowDown,
  Sun,
  Settings,
  Plus,
  Copy,
  CornerDownLeft,
  Command
} from 'lucide-react'
import { useWorkspaceStore } from '../../store/workspace'
import { useChatStore } from '../../store/chat'
import { useSkillsStore } from '../../store/skills'
import { useThemeStore } from '../../store/theme'
import type { Workspace, Thread, Message, Skill } from '@shared/types'

interface SearchResult {
  id: string
  type: 'workspace' | 'thread' | 'message' | 'skill' | 'action'
  title: string
  subtitle: string
  icon: React.ReactNode
  score: number
  matchRanges: [number, number][]
  onSelect: () => void
}

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function highlightText(text: string, ranges: [number, number][]) {
  if (ranges.length === 0) return <span>{text}</span>
  const parts: React.ReactNode[] = []
  let lastEnd = 0
  ranges.forEach(([start, end], i) => {
    if (start > lastEnd) {
      parts.push(<span key={`pre-${i}`}>{text.slice(lastEnd, start)}</span>)
    }
    parts.push(
      <mark key={`mark-${i}`} className="bg-yellow-400/30 text-[var(--text-primary)] rounded px-0.5">
        {text.slice(start, end)}
      </mark>
    )
    lastEnd = end
  })
  if (lastEnd < text.length) {
    parts.push(<span key="post">{text.slice(lastEnd)}</span>)
  }
  return <span>{parts}</span>
}

function findMatches(text: string, query: string): [number, number][] {
  const ranges: [number, number][] = []
  if (!query) return ranges
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  let idx = 0
  while ((idx = lowerText.indexOf(lowerQuery, idx)) !== -1) {
    ranges.push([idx, idx + query.length])
    idx += query.length
  }
  return ranges
}

import { useDebounce } from '../../lib/utils'

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 150)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { workspaces, threads, activeWorkspaceId, setActiveWorkspace, setActiveThread, createThread } =
    useWorkspaceStore()
  const messages = useChatStore((state) => state.messages)
  const { skills } = useSkillsStore()
  const { toggleTheme } = useThemeStore()

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return []

    const allResults: SearchResult[] = []

    // Workspaces
    workspaces.forEach((ws: Workspace) => {
      const nameMatch = findMatches(ws.name || '', query)
      const pathMatch = findMatches(ws.folderPath, query)
      if (nameMatch.length || pathMatch.length) {
        allResults.push({
          id: `ws-${ws.id}`,
          type: 'workspace',
          title: ws.name || ws.folderPath.split('/').pop() || 'Untitled',
          subtitle: ws.folderPath,
          icon: <Folder size={16} className="text-blue-500" />,
          score: nameMatch.length ? 100 : 50,
          matchRanges: nameMatch.length ? nameMatch : pathMatch,
          onSelect: () => {
            setActiveWorkspace(ws.id)
            onOpenChange(false)
          }
        })
      }
    })

    // Threads
    threads.forEach((t: Thread) => {
      const matches = findMatches(t.title, query)
      if (matches.length) {
        const ws = workspaces.find((w: Workspace) => w.id === t.workspaceId)
        allResults.push({
          id: `thread-${t.id}`,
          type: 'thread',
          title: t.title,
          subtitle: ws ? `in ${ws.name || ws.folderPath.split('/').pop()}` : '',
          icon: <MessageSquare size={16} className="text-emerald-500" />,
          score: 80,
          matchRanges: matches,
          onSelect: () => {
            setActiveWorkspace(t.workspaceId)
            setActiveThread(t.id)
            onOpenChange(false)
          }
        })
      }
    })

    // Messages (last 100)
    const recentMessages = messages.slice(-100)
    recentMessages.forEach((m: Message) => {
      if (m.content.length > 200) return
      const matches = findMatches(m.content, query)
      if (matches.length) {
        allResults.push({
          id: `msg-${m.id}`,
          type: 'message',
          title: m.content.slice(0, 60) + (m.content.length > 60 ? '…' : ''),
          subtitle: m.role === 'user' ? 'You' : 'Assistant',
          icon: <FileText size={16} className="text-amber-500" />,
          score: 40,
          matchRanges: matches,
          onSelect: () => {
            onOpenChange(false)
          }
        })
      }
    })

    // Skills
    skills.forEach((s: Skill) => {
      const nameMatch = findMatches(s.name, query)
      const descMatch = findMatches(s.description, query)
      const tagMatch = s.tags?.some((t: string) => t.toLowerCase().includes(q))
      if (nameMatch.length || descMatch.length || tagMatch) {
        allResults.push({
          id: `skill-${s.id}`,
          type: 'skill',
          title: s.name,
          subtitle: s.description.slice(0, 80),
          icon: <Zap size={16} className="text-violet-500" />,
          score: nameMatch.length ? 90 : 45,
          matchRanges: nameMatch.length ? nameMatch : descMatch,
          onSelect: () => {
            if (activeWorkspaceId) {
              createThread(activeWorkspaceId, `Using ${s.name}`, s.id)
            }
            onOpenChange(false)
          }
        })
      }
    })

    // Actions
    const actions: Omit<SearchResult, 'id' | 'score' | 'matchRanges'>[] = [
      {
        type: 'action',
        title: 'New Chat',
        subtitle: 'Start a new conversation',
        icon: <Plus size={16} />,
        onSelect: () => {
          onOpenChange(false)
        }
      },
      {
        type: 'action',
        title: 'Open Settings',
        subtitle: 'Configure providers and preferences',
        icon: <Settings size={16} />,
        onSelect: () => {
          onOpenChange(false)
        }
      },
      {
        type: 'action',
        title: 'Toggle Theme',
        subtitle: 'Switch between light and dark mode',
        icon: <Sun size={16} />,
        onSelect: () => {
          toggleTheme()
          onOpenChange(false)
        }
      },
      {
        type: 'action',
        title: 'Copy Last Response',
        subtitle: 'Copy the most recent AI message',
        icon: <Copy size={16} />,
        onSelect: () => {
          onOpenChange(false)
        }
      }
    ]
    actions.forEach((a, i) => {
      const matches = findMatches(a.title, query)
      if (matches.length || a.subtitle.toLowerCase().includes(q)) {
        allResults.push({
          id: `action-${i}`,
          ...a,
          score: 30,
          matchRanges: matches
        })
      }
    })

    return allResults.sort((a, b) => b.score - a.score)
  }, [
    debouncedQuery,
    query,
    workspaces,
    threads,
    messages,
    skills,
    activeWorkspaceId,
    setActiveWorkspace,
    setActiveThread,
    createThread,
    toggleTheme,
    onOpenChange
  ])

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {}
    results.forEach((r) => {
      const key = r.type
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    })
    return groups
  }, [results])

  const flatResults = useMemo(() => {
    const order = ['workspace', 'thread', 'message', 'skill', 'action']
    const flat: SearchResult[] = []
    order.forEach((type) => {
      if (grouped[type]) {
        flat.push(...grouped[type].slice(0, 5))
      }
    })
    return flat
  }, [grouped])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [open])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = flatResults[selectedIndex]
        if (item) {
          item.onSelect()
        }
      }
    },
    [flatResults, selectedIndex, onOpenChange]
  )

  useEffect(() => {
    if (!open) return
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex, open])

  const groupLabels: Record<string, string> = {
    workspace: 'Workspaces',
    thread: 'Threads',
    message: 'Messages',
    skill: 'Skills',
    action: 'Actions'
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => onOpenChange(false)}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed left-1/2 top-[15%] z-50 w-full max-w-2xl -translate-x-1/2"
            onKeyDown={handleKeyDown}
          >
            <Dialog.Title className="sr-only">Global Search</Dialog.Title>
            <div className="rounded-2xl bg-[var(--bg-content)]/95 border border-[var(--border)] shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
                <Search size={20} className="text-[var(--text-muted)] shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search workspaces, threads, messages..."
                  className="flex-1 bg-transparent outline-none text-[15px] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 rounded-md hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
                <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] bg-[var(--bg-sidebar)] px-2 py-1 rounded-md border border-[var(--border)]">
                  <Command size={10} />
                  <span>K</span>
                </div>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
                {query.trim() === '' ? (
                  <div className="px-5 py-8 text-center text-[13px] text-[var(--text-muted)]">
                    <Command size={24} className="mx-auto mb-2 opacity-40" />
                    Type to search across workspaces, threads, messages, and skills
                  </div>
                ) : flatResults.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[13px] text-[var(--text-muted)]">
                    No results found for "{query}"
                  </div>
                ) : (
                  <AnimatePresence>
                    {Object.entries(grouped).map(([type, items]) => {
                      const visible = items.slice(0, 5)
                      if (visible.length === 0) return null
                      return (
                        <div key={type} className="mb-2">
                          <div className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            {groupLabels[type]}
                            {items.length > 5 && (
                              <span className="ml-2 normal-case text-[11px] font-normal opacity-70">
                                Show all {items.length} results
                              </span>
                            )}
                          </div>
                          {visible.map((item, idx) => {
                            const globalIdx = flatResults.findIndex((r) => r.id === item.id)
                            const isSelected = globalIdx === selectedIndex
                            return (
                              <motion.button
                                key={item.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.02, duration: 0.15 }}
                                onClick={() => {
                                  item.onSelect()
                                }}
                                className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                                  isSelected ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--bg-sidebar)]'
                                }`}
                              >
                                <div className="shrink-0 w-8 h-8 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
                                  {item.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                                    {highlightText(item.title, item.matchRanges)}
                                  </div>
                                  <div className="text-[11px] text-[var(--text-muted)] truncate">{item.subtitle}</div>
                                </div>
                                {isSelected && (
                                  <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                                    <CornerDownLeft size={10} />
                                  </div>
                                )}
                              </motion.button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-[var(--border)] bg-[var(--bg-sidebar)]/30 text-[10px] text-[var(--text-muted)]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <ArrowUp size={10} /> <ArrowDown size={10} /> Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <CornerDownLeft size={10} /> Select
                  </span>
                </div>
                <span>{flatResults.length} results</span>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
