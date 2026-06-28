/**
 * WorkModeSwitch — Three-mode segmented control inspired by WorkBuddy's
 * Ask / Plan / Craft pattern.
 *
 * It maps the three user-facing labels to the underlying `approvalMode`
 * enum so we don't need to change the executor or tests:
 *   - Ask   -> 'ask'       (read-only, no actions)
 *   - Plan  -> 'auto-edits' (auto-approve edits, ask before shell/desktop)
 *   - Craft -> 'auto-all'   (auto-approve all common tools)
 *
 * The legacy fourth mode (`bypass`) is no longer exposed here; it lives in
 * Settings -> Advanced only.
 */

import { MessageCircleQuestion, ListChecks, Hammer } from 'lucide-react'
import { useSettingsStore } from '../../store/settings'
import type { AppSettings } from '@shared/types'

type WorkMode = 'ask' | 'plan' | 'craft'

const WORK_MODES: { value: WorkMode; label: string; icon: typeof MessageCircleQuestion; desc: string; approvalMode: AppSettings['approvalMode'] }[] = [
  {
    value: 'ask',
    label: 'Ask',
    icon: MessageCircleQuestion,
    desc: '只读问答，不动文件',
    approvalMode: 'ask'
  },
  {
    value: 'plan',
    label: 'Plan',
    icon: ListChecks,
    desc: '先出计划，再逐项确认',
    approvalMode: 'auto-edits'
  },
  {
    value: 'craft',
    label: 'Craft',
    icon: Hammer,
    desc: '全速执行，不打扰',
    approvalMode: 'auto-all'
  }
]

function approvalToWorkMode(mode: AppSettings['approvalMode']): WorkMode {
  if (mode === 'auto-all') return 'craft'
  // both 'auto-edits' and 'bypass' surface as 'plan' here (bypass is rare and lives in Advanced)
  return 'plan'
}

export default function WorkModeSwitch(): JSX.Element {
  const { settings, update } = useSettingsStore()
  const current = approvalToWorkMode(settings.approvalMode)

  function handleSelect(value: WorkMode): void {
    const target = WORK_MODES.find((m) => m.value === value)
    if (!target) return
    void update({ approvalMode: target.approvalMode })
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-[var(--border)] bg-[var(--bg-content)]"
      role="radiogroup"
      aria-label="Work mode"
      data-work-mode={current}
    >
      {WORK_MODES.map((mode) => {
        const Icon = mode.icon
        const active = current === mode.value
        return (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={mode.desc}
            onClick={() => handleSelect(mode.value)}
            data-mode={mode.value}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              active
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)]'
            }`}
          >
            <Icon size={12} />
            <span>{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}