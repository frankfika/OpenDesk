/**
 * ChangeLogPanel — chronological list of every mutation the assistant made
 * in the current session. Used as the "结果区" / file-change log that
 * WorkBuddy exposes alongside the conversation.
 *
 * Rendered as a side panel; can also be embedded in ArtifactPanel.
 */

import { useChangeLog, type ChangeKind, type ChangeEntry } from '../../store/changeLog'
import {
  FileEdit,
  FileText,
  Trash2,
  Terminal,
  Send,
  Sparkles,
  Users,
  Check,
  AlertCircle,
  Clock,
  Eraser
} from 'lucide-react'

const ICON_MAP: Record<ChangeKind, typeof FileEdit> = {
  'file.write': FileEdit,
  'file.read': FileText,
  'file.delete': Trash2,
  shell: Terminal,
  'web3.send': Send,
  skill: Sparkles,
  ensemble: Users
}

const KIND_LABEL: Record<ChangeKind, string> = {
  'file.write': '写入',
  'file.read': '读取',
  'file.delete': '删除',
  shell: 'Shell',
  'web3.send': '链上',
  skill: 'Skill',
  ensemble: 'Ensemble'
}

function relativeTime(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return `${sec} 秒前`
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟前`
  return new Date(ts).toLocaleTimeString()
}

interface ChangeLogPanelProps {
  threadId?: string | null
  className?: string
  compact?: boolean
}

export default function ChangeLogPanel({
  threadId,
  className = '',
  compact = false
}: ChangeLogPanelProps): JSX.Element {
  const { entries, clear, clearForThread } = useChangeLog()

  const filtered = threadId
    ? entries.filter((e) => e.threadId === threadId || e.threadId === null)
    : entries

  return (
    <div className={`flex flex-col h-full ${className}`} data-component="change-log">
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/30">
        <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <Clock size={12} />
          变更记录
          {filtered.length > 0 && (
            <span className="text-[10px] text-[var(--text-muted)]">({filtered.length})</span>
          )}
        </span>
        {(filtered.length > 0) && (
          <button
            type="button"
            onClick={() => (threadId ? clearForThread(threadId) : clear())}
            className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-content)] text-[var(--text-primary)]"
            title="清空记录"
          >
            <Eraser size={10} />
            清空
          </button>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto ${compact ? 'px-1 py-1' : 'px-2 py-2'}`}>
        {filtered.length === 0 ? (
          <p className="text-[11px] text-[var(--text-muted)] px-2 py-6 text-center">
            还没有任何变更
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {filtered.map((e) => (
              <ChangeRow key={e.id} entry={e} compact={compact} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ChangeRow({ entry, compact }: { entry: ChangeEntry; compact: boolean }): JSX.Element {
  const Icon = ICON_MAP[entry.kind]
  return (
    <div
      className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--bg-sidebar)]/40"
      data-change-id={entry.id}
      data-status={entry.status}
    >
      <div
        className={`shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center text-white ${
          entry.status === 'error' ? 'bg-red-500' : entry.status === 'pending' ? 'bg-[var(--text-muted)]' : 'bg-[var(--accent)]'
        }`}
      >
        <Icon size={11} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {KIND_LABEL[entry.kind]}
          </span>
          <span className="text-[12px] text-[var(--text-primary)] truncate">{entry.title}</span>
        </div>
        {entry.detail && !compact && (
          <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">{entry.detail}</p>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          {entry.status === 'success' && (
            <Check size={9} className="text-green-500" />
          )}
          {entry.status === 'error' && (
            <AlertCircle size={9} className="text-red-500" />
          )}
          <span className="text-[10px] text-[var(--text-muted)]">{relativeTime(entry.ts)}</span>
          {entry.error && (
            <span className="text-[10px] text-red-500 truncate">· {entry.error}</span>
          )}
        </div>
      </div>
    </div>
  )
}