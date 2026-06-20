import { Users, Scale } from 'lucide-react'
import Switch from '../ui/Switch'
import { AGENT_ROLES } from '@shared/agent-roles'
import type { AppSettings, ProviderConfig } from '@shared/types'

const ROLE_DESCRIPTIONS: Record<string, string> = {
  generalist: 'Balanced general-purpose assistant',
  coder: 'Code correctness, best practices, edge cases',
  reviewer: 'Skeptical reviewer finding mistakes and weaknesses',
  researcher: 'Gathers context, compares alternatives, cites facts',
  writer: 'Well-structured, easy-to-read technical writing'
}

interface EnsemblePanelProps {
  settings: AppSettings
  providers: ProviderConfig[]
  onUpdate: (patch: Partial<AppSettings>) => void
}

export default function EnsemblePanel({ settings, providers, onUpdate }: EnsemblePanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-[var(--accent)]" />
          <span className="text-[13px] font-medium text-[var(--text-secondary)]">Ensemble Mode</span>
        </div>
        <Switch
          checked={settings.ensembleModeDefault ?? false}
          onCheckedChange={(v) => onUpdate({ ensembleModeDefault: v })}
        />
      </div>
      <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
        When enabled, each question is sent to multiple AI models in parallel. Their answers are then judged by an
        arbitrator model to produce a single, more reliable final answer.
      </p>

      <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-content)]">
        <div>
          <div className="text-sm font-medium text-[var(--text-primary)]">Auto-enable for complex tasks</div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Automatically turn on Ensemble for code review, debugging, analysis, etc.
          </div>
        </div>
        <Switch
          checked={settings.autoEnsembleForComplexTasks ?? false}
          onCheckedChange={(v) => onUpdate({ autoEnsembleForComplexTasks: v })}
        />
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium">Ensemble Providers</span>
          <div className="flex gap-1.5">
            {[2, 3, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => {
                  const ids = providers
                    .filter((p) => p.enabled)
                    .slice(0, n)
                    .map((p) => p.id)
                  onUpdate({ ensembleProviderIds: ids })
                }}
                className="text-[11px] px-2 py-1 rounded-md bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {n} models
              </button>
            ))}
          </div>
        </div>

        {providers.length === 0 ? (
          <div className="text-[12px] text-[var(--text-muted)] py-2">Add at least one provider first.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {providers.map((p) => {
              const selected = settings.ensembleProviderIds?.includes(p.id) ?? false
              const role = settings.agentRoleAssignments?.[p.id] ?? 'generalist'
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                    selected
                      ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30'
                      : 'bg-[var(--bg-content)] border-[var(--border)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const current = settings.ensembleProviderIds ?? []
                      const next = e.target.checked ? [...current, p.id] : current.filter((id) => id !== p.id)
                      onUpdate({ ensembleProviderIds: next })
                    }}
                    className="accent-[var(--accent)]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)]">{p.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{p.model}</div>
                  </div>
                  {selected && (
                    <div className="flex flex-col items-end gap-0.5">
                      <select
                        value={role}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const assignments = {
                            ...(settings.agentRoleAssignments ?? {}),
                            [p.id]: e.target.value as string
                          }
                          onUpdate({ agentRoleAssignments: assignments })
                        }}
                        className="text-[11px] px-2 py-1 rounded-md bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none"
                        title={ROLE_DESCRIPTIONS[role] ?? ''}
                      >
                        {AGENT_ROLES.map((r: { id: string; name: string }) => (
                          <option key={r.id} value={r.id} title={ROLE_DESCRIPTIONS[r.id] ?? ''}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      <span
                        className="text-[10px] text-[var(--text-muted)] max-w-[140px] truncate"
                        title={ROLE_DESCRIPTIONS[role] ?? ''}
                      >
                        {ROLE_DESCRIPTIONS[role]}
                      </span>
                    </div>
                  )}
                </label>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Scale size={15} className="text-[var(--accent)]" />
          <span className="text-[13px] font-medium">Arbitrator Provider</span>
        </div>
        <select
          value={settings.arbitratorProviderId || ''}
          onChange={(e) => onUpdate({ arbitratorProviderId: e.target.value || null })}
          className="w-full px-3.5 py-2.5 rounded-xl text-[13px] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
        >
          <option value="">Auto (strongest enabled)</option>
          {providers
            .filter((p) => p.enabled)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.model}
              </option>
            ))}
        </select>
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          The arbitrator compares all agent answers and writes the final answer. Choose your most capable model.
        </p>
      </div>
    </div>
  )
}
