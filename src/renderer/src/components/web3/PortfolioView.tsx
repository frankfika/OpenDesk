// PortfolioView — main "home" view. Shows real balance, token list, activity.
import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAppKit } from '@reown/appkit/react'
import {
  TrendingUp,
  TrendingDown,
  ExternalLink,
  AlertCircle,
  Search,
  ArrowRight,
  RefreshCw,
  Layers,
  Activity as ActivityIcon,
  ScanLine,
  ShieldCheck,
  Zap,
  type LucideIcon
} from 'lucide-react'
import { useAccount } from 'wagmi'
import {
  CHAINS,
  ChainKey,
  MAINNET_KEYS,
  useNativeBalance,
  useTokenList,
  useTokenPrices,
  useActivity,
  useTokenTransfers,
  useMultiChainNativeBalances,
  fmtUsd,
  fmtNumber,
  fmtPct,
  timeAgo,
  shortAddr
} from '../../hooks/useWeb3Data'
import { useWeb3Store, type Web3ScenarioId } from '../../store/web3'
import Sparkline from './Sparkline'

export default function PortfolioView(): JSX.Element {
  const { address, isConnected } = useAccount()
  const [viewAddress, setViewAddress] = useState<string>('')

  // When the user connects their wallet, default the view to their own
  // address. Until they connect, leave the field empty — the user is
  // expected to type or paste the address they want to inspect. (An older
  // version of this file used vitalik.eth as a default "demo" address,
  // which made the workbench look like it was inspecting someone else's
  // wallet; that was removed for the v1 cutover.)
  useEffect(() => {
    if (isConnected && address && !viewAddress) {
      setViewAddress(address)
    }
  }, [isConnected, address, viewAddress])

  return (
    <div className="h-full overflow-y-auto">
      <PortfolioContent
        address={viewAddress}
        connectedAddress={address}
        isConnected={isConnected}
        onSetAddress={setViewAddress}
      />
    </div>
  )
}

