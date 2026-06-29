/**
 * WorkflowPanel — Settings tab that surfaces all the v0.6.0 / v0.7.0
 * features in one place:
 *   - Scheduler (cron jobs)
 *   - Change Log (assistant's mutations)
 *   - Skills Marketplace
 *   - Claw (Telegram bot config)
 *
 * Each section can be expanded inline so the user can manage everything
 * without leaving Settings.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  History,
  Store,
  Send,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react'

interface ScheduledTask {
  id: string
  name: string
  cron: string
  enabled: boolean
  createdAt: number
  lastRunAt?: number
  lastRunStatus?: 'success' | 'error'
}

interface ChangeEntry {
  id: string
  threadId: string | null
  ts: number
  kind: 'file.write' | 'file.read' | 'file.delete' | 'shell' | 'web3.send' | 'skill' | 'ensemble'
  title: string
  detail: string | null
  status: 'pending' | 'success' | 'error'
  error: string | null
}

interface InstalledRecord {
  id: string
  name: string
  version: string
  installedAt: number
  updateAvailable?: boolean
  latestVersion?: string
}

interface ClawConfig {
  telegramToken?: string
  allowedChatIds?: number[]
  enabled?: boolean
  bindings?: Array<{ chatId: number; label?: string; threadId?: string }>
}

export default function WorkflowPanel(): JSX.Element {
  const [section, setSection] = useState<'scheduler' | 'changelog' | 'marketplace' | 'claw'>('scheduler')

  return (
    <div className="flex flex-col h-full" data-component="workflow-panel">
      <div className="shrink-0 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/30">
        <span className="text-sm font-semibold text-[var(--text-primary)]">Workflow</span>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          Scheduler · Change Log · Skills Marketplace · Claw 远程控制
        </p>
      </div>

      <div className="shrink-0 flex border-b border-[var(--border)] bg-[var(--bg-sidebar)]/20">
        <SubTab id="scheduler" icon={<Clock size={11} />} active={section} setActive={setSection}>
          定时任务
        </SubTab>
        <SubTab id="changelog" icon={<History size={11} />} active={section} setActive={setSection}>
          变更记录
        </SubTab>
        <SubTab id="marketplace" icon={<Store size={11} />} active={section} setActive={setSection}>
          技能市场
        </SubTab>
        <SubTab id="claw" icon={<Send size={11} />} active={section} setActive={setSection}>
          Claw
        </SubTab>
      </div>

      <div className="flex-1 overflow-y-auto">
        {section === 'scheduler' && <SchedulerSection />}
        {section === 'changelog' && <ChangelogSection />}
        {section === 'marketplace' && <MarketplaceSummarySection />}
        {section === 'claw' && <ClawSection />}
      </div>
    </div>
  )
}

function SubTab({
  id,
  icon,
  active,
  setActive,
  children
}: {
  id: 'scheduler' | 'changelog' | 'marketplace' | 'claw'
  icon: React.ReactNode
  active: string
  setActive: (s: typeof id) => void
  children: React.ReactNode
}): JSX.Element {
  const isActive = active === id
  return (
    <button
      type="button"
      onClick={() => setActive(id)}
      data-subtab={id}
      className={`flex items-center gap-1 px-3 py-2 text-[11px] transition-colors ${
        isActive
          ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function SchedulerSection(): JSX.Element {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh(): Promise<void> {
    setLoading(true)
    try {
      setTasks(await window.api.app.scheduler.list())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    return () => undefined
  }, [])

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">定时任务（{tasks.length}）</h3>
        <button
          type="button"
          onClick={() => void refresh()}
          className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-[var(--border)] hover:bg-[var(--bg-sidebar)]"
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>
      {tasks.length === 0 ? (
        <p className="text-[11px] text-[var(--text-muted)]">还没有定时任务。打开 **自动化** 面板创建。</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((t) => (
            <div key={t.id} className="border border-[var(--border)] rounded-md p-2.5 bg-[var(--bg-content)]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[var(--text-primary)]">{t.name}</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{t.cron}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)]">
                <span>{t.enabled ? '✓ 启用' : '⏸ 暂停'}</span>
                {t.lastRunAt && (
                  <span>· 上次运行: {new Date(t.lastRunAt).toLocaleString()}</span>
                )}
                {t.lastRunStatus && (
                  <span className={t.lastRunStatus === 'success' ? 'text-green-500' : 'text-red-500'}>
                    · {t.lastRunStatus === 'success' ? '成功' : '失败'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChangelogSection(): JSX.Element {
  const [entries, setEntries] = useState<ChangeEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh(): Promise<void> {
    setLoading(true)
    try {
      setEntries(await window.api.app.changelog.list({ limit: 100 }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    return () => undefined
  }, [])

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">变更记录（{entries.length}）</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void window.api.app.changelog.clear()
              setEntries([])
            }}
            className="px-2 py-1 text-[10px] rounded border border-[var(--border)] hover:border-red-500 hover:text-red-500"
          >
            清空
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-[var(--border)] hover:bg-[var(--bg-sidebar)]"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="text-[11px] text-[var(--text-muted)]">还没有任何变更。打开 **结果区** 面板查看实时记录。</p>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-[var(--bg-sidebar)]/40"
            >
              <span
                className={`shrink-0 mt-0.5 w-5 h-5 rounded-md flex items-center justify-center text-white ${
                  e.status === 'error' ? 'bg-red-500' : e.status === 'pending' ? 'bg-[var(--text-muted)]' : 'bg-[var(--accent)]'
                }`}
              >
                {e.status === 'success' ? <Check size={10} /> : e.status === 'error' ? <AlertCircle size={10} /> : <Loader2 size={10} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-[var(--text-primary)] truncate">{e.title}</div>
                <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-2">
                  <span>{e.kind}</span>
                  <span>{new Date(e.ts).toLocaleString()}</span>
                  {e.error && <span className="text-red-500 truncate">· {e.error}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function MarketplaceSummarySection(): JSX.Element {
  const [installed, setInstalled] = useState<InstalledRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void window.api.app.marketplace.installed().then(setInstalled).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--text-primary)]">已装 Marketplace 技能（{installed.length}）</h3>
        <button
          type="button"
          onClick={() => void window.api.app.marketplace.checkUpdates().then(setInstalled)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-[var(--border)] hover:bg-[var(--bg-sidebar)]"
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          检查更新
        </button>
      </div>
      {installed.length === 0 ? (
        <p className="text-[11px] text-[var(--text-muted)]">还没有 Marketplace 安装。打开 **专家** 面板发现新技能。</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {installed.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center justify-between px-2.5 py-1.5 rounded border border-[var(--border)] bg-[var(--bg-content)]"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">{rec.name}</div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  v{rec.version}
                  {rec.updateAvailable && rec.latestVersion && (
                    <span className="ml-2 text-[var(--accent)]">→ v{rec.latestVersion}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void window.api.app.marketplace.uninstall(rec.id).then(() => setInstalled((s) => s.filter((x) => x.id !== rec.id)))}
                className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)] hover:border-red-500 hover:text-red-500"
              >
                移除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ClawSection(): JSX.Element {
  const [config, setConfig] = useState<ClawConfig>({})
  const [running, setRunning] = useState(false)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const cfg = await window.api.app.claw.getConfig()
      setConfig(cfg)
      setToken(cfg.telegramToken ?? '')
      setRunning(await window.api.app.claw.isRunning())
    })()
    const offStatus = window.api.app.claw.onStatus((s) => setRunning(s.running))
    const offErr = window.api.app.claw.onError((e) => setError(e.message))
    return () => {
      offStatus()
      offErr()
    }
  }, [])

  async function save(): Promise<void> {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const cfg = await window.api.app.claw.updateConfig({
        telegramToken: token.trim() || undefined,
        enabled: Boolean(token.trim()) && (config.enabled ?? true)
      })
      setConfig(cfg)
      setSuccess('保存成功')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function toggleStart(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      if (running) await window.api.app.claw.stop()
      else await window.api.app.claw.start()
      setRunning(await window.api.app.claw.isRunning())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-2">Telegram Bot Token</h3>
        <p className="text-[11px] text-[var(--text-muted)] mb-2 leading-relaxed">
          在 Telegram 里搜索 <code className="px-1 py-0.5 rounded bg-[var(--bg-sidebar)]">@BotFather</code>，
          发送 <code className="px-1 py-0.5 rounded bg-[var(--bg-sidebar)]">/newbot</code> 即可拿到 token。
          任何拿到 token 的人都能远程控制你的 OpenDesk，所以**别泄漏**。
        </p>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="123456789:ABCDefGhIJKlmnOPQrstUVwxYZ"
          className="w-full px-2 py-1.5 text-[12px] font-mono rounded border border-[var(--border)] bg-[var(--bg-content)] text-[var(--text-primary)]"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded bg-[var(--accent)] text-white disabled:opacity-50"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          保存
        </button>
        <button
          type="button"
          onClick={() => void toggleStart()}
          disabled={busy || !config.telegramToken}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded disabled:opacity-50 ${
            running
              ? 'bg-red-500/15 text-red-500 border border-red-500/40'
              : 'bg-green-500/15 text-green-500 border border-green-500/40'
          }`}
        >
          {running ? <Loader2 size={11} /> : <Plus size={11} />}
          {running ? '停止' : '启动'}
        </button>
        <span className={`text-[11px] ${running ? 'text-green-500' : 'text-[var(--text-muted)]'}`}>
          {running ? '运行中' : '未运行'}
        </span>
      </div>

      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {success && <p className="text-[11px] text-green-500">{success}</p>}

      <div className="border-t border-[var(--border)] pt-3">
        <h4 className="text-[11px] font-semibold text-[var(--text-primary)] mb-2">下一步</h4>
        <ul className="text-[11px] text-[var(--text-muted)] space-y-1 list-disc pl-4">
          <li>启动后给 bot 发任意消息，OpenDesk 会把消息转发到默认 thread</li>
          <li>回复会通过 Telegram 发回</li>
          <li>更多平台（WeChat / WeCom / Lark / DingTalk）v0.8.0 排期</li>
        </ul>
      </div>
    </div>
  )
}