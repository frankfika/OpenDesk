// tokenPrices — non-React price lookup shared by web3Chat + PortfolioView.
//
// Live price APIs (CoinGecko / Coinbase) are blocked on the LAN, so the
// demo runs entirely off a curated static price table. The numbers are
// reasonable as of the demo date (early 2026) — real production would
// swap in a paid feed and merge the result with STATIC_FALLBACK.
import { CHAINS, type ChainKey } from '../hooks/useWeb3Data'

export interface PriceInfo {
  id: string
  symbol: string
  name: string
  usd: number
  usd_24h_change: number
  sparkline: number[]
  market_cap?: number
}

// Demo-grade static price table. USD + 24h % change.
const STATIC_PRICES: Record<string, { usd: number; change24: number; name: string }> = {
  ETH:  { usd: 1720, change24: 0.5,  name: 'Ether' },
  WETH: { usd: 1720, change24: 0.5,  name: 'Wrapped Ether' },
  USDC: { usd: 1.0,  change24: 0.0,  name: 'USD Coin' },
  USDT: { usd: 1.0,  change24: 0.0,  name: 'Tether' },
  DAI:  { usd: 1.0,  change24: 0.0,  name: 'Dai' },
  WBTC: { usd: 38000, change24: 1.2, name: 'Wrapped Bitcoin' },
  LINK: { usd: 13.5, change24: 2.1,  name: 'Chainlink' },
  UNI:  { usd: 6.8,  change24: -0.8, name: 'Uniswap' },
  MATIC:{ usd: 0.4,  change24: 0.3,  name: 'Polygon' },
  POL:  { usd: 0.4,  change24: 0.3,  name: 'Polygon' },
  ARB:  { usd: 0.6,  change24: -1.1, name: 'Arbitrum' },
  OP:   { usd: 1.7,  change24: 0.9,  name: 'Optimism' },
  BNB:  { usd: 580,  change24: 0.4,  name: 'BNB' },
  WBNB: { usd: 580,  change24: 0.4,  name: 'Wrapped BNB' }
}

// Synthesize a sparkline from a stable seed so the UI doesn't look
// completely flat. The shape respects the 24h change direction.
function synthSparkline(change24: number, base: number): number[] {
  const points = 30
  const out: number[] = []
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1)
    const drift = (change24 / 100) * base * t
    const noise = (Math.sin(i * 1.7) + Math.sin(i * 0.5)) * base * 0.012
    out.push(base * 0.96 + drift + noise)
  }
  return out
}

export async function fetchTokenPrices(symbols: (string | undefined | null)[]): Promise<Record<string, PriceInfo>> {
  const unique = Array.from(new Set(symbols.filter(Boolean) as string[]))
  const out: Record<string, PriceInfo> = {}
  for (const s of unique) {
    const p = STATIC_PRICES[s]
    if (!p) continue
    out[s] = {
      id: s.toLowerCase(),
      symbol: s,
      name: p.name,
      usd: p.usd,
      usd_24h_change: p.change24,
      sparkline: synthSparkline(p.change24, p.usd),
      market_cap: p.usd * 1_000_000
    }
  }
  return out
}

export function nativeCoingeckoId(chain: ChainKey): string | null {
  return CHAINS[chain].symbol
}
