export interface MentionItem {
  id: string
  name?: string
  subtitle?: string
  icon?: React.ReactNode
  label?: string
  desc?: string
  type?: string
}

interface MentionPopoverProps {
  type: 'mention' | 'thread' | 'command'
  items: MentionItem[]
  selectedIndex: number
  onSelect: (item: MentionItem) => void
}

export default function MentionPopover({ type, items, selectedIndex, onSelect }: MentionPopoverProps) {
  if (items.length === 0) return null
  const title =
    type === 'mention' ? 'Mention workspace or file' : type === 'thread' ? 'Reference thread' : 'Quick command'
  return (
    <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 rounded-xl overflow-hidden z-50 py-2 bg-[var(--bg-content)]/95 border border-[var(--border)] shadow-xl max-h-[280px] flex flex-col">
      <div className="px-3 pb-2 text-xs font-semibold text-[var(--text-muted)] border-b border-[var(--border)] mb-1">
        {title}
      </div>
      <div className="overflow-y-auto flex-1 px-1">
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={`w-full px-3 py-2 text-left transition-colors rounded-lg flex items-center gap-2 ${
              idx === selectedIndex ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--bg-sidebar)]'
            }`}
          >
            <div className="shrink-0 w-6 h-6 rounded bg-[var(--bg-sidebar)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
              {type === 'command' ? <span className="text-xs">{item.icon ?? '🚀'}</span> : item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {type === 'command' ? (item.label ?? item.name) : (item.name ?? item.label)}
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] ml-2">
                {type === 'command' ? (item.desc ?? item.subtitle) : (item.subtitle ?? item.desc)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
