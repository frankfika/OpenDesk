// OrderScenario — buy / sell quick ticket. Crypto-only since v0.4.2.
// When the user is on a supported crypto symbol, "Send" sends a
// self-transfer (the simplest meaningful on-chain action — the operator
// can see gas, signing prompt, and confirmation in their wallet UI).

import { useMemo, useState } from 'react'
import { parseEther, isAddress } from 'viem'
import { useAccount, useSendTransaction } from 'wagmi'
import { useTradeStore } from '../../../store/trade'
import { fetchTokenPrices, type PriceInfo } from '../../../lib/tokenPrices'
import { fmtUsd } from '../format'
import { useToast } from '../../../store/toast'

type Side = 'buy' | 'sell'
type OrderType = 'market' | 'limit' | 'stop'

const PRESET_QTYS = [1, 10, 100, 1000]

// Stable fallback price so the "Estimated Notional" still renders when
// the live call is rate-limited or offline. Matches the values used by
// `lib/tokenPrices.ts` so the two surfaces stay in sync.
const FALLBACK_PRICES: Record<string, number> = {
  ETH: 1720,
  WETH: 1720,
  BTC: 38000,
  WBTC: 38000,
  SOL: 95,
  BNB: 580,
  WBNB: 580,
  MATIC: 0.4,
  POL: 0.4,
  ARB: 0.6,
  OP: 1.7
}

const SUPPORTED_CRYPTO = new Set(Object.keys(FALLBACK_PRICES))

