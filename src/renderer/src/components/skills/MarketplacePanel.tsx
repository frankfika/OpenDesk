/**
 * MarketplacePanel — discover and one-click install Skills from the
 * curated registry. Renders as a sub-tab inside the Skills section.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Store,
  Search,
  Download,
  Check,
  Loader2,
  BadgeCheck,
  Tag,
  RefreshCw,
  Sparkles,
  Trash2
} from 'lucide-react'

interface MarketplaceEntry {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  author: string
  githubPath: string
  skillSubpath: string
  stars?: number
  installs?: number
  version?: string
  verified?: boolean
}

interface InstalledRecord {
  id: string
  name: string
  version: string
  installedAt: number
  lastCheckedAt: number
  latestVersion?: string
  updateAvailable?: boolean
  path: string
}

type Tab = 'discover' | 'installed'

export default function MarketplacePanel(): JSX.Element {
  const [tab, setTab] = useState<Tab>('discover')
  const [entries, setEntries] = useState<MarketplaceEntry[]>([])
  const [installed, setInstalled] = useState<InstalledRecord[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const [list, inst] = await Promise.all([
        window.api.app.marketplace.list(),
        window.api.app.marketplace.installed()
      ])
      setEntries(list)
      setInstalled(inst)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function install(entry: MarketplaceEntry): Promise<void> {
    setInstalling(entry.id)
    try {
      const result = await window.api.app.marketplace.install(entry)
      if (result.ok) {
        if (result.record) setInstalled((s) => upsertInstalled(s, result.record!))
      } else {
        setError(result.error ?? 'install failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setInstalling(null)
    }
  }

  async function uninstall(id: string): Promise<void> {
    await window.api.app.marketplace.uninstall(id)
    setInstalled((s) => s.filter((x) => x.id !== id))
  }

  async function checkUpdates(): Promise<void> {
    setLoading(true)
    try {
      const updates = await window.api.app.marketplace.checkUpdates()
      const map = new Map(installed.map((x) => [x.id, x]))
      for (const u of updates) map.set(u.id, u)
      setInstalled(Array.from(map.values()))
    } finally {
      setLoading(false)
    }
  }

  const categories = Array.from(new Set(entries.map((e) => e.category)))
  const filtered = entries.filter((e) => {
    if (category && e.category !== category) return false
    const q = query.trim().toLowerCase()
    if (q && !(e.name + e.description + e.tags.join(' ')).toLowerCase().includes(q)) return false
    return true
  })

  const installedIds = new Set(installed.map((x) => x.id))
  const updatesAvailable = installed.filter((x) => x.updateAvailable).length

  return (
    <div className="flex flex-col h-full" data-component="marketplace-panel">
      <div className="shrink-0 px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Store size={12} />
            Skills Marketplace
          </span>
          <div className="flex items-center gap-1">
            {tab === 'installed' && (
              <button
                type="button"
                onClick={() => void checkUpdates()}
                disabled={loading}
                className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-content)] text-[var(--text-primary)]"
                title="检查更新"
                data-action="check-updates"
              >
                <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                检查更新{updatesAvailable > 0 && (
                  <span className="ml-1 px-1 rounded-full bg-[var(--accent)] text-white text-[9px]">
                    {updatesAvailable}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-content)] text-[var(--text-primary)]"
              title="刷新列表"
            >
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 mt-2">
          <button
            type="button"
            onClick={() => setTab('discover')}
            data-tab="discover"
            className={`px-2.5 py-1 text-[11px] rounded ${
              tab === 'discover'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-content)] text-[var(--text-secondary)] border border-[var(--border)]'
            }`}
          >
            发现
            <span className="ml-1 text-[9px] opacity-70">({entries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('installed')}
            data-tab="installed"
            className={`px-2.5 py-1 text-[11px] rounded ${
              tab === 'installed'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-content)] text-[var(--text-secondary)] border border-[var(--border)]'
            }`}
          >
            已装
            <span className="ml-1 text-[9px] opacity-70">({installed.length})</span>
          </button>
        </div>

        {tab === 'discover' && (
          <>
            <div className="relative mt-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索技能..."
                className="no-drag w-full pl-7 pr-2 py-1.5 text-[12px] rounded-md bg-[var(--bg-content)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-strong)]"
              />
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              <button
                type="button"
                onClick={() => setCategory(null)}
                className={`px-2 py-0.5 text-[10px] rounded ${
                  category === null
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-content)] text-[var(--text-secondary)] border border-[var(--border)]'
                }`}
              >
                全部
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-2 py-0.5 text-[10px] rounded ${
                    category === c
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-content)] text-[var(--text-secondary)] border border-[var(--border)]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </>
        )}
        {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {tab === 'discover' ? (
          loading && entries.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[11px] text-[var(--text-muted)] px-2 py-6 text-center">没有匹配的技能</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((e) => (
                <MarketplaceCard
                  key={e.id}
                  entry={e}
                  installing={installing === e.id}
                  installed={installedIds.has(e.id)}
                  onInstall={() => void install(e)}
                />
              ))}
            </div>
          )
        ) : installed.length === 0 ? (
          <p className="text-[11px] text-[var(--text-muted)] px-2 py-6 text-center">还没有从 Marketplace 安装任何 Skill</p>
        ) : (
          <div className="flex flex-col gap-2">
            {installed.map((rec) => {
              const entry = entries.find((e) => e.id === rec.id)
              return (
                <InstalledCard
                  key={rec.id}
                  record={rec}
                  reinstalling={installing === rec.id}
                  reinstallEntry={entry ?? null}
                  onReinstall={() => entry && void install(entry)}
                  onUninstall={() => void uninstall(rec.id)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function upsertInstalled(list: InstalledRecord[], rec: InstalledRecord): InstalledRecord[] {
  const idx = list.findIndex((x) => x.id === rec.id)
  if (idx === -1) return [...list, rec]
  const next = [...list]
  next[idx] = rec
  return next
}

function InstalledCard({
  record,
  reinstalling,
  reinstallEntry,
  onReinstall,
  onUninstall
}: {
  record: InstalledRecord
  reinstalling: boolean
  reinstallEntry: MarketplaceEntry | null
  onReinstall: () => void
  onUninstall: () => void
}): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[var(--border)] rounded-md p-3 bg-[var(--bg-content)]"
      data-installed-id={record.id}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{record.name}</span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">v{record.version}</span>
            {record.updateAvailable && record.latestVersion && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded bg-[var(--accent)]/15 text-[var(--accent)]">
                <Sparkles size={8} />
                更新 → v{record.latestVersion}
              </span>
            )}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1">
            安装于 {new Date(record.installedAt).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {reinstallEntry && (
            <button
              type="button"
              onClick={onReinstall}
              disabled={reinstalling}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-sidebar)] text-[var(--text-primary)] disabled:opacity-60"
              title={record.updateAvailable ? `升级到 v${record.latestVersion}` : '重新安装'}
              data-action="reinstall"
            >
              {reinstalling ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
              {record.updateAvailable ? '升级' : '重装'}
            </button>
          )}
          <button
            type="button"
            onClick={onUninstall}
            className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-[var(--border)] hover:border-red-500 hover:text-red-500 hover:bg-red-500/10 text-[var(--text-muted)]"
            title="从 lock 移除（不会删除磁盘上的文件）"
            data-action="uninstall"
          >
            <Trash2 size={10} />
            移除
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function MarketplaceCard({
  entry,
  installing,
  installed,
  onInstall
}: {
  entry: MarketplaceEntry
  installing: boolean
  installed: boolean
  onInstall: () => void
}): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[var(--border)] rounded-md p-3 bg-[var(--bg-content)] hover:border-[var(--border-strong)] transition-colors"
      data-skill-id={entry.id}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">{entry.name}</span>
            {entry.verified && (
              <BadgeCheck size={12} className="text-[var(--accent)]" aria-label="Verified" />
            )}
            {entry.version && (
              <span className="text-[10px] text-[var(--text-muted)] font-mono">v{entry.version}</span>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{entry.description}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] rounded bg-[var(--bg-sidebar)] text-[var(--text-muted)]">
              <Tag size={8} />
              {entry.category}
            </span>
            {entry.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[9px] text-[var(--text-muted)]">#{t}</span>
            ))}
            {entry.stars != null && (
              <span className="text-[9px] text-[var(--text-muted)]">★ {entry.stars}</span>
            )}
            {entry.installs != null && (
              <span className="text-[9px] text-[var(--text-muted)]">↓ {entry.installs}</span>
            )}
          </div>
          <div className="text-[9px] text-[var(--text-muted)] mt-1 font-mono truncate">
            github:{entry.githubPath}/{entry.skillSubpath}
          </div>
        </div>
        <button
          type="button"
          onClick={onInstall}
          disabled={installing || installed}
          className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded transition-colors ${
            installed
              ? 'bg-green-500/10 text-green-500 border border-green-500/30'
              : 'bg-[var(--accent)] text-white hover:opacity-90'
          } disabled:opacity-70`}
          data-action="install"
        >
          {installed ? (
            <>
              <Check size={11} />
              已装
            </>
          ) : installing ? (
            <>
              <Loader2 size={11} className="animate-spin" />
              安装中
            </>
          ) : (
            <>
              <Download size={11} />
              安装
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}