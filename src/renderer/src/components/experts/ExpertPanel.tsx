/**
 * ExpertPanel — a WorkBuddy-style vertical expert launcher.
 *
 * Lists all built-in Experts (vertical AI assistants). Clicking one dispatches
 * an `opendesk:select-expert` event with the Expert payload; consumers (the
 * chat input, the Web3 Workbench) react to it by seeding the system prompt +
 * suggested starter chips.
 *
 * Data is loaded once via `window.api.app.experts.list` and re-used.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Zap,
  BookOpen,
  GitPullRequest,
  TrendingUp,
  Search,
  type LucideIcon
} from 'lucide-react'

interface Expert {
  id: string
  name: string
  domain: string
  description: string
  icon: string
  color: string
  skillId: string
  systemPrompt: string
  starters: string[]
}

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Zap,
  BookOpen,
  GitPullRequest,
  TrendingUp,
  Search
}

export default function ExpertPanel(): JSX.Element {
  const [experts, setExperts] = useState<Expert[]>([])
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    void window.api.app.experts.list().then((list) => {
      setExperts(list)
      if (list.length > 0 && !activeId) setActiveId(list[0].id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = query.trim()
    ? experts.filter((e) =>
        (e.name + e.domain + e.description).toLowerCase().includes(query.toLowerCase())
      )
    : experts

  const active = experts.find((e) => e.id === activeId) ?? null

  function dispatchSelect(e: Expert, starter?: string): void {
    window.dispatchEvent(
      new CustomEvent('opendesk:select-expert', {
        detail: { expert: e, starter }
      })
    )
  }

  return (
    <div className="flex flex-col h-full" data-component="expert-panel">
      <div className="shrink-0 px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-primary)]">Experts</span>
          <span className="text-[10px] text-[var(--text-muted)]">{experts.length} 个</span>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索专家..."
          className="no-drag w-full mt-2 px-2.5 py-1.5 text-[12px] rounded-md bg-[var(--bg-content)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)]"
        />
      </div>

      <div className="shrink-0 overflow-y-auto px-2 py-2 flex flex-col gap-1 max-h-[40%]">
        {filtered.length === 0 ? (
          <p className="text-[11px] text-[var(--text-muted)] px-2 py-3 text-center">没有匹配的专家</p>
        ) : (
          filtered.map((e) => {
            const Icon = ICON_MAP[e.icon] ?? Sparkles
            const selected = activeId === e.id
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setActiveId(e.id)}
                data-expert-id={e.id}
                className={`flex items-start gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                  selected
                    ? 'bg-[var(--bg-content)] border border-[var(--border-strong)]'
                    : 'hover:bg-[var(--bg-content)] border border-transparent'
                }`}
              >
                <div
                  className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-white"
                  style={{ background: e.color }}
                >
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">{e.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">{e.domain}</div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {active && (
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 overflow-y-auto px-3 py-3 border-t border-[var(--border)]"
          data-active-expert={active.id}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white"
              style={{ background: active.color }}
            >
              {(() => {
                const Icon = ICON_MAP[active.icon] ?? Sparkles
                return <Icon size={18} />
              })()}
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{active.name}</div>
              <div className="text-[10px] text-[var(--text-muted)]">{active.domain}</div>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-[var(--text-secondary)] leading-relaxed">{active.description}</p>
          <div className="mt-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              试试这些问题
            </div>
            <div className="flex flex-col gap-1">
              {active.starters.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => dispatchSelect(active, s)}
                  className="text-left text-[12px] px-2.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-content)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-sidebar)] transition-colors"
                  data-starter-idx={i}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatchSelect(active)}
            className="mt-3 w-full px-3 py-1.5 rounded-md text-[12px] font-medium text-white"
            style={{ background: active.color }}
          >
            启用 {active.name}
          </button>
        </motion.div>
      )}
    </div>
  )
}