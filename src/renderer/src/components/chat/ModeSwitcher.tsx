import type { ChatMode } from '@shared/types'

interface ModeSwitcherProps {
  mode: ChatMode
  onChange: (mode: ChatMode) => void
  disabled?: boolean
}

const MODES: { value: ChatMode; label: string; short: string }[] = [
  { value: 'single', label: 'Chat', short: 'Chat' },
  { value: 'agent', label: 'Agent', short: 'Agent' },
  { value: 'ensemble', label: 'Ensemble', short: 'Ensemble' },
  { value: 'compare', label: 'Compare', short: 'Compare' }
]

export default function ModeSwitcher({ mode, onChange, disabled }: ModeSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--border)]">
      {MODES.map((m) => {
        const active = m.value === mode
        return (
          <button
            key={m.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m.value)}
            className={[
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200',
              active
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-content)]',
              disabled && 'opacity-50 cursor-not-allowed'
            ].join(' ')}
            title={m.label}
          >
            {m.short}
          </button>
        )
      })}
    </div>
  )
}
