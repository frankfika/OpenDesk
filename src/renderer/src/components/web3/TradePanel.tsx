// TradePanel — natural-language trade copilot.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Send, ArrowRight, ChevronRight, AlertCircle } from 'lucide-react'
import { useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { useWeb3Store } from '../../store/web3'
import { CHAINS, shortAddr, type ChainKey } from '../../hooks/useWeb3Data'

const EXAMPLES = [
  { text: 'Send 0 ETH to myself on Ethereum', intent: 'Open a real Ethereum signature card' },
  { text: 'Send 0 ETH to myself on Base', intent: 'Open a Base signature card' },
  { text: 'Send 0 ETH to myself on Arbitrum', intent: 'Open an Arbitrum signature card' },
  { text: 'Send 0.001 ETH to vitalik.eth on Ethereum', intent: 'Resolve ENS, prepare native transfer' }
]

const ACCENT = 'var(--web3-trade)'

export default function TradePanel(): JSX.Element {
  const [input, setInput] = useState('')
  const [prepHint, setPrepHint] = useState('')
  const { isConnected, address } = useAccount()
  const setPendingTxRequest = useWeb3Store((s) => s.setPendingTxRequest)

  const handleExample = async (text: string) => {
    setInput(text)
    setPrepHint('')

    if (!isConnected || !address) {
      setPrepHint('Connect wallet to prepare transaction')
      return
    }

    const chainMatch = text.match(/on (Ethereum|Base|Arbitrum)/i)
    const chainName = chainMatch ? chainMatch[1] : 'Ethereum'
    const chainKey = chainName.toLowerCase() as ChainKey

    const amountMatch = text.match(/(\d+\.?\d*)\s*ETH/)
    const amount = amountMatch ? amountMatch[1] : '0'

    let recipient = ''
    if (text.includes('myself')) {
      recipient = address
    } else if (text.includes('vitalik.eth')) {
      try {
        const res = await fetch('/api/ens/ens/resolve/vitalik.eth')
        const data = await res.json()
        recipient = data.address || data
      } catch {
        recipient = ''
      }
    }

    const pendingTxRequest = {
      id: `tx-${Date.now()}`,
      chain: chainKey,
      chainName: CHAINS[chainKey]?.name || chainName,
      from: address,
      to: recipient,
      value: parseEther(amount).toString(),
      data: '0x',
      description: text
    }

    setPendingTxRequest(pendingTxRequest)
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="web3-card web3-card-pad">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 web3-label mb-2" style={{ color: ACCENT }}>
              <Zap size={11} />
              One-Liner Trade
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Prepare a native transfer</h2>
          </div>
          <p className="text-[12px] web3-text-body leading-relaxed max-w-md sm:text-right">
            Native-token transfers now open a real wallet confirmation card.
          </p>
        </div>
      </motion.div>

      <div className="web3-card web3-card-pad">
        <div className="web3-label mb-2.5">Quick prompts</div>
        <div className="space-y-1.5">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleExample(ex.text)}
              className="w-full text-left rounded-lg border border-[var(--web3-border)] bg-[var(--web3-card)] hover:bg-[var(--web3-card-hover)] hover:border-[var(--web3-border-strong)] px-3 py-2.5 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Send size={11} className="opacity-60 group-hover:opacity-100" style={{ color: ACCENT }} />
                <span className="text-[12px] font-mono web3-text-strong">{ex.text}</span>
                <ChevronRight
                  size={11}
                  className="ml-auto web3-text-muted opacity-50 group-hover:opacity-100 transition-all group-hover:translate-x-0.5"
                  style={{ color: ACCENT }}
                />
              </div>
              <div className="text-[10px] web3-text-muted mt-1 ml-5">→ {ex.intent}</div>
            </button>
          ))}
        </div>
        {prepHint && (
          <div className="mt-2 text-[11px]" style={{ color: ACCENT }}>
            {prepHint}
          </div>
        )}
      </div>

      <div className="web3-card web3-card-pad">
        <div className="web3-label mb-2">Or describe a native transfer</div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder="e.g. Send 0.001 ETH to vitalik.eth on Ethereum"
          className="web3-input align-top"
          style={{ minHeight: 80, resize: 'none' }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="web3-label web3-text-muted">
            {!isConnected ? 'Connect a wallet to open the signature card' : 'Sent to AI agent →'}
          </span>
          <button
            type="button"
            onClick={() => {
              if (!input.trim()) return
              window.dispatchEvent(new CustomEvent('opendesk:fill-input', { detail: { text: input } }))
            }}
            disabled={!input.trim()}
            className="web3-btn web3-btn-primary disabled:opacity-30"
          >
            <ArrowRight size={11} />
            Run
          </button>
        </div>
      </div>

      <div className="web3-card web3-card-pad">
        <div className="web3-label mb-2.5">Chain coverage</div>
        <div className="grid grid-cols-3 gap-2">
          {(['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'bsc'] as const).map((k) => {
            const meta = CHAINS[k]
            return (
              <div key={k} className="rounded-lg border border-[#1f1f23] bg-[#141416] p-2.5 flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-white">{meta.name}</div>
                  <div className="web3-label web3-text-muted">{meta.symbol}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex items-start gap-2 text-[10.5px] web3-text-body">
          <AlertCircle size={11} className="shrink-0 mt-0.5" />
          <span>
            Native transfers are fully wired to the signature card. Swaps and bridges are hidden until their route +
            simulation flow is fully connected.
          </span>
        </div>
      </div>
    </div>
  )
}
