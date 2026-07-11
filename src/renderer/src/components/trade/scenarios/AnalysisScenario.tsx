// AnalysisScenario — hand the analysis off to the conversational
// assistant. Crypto-only since v0.4.2. We build a market-context
// prompt from live crypto price + 24h change, switch to the assistant
// view, and pre-fill the chat input so the user gets a streaming
// answer they can follow up on — with the conversation persisted like
// any other thread.

import { useEffect, useState } from 'react'
import { useTradeStore } from '../../../store/trade'
import { useViewStore } from '../../../store/view'
import { fetchTokenPrices, type PriceInfo } from '../../../lib/tokenPrices'
import { Sparkles, MessagesSquare } from 'lucide-react'

interface CryptoSnap {
  symbol: string
  usd: number | null
  change24h: number | null
}

export default function AnalysisScenario(): JSX.Element {
  const symbol = useTradeStore((s) => s.selectedSymbol ?? '')
  const setView = useViewStore((s) => s.setView)
  const [snap, setSnap] = useState<CryptoSnap | null>(null)

  useEffect(() => {
    if (!symbol) return
    let cancelled = false
    fetchTokenPrices([symbol.toUpperCase()])
      .then((map: Record<string, PriceInfo>) => {
        if (cancelled) return
        const entry = map[symbol.toUpperCase()] ?? map[symbol]
        if (entry) {
          setSnap({
            symbol: symbol.toUpperCase(),
            usd: entry.usd ?? null,
            change24h: entry.usd_24h_change ?? null
          })
        }
      })
      .catch(() => {
        // network blip; just skip
      })
    return () => {
      cancelled = true
    }
  }, [symbol])

  const analyseInAssistant = () => {
    if (!snap || snap.usd == null) return
    const prompt = buildPrompt(snap)
    setView('assistant')
    // Defer so the assistant view (and its InputBar listener) is mounted
    // before we dispatch the fill event.
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('opendesk:fill-input', { detail: { text: prompt } }))
    }, 80)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex flex-col items-center gap-1.5">
        <MessagesSquare size={28} className="text-[#1D8C80]" />
        <p className="text-[13px] font-semibold text-white">Analyse {symbol || '—'} with the assistant</p>
        <p className="max-w-sm text-[11.5px] leading-relaxed web3-text-muted">
          Sends a live snapshot of{' '}
          <span className="font-mono text-white">{symbol || 'the selected symbol'}</span> — spot price
          and 24h change — to your AI assistant, where you can read a streaming take and ask
          follow-up questions. The conversation is saved like any other thread.
        </p>
      </div>

      <button
        type="button"
        onClick={analyseInAssistant}
        disabled={!snap || snap.usd == null}
        className="flex items-center gap-1.5 rounded bg-[#1D8C80] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1D8C80]/90 disabled:opacity-30"
      >
        <Sparkles size={13} />
        Analyse in Assistant
      </button>

      {(!snap || snap.usd == null) && (
        <span className="text-[10.5px] web3-text-muted">Waiting for a live price for {symbol || 'this symbol'}…</span>
      )}
    </div>
  )
}

function buildPrompt(snap: CryptoSnap): string {
  const direction = (snap.change24h ?? 0) >= 0 ? 'up' : 'down'
  return [
    `Crypto: ${snap.symbol}.`,
    `Spot price: $${snap.usd?.toLocaleString('en-US', { maximumFractionDigits: 6 })}.`,
    `24h change: ${snap.change24h != null ? `${snap.change24h.toFixed(2)}% (${direction})` : 'n/a'}.`,
    '',
    'Briefly: what should a trader be aware of right now? Consider volatility, recent trend, and any obvious risk factors.'
  ].join('\n')
}
