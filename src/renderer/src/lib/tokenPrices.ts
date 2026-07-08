// tokenPrices — non-React price lookup shared by web3Chat + PortfolioView.
//
// Primary source is the live CoinGecko `/coins/markets` endpoint (one call
// returns spot price, 24h change, market cap and a real 7-day sparkline). In
// Electron we hit the API directly; the browser preview routes through the
// Vite dev proxy. If the network call fails (offline, rate-limited, LAN
// firewall) we fall back to a small static table so the UI never shows blanks.
import { CHAINS, type ChainKey } from '../hooks/useWeb3Data'
import { coingeckoBase } from './apiBase'

export interface PriceInfo {
  id: string
  symbol: string
  name: string
  usd: number
  usd_24h_change: number
  sparkline: number[]
  market_cap?: number
}

// Symbol → CoinGecko coin id. Only the assets we surface in the workbench.
const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  WETH: 'weth',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  WBTC: 'wrapped-bitcoin',
  LINK: 'chainlink',
  UNI: 'uniswap',
  MATIC: 'matic-network',
  POL: 'matic-network',
  ARB: 'arbitrum',
  OP: 'optimism',
  BNB: 'binancecoin',
  WBNB: 'wbnb'
}

// Static fallback table (USD + 24h % change). Only used when the live call
// fails — kept intentionally small and clearly stale.
const STATIC_PRICES: Record<string, { usd: number; change24: number; name: string }> = {
  ETH: { usd: 1720, change24: 0.5, name: 'Ether' },
  WETH: { usd: 1720, change24: 0.5, name: 'Wrapped Ether' },
  USDC: { usd: 1.0, change24: 0.0, name: 'USD Coin' },
  USDT: { usd: 1.0, change24: 0.0, name: 'Tether' },
  DAI: { usd: 1.0, change24: 0.0, name: 'Dai' },
  WBTC: { usd: 38000, change24: 1.2, name: 'Wrapped Bitcoin' },
  LINK: { usd: 13.5, change24: 2.1, name: 'Chainlink' },
  UNI: { usd: 6.8, change24: -0.8, name: 'Uniswap' },
  MATIC: { usd: 0.4, change24: 0.3, name: 'Polygon' },
  POL: { usd: 0.4, change24: 0.3, name: 'Polygon' },
  ARB: { usd: 0.6, change24: -1.1, name: 'Arbitrum' },
  OP: { usd: 1.7, change24: 0.9, name: 'Optimism' },
  BNB: { usd: 580, change24: 0.4, name: 'BNB' },
  WBNB: { usd: 580, change24: 0.4, name: 'Wrapped BNB' }
}

// Synthesize a sparkline for the fallback path so a static token still renders
// a shape instead of a flat line. The direction respects the 24h change.
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

function fallbackInfo(symbol: string): PriceInfo | null {
  const p = STATIC_PRICES[symbol]
  if (!p) return null
  return {
    id: symbol.toLowerCase(),
    symbol,
    name: p.name,
    usd: p.usd,
    usd_24h_change: p.change24,
    sparkline: synthSparkline(p.change24, p.usd),
    market_cap: p.usd * 1_000_000
  }
}

interface CoinGeckoMarketRow {
  id: string
  symbol: string
  name: string
  current_price: number | null
  price_change_percentage_24h: number | null
  market_cap: number | null
  sparkline_in_7d?: { price?: number[] }
}

/**
 * Look up USD prices for a set of token symbols. Returns a map keyed by both
 * the original symbol and its uppercase form so callers can index either way.
 * Live CoinGecko data first; static fallback for anything the live call omits
 * or when the request fails entirely.
 */
export async function fetchTokenPrices(
  symbols: (string | undefined | null)[]
): Promise<Record<string, PriceInfo>> {
  const requested = Array.from(new Set(symbols.filter(Boolean).map((s) => (s as string).toUpperCase())))
  if (requested.length === 0) return {}

  // Unique CoinGecko ids for the requested symbols.
  const ids = Array.from(new Set(requested.map((s) => COINGECKO_IDS[s]).filter(Boolean)))

  const byId = new Map<string, CoinGeckoMarketRow>()
  if (ids.length > 0) {
    try {
      const url = `${coingeckoBase()}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
        ids.join(',')
      )}&sparkline=true&price_change_percentage=24h`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const rows = (await res.json()) as CoinGeckoMarketRow[]
        if (Array.isArray(rows)) for (const row of rows) byId.set(row.id, row)
      }
    } catch {
      // Network blocked / rate-limited — fall through to the static table.
    }
  }

  const out: Record<string, PriceInfo> = {}
  for (const sym of requested) {
    const id = COINGECKO_IDS[sym]
    const row = id ? byId.get(id) : undefined
    let info: PriceInfo | null
    if (row && typeof row.current_price === 'number') {
      const spark = row.sparkline_in_7d?.price
      const change = row.price_change_percentage_24h ?? 0
      info = {
        id: row.id,
        symbol: sym,
        name: row.name || sym,
        usd: row.current_price,
        usd_24h_change: change,
        sparkline: spark && spark.length > 1 ? spark : synthSparkline(change, row.current_price),
        market_cap: row.market_cap ?? undefined
      }
    } else {
      info = fallbackInfo(sym)
    }
    if (info) {
      out[sym] = info
      // Alias under any original-case symbol the caller passed in.
      for (const original of symbols) {
        if (original && original.toUpperCase() === sym) out[original] = info
      }
    }
  }
  return out
}

export function nativeCoingeckoId(chain: ChainKey): string | null {
  return CHAINS[chain].symbol
}
