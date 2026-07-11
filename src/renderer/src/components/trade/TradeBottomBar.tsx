// TradeBottomBar — quick-ticket + alerts + key bindings hint. Sits at
// the bottom of the centre pane (not the full window) so the chart
// stays tall. Crypto-only since v0.4.2.

import { useEffect, useState } from 'react'
import { useTradeStore } from '../../store/trade'
import { fmtPct } from './format'
import { setScenario } from './scenario-nav'

function cgIdFor(symbol: string): string {
  const map: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    BNB: 'binancecoin',
    ADA: 'cardano',
    DOGE: 'dogecoin',
    XRP: 'ripple'
  }
  return map[symbol.toUpperCase()] ?? symbol.toLowerCase()
}

export default function TradeBottomBar(): JSX.Element {
  const symbol = useTradeStore((s) => s.selectedSymbol ?? '')
  const dir = useTradeStore((s) => s.colorDirection)
  const setColorDirection = useTradeStore((s) => s.setColorDirection)

  const [price, setPrice] = useState<number | null>(null)
  const [change, setChange] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    const id = cgIdFor(symbol)
    const tick = async () => {
      try {
        const r = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true`
        )
        if (!r.ok) return
        const data = (await r.json()) as Record<string, { usd?: number; usd_24h_change?: number }>
        const row = data[id]
        if (!cancelled && row) {
          setPrice(row.usd ?? null)
          setChange(row.usd_24h_change ?? null)
        }
      } catch {
        // network blip; keep last known
      }
    }
    tick()
    const t = setInterval(tick, 8_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [symbol])

  const up = (change ?? 0) >= 0
  const positive = dir === 'us' ? up : !up

  return (
    <div
      className="flex shrink-0 items-center gap-3 border-t px-3 py-1.5 text-[11px]"
      style={{ background: '#0c0c0c', borderColor: '#1f1f23', height: 32 }}
    >
      <button
        type="button"
        onClick={() => setScenario('order')}
        className="rounded bg-emerald-600/90 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-white hover:bg-emerald-500"
      >
        B Buy
      </button>
      <button
        type="button"
        onClick={() => setScenario('order')}
        className="rounded bg-red-600/90 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-white hover:bg-red-500"
      >
        S Sell
      </button>
      {price != null && change != null && (
        <span className={`trade-num ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {symbol} {price.toFixed(price < 1 ? 4 : 2)}{' '}
          <span className="opacity-80">{fmtPct(change, dir)}</span>
        </span>
      )}

      <span className="ml-auto flex items-center gap-2 text-[10.5px] web3-text-muted">
        <button
          type="button"
          onClick={() => setColorDirection(dir === 'us' ? 'cn' : 'us')}
          className="rounded border border-[#2a2a2e] bg-black/40 px-2 py-0.5 font-mono hover:border-[#1D8C80]"
          title="Toggle US (green up) / CN (red up) colour rule"
        >
          colour: {dir === 'us' ? 'US ▲' : 'CN ▼'}
        </button>
        <span>
          <kbd className="rounded border border-[#2a2a2e] bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white">B</kbd>/
          <kbd className="rounded border border-[#2a2a2e] bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white">S</kbd>{' '}
          trade
        </span>
        <span>
          <kbd className="rounded border border-[#2a2a2e] bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white">/</kbd>{' '}
          search
        </span>
        <span>
          <kbd className="rounded border border-[#2a2a2e] bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white">space</kbd>{' '}
          pause ticker
        </span>
      </span>
    </div>
  )
}
