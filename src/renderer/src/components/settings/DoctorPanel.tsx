import { Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { DoctorReport, DoctorCheck } from '@shared/types'

interface DoctorPanelProps {
  report: DoctorReport | null
  running: boolean
  onRun: () => void
}

function statusIcon(status: 'pass' | 'warn' | 'fail') {
  if (status === 'pass') return <CheckCircle2 size={14} className="text-green-500" />
  if (status === 'warn') return <AlertTriangle size={14} className="text-yellow-500" />
  return <XCircle size={14} className="text-red-500" />
}

export default function DoctorPanel({ report, running, onRun }: DoctorPanelProps) {
  return (
    <div className="border-t border-[var(--border)] pt-4">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
        Diagnostics
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium">System Check</span>
        <button
          onClick={onRun}
          disabled={running}
          className={`text-xs px-3.5 py-2 rounded-lg font-medium transition-all ${
            running
              ? 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
              : 'bg-[var(--accent)] text-white hover:opacity-90'
          }`}
        >
          {running ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              Running…
            </span>
          ) : (
            'Run Diagnostics'
          )}
        </button>
      </div>

      {report && (
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-content)]">
          <div className="flex items-center gap-2 mb-3">
            {statusIcon(report.overall as 'pass' | 'warn' | 'fail')}
            <span className="text-sm font-medium">Overall: {report.overall.toUpperCase()}</span>
            <span className="text-[11px] text-[var(--text-muted)] ml-auto">
              {new Date(report.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {report.checks.map((check: DoctorCheck, i: number) => (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                {statusIcon(check.status)}
                <div>
                  <span className="font-medium text-[var(--text-primary)]">{check.name}</span>
                  <span className="text-[var(--text-secondary)] ml-2">{check.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
