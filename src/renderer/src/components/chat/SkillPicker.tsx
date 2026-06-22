import { useSkillsStore } from '../../store/skills'

interface SkillPickerProps {
  filter: string
  onSelect: (skillId: string) => void
  onOpenSkills?: () => void
}

export default function SkillPicker({ filter, onSelect, onOpenSkills }: SkillPickerProps) {
  const { skills, loaded } = useSkillsStore()
  const normalized = filter.toLowerCase()
  const filtered = skills.filter((s) => s.name.toLowerCase().includes(normalized))

  return (
    <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 rounded-xl overflow-hidden z-50 py-2 bg-[var(--bg-content)]/90 border border-[var(--border)] shadow-xl max-h-[300px] flex flex-col">
      <div className="px-3 pb-2 text-xs font-semibold text-[var(--text-muted)] border-b border-[var(--border)] mb-1">
        Select a skill
      </div>
      <div className="overflow-y-auto flex-1 px-1">
        {!loaded ? (
          <div className="px-3 py-4 text-xs text-center text-[var(--text-muted)]">Loading skills…</div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-center text-[var(--text-muted)] flex flex-col gap-2">
            <span>No matching skills found</span>
            {onOpenSkills && (
              <button
                type="button"
                onClick={onOpenSkills}
                className="text-[var(--accent)] hover:underline"
              >
                Open Skills panel
              </button>
            )}
          </div>
        ) : (
          filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className="w-full px-3 py-2 text-left transition-colors hover:bg-[var(--bg-sidebar)] rounded-lg flex flex-col gap-0.5"
            >
              <span className="text-sm font-medium text-[var(--text-primary)]">{s.name}</span>
              <span className="text-[11px] text-[var(--text-secondary)] line-clamp-1">{s.description}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
