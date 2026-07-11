// ChartScenario — single-symbol chart + summary. Crypto-only since
// v0.4.2 (stock support removed). The K-line / depth / orderbook view
// is wired up in Phase 3 — for now, this renders a placeholder that
// shows the symbol + a hint to use the Watchlist / Crypto tab.

import { useTradeStore } from '../../../store/trade'

export default function ChartScenario(): JSX.Element {
  const symbol = useTradeStore((s) => s.selectedSymbol)

  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <div className="max-w-md text-[12.5px] leading-relaxed web3-text-muted">
        <div className="mb-2 text-[14px] font-semibold text-white">Crypto chart for {symbol || '—'}</div>
        The K-line / depth / orderbook view for crypto is wired up in Phase 3.
        For now use the Watchlist and the Crypto tab to monitor spot price.
      </div>
    </div>
  )
}
