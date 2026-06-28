/**
 * SectionRail — vertical icon rail with 7 sections (WorkBuddy parity):
 *   Assistant / Projects / Experts / Automation / Files / KB / Inspiration
 *
 * Rendered as a left rail next to the Web3 Workbench (or anywhere else).
 * Persists the active section via `useSectionStore`.
 */

import {
  MessageSquare,
  Folder,
  Sparkles,
  Clock,
  FileText,
  Database,
  Lightbulb,
  type LucideIcon
} from 'lucide-react'
import { SECTIONS, useSectionStore, type SectionId } from '../../store/sections'

const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare,
  Folder,
  Sparkles,
  Clock,
  FileText,
  Database,
  Lightbulb
}

interface SectionRailProps {
  className?: string
}

export default function SectionRail({ className = '' }: SectionRailProps): JSX.Element {
  const { activeSection, setActiveSection } = useSectionStore()
  return (
    <nav
      className={`flex flex-col gap-0.5 py-2 px-1 border-r border-[var(--border)] bg-[var(--bg-sidebar)] ${className}`}
      data-component="section-rail"
      aria-label="Sections"
    >
      {SECTIONS.map((s) => {
        const Icon = ICON_MAP[s.icon] ?? MessageSquare
        const active = activeSection === s.id
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSection(s.id)}
            data-section={s.id}
            data-active={active}
            title={s.label}
            className={`relative flex items-center justify-center w-9 h-9 rounded-md transition-colors ${
              active
                ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-content)] hover:text-[var(--text-primary)]'
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-[var(--accent)]" />
            )}
            <Icon size={14} />
          </button>
        )
      })}
    </nav>
  )
}

export type { SectionId }