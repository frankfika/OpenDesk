import { Loader2, CheckCircle2, AlertTriangle, XCircle, Stethoscope } from 'lucide-react'
import type { DoctorReport, DoctorCheck } from '@shared/types'

interface DoctorPanelProps {
  report: DoctorReport | null
  running: boolean
  onRun: () => void
}

const STATUS_LABEL: Record<'pass' | 'warn' | 'fail', string> = {
  pass: '正常',
  warn: '注意',
  fail: '失败'
}

function statusIcon(status: 'pass' | 'warn' | 'fail') {
  if (status === 'pass') return <CheckCircle2 size={14} className="text-[var(--success)]" />
  if (status === 'warn') return <AlertTriangle size={14} className="text-[var(--warning)]" />
  return <XCircle size={14} className="text-[var(--error)]" />
}

export default function DoctorPanel({ report, running, onRun }: DoctorPanelProps) {
  return (
    <div className="border-t border-[var(--border)] pt-4">
      <div className="flex items-center gap-2 mb-3">
        <Stethoscope size={13} className="text-[var(--accent)]" />
        <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          运行分析 / Diagnostics
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium">系统自检</span>
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg font-medium transition-all ${
            running
              ? 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
              : 'bg-[var(--accent)] text-white hover:opacity-90 active:scale-[0.98]'
          }`}
        >
          {running ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              分析中…
            </>
          ) : (
            <>
              <Stethoscope size={12} />
              运行分析
            </>
          )}
        </button>
      </div>

      {report && (
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-content)]">
          <div className="flex items-center gap-2 mb-3">
            {statusIcon(report.overall as 'pass' | 'warn' | 'fail')}
            <span className="text-sm font-medium">
              总体：{STATUS_LABEL[report.overall as 'pass' | 'warn' | 'fail'] ?? report.overall.toUpperCase()}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] ml-auto">
              {new Date(report.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {report.checks.map((check: DoctorCheck, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                {statusIcon(check.status)}
                <div className="flex-1">
                  <span className="font-medium text-[var(--text-primary)]">{check.name}</span>
                  <span className="text-[var(--text-secondary)] ml-2">{check.message}</span>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    check.status === 'pass'
                      ? 'bg-[var(--success-bg)] text-[var(--success)]'
                      : check.status === 'warn'
                      ? 'bg-[var(--warning-bg)] text-[var(--warning)]'
                      : 'bg-[var(--error-bg)] text-[var(--error)]'
                  }`}
                >
                  {STATUS_LABEL[check.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
