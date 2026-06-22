// IntelPanel — search bar + 3 quick-pick addresses + ENS suggestion.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ScanLine, Search, User, Sparkles, ArrowRight } from 'lucide-react'

const QUICK_PICKS = [
  { label: 'vitalik.eth', address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' },
  { label: 'ens.eth', address: '0x283af0b28c62c092c9727f1ee09c02ca627eb7f5' },
  { label: 'brantly.eth', address: '0x89622819d6efdc8b04899b66a1c93b1cb793ae16' }
]

export default function IntelPanel(): JSX.Element {
  const [input, setInput] = useState('')

  const handleQuick = (label: string) => {
    window.dispatchEvent(new CustomEvent('opendesk:fill-input', { detail: { text: `Analyze ${label}` } }))
  }

  const handleCustom = () => {
    if (!input.trim()) return
    window.dispatchEvent(new CustomEvent('opendesk:fill-input', { detail: { text: `Analyze ${input.trim()}` } }))
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="web3-card web3-card-pad-lg relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, rgba(98, 126, 234, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%)' }}
      >
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(98, 126, 234, 0.2) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 web3-label mb-2" style={{ color: '#627eea' }}>
            <ScanLine size={11} />
            Chain Intel
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">On-chain dossier in 30 seconds.</h2>
          <p className="text-[12.5px] web3-text-body leading-relaxed max-w-md">
            Drop any address or ENS. The agent pulls balances across every EVM chain, ranks tokens, flags risky approvals, and writes a one-pager.
          </p>
        </div>
      </motion.div>

      <div className="web3-card web3-card-pad">
        <div className="web3-label mb-2.5">Quick picks</div>
        <div className="space-y-1.5">
          {QUICK_PICKS.map((q) => (
            <button
              key={q.address}
              type="button"
              onClick={() => handleQuick(q.label)}
              className="w-full text-left rounded-lg border border-[#1f1f23] bg-[#141416] hover:bg-[#1a1a1d] hover:border-[#627eea]/30 px-3 py-2.5 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(98, 126, 234, 0.15)', border: '1px solid rgba(98, 126, 234, 0.3)' }}
                >
                  <User size={12} style={{ color: '#627eea' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-mono font-semibold text-white">{q.label}</div>
                  <div className="web3-label web3-text-muted truncate">{q.address}</div>
                </div>
                <ArrowRight size={12} className="text-white/20 group-hover:text-[#627eea] group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="web3-card web3-card-pad">
        <div className="web3-label mb-2">Or paste any address / ENS</div>
        <div className="web3-input">
          <Search size={12} className="web3-text-muted shrink-0" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleCustom()}
            placeholder="vitalik.eth or 0x..."
            className="flex-1 bg-transparent outline-none text-[12px] font-mono text-white placeholder:web3-text-muted min-w-0"
          />
          <button
            type="button"
            onClick={handleCustom}
            disabled={!input.trim()}
            className="web3-btn web3-btn-primary disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg, #627eea, #3b5dc7)' }}
          >
            <Sparkles size={11} />
            Analyze
          </button>
        </div>
      </div>

      <div className="web3-card web3-card-pad-sm">
        <div className="web3-label mb-2">What the report covers</div>
        <ul className="text-[11.5px] web3-text-body space-y-1">
          <li className="flex items-start gap-2">
            <span className="mt-0.5" style={{ color: '#627eea' }}>·</span>
            Net worth across Ethereum, Base, Arbitrum, Optimism, Polygon, BNB
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5" style={{ color: '#627eea' }}>·</span>
            Top 10 tokens with USD value, 24h change, 7-day sparkline
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5" style={{ color: '#627eea' }}>·</span>
            Active token approvals with risk scoring
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5" style={{ color: '#627eea' }}>·</span>
            Recent transactions + verdict on wallet type
          </li>
        </ul>
      </div>
    </div>
  )
}
