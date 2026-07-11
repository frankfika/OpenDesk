// TradeWatchlist — left-rail crypto watchlist.
//
// The list comes from the trade store. Selecting a row sets the active
// symbol + scenario=chart so the centre pane knows what to render.
//
// Search input at the top filters the list. Pressing `/` from anywhere
// focuses it. (Crypto-only — stock support removed in v0.4.2.)

import { useMemo, useState } from 'react'
import { useTradeStore, type WatchlistItem } from '../../store/trade'
import { Search, X, Plus } from 'lucide-react'
import { fmtPct } from './format'

export default function TradeWatchlist(): JSX.Element {
  const watchlist = useTradeStore((s) => s.watchlist)
  const selectedSymbol = useTradeStore((s) => s.selectedSymbol)
  const selectedAsset = useTradeStore((s) => s.selectedAsset)
  const selectSymbol = useTradeStore((s) => s.selectSymbol)
  const setScenario = useTradeStore((s) => s.setScenario)
  const addWatch = useTradeStore((s) => s.addWatch)
  const removeWatch = useTradeStore((s) => s.removeWatch)
  const colorDirection = useTradeStore((s) => s.colorDirection)

  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = useMemo(() => {
    if (!query.trim()) return watchlist
    const q = query.toLowerCase()
    return watchlist.filter((w) => w.symbol.toLowerCase().includes(q))
  }, [watchlist, query])

  return (
    <aside
      className="flex w-[260px] shrink-0 flex-col border-r"
      style={{ background: '#0d0d0d', borderColor: '#1f1f23' }}
    >
      <div className="flex items-center gap-1 border-b px-2 py-1.5" style={{ borderColor: '#1f1f23' }}>
        <span className="px-2 text-[10.5px] font-mono font-semibold uppercase tracking-wide web3-text-muted">
          Crypto
        </span>
      </div>

      <div className="flex items-center gap-1 border-b px-2 py-1.5" style={{ borderColor: '#1f1f23' }}>
        <Search size={11} className="web3-text-muted shrink-0" />
        <input
          id="trade-watchlist-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter…  press / to focus"
          className="min-w-0 flex-1 bg-transparent text-[11.5px] text-white outline-none placeholder:web3-text-muted"
        />
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="text-[#1D8C80] hover:text-white"
          title="Add symbol"
        >
          <Plus size={12} />
        </button>
      </div>

      {showAdd && (
        <AddSymbolPanel
          onClose={() => setShowAdd(false)}
          onAdd={(sym) => {
            addWatch({ symbol: sym.toUpperCase(), assetClass: 'crypto' })
            setShowAdd(false)
          }}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-[11px] web3-text-muted">
            {query ? 'No matches' : 'Watchlist is empty. Add symbols to begin.'}
          </div>
        ) : (
          filtered.map((item) => (
            <WatchlistRow
              key={`${item.assetClass}:${item.symbol}`}
              item={item}
              isActive={item.symbol === selectedSymbol && item.assetClass === selectedAsset}
              dir={colorDirection}
              onSelect={() => {
                selectSymbol(item.symbol, item.assetClass)
                setScenario('chart')
              }}
              onRemove={() => removeWatch(item.symbol)}
            />
          ))
        )}
      </div>
    </aside>
  )
}

interface RowProps {
  item: WatchlistItem
  isActive: boolean
  dir: 'us' | 'cn'
  onSelect: () => void
  onRemove: () => void
}

function WatchlistRow({ item, isActive, dir, onSelect, onRemove }: RowProps): JSX.Element {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`group flex items-center gap-2 border-b px-3 py-1.5 cursor-pointer ${
        isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
      }`}
      style={{ borderColor: '#15151a' }}
    >
      <div className="flex w-12 shrink-0 items-center gap-1">
        <span className="text-[10px] uppercase web3-text-muted">₿</span>
        <span className="trade-num text-[12px] font-semibold text-white">{item.symbol}</span>
      </div>
      <WatchlistPrice item={item} dir={dir} />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="opacity-0 transition-opacity group-hover:opacity-100 web3-text-muted hover:text-white"
        title="Remove from watchlist"
      >
        <X size={11} />
      </button>
    </div>
  )
}

function WatchlistPrice({ item, dir }: { item: WatchlistItem; dir: 'us' | 'cn' }): JSX.Element {
  return <CryptoPriceCell symbol={item.symbol} dir={dir} />
}

function CryptoPriceCell({ symbol, dir }: { symbol: string; dir: 'us' | 'cn' }): JSX.Element {
  const [price, setPrice] = useState<number | null>(null)
  const [change, setChange] = useState<number | null>(null)
  // Re-fetch every 15 s. We intentionally don't share a cache with the
  // top bar — each row is small, the API is cheap, and a stale price
  // is worse than a duplicate call.
  useState(() => {
    const tick = () => {
      const id = cgIdFor(symbol)
      fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
          id
        )}&vs_currencies=usd&include_24hr_change=true`
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return
          const row = data[id]
          if (row) {
            setPrice(row.usd ?? null)
            setChange(row.usd_24h_change ?? null)
          }
        })
        .catch(() => {})
    }
    tick()
    const t = setInterval(tick, 15_000)
    return () => clearInterval(t)
  })
  if (price == null || change == null) {
    return <span className="trade-num flex-1 text-right text-[11px] web3-text-muted">…</span>
  }
  const up = change >= 0
  const positive = dir === 'us' ? up : !up
  return (
    <>
      <span className={`trade-num flex-1 text-right text-[12px] font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {price.toFixed(price < 1 ? 4 : 2)}
      </span>
      <span className={`trade-num w-14 text-right text-[10.5px] ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {fmtPct(change, dir)}
      </span>
    </>
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

interface AddProps {
  onClose: () => void
  onAdd: (symbol: string) => void
}

function AddSymbolPanel({ onClose, onAdd }: AddProps): JSX.Element {
  const [q, setQ] = useState('')
  return (
    <div className="border-b p-2" style={{ borderColor: '#1f1f23', background: '#101013' }}>
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase web3-text-muted">
        <span>Add crypto symbol</span>
        <button type="button" onClick={onClose} className="web3-text-muted hover:text-white">
          <X size={11} />
        </button>
      </div>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && q.trim()) {
            onAdd(q.trim().toUpperCase())
          }
        }}
        placeholder="Symbol e.g. LINK"
        className="w-full rounded border border-[#2a2a2e] bg-black/40 px-2 py-1 text-[12px] text-white outline-none placeholder:web3-text-muted"
      />
    </div>
  )
}
