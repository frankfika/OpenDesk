import { useState, useEffect, useRef } from 'react'
import { ShieldAlert, ChevronDown, Check } from 'lucide-react'
import { useSettingsStore } from '../../store/settings'

const APPROVAL_MODES = [
  { value: 'auto-edits', label: 'Auto edits', desc: 'Auto-approve file edits, shell & desktop within allowed directories' },
  { value: 'auto-all', label: 'Auto all', desc: 'Auto-approve all common tool actions' },
  { value: 'bypass', label: 'Bypass', desc: 'Run all actions without approval' },
  { value: 'ask', label: 'Ask', desc: 'Block shell & desktop tools until you enable auto mode' }
] as const

export default function ApprovalModeSelector() {
  const { settings, update } = useSettingsStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const currentMode = APPROVAL_MODES.find((m) => m.value === settings.approvalMode) ?? APPROVAL_MODES[0]

  useEffect(() => {
    if (!open) return
    function onMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  function handleSelect(value: string) {
    update({ approvalMode: value as 'ask' | 'auto-edits' | 'auto-all' | 'bypass' })
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative" onMouseDown={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors hover:bg-[var(--border)] text-[var(--text-secondary)]"
      >
        <ShieldAlert size={14} />
        <span className="font-medium">{currentMode.label}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 rounded-lg overflow-hidden z-50 py-1 bg-[var(--bg-content)] border border-[var(--border)] shadow-lg min-w-[220px]">
          {APPROVAL_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleSelect(mode.value)}
              className={`w-full px-3 py-2 text-left transition-colors flex items-start gap-2 ${
                mode.value === settings.approvalMode ? 'bg-[var(--bg-sidebar)]' : 'hover:bg-[var(--bg-sidebar)]'
              }`}
            >
              <div className="flex-1">
                <div
                  className={`text-sm font-medium ${mode.value === settings.approvalMode ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                >
                  {mode.label}
                </div>
                <div className="text-xs mt-0.5 text-[var(--text-muted)]">{mode.desc}</div>
              </div>
              {mode.value === settings.approvalMode && <Check size={14} className="mt-1 text-[var(--text-primary)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