function PortfolioContent({
  address,
  connectedAddress,
  isConnected,
  onSetAddress
}: {
  address: string
  connectedAddress?: `0x${string}`
  isConnected: boolean
  onSetAddress: (address: string) => void
}): JSX.Element {
  const [activeChain, setActiveChain] = useState<ChainKey>('ethereum')
  const { chainId } = useAccount()
  useEffect(() => {
    if (chainId) {
      const key = Object.values(CHAINS).find(c => c.chain.id === chainId)?.key
      if (key) setActiveChain(key as ChainKey)
    }
  }, [chainId])
  const [taskInput, setTaskInput] = useState('')
  const [resolving, setResolving] = useState(false)
  const [searchError, setSearchError] = useState('')
  const native = useNativeBalance(address, activeChain)
  const tokens = useTokenList(address, activeChain)
  const activity = useActivity(address, activeChain, 8)
  const transfers = useTokenTransfers(address, activeChain, 8)
  const multiChain = useMultiChainNativeBalances(address)
  const setActiveScenario = useWeb3Store((s) => s.setActiveScenario)
  const setPendingTxRequest = useWeb3Store((s) => s.setPendingTxRequest)
  const { open } = useAppKit()

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
      const nativeUsd =
        parseFloat(native.data.balance) * (activeChain === 'bsc' ? (prices.data?.BNB?.usd ?? 0) : ethPrice)
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

  const totalMultiChainUsd = useMemo(() => {
    if (!multiChain.data) return 0
    return multiChain.data.reduce((sum, b) => sum + (b.balanceUsd ?? 0), 0)
  }, [multiChain.data])

  const ethChange = prices.data?.ETH?.usd_24h_change ?? null
  const totalChange = ethChange ?? 0
  const runScenario = (scenario: Web3ScenarioId, prompt: string) => {
    setActiveScenario(scenario)
    window.dispatchEvent(new CustomEvent('opendesk:fill-input', { detail: { text: prompt } }))
  }

  const runDoctorScan = (target: string) => {
    setActiveScenario('doctor')
    window.dispatchEvent(
      new CustomEvent('opendesk:web3:set-doctor-address', { detail: { address: target, chain: activeChain } })
    )
    window.dispatchEvent(
      new CustomEvent('opendesk:fill-input', { detail: { text: `Scan ${target} for risky approvals` } })
    )
  }

  const openSignerCheck = () => {
    setActiveScenario('trade')
    if (!connectedAddress) {
      void open({ view: 'Connect' })
      window.dispatchEvent(
        new CustomEvent('opendesk:fill-input', {
          detail: { text: 'Connect a wallet, then run signer check again.' }
        })
      )
      return
    }
    setPendingTxRequest({
      id: `local-signer-check-${Date.now()}`,
      chain: activeChain,
      chainName: CHAINS[activeChain].name,
      from: connectedAddress,
      to: connectedAddress,
      data: '0x',
      value: '0',
      description:
        `Signer check on ${CHAINS[activeChain].name}: prepare a 0 ${CHAINS[activeChain].symbol} self-transaction. ` +
        'Review the wallet popup carefully; signing may still spend gas, and you can reject safely.'
    })
    window.dispatchEvent(
      new CustomEvent('opendesk:fill-input', {
        detail: { text: `Signer check ready on ${CHAINS[activeChain].name}. Review the transaction card.` }
      })
    )
  }

  const resolveAddress = async (value: string) => {
    if (value.toLowerCase().endsWith('.eth')) {
      const ens = await fetch(`/api/ens/ens/resolve/${value}`)
        .then((r) => r.json())
        .catch(() => null)
      return ens?.address || null
    }
    return /^0x[a-fA-F0-9]{40}$/.test(value) ? value : null
  }

  const submitTask = async () => {
    const value = taskInput.trim()
    if (!value) return
    setResolving(true)
    try {
      if (/^0x[a-fA-F0-9]{64}$/.test(value)) {
        setSearchError('暂不支持 tx hash，试试地址或 token')
        return
      }
      if (/^[a-zA-Z]+$/.test(value)) {
        setSearchError('暂不支持 token 分析，试试地址或 ENS')
        return
      }
      const resolved = await resolveAddress(value)
      if (resolved) {
        onSetAddress(resolved)
        runScenario('intel', `Analyze ${resolved}`)
        setTaskInput('')
        return
      }
      runScenario('chat', value)
      setTaskInput('')
    } finally {
      setResolving(false)
    }
  }

  useEffect(() => {
    if (searchError) {
      const timer = setTimeout(() => setSearchError(''), 500)
      return () => clearTimeout(timer)
    }
  }, [searchError])

  const missions = [
    {
      icon: ScanLine,
      title: 'Whale teardown',
      detail: 'Analyze vitalik.eth across chains',
      cta: 'Run report',
      onClick: () => runScenario('intel', 'Analyze vitalik.eth')
    },
    {
      icon: ShieldCheck,
      title: 'Approval danger check',
      detail: 'Find spenders that can move tokens',
      cta: 'Scan risk',
      onClick: () => runDoctorScan(address)
    },
    {
      icon: Zap,
      title: 'Signer check',
      detail: 'Open a real wallet confirmation card',
      cta: 'Open signer',
      onClick: openSignerCheck
    },
    {
      icon: ActivityIcon,
      title: 'Explain activity',
      detail: 'Turn transactions into plain English',
      cta: 'Explain',
      onClick: () => runScenario('chat', `Explain the recent activity for ${address}`)
    }
  ]

  return (
    <div className="p-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="web3-card overflow-hidden"
      >
        <div className="px-6 pt-5 pb-6">
          <div className="web3-label web3-status-accent mb-3">Command center</div>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-[28px] font-bold leading-[1.15] text-white tracking-tight">
                Pick a mission. <span className="web3-text-muted">OpenDesk turns wallet noise into action.</span>
              </h1>
              <p className="mt-2 text-[12.5px] web3-text-body leading-relaxed">
                Drop a wallet, ask a task, or run a live example. The agent will analyze, explain, and prepare the next
                move.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isConnected && connectedAddress && (
                <button type="button" onClick={() => onSetAddress(connectedAddress)} className="web3-btn">
                  My wallet
                </button>
              )}
              <span className="web3-label web3-text-muted">
                {isConnected ? 'Wallet connected' : 'Sample wallet active'}
              </span>
            </div>
          </div>

          <div
            className="mt-5 flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{
              background: '#0a0a0a',
              border: '1px solid var(--web3-border)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset'
            }}
          >
            <Search size={15} className="web3-text-muted shrink-0" />
            <input
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submitTask()}
              placeholder="Paste vitalik.eth, 0x..., or ask: Find risky approvals"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-white outline-none placeholder:web3-text-muted"
            />
            <button
              type="button"
              onClick={submitTask}
              disabled={!taskInput.trim() || resolving}
              className="web3-btn web3-btn-primary disabled:opacity-30"
            >
              {resolving ? 'Checking' : 'Run'}
              <ArrowRight size={11} />
            </button>
          </div>
          {searchError && <div className='mt-2 text-[11px] text-red-400'>{searchError}</div>}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10.5px] font-mono web3-text-muted">Quick intel:</span>
            {[
              { label: 'vitalik.eth', value: 'vitalik.eth' },
              { label: 'ens.eth', value: 'ens.eth' },
              { label: 'brantly.eth', value: 'brantly.eth' }
            ].map((q) => (
              <button
                key={q.value}
                type="button"
                onClick={() => {
                  setTaskInput(q.value)
                  void submitTask()
                }}
                className="text-[10.5px] font-mono web3-text-muted hover:text-white px-2 py-0.5 rounded-md border border-[#1f1f23] hover:border-[#1D8C80]/30 bg-transparent hover:bg-[#141416] transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Missions — 2x2 independent cards (not divide-style list items) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {missions.map((mission) => (
          <MissionButton
            key={mission.title}
            icon={mission.icon}
            title={mission.title}
            detail={mission.detail}
            cta={mission.cta}
            onClick={mission.onClick}
          />
        ))}
      </div>

      {/* Multi-chain total */}
      <div className="web3-card web3-card-pad overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 web3-label web3-text-muted mb-1.5">
              <Layers size={10} />
              Total across all chains
            </div>
            <div className="flex items-end gap-3">
              <div className="text-[32px] font-bold text-white tracking-tight font-mono leading-none">
                {multiChain.loading ? (
                  <span className="inline-block w-28 h-8 rounded-md bg-white/5 animate-pulse" />
                ) : (
                  fmtUsd(totalMultiChainUsd)
                )}
              </div>
              {ethChange != null && (
                <div className={`flex items-center gap-1 pb-1 text-[12px] font-mono font-bold ${ethChange >= 0 ? 'web3-status-live' : 'web3-status-error'}`}>
                  {ethChange >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {fmtPct(ethChange, 2)}
                  <span className="web3-text-muted font-normal text-[10px] ml-0.5">24h</span>
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] web3-text-muted font-mono">
              <span className="truncate" title={address}>{shortAddr(address)}</span>
              <span className="opacity-50">·</span>
              <span>{multiChain.data?.filter(b => b.balanceUsd && b.balanceUsd > 0).length ?? 0} chains</span>
            </div>
          </div>
        </div>

        {/* 链分布条 */}
        <div className="mt-3 flex h-1.5 rounded-full overflow-hidden">
          {multiChain.loading ? (
            <div className="h-full w-full bg-white/5 animate-pulse" />
          ) : (
            multiChain.data?.filter(b => b.balanceUsd && b.balanceUsd > 0).map(b => {
              const pct = totalMultiChainUsd > 0 ? (b.balanceUsd! / totalMultiChainUsd) * 100 : 0
              return (
                <div
                  key={b.chain}
                  className="h-full"
                  style={{ width: `${pct}%`, background: CHAINS[b.chain].color }}
                  title={`${CHAINS[b.chain].name}: ${fmtUsd(b.balanceUsd!)}`}
                />
              )
            })
          )}
        </div>

        {/* 图例 */}
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          {multiChain.loading ? (
            <span className="text-[10px] font-mono web3-text-muted">Loading…</span>
          ) : (
            multiChain.data?.filter(b => b.balanceUsd && b.balanceUsd > 0).map(b => {
              const pct = totalMultiChainUsd > 0 ? (b.balanceUsd! / totalMultiChainUsd) * 100 : 0
              return (
                <span key={b.chain} className="flex items-center gap-1 text-[10px] font-mono web3-text-muted">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: CHAINS[b.chain].color, boxShadow: `0 0 4px ${CHAINS[b.chain].color}` }} />
                  {CHAINS[b.chain].shortName} {fmtPct(pct, 0)}
                </span>
              )
            })
          )}
        </div>
      </div>

      <div className="web3-card web3-card-pad overflow-hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 web3-label web3-text-muted mb-1.5">
              <ActivityIcon size={10} />
              {CHAINS[activeChain].name}
            </div>
            <div className="flex items-end gap-3">
              <div className="text-[32px] font-bold text-white tracking-tight font-mono leading-none">
                {tokens.loading || prices.loading ? (
                  <span className="inline-block w-28 h-8 rounded-md bg-white/5 animate-pulse" />
                ) : (
                  fmtUsd(totalUsd)
                )}
              </div>
              {ethChange != null && totalUsd > 0 && (
                <div
                  className={`flex items-center gap-1 pb-1 text-[12px] font-mono font-bold ${totalChange >= 0 ? 'web3-status-live' : 'web3-status-error'}`}
                >
                  {totalChange >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {fmtPct(totalChange, 2)}
                  <span className="web3-text-muted font-normal text-[10px] ml-0.5">24h</span>
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] web3-text-muted font-mono">
              <span className="truncate" title={address}>
                {shortAddr(address)}
              </span>
              <span className="opacity-50">·</span>
              <span>{CHAINS[activeChain].symbol} {fmtNumber(parseFloat(native.data?.balance ?? '0'), 4)}</span>
              <span className="opacity-50">·</span>
              <span>{tokens.data?.length ?? 0} tokens</span>
              <span className="opacity-50">·</span>
              <span>{activity.data?.length ?? 0} tx</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap xl:justify-end xl:max-w-[360px]">
            {MAINNET_KEYS.slice(0, 5).map((k) => {
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
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
                  />
                  {meta.shortName}
                </button>
              )
            })}
            {MAINNET_KEYS.length > 5 && (
              <span className="px-1.5 py-1 text-[10.5px] font-mono web3-text-muted">
                +{MAINNET_KEYS.length - 5} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Token list */}
      <div className="web3-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1f1f23] flex items-center justify-between">
          <div className="web3-label">Tokens on {CHAINS[activeChain].name}</div>
          <div className="web3-label web3-text-muted">{tokens.data?.length ?? 0} holdings</div>
        </div>

        {tokens.error && <ErrorRow message={tokens.error} onRetry={tokens.refetch} />}
        {!tokens.loading && tokens.data && tokens.data.length === 0 && (
          <EmptyRow
            icon={Layers}
            title="No tokens held"
            hint="This address has no ERC-20 token balance on this chain."
          />
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
                    <Sparkline
                      data={price.sparkline}
                      width={56}
                      height={18}
                      positive={(change ?? 0) >= 0}
                      className="opacity-80"
                    />
                  )}
                  <div className="text-right min-w-[80px]">
                    <div className="text-[12px] font-mono font-semibold text-white">
                      {fmtNumber(parseFloat(t.balanceFormatted), 4)}
                    </div>
                    <div
                      className={`text-[10px] font-mono ${change != null ? (change >= 0 ? 'web3-status-live' : 'web3-status-error') : 'web3-text-muted'}`}
                    >
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
        {!activity.loading &&
          activity.data &&
          activity.data.length === 0 &&
          transfers.data &&
          transfers.data.length === 0 && (
            <EmptyRow
              icon={ActivityIcon}
              title="No activity"
              hint="This address has no transactions or token transfers on this chain."
            />
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
                  <ActivityRow
                    key={`tx-${item.data.hash}-${i}`}
                    hash={item.data.hash}
                    method={item.data.method ?? 'Tx'}
                    time={item.data.timestamp}
                    value={item.data.valueFormatted}
                    symbol={CHAINS[activeChain].symbol}
                    isError={item.data.isError}
                    direction={item.data.direction}
                    chain={activeChain}
                  />
                ) : (
                  <TransferRow
                    key={`tt-${item.data.hash}-${i}`}
                    hash={item.data.hash}
                    symbol={item.data.tokenSymbol}
                    value={item.data.valueFormatted}
                    time={item.data.timestamp}
                    from={item.data.from}
                    to={item.data.to}
                    chain={activeChain}
                    address={address}
                  />
                )
              )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MissionButton({
  icon: Icon,
  title,
  detail,
  cta,
  onClick
}: {
  icon: LucideIcon
  title: string
  detail: string
  cta: string
  onClick: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[112px] items-start gap-3 rounded-xl border border-[var(--web3-border)] bg-[var(--web3-card)] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1D8C80]/60 hover:shadow-[0_8px_24px_-12px_rgba(29,140,128,0.5)] active:translate-y-0"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#1D8C80]/30 bg-[#1D8C80]/15 text-[#1D8C80] transition-colors group-hover:bg-[#1D8C80]/25">
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-white tracking-tight">{title}</div>
        <div className="mt-1 text-[11px] web3-text-muted leading-relaxed">{detail}</div>
        <div className="mt-3 flex items-center gap-1 text-[10.5px] font-mono font-bold tracking-wider uppercase text-[#1D8C80]">
          {cta}
          <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
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

function ActivityRow({
  hash,
  method,
  time,
  value,
  symbol,
  isError,
  direction,
  chain
}: {
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
        <div className="web3-label web3-text-muted">
          {timeAgo(time)} · {shortAddr(hash)}
        </div>
      </div>
      <div className="text-right">
        <div
          className={`text-[11.5px] font-mono font-semibold ${direction === 'in' ? 'web3-status-live' : direction === 'out' ? 'web3-text-strong' : 'web3-text-body'}`}
        >
          {direction === 'in' ? '+' : direction === 'out' ? '-' : ''}
          {fmtNumber(parseFloat(value), 4)} {symbol}
        </div>
        {isError && <div className="web3-label web3-status-error">FAILED</div>}
      </div>
      <ExternalLink size={11} className="web3-text-muted opacity-50" />
    </a>
  )
}

function TransferRow({
  hash,
  symbol,
  value,
  time,
  from,
  to,
  chain,
  address
}: {
  hash: string
  symbol: string
  value: string
  time: number
  from: string
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
        <div className="web3-label web3-text-muted">
          {timeAgo(time)} · {shortAddr(hash)}
        </div>
        <div className="web3-label web3-text-muted">From {shortAddr(from)} · To {shortAddr(to)}</div>
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
      <button type="button" onClick={onRetry} className="web3-text-secondary hover:text-white">
        Retry
      </button>
    </div>
  )
}

function EmptyRow({
  icon: Icon,
  title,
  hint
}: {
  icon: typeof ActivityIcon | typeof Layers
  title: string
  hint: string
}): JSX.Element {
  return (
    <div className="px-5 py-6 text-center">
      <Icon size={20} className="mx-auto web3-text-muted opacity-40 mb-2" />
      <div className="text-[12px] web3-text-body font-medium">{title}</div>
      <div className="text-[10.5px] web3-text-muted mt-0.5">{hint}</div>
    </div>
  )
}
