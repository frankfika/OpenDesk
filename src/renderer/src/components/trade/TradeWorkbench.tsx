// TradeWorkbench — top-level layout for the trading workstation.
//
// Trader-style dense layout:
//   - TopBar: ticker tape, account summary, clock, scenario tabs
//   - Left:   watchlist (collapsible)
//   - Center: active scenario (Chart / Order / Positions / News / Analysis)
//   - Bottom: news / quick-ticket / alerts
//
// All input flows through the keyboard first; mouse is a fallback. The
// `useTradeHotkeys` hook is mounted once at this level.

import { useEffect } from 'react'
import { useTradeStore, type TradeScenario } from '../../store/trade'
import { useTradeHotkeys } from '../../hooks/useTradeHotkeys'
import TradeTopBar from './TradeTopBar'
import TradeWatchlist from './TradeWatchlist'
import TradeScenarioPane from './TradeScenarioPane'
import TradeBottomBar from './TradeBottomBar'
import ErrorBoundary from '../ui/ErrorBoundary'

const SCENARIOS: { id: TradeScenario; label: string; hotkey: string }[] = [
  { id: 'chart', label: 'Chart', hotkey: '1' },
  { id: 'order', label: 'Order', hotkey: '2' },
  { id: 'positions', label: 'Positions', hotkey: '3' },
  { id: 'news', label: 'News', hotkey: '4' },
  { id: 'analysis', label: 'AI Analysis', hotkey: '5' }
]

export default function TradeWorkbench(): JSX.Element {
  const scenario = useTradeStore((s) => s.scenario)
  const setScenario = useTradeStore((s) => s.setScenario)

  useEffect(() => {
    // Make sure the watchlist has at least one item so the panes have
    // something to show on first launch. (Already handled by the store's
    // DEFAULT_WATCHLIST, but in case the persisted state is empty we
    // refill here.)
    const { watchlist, addWatch } = useTradeStore.getState()
    if (watchlist.length === 0) {
      addWatch({ symbol: 'BTC', assetClass: 'crypto' })
      addWatch({ symbol: 'ETH', assetClass: 'crypto' })
    }
  }, [])

  useTradeHotkeys()

  return (
    <ErrorBoundary>
      <div
        className="flex h-full w-full flex-col overflow-hidden text-[12.5px] leading-tight"
        style={{ background: '#0a0a0a' }}
      >
        <TradeTopBar scenarios={SCENARIOS} activeScenario={scenario} onScenario={setScenario} />

        <div className="relative flex min-h-0 flex-1">
          <TradeWatchlist />

          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <TradeScenarioPane scenario={scenario} />
            <TradeBottomBar />
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
