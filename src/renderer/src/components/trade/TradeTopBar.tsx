// TradeTopBar — top-of-screen status bar.
//
// Two stacked bands, visually separated:
//   Row 1 (32px) — nav:  brand · TRADE mode · scenario tabs · ticker pause · clock · account
//   Row 2 (24px) — data: scrolling ticker tape of watchlist quotes
//
// The ticker tape is paused via `useTradeStore.tickerPaused` (Space).

import { useEffect, useState } from 'react'
import { useTradeStore, type TradeScenario } from '../../store/trade'
import { useAccount } from 'wagmi'
import { useNativeBalance } from '../../hooks/useWeb3Data'
import BrandLockup from '../ui/BrandLockup'

interface TopBarProps {
  scenarios: { id: TradeScenario; label: string; hotkey: string }[]
  activeScenario: TradeScenario
  onScenario: (id: TradeScenario) => void
}

function fmtUsd(n: number | null | undefined): string {
  if (n == null) return '$0.00'
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function fmtPct(n: number, dir: 'us' | 'cn'): string {
  const up = n >= 0
  // US: green up / red down. CN: red up / green down.
  const positive = dir === 'us' ? up : !up
  const sign = up ? '+' : ''
  return `${sign}${n.toFixed(2)}%${positive ? '▲' : '▼'}`
}

function fmtClock(d: Date): string {
  return d.toISOString().slice(11, 19) + ' UTC'
}

export default function TradeTopBar({ scenarios, activeScenario, onScenario }: TopBarProps): JSX.Element {
  const paused = useTradeStore((s) => s.tickerPaused)
  const toggleTickerPause = useTradeStore((s) => s.toggleTickerPause)
  const watchlist = useTradeStore((s) => s.watchlist)
  const colorDirection = useTradeStore((s) => s.colorDirection)

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header
      className="flex shrink-0 flex-col"
      style={{ background: '#0f0f0f', borderBottom: '1px solid #1f1f23' }}
    >
      {/* Row 1 — navigation */}
      <div
        className="flex items-center gap-3 px-3"
        style={{ height: 32 }}
      >
        <div
          className="flex items-center pr-3"
          style={{ borderRight: '1px solid #1f1f23' }}
        >
          <BrandLockup mode="TRADE" size="compact" />
        </div>

        <nav className="flex items-center gap-0.5">
          {scenarios.map((s) => {
            const active = activeScenario === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onScenario(s.id)}
                title={`${s.label} (press ${s.hotkey})`}
                className={`relative rounded px-2 py-0.5 text-[10.5px] font-mono font-semibold transition-colors ${
                  active
                    ? 'text-white'
                    : 'text-[var(--text-muted)] hover:text-white hover:bg-white/[0.04]'
                }`}
                style={
                  active
                    ? { background: 'rgba(255,255,255,0.07)' }
                    : undefined
                }
              >
                <span className="opacity-60">{s.hotkey}</span>
                <span className="mx-1">·</span>
                <span>{s.label}</span>
                {active && (
                  <span
                    className="absolute left-1.5 right-1.5"
                    style={{ bottom: -5, height: 1.5, background: '#2dd4bf' }}
                  />
                )}
              </button>
            )
          })}
        </nav>

        <div className="flex-1" />

        <button
          type="button"
          onClick={toggleTickerPause}
          className="web3-label web3-text-muted hover:text-white"
          title={paused ? 'Resume ticker (Space)' : 'Pause ticker (Space)'}
        >
          {paused ? '▶ ticker' : '⏸ ticker'}
        </button>

        <span className="web3-label web3-text-muted tabular-nums">{fmtClock(now)}</span>

        <AccountSummary />
      </div>

      {/* Row 2 — data tape */}
      <div
        className="flex items-center overflow-hidden"
        style={{
          height: 24,
          background: '#0a0a0a',
          borderTop: '1px solid #15151a',
          maskImage:
            'linear-gradient(to right, transparent, black 3%, black 97%, transparent)'
        }}
      >
        <div
          className="flex items-center gap-5 px-3 text-[10.5px] font-mono"
          style={{
            animation: paused ? 'none' : 'ticker-scroll 60s linear infinite',
            whiteSpace: 'nowrap',
            width: '100%'
          }}
        >
          {watchlist.map((item) => (
            <TickerCell key={`${item.assetClass}:${item.symbol}`} item={item} dir={colorDirection} />
          ))}
        </div>
      </div>
    </header>
  )
}

interface TickerCellProps {
  item: { symbol: string; assetClass: 'crypto' }
  dir: 'us' | 'cn'
}

function TickerCell({ item, dir }: TickerCellProps): JSX.Element {
  return <CryptoTicker symbol={item.symbol} dir={dir} />
}

function CryptoTicker({ symbol, dir }: { symbol: string; dir: 'us' | 'cn' }): JSX.Element {
  // For the ticker we use the spot price hook indirectly via useNativeBalance
  // is overkill — keep it simple: one shared CoinGecko call per symbol
  // through a tiny wrapper.
  const [price, setPrice] = useState<number | null>(null)
  const [change, setChange] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    const id = setInterval(async () => {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
            cgIdFor(symbol)
          )}&vs_currencies=usd&include_24hr_change=true`
        )
        if (!res.ok) return
        const data = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>
        const row = data[cgIdFor(symbol)]
        if (!cancelled && row) {
          setPrice(row.usd ?? null)
          setChange(row.usd_24h_change ?? null)
        }
      } catch {
        // network blip; keep last known value
      }
    }, 20_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [symbol])
  if (price == null || change == null) {
    return (
      <span className="text-[#5a5a60]">
        {symbol} <span className="opacity-60">…</span>
      </span>
    )
  }
  const up = change >= 0
  const positive = dir === 'us' ? up : !up
  return (
    <span className={positive ? 'text-emerald-400' : 'text-red-400'}>
      {symbol} <span className="font-semibold">{price.toFixed(price < 1 ? 4 : 2)}</span>{' '}
      <span className="opacity-80">{fmtPct(change, dir)}</span>
    </span>
  )
}

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

function AccountSummary(): JSX.Element {
  const { address, isConnected } = useAccount()
  const eth = useNativeBalance(address ?? null, 'ethereum')
  const total = eth.data?.balanceUsd ?? null
  return (
    <div
      className="flex items-center gap-1.5 pl-3 text-[10.5px]"
      style={{ borderLeft: '1px solid #1f1f23' }}
    >
      <span className="web3-label web3-text-muted">Account</span>
      <span className="font-mono font-semibold text-white tabular-nums">{fmtUsd(total)}</span>
      <span className="web3-text-muted">·</span>
      <span className="web3-text-muted">
        {isConnected ? '🟢 wallet' : '⚪ no wallet'}
      </span>
    </div>
  )
}
