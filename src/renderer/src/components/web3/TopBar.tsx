// TopBar — wallet-first, always shows connected wallet + total balance.
import { useAccount } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { ChevronDown, Fuel, Settings, Zap } from 'lucide-react'
import { CHAINS, useTokenPrices, useGas, fmtUsd, fmtPct } from '../../hooks/useWeb3Data'
import WalletConnectButton from './WalletConnectButton'

export default function TopBar(): JSX.Element {
  const { isConnected, chainId } = useAccount()
  const { open } = useAppKit()

  const ethPrices = useTokenPrices(['ETH'])
  const gas = useGas('ethereum')

  const ethUsd = ethPrices.data?.ETH?.usd ?? null
  const ethChange = ethPrices.data?.ETH?.usd_24h_change ?? null
  const gwei = gas.data ? Number(gas.data.gasPrice) / 1e9 : null

  const currentChainMeta = chainId != null ? Object.values(CHAINS).find((c) => c.chain.id === chainId) ?? null : null

  return (
    <div className="relative flex items-center justify-between px-5 py-3 border-b z-20" style={{ background: '#0e0e10', borderColor: '#1f1f23' }}>
      {/* Brand */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1D8C80, #0d6e63)', boxShadow: '0 4px 16px rgba(29, 140, 128, 0.35)' }}
        >
          <Zap size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-bold text-white tracking-tight">OpenDesk</span>
            <span className="text-[8px] font-mono tracking-widest text-[#1D8C80] font-bold px-1 py-0.5 rounded border border-[#1D8C80]/30 bg-[#1D8C80]/10">
              WEB3
            </span>
          </div>
          <span className="web3-label">v1.0 · MAINNET READY</span>
        </div>

        {isConnected && (
          <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-[#1f1f23]">
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              style={{ boxShadow: '0 0 6px #34d399' }}
            />
            <span className="web3-label web3-status-live">LIVE</span>
            <span className="web3-label web3-text-muted">·</span>
            <span className="web3-label">ETH {fmtUsd(ethUsd, { compact: false, decimals: 0 })}</span>
            {ethChange != null && (
              <span className={`web3-label ${ethChange >= 0 ? 'web3-status-live' : 'web3-status-error'}`}>
                {fmtPct(ethChange, 1)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2">
        {gwei != null && (
          <div className="web3-input" style={{ padding: '6px 10px' }}>
            <Fuel size={11} className="web3-status-warn" />
            <span className="web3-label web3-text-body">Gas</span>
            <span className="text-[11px] font-mono font-bold web3-status-warn">{gwei.toFixed(1)}</span>
            <span className="web3-label web3-text-muted">gwei</span>
          </div>
        )}

        {isConnected && currentChainMeta && (
          <button
            type="button"
            onClick={() => open({ view: 'Networks' })}
            className="web3-input"
            style={{ padding: '6px 10px', cursor: 'pointer' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: currentChainMeta.color, boxShadow: `0 0 6px ${currentChainMeta.color}` }}
            />
            <span className="text-[11px] font-mono font-semibold web3-text-body">{currentChainMeta.name}</span>
            <ChevronDown size={10} className="web3-text-muted" />
          </button>
        )}

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('opendesk:open-settings'))}
          className="rounded-lg p-1.5 web3-text-muted hover:text-white hover:bg-[#1f1f23] transition-colors"
          title="Settings (⌘,)"
        >
          <Settings size={14} />
        </button>

        <WalletConnectButton />
      </div>
    </div>
  )
}
