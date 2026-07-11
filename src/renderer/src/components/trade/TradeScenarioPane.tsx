// TradeScenarioPane — routes the active scenario id to the matching
// renderer. Each scenario gets its own row of content; the surrounding
// shell stays put so the trade-station feel of a fixed layout doesn't
// shift as the user switches tabs.

import { useTradeStore, type TradeScenario } from '../../store/trade'
import ChartScenario from './scenarios/ChartScenario'
import OrderScenario from './scenarios/OrderScenario'
import PositionsScenario from './scenarios/PositionsScenario'
import NewsScenario from './scenarios/NewsScenario'
import AnalysisScenario from './scenarios/AnalysisScenario'

const SCENARIO_TITLES: Record<TradeScenario, string> = {
  chart: 'Chart',
  order: 'Order Ticket',
  positions: 'Positions',
  news: 'News',
  analysis: 'AI Analysis'
}

export default function TradeScenarioPane({ scenario }: { scenario: TradeScenario }): JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex items-center gap-2 border-b px-3 py-1.5"
        style={{ background: '#0c0c0c', borderColor: '#1f1f23', height: 28 }}
      >
        <span className="text-[10.5px] font-mono uppercase tracking-wider web3-text-muted">
          Scenario
        </span>
        <span className="text-[11.5px] font-semibold text-white">{SCENARIO_TITLES[scenario]}</span>
        <span className="ml-auto text-[10.5px] web3-text-muted">
          press <kbd className="rounded border border-[#2a2a2e] bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white">1-5</kbd>{' '}
          to switch · <kbd className="rounded border border-[#2a2a2e] bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white">Tab</kbd>{' '}
          to cycle
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {scenario === 'chart' && <ChartScenario />}
        {scenario === 'order' && <OrderScenario />}
        {scenario === 'positions' && <PositionsScenario />}
        {scenario === 'news' && <NewsScenario />}
        {scenario === 'analysis' && <AnalysisScenario />}
      </div>
    </div>
  )
}
