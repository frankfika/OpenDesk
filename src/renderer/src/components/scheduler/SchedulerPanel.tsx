/**
 * SchedulerPanel — WorkBuddy-style "自动化" tab.
 *
 * Lists scheduled tasks (cron + action), lets the user create / edit / pause
 * / delete / run-now. Renders a "create" form inline with cron validation
 * via `scheduler:validate`.
 */

import { useEffect, useState } from 'react'
import { Clock, Plus, Trash2, Play, Pause, Pencil, X, Check } from 'lucide-react'

interface ScheduledTask {
  id: string
  name: string
  cron: string
  enabled: boolean
  createdAt: number
  lastRunAt?: number
  lastRunStatus?: 'success' | 'error'
  lastRunError?: string
}

function relativeTime(ts?: number): string {
  if (!ts) return '从未运行'
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return `${sec} 秒前`
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟前`
  if (sec < 86400) return `${Math.floor(sec / 3600)} 小时前`
  return `${Math.floor(sec / 86400)} 天前`
}

export default function SchedulerPanel(): JSX.Element {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [showCreate, setShowCreate] = useState(false)

  async function refresh(): Promise<void> {
    const list = await window.api.app.scheduler.list()
    setTasks(list)
  }

  useEffect(() => {
    void refresh()
    const off = window.api.app.scheduler.onTaskRunning(() => {
      void refresh()
    })
    return () => off()
  }, [])

  return (
    <div className="flex flex-col h-full" data-component="scheduler-panel">
      <div className="shrink-0 px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Clock size={12} />
            自动化
          </span>
          <button
            type="button"
            onClick={() => {
              setShowCreate(true)
            }}
            className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-content)] text-[var(--text-primary)]"
            data-action="new-task"
          >
            <Plus size={10} />
            新建
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {showCreate && (
          <TaskForm
            onClose={() => setShowCreate(false)}
            onSaved={() => {
              setShowCreate(false)
              void refresh()
            }}
          />
        )}

        {tasks.length === 0 && !showCreate && (
          <p className="text-[11px] text-[var(--text-muted)] px-2 py-6 text-center">
            暂无任务。点击右上角"新建"创建第一个定时任务。
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onChanged={() => void refresh()}
              onEdit={() => {
                setEditingId(t.id)
                setShowCreate(true)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TaskForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }): JSX.Element {
  const [name, setName] = useState('每日日报')
  const [cron, setCron] = useState('0 9 * * 1-5')
  const [prompt, setPrompt] = useState('把昨天的销售数据生成日报，写到 ~/Reports/daily.md')
  const [valid, setValid] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.app.scheduler.validate(cron).then((v: boolean) => {
      if (!cancelled) setValid(v)
    })
    return () => {
      cancelled = true
    }
  }, [cron])

  async function handleCreate(): Promise<void> {
    setError(null)
    if (!valid) {
      setError('Cron 表达式无效')
      return
    }
    try {
      await window.api.app.scheduler.create({
        name,
        cron,
        action: { kind: 'skill', skillId: 'weekly-report', prompt }
      })
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="border border-[var(--border)] rounded-md p-3 mb-3 bg-[var(--bg-content)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--text-primary)]">新建定时任务</span>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-sidebar)]">
          <X size={11} />
        </button>
      </div>
      <label className="block text-[10px] text-[var(--text-muted)] mt-1">任务名称</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full mt-0.5 px-2 py-1 text-[12px] rounded border border-[var(--border)] bg-[var(--bg-content)] text-[var(--text-primary)]"
      />
      <label className="block text-[10px] text-[var(--text-muted)] mt-2">Cron 表达式</label>
      <div className="flex items-center gap-2 mt-0.5">
        <input
          type="text"
          value={cron}
          onChange={(e) => setCron(e.target.value)}
          className="flex-1 px-2 py-1 text-[12px] rounded border border-[var(--border)] bg-[var(--bg-content)] text-[var(--text-primary)] font-mono"
        />
        <span className={`text-[10px] ${valid ? 'text-green-500' : 'text-red-500'}`}>
          {valid === null ? '...' : valid ? '✓ 有效' : '✗ 无效'}
        </span>
      </div>
      <label className="block text-[10px] text-[var(--text-muted)] mt-2">提示词（触发时作为用户消息发送）</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        className="w-full mt-0.5 px-2 py-1 text-[12px] rounded border border-[var(--border)] bg-[var(--bg-content)] text-[var(--text-primary)]"
      />
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!valid}
          className="flex items-center gap-1 px-3 py-1.5 text-[12px] rounded bg-[var(--accent)] text-white disabled:opacity-50"
        >
          <Check size={11} />
          保存
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-[12px] rounded border border-[var(--border)] hover:bg-[var(--bg-sidebar)]"
        >
          取消
        </button>
      </div>
    </div>
  )
}

function TaskCard({
  task,
  onChanged,
  onEdit
}: {
  task: ScheduledTask
  onChanged: () => void
  onEdit: () => void
}): JSX.Element {
  async function toggle(): Promise<void> {
    await window.api.app.scheduler.update(task.id, { enabled: !task.enabled })
    onChanged()
  }
  async function runNow(): Promise<void> {
    await window.api.app.scheduler.run(task.id)
  }
  async function remove(): Promise<void> {
    await window.api.app.scheduler.delete(task.id)
    onChanged()
  }
  return (
    <div className="border border-[var(--border)] rounded-md p-2.5 bg-[var(--bg-content)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={toggle}
            className={`shrink-0 p-1 rounded ${task.enabled ? 'text-green-500' : 'text-[var(--text-muted)]'}`}
            title={task.enabled ? '已启用' : '已暂停'}
          >
            {task.enabled ? <Play size={11} /> : <Pause size={11} />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">{task.name}</div>
            <div className="text-[10px] text-[var(--text-muted)] font-mono">{task.cron}</div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={onEdit} className="p-1 rounded hover:bg-[var(--bg-sidebar)]" title="编辑">
            <Pencil size={11} />
          </button>
          <button type="button" onClick={runNow} className="p-1 rounded hover:bg-[var(--bg-sidebar)]" title="立即运行">
            <Play size={11} />
          </button>
          <button type="button" onClick={remove} className="p-1 rounded hover:bg-[var(--bg-sidebar)] text-red-500" title="删除">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      <div className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-2">
        <span>上次运行: {relativeTime(task.lastRunAt)}</span>
        {task.lastRunStatus && (
          <span className={task.lastRunStatus === 'success' ? 'text-green-500' : 'text-red-500'}>
            · {task.lastRunStatus === 'success' ? '成功' : `失败: ${task.lastRunError ?? ''}`}
          </span>
        )}
      </div>
    </div>
  )
}