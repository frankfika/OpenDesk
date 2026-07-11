// TopBar — wallet-first, always shows connected wallet + total balance.
import { useAccount } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { ChevronDown, Fuel, Settings } from 'lucide-react'
import { CHAINS, useTokenPrices, useGas, fmtUsd, fmtPct } from '../../hooks/useWeb3Data'
import BrandLockup from '../ui/BrandLockup'
import WalletConnectButton from './WalletConnectButton'

export default function TopBar(): JSX.Element {
  const { isConnected, chainId } = useAccount()
  const { open } = useAppKit()

  const ethPrices = useTokenPrices(['ETH'])
  const gas = useGas('ethereum')

  const ethUsd = ethPrices.data?.ETH?.usd ?? null
  const ethChange = ethPrices.data?.ETH?.usd_24h_change ?? null
  const gwei = gas.data ? Number(gas.data.gasPrice) / 1e9 : null

  const currentChainMeta = chainId != null ? (Object.values(CHAINS).find((c) => c.chain.id === chainId) ?? null) : null

  return (
    <div
      className="relative flex items-center justify-between px-5 py-3 border-b z-20"
      style={{ background: '#0e0e10', borderColor: '#1f1f23' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 min-w-0">
        <BrandLockup mode="WEB3" />

        {isConnected && (
          <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-[#1f1f23]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px #34d399' }} />
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
