// NewsScenario — placeholder. Crypto news (CoinDesk / The Block /
// project-specific feeds) is wired up in Phase 3. For now, route the
// user to the assistant for any narrative context they need.

import { useViewStore } from '../../../store/view'
import { useTradeStore } from '../../../store/trade'
import { MessagesSquare, Sparkles } from 'lucide-react'

export default function NewsScenario(): JSX.Element {
  const symbol = useTradeStore((s) => s.selectedSymbol)
  const setView = useViewStore((s) => s.setView)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <MessagesSquare size={28} className="text-[#1D8C80]" />
      <p className="text-[13px] font-semibold text-white">Crypto news for {symbol || 'this symbol'}</p>
      <p className="max-w-sm text-[11.5px] leading-relaxed web3-text-muted">
        A live news feed (CoinDesk, The Block, project-specific RSS) is wired up in Phase 3. For
        now, ask the assistant for context on any recent event.
      </p>
      <button
        type="button"
        onClick={() => setView('assistant')}
        className="flex items-center gap-1.5 rounded bg-[#1D8C80] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1D8C80]/90"
      >
        <Sparkles size={13} />
        Ask the assistant
      </button>
    </div>
  )
}
