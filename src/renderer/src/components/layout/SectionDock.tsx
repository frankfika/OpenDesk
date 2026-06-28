/**
 * SectionDock — main panel area for the 7 sections. Renders the
 * appropriate component based on `useSectionStore.activeSection`.
 *
 * Sections covered:
 *   - assistant  -> Web3Workbench (default chat scenario)
 *   - experts    -> ExpertPanel
 *   - automation -> SchedulerPanel
 *   - projects / files / knowledge / inspiration -> placeholder with brief copy
 */

import { useSectionStore, SECTIONS } from '../../store/sections'
import ExpertPanel from '../experts/ExpertPanel'
import SchedulerPanel from '../scheduler/SchedulerPanel'

interface SectionDockProps {
  className?: string
  /** Render this for "assistant" — typically the Web3 Workbench */
  assistantView: React.ReactNode
}

export default function SectionDock({ className = '', assistantView }: SectionDockProps): JSX.Element {
  const { activeSection } = useSectionStore()
  const def = SECTIONS.find((s) => s.id === activeSection)

  if (activeSection === 'assistant') {
    return <div className={className}>{assistantView}</div>
  }

  if (activeSection === 'experts') {
    return (
      <div className={`flex flex-col h-full bg-[var(--bg-content)] ${className}`}>
        <SectionHeader />
        <ExpertPanel />
      </div>
    )
  }

  if (activeSection === 'automation') {
    return (
      <div className={`flex flex-col h-full bg-[var(--bg-content)] ${className}`}>
        <SectionHeader />
        <SchedulerPanel />
      </div>
    )
  }

  // Placeholder panels for sections we haven't shipped UI for yet.
  return (
    <div className={`flex flex-col h-full bg-[var(--bg-content)] ${className}`}>
      <SectionHeader />
      <div className="flex-1 flex items-center justify-center px-8 py-6">
        <div className="text-center max-w-md">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{def?.label}</p>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            这个板块正在筹备中。当前可用的有 <strong>助理</strong> / <strong>专家</strong> / <strong>自动化</strong>。
          </p>
        </div>
      </div>
    </div>
  )
}

function SectionHeader(): JSX.Element {
  const { activeSection } = useSectionStore()
  const def = SECTIONS.find((s) => s.id === activeSection)
  return (
    <div className="shrink-0 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/30">
      <span className="text-sm font-semibold text-[var(--text-primary)]">{def?.label ?? activeSection}</span>
      {def && (
        <span className="ml-2 text-[10px] text-[var(--text-muted)]">{def.short}</span>
      )}
    </div>
  )
}