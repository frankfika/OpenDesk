import { useMemo } from 'react'
import type { ProviderConfig, AgentRole } from '@shared/types'
import { X, Users, Scale, Cpu } from 'lucide-react'

interface EnsembleModelPickerProps {
  open: boolean
  providers: ProviderConfig[]
  selectedIds: string[]
  arbitratorId?: string | null
  roleAssignments: Record<string, AgentRole>
  onToggleProvider: (id: string) => void
  onSetArbitrator: (id: string | null) => void
  onSetRole: (id: string, role: AgentRole) => void
  onClose: () => void
}

const ROLES: { value: AgentRole; label: string; description: string }[] = [
  {
    value: 'generalist',
    label: 'Generalist',
    description: 'Balanced, accurate answers without a strong specialty.'
  },
  {
    value: 'coder',
    label: 'Coder',
    description: 'Focus on code correctness, best practices, and edge cases.'
  },
  {
    value: 'reviewer',
    label: 'Reviewer',
    description: 'Skeptical lens: find mistakes, omissions, and weaknesses.'
  },
  {
    value: 'researcher',
    label: 'Researcher',
    description: 'Gather context, compare alternatives, and cite facts.'
  },
  {
    value: 'writer',
    label: 'Writer',
    description: 'Clear, well-structured output with good examples.'
  }
]

export default function EnsembleModelPicker({
  open,
  providers,
  selectedIds,
  arbitratorId,
  roleAssignments,
  onToggleProvider,
  onSetArbitrator,
  onSetRole,
  onClose
}: EnsembleModelPickerProps) {
  const selectedProviders = useMemo(() => providers.filter((p) => selectedIds.includes(p.id)), [providers, selectedIds])

  const estimatedCost = useMemo(() => {
    // Rough estimate per 1k tokens blended; should be replaced by per-provider pricing
    const per1k = 0.009
    return selectedProviders.length > 0
      ? `~$${(selectedProviders.length * per1k).toFixed(3)} / 1k tokens`
      : 'Select at least one model'
  }, [selectedProviders.length])

  if (!open) return null

  return (
    <div className="absolute bottom-full left-0 mb-2 min-w-[320px] w-max max-w-[min(90vw,420px)] rounded-2xl border border-[var(--border)] bg-[var(--bg-content)] shadow-2xl p-4 z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          <Users size={16} />
          <span className="font-semibold text-sm">Ensemble Models</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)]"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {providers.map((provider) => {
          const selected = selectedIds.includes(provider.id)
          const isArbitrator = arbitratorId === provider.id
          return (
            <div
              key={provider.id}
              className={[
                'flex items-center gap-3 p-2.5 rounded-xl border transition-all min-w-0',
                selected
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                  : 'border-[var(--border)] hover:border-[var(--text-muted)]'
              ].join(' ')}
            >
              <input
                type="checkbox"
                id={`em-${provider.id}`}
                checked={selected}
                onChange={() => onToggleProvider(provider.id)}
                className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] shrink-0"
              />
              <label htmlFor={`em-${provider.id}`} className="flex-1 min-w-0 cursor-pointer">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{provider.name}</div>
                <div className="text-xs text-[var(--text-muted)] truncate">{provider.model}</div>
              </label>

              <div className="flex items-center gap-2 shrink-0">
                {selected && (
                  <div className="flex flex-col gap-1 shrink-0 max-w-[140px]">
                    <select
                      value={roleAssignments[provider.id] || 'generalist'}
                      onChange={(e) => onSetRole(provider.id, e.target.value as AgentRole)}
                      className="text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 text-[var(--text-primary)] focus:border-[var(--text-muted)]"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] text-[var(--text-muted)] leading-tight">
                      {ROLES.find((r) => r.value === (roleAssignments[provider.id] || 'generalist'))?.description}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onSetArbitrator(isArbitrator ? null : provider.id)}
                  title={isArbitrator ? 'Arbitrator: synthesizes all agent answers' : 'Set as arbitrator'}
                  className={[
                    'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
                    isArbitrator
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--bg-sidebar)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  ].join(' ')}
                >
                  <Scale size={12} />
                  <span className="hidden sm:inline">{isArbitrator ? 'Arb' : 'Arb'}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Cpu size={14} />
          <span>
            {selectedProviders.length} model{selectedProviders.length !== 1 ? 's' : ''} selected
          </span>
        </div>
        <div className="text-[var(--text-secondary)] whitespace-nowrap">{estimatedCost}</div>
      </div>
    </div>
  )
}
