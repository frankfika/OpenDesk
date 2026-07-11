// IntelPanel — search bar + 3 quick-pick addresses + ENS suggestion.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ScanLine, Search, User, Sparkles, ArrowRight } from 'lucide-react'

const QUICK_PICKS = [
  { label: 'vitalik.eth', address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' },
  { label: 'ens.eth', address: '0x283af0b28c62c092c9727f1ee09c02ca627eb7f5' },
  { label: 'brantly.eth', address: '0x89622819d6efdc8b04899b66a1c93b1cb793ae16' }
]

const ACCENT = 'var(--web3-intel)'
const ACCENT_DIM = 'var(--web3-intel-dim)'

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
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="web3-card web3-card-pad">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 web3-label mb-2" style={{ color: ACCENT }}>
              <ScanLine size={11} />
              Chain Intel
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">On-chain dossier</h2>
          </div>
          <p className="text-[12px] web3-text-body leading-relaxed max-w-md sm:text-right">
            Address profile, token ranking, approval risks, recent activity.
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
              className="w-full text-left rounded-lg border border-[var(--web3-border)] bg-[var(--web3-card)] hover:bg-[var(--web3-card-hover)] hover:border-[var(--web3-border-strong)] px-3 py-2.5 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: `${ACCENT}26`, border: `1px solid ${ACCENT}4d` }}
                >
                  <User size={12} style={{ color: ACCENT }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-mono font-semibold text-white">{q.label}</div>
                  <div className="web3-label web3-text-muted truncate">{q.address}</div>
                </div>
                <ArrowRight
                  size={12}
                  className="web3-text-muted opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                  style={{ color: ACCENT }}
                />
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
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DIM})` }}
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
            <span className="mt-0.5" style={{ color: ACCENT }}>
              ·
            </span>
            Net worth across Ethereum, Base, Arbitrum, Optimism, Polygon, BNB
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5" style={{ color: ACCENT }}>
              ·
            </span>
            Top 10 tokens with USD value, 24h change, 7-day sparkline
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5" style={{ color: ACCENT }}>
              ·
            </span>
            Active token approvals with risk scoring
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5" style={{ color: ACCENT }}>
              ·
            </span>
            Recent transactions + verdict on wallet type
          </li>
        </ul>
      </div>
    </div>
  )
}
