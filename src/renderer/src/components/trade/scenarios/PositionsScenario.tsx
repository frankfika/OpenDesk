// PositionsScenario — open positions + realised/unrealised P&L. Phase 1
// shows the layout with an empty state; the real position store +
// reconciliation against the broker / chain lands in Phase 2.

import { useTradeStore } from '../../../store/trade'
import { fmtPct } from '../format'

export default function PositionsScenario(): JSX.Element {
  const symbol = useTradeStore((s) => s.selectedSymbol)
  return (
    <div className="flex h-full flex-col p-4">
      <h2 className="mb-2 text-[12px] font-semibold uppercase web3-text-muted">Open Positions</h2>
      <div className="flex-1 overflow-auto rounded border border-[#1f1f23]">
        <table className="w-full text-[11.5px]">
          <thead className="text-left text-[10px] uppercase web3-text-muted">
            <tr>
              <th className="px-2 py-1.5">Symbol</th>
              <th className="px-2 py-1.5 text-right">Qty</th>
              <th className="px-2 py-1.5 text-right">Avg Cost</th>
              <th className="px-2 py-1.5 text-right">Last</th>
              <th className="px-2 py-1.5 text-right">Mkt Value</th>
              <th className="px-2 py-1.5 text-right">P&amp;L</th>
              <th className="px-2 py-1.5 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-2 py-6 text-center web3-text-muted">
                No open positions yet.
                <br />
                <span className="text-[10.5px]">
                  Send an order from the <span className="font-mono text-white">Order</span> scenario — pending intents
                  will land here in Phase 2.
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[10.5px] web3-text-muted">
        Selected:{' '}
        <span className="font-mono text-white">
          {symbol ?? '—'}
        </span>{' '}
        · Convention: <span className="font-mono text-white">{fmtPct(0).slice(-1) === '▲' ? 'US' : 'CN'}</span> colour
        rule
      </div>
    </div>
  )
}
