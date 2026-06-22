import { clsx } from 'clsx'

interface ChainBadgeProps {
  chain: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
}

const CHAIN_META: Record<string, { name: string; color: string; symbol: string }> = {
  ethereum: { name: 'Ethereum', color: '#627eea', symbol: 'ETH' },
  base: { name: 'Base', color: '#0052ff', symbol: 'ETH' },
  arbitrum: { name: 'Arbitrum', color: '#28a0f0', symbol: 'ETH' },
  optimism: { name: 'Optimism', color: '#ff0420', symbol: 'ETH' },
  polygon: { name: 'Polygon', color: '#8247e5', symbol: 'POL' },
  bsc: { name: 'BNB Chain', color: '#f3ba2f', symbol: 'BNB' },
  sepolia: { name: 'Sepolia', color: '#627eea', symbol: 'ETH' },
  'base-sepolia': { name: 'Base Sepolia', color: '#0052ff', symbol: 'ETH' },
  'arbitrum-sepolia': { name: 'Arb Sepolia', color: '#28a0f0', symbol: 'ETH' },
  'optimism-sepolia': { name: 'OP Sepolia', color: '#ff0420', symbol: 'ETH' },
  'polygon-amoy': { name: 'Polygon Amoy', color: '#8247e5', symbol: 'POL' },
  'bsc-testnet': { name: 'BNB Testnet', color: '#f3ba2f', symbol: 'BNB' }
}

export default function ChainBadge({ chain, size = 'md', showName = true, className }: ChainBadgeProps) {
  const meta = CHAIN_META[chain.toLowerCase()] ?? { name: chain, color: '#888', symbol: '' }
  const sizes = {
    sm: { dot: 6, font: 'text-[10px]', pad: 'px-1.5 py-0.5' },
    md: { dot: 8, font: 'text-[11px]', pad: 'px-2 py-1' },
    lg: { dot: 10, font: 'text-xs', pad: 'px-2.5 py-1.5' }
  }
  const s = sizes[size]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border border-[#1f1f23] bg-[#141416] font-mono font-semibold tracking-wide',
        s.font,
        s.pad,
        className
      )}
      style={{ color: meta.color }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: s.dot, height: s.dot, background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
      />
      {showName && <span>{meta.name}</span>}
    </span>
  )
}

export { CHAIN_META }
