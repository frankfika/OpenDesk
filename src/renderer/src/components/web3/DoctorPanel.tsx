// DoctorPanel — scan a wallet for risky ERC20 approvals.
import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, ShieldAlert, AlertTriangle, Search, Loader2, Lock } from 'lucide-react'
import { useAccount } from 'wagmi'
import { CHAINS, ChainKey, useTokenList, useApprovals, Approval, fmtNumber } from '../../hooks/useWeb3Data'

const ACCENT = 'var(--web3-doctor)'

export default function DoctorPanel(): JSX.Element {
  const [viewAddress, setViewAddress] = useState('')
  const [input, setInput] = useState('')
  const [chain, setChain] = useState<ChainKey>('ethereum')
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isConnected, address } = useAccount()

  useEffect(() => {
    if (isConnected && address && !viewAddress) {
      setViewAddress(address)
    }
  }, [isConnected, address, viewAddress])

  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent<{ address?: string; chain?: ChainKey }>).detail
      if (next?.address) setViewAddress(next.address)
      if (next?.chain) setChain(next.chain)
      setInput('')
    }
    window.addEventListener('opendesk:web3:set-doctor-address', handler)
    return () => window.removeEventListener('opendesk:web3:set-doctor-address', handler)
  }, [])

  const handleSearch = async () => {
    const v = input.trim()
    if (!v) return
    setError(null)
    setResolving(true)
    try {
      let resolved = v
      if (v.toLowerCase().endsWith('.eth')) {
        const ens = await fetch(`/api/ens/ens/resolve/${v}`)
          .then((r) => r.json())
          .catch(() => null)
        if (ens?.address) {
          resolved = ens.address
        } else {
          setError('ENS resolution failed')
          return
        }
      } else if (!/^0x[a-fA-F0-9]{40}$/.test(v)) {
        setError('Invalid address format')
        return
      }
      setViewAddress(resolved)
    } finally {
      setResolving(false)
    }
  }

  const tokens = useTokenList(viewAddress, chain)
  const approvals = useApprovals(viewAddress, chain, tokens.data ?? [])

  const healthScore = useMemo(() => {
    if (!approvals.data || approvals.loading) return null
    const total = approvals.data.length
    const high = approvals.data.filter((a) => a.risk === 'high').length
    if (total === 0) return 100
    const medium = total - high
    return Math.max(0, Math.round(100 - medium * 5 - high * 12))
  }, [approvals.data, approvals.loading])

  const healthColor = (s: number) => (s >= 80 ? '#10b981' : s >= 60 ? '#1D8C80' : s >= 40 ? '#f59e0b' : '#ef4444')
  // TODO: pull these into web3 status tokens when refactoring ApprovalRow
  const healthLabel = (s: number) => (s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Caution' : 'High Risk')

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="web3-card web3-card-pad">
        <div className="web3-label mb-1.5">Scan wallet</div>
        <div className="web3-input">
          <Search size={12} className="web3-text-muted shrink-0" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
            placeholder="Address or ENS (e.g. vitalik.eth)"
            className="flex-1 bg-transparent outline-none text-[12px] font-mono text-white placeholder:web3-text-muted min-w-0"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={resolving}
            className="rounded-md px-2 py-1 text-[10px] font-bold web3-text-body bg-[var(--web3-card-hover)] hover:bg-[var(--web3-border-strong)] transition-colors"
          >
            {resolving ? <Loader2 size={12} className='animate-spin' /> : 'Scan'}
          </button>
        </div>
        {error && (
          <div className="mt-2 flex items-center gap-2">
            <div className="text-[11px] text-red-400 font-mono flex-1">{error}</div>
            <button
              type="button"
              onClick={() => {
                setError(null)
                handleSearch()
              }}
              className="rounded-md px-2 py-1 text-[10px] font-bold web3-text-body bg-[var(--web3-card-hover)] hover:bg-[var(--web3-border-strong)] transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        <div className="mt-2 web3-label web3-text-muted break-all">{viewAddress}</div>
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {(['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'bsc'] as ChainKey[]).map((k) => {
            const meta = CHAINS[k]
            const active = chain === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => setChain(k)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10.5px] font-mono font-semibold transition-colors ${
                  active
                    ? 'bg-[var(--web3-card-active)] text-white border border-[var(--web3-border-strong)]'
                    : 'web3-text-muted hover:web3-text-body hover:bg-[var(--web3-card-hover)] border border-transparent'
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
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="web3-card web3-card-pad-lg relative overflow-hidden"
        style={{ background: `linear-gradient(180deg, ${ACCENT}0f 0%, rgba(0, 0, 0, 0.4) 100%)` }}
      >
        <div className="flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center relative"
            style={{
              background: `conic-gradient(${healthScore != null ? healthColor(healthScore) : '#666'} ${healthScore != null ? healthScore * 3.6 : 0}deg, rgba(255,255,255,0.05) 0deg)`
            }}
          >
            <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center">
              {approvals.loading ? (
                <Loader2 size={20} className="web3-text-muted animate-spin" />
              ) : healthScore != null ? (
                <span className="text-2xl font-bold font-mono text-white">{healthScore}</span>
              ) : (
                <span className="text-2xl font-bold font-mono web3-text-muted">—</span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="web3-label mb-1">Wallet Health</div>
            <div className="text-xl font-bold text-white mb-1">
              {approvals.loading ? 'Scanning…' : healthScore == null ? '—' : healthLabel(healthScore)}
            </div>
            <div className="text-[11px] web3-text-body">
              {approvals.data
                ? `${approvals.data.length} active approvals · ${approvals.data.filter((a) => a.risk === 'high').length} high-risk`
                : 'Click Scan to assess'}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="web3-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--web3-border)] flex items-center justify-between">
          <div className="web3-label">Token Approvals</div>
          <div className="web3-label web3-text-muted">{approvals.data ? `${approvals.data.length} found` : '—'}</div>
        </div>

        {approvals.error && <div className="px-5 py-4 text-[11px] text-red-300 font-mono">{approvals.error}</div>}

        {approvals.loading && (
          <div className="divide-y divide-[var(--web3-border)]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[var(--web3-card-hover)] animate-pulse" />
                <div className="flex-1">
                  <div className="w-32 h-3 rounded bg-[var(--web3-card-hover)] animate-pulse mb-1" />
                  <div className="w-20 h-2 rounded bg-[var(--web3-card-hover)] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!approvals.loading && approvals.data && approvals.data.length === 0 && (
          <div className="px-5 py-8 text-center">
            <ShieldCheck size={28} className="mx-auto web3-status-live mb-2" />
            <div className="text-[13px] text-white font-semibold">No active approvals</div>
            <div className="text-[10.5px] web3-text-muted mt-1">
              This wallet hasn't approved any known spenders on {CHAINS[chain].name}.
            </div>
          </div>
        )}

        {approvals.data && approvals.data.length > 0 && (
          <div className="divide-y divide-[var(--web3-border)]">
            {approvals.data
              .sort((a, b) => (a.risk === 'high' ? -1 : 1) - (b.risk === 'high' ? -1 : 1))
              .map((a, i) => (
                <ApprovalRow key={`${a.token}-${a.spender}-${i}`} approval={a} chain={chain} />
              ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--web3-border)] p-3 text-[11px] web3-text-body flex items-start gap-2">
        <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: ACCENT }} />
        <div>
          <div className="font-semibold text-white mb-0.5">About infinite approvals</div>
          <div className="web3-text-secondary">
            Many dApps request <code className="font-mono bg-[var(--web3-card-hover)] px-1 rounded">uint256 max</code>{' '}
            allowance to save you future gas. If the protocol is hacked or rug-pulled, attackers can drain your tokens.
            Revoke unused allowances below.
          </div>
        </div>
      </div>
    </div>
  )
}

function ApprovalRow({ approval, chain }: { approval: Approval; chain: ChainKey }): JSX.Element {
  const meta = CHAINS[chain]
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--web3-card-hover)] transition-colors"
    >
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center"
        style={{
          background: approval.risk === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          border: `1px solid ${approval.risk === 'high' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
        }}
      >
        {approval.risk === 'high' ? (
          <ShieldAlert size={15} className="text-red-400" />
        ) : (
          <AlertTriangle size={15} className="text-amber-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-semibold text-white">{approval.symbol}</span>
          <span className="web3-label web3-text-muted">→</span>
          <span className="text-[12px] web3-text-body">{approval.spenderLabel}</span>
          {approval.isInfinite && (
            <span className="web3-label web3-status-error px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
              INFINITE
            </span>
          )}
        </div>
        <div className="web3-label web3-text-muted mt-0.5 flex items-center gap-1.5">
          <span className="web3-text-muted">allowance</span>
          <span className={approval.isInfinite ? 'text-red-300' : 'text-amber-300'}>
            {approval.isInfinite ? 'unlimited' : fmtNumber(Number(approval.allowance) / 1e18, 2)}
          </span>
          <span className="web3-text-muted">on</span>
          <span style={{ color: meta.color }}>{meta.name}</span>
        </div>
      </div>
      <a
        href={`${meta.explorer}/token/${approval.token}#writeContract`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 rounded-md border border-[var(--web3-border)] bg-[var(--web3-card)] hover:bg-[var(--web3-card-hover)] px-2.5 py-1.5 web3-label web3-text-body hover:text-white transition-colors"
      >
        <Lock size={10} />
        Revoke
      </a>
    </motion.div>
  )
}
