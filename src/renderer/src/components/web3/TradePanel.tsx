// TradePanel — natural-language trade copilot.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Send, ArrowRight, ChevronRight, AlertCircle } from 'lucide-react'
import { useAccount } from 'wagmi'
import { CHAINS } from '../../hooks/useWeb3Data'

const EXAMPLES = [
  { text: 'Swap 0.05 ETH for USDC on Base', intent: 'Swap 0.05 ETH (~$170) → USDC on Base via Uniswap V3' },
  { text: 'Send 10 USDC to vitalik.eth', intent: 'Transfer 10 USDC → 0xd8da…6045' },
  { text: 'Bridge 0.1 ETH from Ethereum to Arbitrum', intent: 'Bridge 0.1 ETH Ethereum → Arbitrum' },
  { text: 'Check gas for an Arbitrum swap', intent: 'Read current gas prices on Arbitrum' }
]

export default function TradePanel(): JSX.Element {
  const [input, setInput] = useState('')
  const { isConnected } = useAccount()

  const handleExample = (text: string) => {
    setInput(text)
    window.dispatchEvent(new CustomEvent('opendesk:fill-input', { detail: { text } }))
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="web3-card web3-card-pad-lg relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, rgba(29, 140, 128, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%)' }}
      >
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(29, 140, 128, 0.25) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 web3-label web3-status-accent mb-2">
            <Zap size={11} />
            One-Liner Trade
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Say it, sign it, done.</h2>
          <p className="text-[12.5px] web3-text-body leading-relaxed max-w-md">
            Tell the AI what you want in plain English. The agent picks the route, simulates the transaction, and pops a signature card. Your keys, your call.
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
              className="w-full text-left rounded-lg border border-[#1f1f23] bg-[#141416] hover:bg-[#1a1a1d] hover:border-[#1D8C80]/30 px-3 py-2.5 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Send size={11} className="web3-status-accent opacity-60 group-hover:opacity-100" />
                <span className="text-[12px] font-mono web3-text-strong">{ex.text}</span>
                <ChevronRight size={11} className="ml-auto text-white/20 group-hover:text-[#1D8C80] transition-colors" />
              </div>
              <div className="text-[10px] web3-text-muted mt-1 ml-5">→ {ex.intent}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="web3-card web3-card-pad">
        <div className="web3-label mb-2">Or describe your trade</div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder="e.g. Swap 100 USDC to ETH on Ethereum mainnet, gas under 30 gwei"
          className="web3-input align-top"
          style={{ minHeight: 80, resize: 'none' }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="web3-label web3-text-muted">
            {!isConnected ? 'Connect a wallet to sign transactions' : 'Sent to AI agent →'}
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
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
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
          <span>All transactions are signed in your own wallet (MetaMask / Rabby / WalletConnect). Private keys never enter OpenDesk.</span>
        </div>
      </div>
    </div>
  )
}