export default function OrderScenario(): JSX.Element {
  const symbol = useTradeStore((s) => s.selectedSymbol ?? '')
  const dir = useTradeStore((s) => s.colorDirection)
  const toast = useToast()

  const [side, setSide] = useState<Side>('buy')
  const [type, setType] = useState<OrderType>('market')
  const [qty, setQty] = useState<string>('1')
  const [limit, setLimit] = useState<string>('')
  const [stop, setStop] = useState<string>('')

  const numericQty = Number(qty) || 0
  const isSupportedCrypto = SUPPORTED_CRYPTO.has(symbol.toUpperCase())

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="mb-3 flex items-center gap-2">
          {(['buy', 'sell'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`flex-1 rounded px-3 py-2 text-[12px] font-semibold uppercase tracking-wide transition-colors ${
                side === s
                  ? s === 'buy'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-red-600 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {s} {symbol}
            </button>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-2">
          {(['market', 'limit', 'stop'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded px-3 py-1 text-[11px] font-mono uppercase tracking-wide ${
                type === t ? 'bg-white/15 text-white' : 'web3-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <Field label="Quantity">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              min="0"
              step="0.0001"
              className="trade-num w-full rounded border border-[#2a2a2e] bg-black/40 px-2 py-1.5 text-[14px] font-semibold text-white outline-none focus:border-[#1D8C80]"
            />
            <div className="flex gap-1">
              {PRESET_QTYS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setQty(p.toString())}
                  className="rounded border border-[#2a2a2e] bg-black/40 px-1.5 py-1 text-[10.5px] font-mono web3-text-muted hover:border-[#1D8C80] hover:text-white"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </Field>

        {type === 'limit' && (
          <Field label="Limit Price">
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              min="0"
              step="0.01"
              placeholder="—"
              className="trade-num w-full rounded border border-[#2a2a2e] bg-black/40 px-2 py-1.5 text-[14px] font-semibold text-white outline-none focus:border-[#1D8C80]"
            />
          </Field>
        )}

        {type === 'stop' && (
          <Field label="Stop Price">
            <input
              type="number"
              value={stop}
              onChange={(e) => setStop(e.target.value)}
              min="0"
              step="0.01"
              placeholder="—"
              className="trade-num w-full rounded border border-[#2a2a2e] bg-black/40 px-2 py-1.5 text-[14px] font-semibold text-white outline-none focus:border-[#1D8C80]"
            />
          </Field>
        )}

        <NotionalSummary symbol={symbol} qty={numericQty} />

        <SendButton
          isSupportedCrypto={isSupportedCrypto}
          symbol={symbol}
          side={side}
          qty={numericQty}
          type={type}
          limit={limit}
          onSent={(txHash) => {
            if (window.api?.app?.changelog?.record) {
              window.api.app.changelog.record({
                kind: 'web3.send',
                title: `${side.toUpperCase()} ${qty} ${symbol} ${type} → ${txHash.slice(0, 10)}…`,
                detail: 'Self-transfer sent via the connected wallet.',
                status: 'success',
                threadId: null
              })
            }
            toast.success(`Sent. Tx: ${txHash.slice(0, 10)}…`)
          }}
          onError={(err) => {
            if (window.api?.app?.changelog?.record) {
              window.api.app.changelog.record({
                kind: 'web3.send',
                title: `${side.toUpperCase()} ${qty} ${symbol} ${type} failed`,
                detail: err,
                status: 'error',
                threadId: null
              })
            }
            toast.error(`Order failed: ${err}`)
          }}
        />

        {!isSupportedCrypto && (
          <div className="mt-3 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            Crypto order entry supports native tokens only (ETH, BTC-equivalent, SOL, BNB, MATIC, ARB, OP).
            For {symbol || 'this symbol'} use the connected wallet directly.
          </div>
        )}
      </div>

      <aside
        className="w-[260px] shrink-0 border-l p-3"
        style={{ background: '#0c0c0c', borderColor: '#1f1f23' }}
      >
        <h3 className="mb-2 text-[10.5px] uppercase web3-text-muted">Reference</h3>
        {isSupportedCrypto ? (
          <CryptoReference symbol={symbol} dir={dir} />
        ) : (
          <div className="text-[11.5px] web3-text-muted">Pick a symbol first.</div>
        )}
      </aside>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="mb-3 block">
      <div className="mb-1 text-[10.5px] uppercase web3-text-muted">{label}</div>
      {children}
    </label>
  )
}

function NotionalSummary({ symbol, qty }: { symbol: string; qty: number }): JSX.Element {
  // Crypto notional needs the symbol's USD price. We pull it through
  // the same `fetchTokenPrices` used by the rest of the workbench, with
  // the static table as a fallback.
  const [cryptoUsd, setCryptoUsd] = useState<number | null>(null)

  useMemo(() => {
    if (!symbol) return
    let cancelled = false
    fetchTokenPrices([symbol.toUpperCase()])
      .then((map: Record<string, PriceInfo>) => {
        if (cancelled) return
        const entry = map[symbol.toUpperCase()] ?? map[symbol]
        if (entry?.usd) setCryptoUsd(entry.usd)
        else setCryptoUsd(FALLBACK_PRICES[symbol.toUpperCase()] ?? null)
      })
      .catch(() => {
        if (!cancelled) setCryptoUsd(FALLBACK_PRICES[symbol.toUpperCase()] ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [symbol])

  const notional = cryptoUsd != null && qty > 0 ? cryptoUsd * qty : null

  return (
    <div className="mt-4 flex items-center justify-between rounded border border-[#1f1f23] bg-black/40 px-3 py-2">
      <span className="text-[10.5px] uppercase web3-text-muted">
        Estimated Notional ({symbol || '—'})
      </span>
      <span className="trade-num text-[16px] font-bold text-white">{fmtUsd(notional)}</span>
    </div>
  )
}

interface SendButtonProps {
  isSupportedCrypto: boolean
  symbol: string
  side: Side
  qty: number
  type: OrderType
  limit: string
  onSent: (txHash: string) => void
  onError: (err: string) => void
}

function SendButton({
  isSupportedCrypto,
  symbol,
  side,
  qty,
  type,
  limit,
  onSent,
  onError
}: SendButtonProps): JSX.Element {
  const { address, isConnected } = useAccount()
  const { sendTransactionAsync, isPending } = useSendTransaction()
  const [sending, setSending] = useState(false)

  const ready = qty > 0 && symbol.length > 0 && isSupportedCrypto && isConnected && address

  const handleSend = async () => {
    if (isSupportedCrypto) {
      if (!isConnected || !address) {
        onError('Connect a wallet to send crypto.')
        return
      }
      if (!isAddress(address)) {
        onError('Wallet address is malformed.')
        return
      }
      // Native self-transfer: simplest on-chain action that exercises
      // the full wallet flow (gas estimate, signing prompt, receipt).
      const ethQty = symbol.toUpperCase() === 'ETH' || symbol.toUpperCase() === 'WETH' ? qty : 0
      if (ethQty <= 0) {
        onError('Order entry currently supports ETH/WETH self-transfers.')
        return
      }
      setSending(true)
      try {
        const value = parseEther(ethQty.toString())
        const hash = await sendTransactionAsync({ to: address, value })
        if (!hash) {
          onError('No transaction hash returned.')
          return
        }
        onSent(hash)
      } catch (err) {
        onError(err instanceof Error ? err.message : String(err))
      } finally {
        setSending(false)
      }
      return
    }

    onError('Order entry not supported for this symbol.')
  }

  return (
    <div className="mt-4 flex gap-2">
      <button
        type="button"
        disabled={!ready || sending || isPending}
        onClick={handleSend}
        className={`flex-1 rounded px-3 py-2.5 text-[12.5px] font-bold uppercase tracking-wide text-white disabled:opacity-30 ${
          side === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
        }`}
      >
        {sending || isPending ? 'Sending…' : `Send ${side} order`}
      </button>
    </div>
  )
}

function CryptoReference({ symbol, dir: _dir }: { symbol: string; dir: 'us' | 'cn' }): JSX.Element {
  const [usd, setUsd] = useState<number | null>(null)
  useMemo(() => {
    let cancelled = false
    fetchTokenPrices([symbol.toUpperCase()])
      .then((map: Record<string, PriceInfo>) => {
        if (cancelled) return
        const entry = map[symbol.toUpperCase()] ?? map[symbol]
        setUsd(entry?.usd ?? FALLBACK_PRICES[symbol.toUpperCase()] ?? null)
      })
      .catch(() => {
        if (!cancelled) setUsd(FALLBACK_PRICES[symbol.toUpperCase()] ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [symbol])

  return (
    <div className="space-y-1.5 text-[11.5px]">
      <Row label="Symbol" value={symbol} />
      <Row label="USD Price" value={usd != null ? `$${usd.toFixed(2)}` : '—'} />
      <Row label="Network" value="Connected wallet" />
      <div className="pt-2 text-[10.5px] web3-text-muted">
        Sends a self-transfer at the displayed quantity. Use your wallet to sign.
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span className="web3-text-muted">{label}</span>
      <span className="trade-num text-white">{value}</span>
    </div>
  )
}
