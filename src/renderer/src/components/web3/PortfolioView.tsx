// PortfolioView — main "home" view. Shows real balance, token list, activity.
import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, ExternalLink, AlertCircle, Search, RefreshCw, Layers, Activity as ActivityIcon } from 'lucide-react'
import { useAccount } from 'wagmi'
import {
  CHAINS, ChainKey, MAINNET_KEYS,
  useNativeBalance, useTokenList, useTokenPrices, useActivity, useTokenTransfers,
  fmtUsd, fmtNumber, fmtPct, timeAgo, shortAddr
} from '../../hooks/useWeb3Data'
import Sparkline from './Sparkline'

const SAMPLE_ADDRESS = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'

export default function PortfolioView(): JSX.Element {
  const { address, isConnected } = useAccount()
  const [viewAddress, setViewAddress] = useState<string>('')
  const [inputValue, setInputValue] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (isConnected && address && !viewAddress) {
      setViewAddress(address)
    } else if (!isConnected && !viewAddress) {
      setViewAddress(SAMPLE_ADDRESS)
    }
  }, [isConnected, address, viewAddress])

  const handleSearch = async () => {
    const v = inputValue.trim()
    if (!v) return
    setSearching(true)
    try {
      let resolved = v
      if (v.toLowerCase().endsWith('.eth')) {
        const ens = await fetch(`/api/ens/ens/resolve/${v}`).then((r) => r.json()).catch(() => null)
        if (ens?.address) resolved = ens.address
      } else if (!/^0x[a-fA-F0-9]{40}$/.test(v)) {
        return
      }
      setViewAddress(resolved)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 pt-5 pb-3 border-b border-[var(--web3-border)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="web3-label">Watching</span>
          {!isConnected && <span className="web3-label web3-status-warn">SAMPLE · CONNECT TO USE YOURS</span>}
        </div>
        <div className="web3-input">
          <Search size={12} className="web3-text-muted shrink-0" />
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
            placeholder="Paste address or ENS (e.g. vitalik.eth)"
            className="flex-1 bg-transparent outline-none text-[12px] font-mono text-white placeholder:web3-text-muted min-w-0"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="rounded-md px-2 py-1 text-[10px] font-bold web3-text-body hover:text-white bg-[var(--web3-card-hover)] hover:bg-[var(--web3-border-strong)] transition-colors disabled:opacity-50"
          >
            {searching ? '...' : 'Look up'}
          </button>
          {isConnected && address && (
            <button
              type="button"
              onClick={() => setViewAddress(address)}
              className="rounded-md px-2 py-1 text-[10px] font-bold web3-text-body hover:text-white bg-[var(--web3-card-hover)] hover:bg-[var(--web3-border-strong)] transition-colors"
            >
              My wallet
            </button>
          )}
        </div>
        <div className="mt-2 web3-label web3-text-muted break-all">
          {viewAddress}
        </div>
      </div>

      <PortfolioContent address={viewAddress} />
    </div>
  )
}

function PortfolioContent({ address }: { address: string }): JSX.Element {
  const [activeChain, setActiveChain] = useState<ChainKey>('ethereum')
  const native = useNativeBalance(address, activeChain)
  const tokens = useTokenList(address, activeChain)
  const activity = useActivity(address, activeChain, 8)
  const transfers = useTokenTransfers(address, activeChain, 8)

  const symbols = useMemo(() => {
    const s = new Set<string>([CHAINS[activeChain].symbol])
    if (tokens.data) tokens.data.forEach((t) => s.add(t.symbol))
    return Array.from(s)
  }, [tokens.data, activeChain])
  const prices = useTokenPrices(symbols)

  const totalUsd = useMemo(() => {
    let total = 0
    const ethPrice = prices.data?.ETH?.usd ?? 0
    if (native.data) {
      const nativeUsd = parseFloat(native.data.balance) * (activeChain === 'bsc' ? prices.data?.BNB?.usd ?? 0 : ethPrice)
      total += nativeUsd
    }
    if (tokens.data) {
      for (const t of tokens.data) {
        const price = prices.data?.[t.symbol.toUpperCase()]?.usd
        if (price) total += parseFloat(t.balanceFormatted) * price
      }
    }
    return total
  }, [native.data, tokens.data, prices.data, activeChain])

  const ethChange = prices.data?.ETH?.usd_24h_change ?? null
  const totalChange = ethChange ?? 0

  return (
    <div className="p-6 space-y-5">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="web3-card web3-card-pad-lg relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(29, 140, 128, 0.08) 0%, rgba(0, 0, 0, 0.4) 100%)'
        }}
      >
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(29, 140, 128, 0.2) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 web3-label web3-status-live mb-1.5">
            <ActivityIcon size={10} />
            Net Worth · {CHAINS[activeChain].name}
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <div className="text-5xl font-bold text-white tracking-tight font-mono">
              {tokens.loading || prices.loading ? (
                <span className="inline-block w-32 h-12 rounded-md bg-white/5 animate-pulse" />
              ) : (
                fmtUsd(totalUsd)
              )}
            </div>
            {ethChange != null && totalUsd > 0 && (
              <div className={`flex items-center gap-1 text-[14px] font-mono font-bold ${totalChange >= 0 ? 'web3-status-live' : 'web3-status-error'}`}>
                {totalChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {fmtPct(totalChange, 2)}
                <span className="web3-text-muted font-normal text-[11px] ml-1">24h</span>
              </div>
            )}
          </div>
          <div className="web3-label web3-text-muted">{shortAddr(address)}</div>

          <div className="flex items-center gap-1.5 mt-4 flex-wrap">
            {MAINNET_KEYS.map((k) => {
              const meta = CHAINS[k]
              const active = activeChain === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setActiveChain(k)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10.5px] font-mono font-semibold transition-colors ${
                    active
                      ? 'bg-white/10 text-white border border-[#3a3a3e]'
                      : 'web3-text-muted hover:web3-text-body hover:bg-[#181820] border border-transparent'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
                  {meta.shortName}
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* 3-up stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Native"
          value={`${fmtNumber(parseFloat(native.data?.balance ?? '0'), 4)} ${CHAINS[activeChain].symbol}`}
          sub={fmtUsd(parseFloat(native.data?.balance ?? '0') * (prices.data?.[CHAINS[activeChain].symbol]?.usd ?? 0))}
          loading={native.loading}
        />
        <StatCard
          label="Tokens"
          value={String(tokens.data?.length ?? 0)}
          sub="held"
          loading={tokens.loading}
        />
        <StatCard
          label="Activity"
          value={String(activity.data?.length ?? 0)}
          sub="recent tx"
          loading={activity.loading}
        />
      </div>

      {/* Token list */}
      <div className="web3-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1f1f23] flex items-center justify-between">
          <div className="web3-label">Tokens on {CHAINS[activeChain].name}</div>
          <div className="web3-label web3-text-muted">{tokens.data?.length ?? 0} holdings</div>
        </div>

        {tokens.error && <ErrorRow message={tokens.error} onRetry={tokens.refetch} />}
        {!tokens.loading && tokens.data && tokens.data.length === 0 && (
          <EmptyRow icon={Layers} title="No tokens held" hint="This address has no ERC-20 token balance on this chain." />
        )}

        {tokens.loading && (
          <div className="divide-y divide-white/5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/5 animate-pulse" />
                  <div>
                    <div className="w-20 h-3 rounded bg-white/5 animate-pulse mb-1" />
                    <div className="w-12 h-2 rounded bg-white/5 animate-pulse" />
                  </div>
                </div>
                <div className="w-16 h-6 rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {tokens.data && tokens.data.length > 0 && (
          <div className="divide-y divide-white/5">
            {tokens.data.map((t, i) => {
              const sym = t.symbol.toUpperCase()
              const price = prices.data?.[sym]
              const usd = price ? parseFloat(t.balanceFormatted) * price.usd : null
              const change = price?.usd_24h_change ?? null
              return (
                <motion.a
                  key={t.contractAddress}
                  href={`${CHAINS[activeChain].explorer}/token/${t.contractAddress}?a=${address}`}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#141416] transition-colors"
                >
                  <TokenLogo symbol={t.symbol} color={CHAINS[activeChain].color} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-white truncate">{t.symbol}</div>
                    <div className="web3-label web3-text-muted truncate">{t.name}</div>
                  </div>
                  {price?.sparkline && price.sparkline.length > 1 && (
                    <Sparkline data={price.sparkline} width={56} height={18} positive={(change ?? 0) >= 0} className="opacity-80" />
                  )}
                  <div className="text-right min-w-[80px]">
                    <div className="text-[12px] font-mono font-semibold text-white">
                      {fmtNumber(parseFloat(t.balanceFormatted), 4)}
                    </div>
                    <div className={`text-[10px] font-mono ${change != null ? (change >= 0 ? 'web3-status-live' : 'web3-status-error') : 'web3-text-muted'}`}>
                      {usd != null ? fmtUsd(usd, { compact: true }) : '—'}
                      {change != null && ` ${fmtPct(change, 1)}`}
                    </div>
                  </div>
                  <ExternalLink size={11} className="web3-text-muted opacity-50" />
                </motion.a>
              )
            })}
          </div>
        )}
      </div>

      {/* Activity */}
      <div className="web3-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1f1f23] flex items-center justify-between">
          <div className="web3-label">Recent Activity</div>
          <a
            href={`${CHAINS[activeChain].explorer}/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="web3-label web3-status-accent hover:underline flex items-center gap-1"
          >
            View all <ExternalLink size={9} />
          </a>
        </div>
        {activity.error && <ErrorRow message={activity.error} onRetry={activity.refetch} />}
        {!activity.loading && activity.data && activity.data.length === 0 && transfers.data && transfers.data.length === 0 && (
          <EmptyRow icon={ActivityIcon} title="No activity" hint="This address has no transactions or token transfers on this chain." />
        )}
        {(activity.loading || transfers.loading) && (
          <div className="divide-y divide-white/5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
                <div className="flex-1">
                  <div className="w-32 h-3 rounded bg-white/5 animate-pulse mb-1" />
                  <div className="w-20 h-2 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!activity.loading && !transfers.loading && (activity.data?.length || transfers.data?.length) ? (
          <div className="divide-y divide-white/5">
            {[
              ...(activity.data ?? []).map((a) => ({ kind: 'tx' as const, ts: a.timestamp, data: a })),
              ...(transfers.data ?? []).map((t) => ({ kind: 'transfer' as const, ts: t.timestamp, data: t }))
            ]
              .sort((a, b) => b.ts - a.ts)
              .slice(0, 10)
              .map((item, i) =>
                item.kind === 'tx' ? (
                  <ActivityRow key={`tx-${item.data.hash}-${i}`} hash={item.data.hash} method={item.data.method ?? 'Tx'} time={item.data.timestamp} value={item.data.valueFormatted} symbol={CHAINS[activeChain].symbol} isError={item.data.isError} direction={item.data.direction} chain={activeChain} />
                ) : (
                  <TransferRow key={`tt-${item.data.hash}-${i}`} hash={item.data.hash} symbol={item.data.tokenSymbol} value={item.data.valueFormatted} time={item.data.timestamp} to={item.data.to} chain={activeChain} address={address} />
                )
              )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, loading }: { label: string; value: string; sub: string; loading?: boolean }): JSX.Element {
  return (
    <div className="web3-card web3-card-pad">
      <div className="web3-label mb-1.5">{label}</div>
      {loading ? (
        <div className="w-20 h-5 rounded bg-white/5 animate-pulse mb-0.5" />
      ) : (
        <div className="text-[15px] font-mono font-bold text-white">{value}</div>
      )}
      <div className="text-[10px] web3-text-muted mt-0.5">{sub}</div>
    </div>
  )
}

function TokenLogo({ symbol, color }: { symbol: string; color: string }): JSX.Element {
  const initial = symbol.slice(0, 1).toUpperCase()
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}80)`, boxShadow: `0 0 8px ${color}40` }}
    >
      {initial}
    </div>
  )
}

function ActivityRow({ hash, method, time, value, symbol, isError, direction, chain }: {
  hash: string
  method: string
  time: number
  value: string
  symbol: string
  isError: boolean
  direction: 'in' | 'out' | 'self'
  chain: ChainKey
}): JSX.Element {
  return (
    <a
      href={`${CHAINS[chain].explorer}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#141416] transition-colors"
    >
      <DirectionArrow direction={direction} />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-white">{method}</div>
        <div className="web3-label web3-text-muted">{timeAgo(time)} · {shortAddr(hash)}</div>
      </div>
      <div className="text-right">
        <div className={`text-[11.5px] font-mono font-semibold ${direction === 'in' ? 'web3-status-live' : direction === 'out' ? 'web3-text-strong' : 'web3-text-body'}`}>
          {direction === 'in' ? '+' : direction === 'out' ? '-' : ''}
          {fmtNumber(parseFloat(value), 4)} {symbol}
        </div>
        {isError && <div className="web3-label web3-status-error">FAILED</div>}
      </div>
      <ExternalLink size={11} className="web3-text-muted opacity-50" />
    </a>
  )
}

function TransferRow({ hash, symbol, value, time, to, chain, address }: {
  hash: string
  symbol: string
  value: string
  time: number
  to: string
  chain: ChainKey
  address: string
}): JSX.Element {
  const incoming = to.toLowerCase() === address.toLowerCase()
  return (
    <a
      href={`${CHAINS[chain].explorer}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#141416] transition-colors"
    >
      <DirectionArrow direction={incoming ? 'in' : 'out'} />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-white">Transfer {symbol}</div>
        <div className="web3-label web3-text-muted">{timeAgo(time)} · {shortAddr(hash)}</div>
      </div>
      <div className="text-right">
        <div className={`text-[11.5px] font-mono font-semibold ${incoming ? 'web3-status-live' : 'web3-text-strong'}`}>
          {incoming ? '+' : '-'}
          {fmtNumber(parseFloat(value), 4)} {symbol}
        </div>
      </div>
      <ExternalLink size={11} className="web3-text-muted opacity-50" />
    </a>
  )
}

function DirectionArrow({ direction }: { direction: 'in' | 'out' | 'self' }): JSX.Element {
  if (direction === 'in') {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-emerald-500/15 border border-emerald-500/30">
        <span className="text-emerald-400 text-[10px]">↓</span>
      </div>
    )
  }
  if (direction === 'out') {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 border border-[#2a2a2e]">
        <span className="web3-text-secondary text-[10px]">↑</span>
      </div>
    )
  }
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 border border-[#2a2a2e]">
      <RefreshCw size={10} className="web3-text-muted" />
    </div>
  )
}

function ErrorRow({ message, onRetry }: { message: string; onRetry: () => void }): JSX.Element {
  return (
    <div className="px-5 py-4 flex items-center gap-2 text-[11px] text-red-300">
      <AlertCircle size={12} className="shrink-0" />
      <span className="flex-1 font-mono">{message}</span>
      <button type="button" onClick={onRetry} className="web3-text-secondary hover:text-white">Retry</button>
    </div>
  )
}

function EmptyRow({ icon: Icon, title, hint }: { icon: typeof ActivityIcon | typeof Layers; title: string; hint: string }): JSX.Element {
  return (
    <div className="px-5 py-6 text-center">
      <Icon size={20} className="mx-auto web3-text-muted opacity-40 mb-2" />
      <div className="text-[12px] web3-text-body font-medium">{title}</div>
      <div className="text-[10.5px] web3-text-muted mt-0.5">{hint}</div>
    </div>
  )
}
