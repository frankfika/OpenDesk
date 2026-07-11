// BrandLockup — the OpenDesk wordmark + icon + mode chip.
//
// Single source of truth for "what's the app called, what mode am I in."
// Used in: Web3 TopBar, Trade TopBar, Settings modal header.
//
// Variants:
//   compact — wordmark + chip only (for tight headers)
//   default — icon + wordmark + chip + tagline (for hero headers)
import { Zap } from 'lucide-react'

export type BrandMode = 'TRADE' | 'WEB3' | 'SETTINGS' | 'CHAT' | 'WORKFLOW'

export interface BrandLockupProps {
  mode: BrandMode
  tagline?: string
  size?: 'compact' | 'default'
}

const DEFAULT_TAGLINES: Record<BrandMode, string> = {
  TRADE: 'Trader workstation · Multi-asset',
  WEB3: 'Wallet intelligence · Agent actions',
  SETTINGS: 'Configure providers, workspace, app',
  CHAT: 'Multi-model · Ensemble · Skills',
  WORKFLOW: 'Schedules · Marketplace · Claw'
}

export default function BrandLockup({ mode, tagline, size = 'default' }: BrandLockupProps): JSX.Element {
  const label = tagline ?? DEFAULT_TAGLINES[mode]
  const compact = size === 'compact'

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className="rounded-lg flex items-center justify-center shrink-0"
        style={{
          width: compact ? 24 : 32,
          height: compact ? 24 : 32,
          background: 'linear-gradient(135deg, #1D8C80, #0d6e63)',
          boxShadow: '0 4px 16px rgba(29, 140, 128, 0.35)'
        }}
      >
        <Zap size={compact ? 12 : 14} className="text-white" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-bold text-white tracking-tight ${
              compact ? 'text-[12.5px]' : 'text-[14px]'
            }`}
          >
            OpenDesk
          </span>
          <ModeChip mode={mode} />
        </div>
        {!compact && (
          <span
            className="web3-label truncate"
            style={{ fontSize: 10 }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  )
}

function ModeChip({ mode }: { mode: BrandMode }): JSX.Element {
  return (
    <span
      className="font-mono font-bold px-1 py-0.5 rounded"
      style={{
        fontSize: 8,
        letterSpacing: '0.1em',
        color: '#1D8C80',
        border: '1px solid rgba(29, 140, 128, 0.3)',
        background: 'rgba(29, 140, 128, 0.1)'
      }}
    >
      {mode}
    </span>
  )
}
