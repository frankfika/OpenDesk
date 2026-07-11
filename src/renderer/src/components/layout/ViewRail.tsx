// ViewRail — slim far-left icon rail that switches the top-level view.
// OpenDesk leads with the conversational assistant; Trade and the legacy
// Web3 workbench sit alongside it. Replaces the old hidden Cmd+Shift+T
// toggle with an always-visible, discoverable switch.

import { MessagesSquare, CandlestickChart, Wallet, type LucideIcon } from 'lucide-react'
import { useViewStore, type AppView } from '../../store/view'

const ITEMS: { id: AppView; label: string; icon: LucideIcon }[] = [
  { id: 'assistant', label: 'Assistant', icon: MessagesSquare },
  { id: 'trade', label: 'Trade', icon: CandlestickChart },
  { id: 'web3', label: 'Web3', icon: Wallet }
]

export default function ViewRail(): JSX.Element {
  const view = useViewStore((s) => s.view)
  const setView = useViewStore((s) => s.setView)
  return (
    <nav
      className="flex shrink-0 flex-col items-center gap-1 border-r border-[var(--border)] bg-[var(--bg-sidebar)] py-2"
      style={{ width: 48 }}
      data-component="view-rail"
      aria-label="Views"
    >
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const active = view === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            title={label}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            data-view={id}
            data-active={active}
            className={`relative flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors ${
              active
                ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-content)] hover:text-[var(--text-primary)]'
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-[var(--accent)]" />
            )}
            <Icon size={17} />
            <span className="text-[8px] font-medium leading-none">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
