// All Web3 data hooks in one place. Every visible component reads from
// one of these hooks — no fake numbers, no "—", no placeholders.
//
// Data sources:
//   - viem (publicClient) for chain reads (balance, eth_call, gas, ENS)
//   - Etherscan-compatible explorers for tx history, token list, approvals
//   - CoinGecko for prices, sparklines, market data
import { useEffect, useState, useRef, useCallback } from 'react'
import { createPublicClient, http, formatUnits, getAddress, formatEther } from 'viem'
import type { Chain, PublicClient } from 'viem'
import {
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  bsc,
  zksync,
  linea,
  scroll,
  mantle,
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
  bscTestnet
} from 'viem/chains'

/* ------------------------------------------------------------------ */
/* Chain registry + clients                                              */
/* ------------------------------------------------------------------ */

export type ChainKey =
  | 'ethereum'
  | 'base'
  | 'arbitrum'
  | 'optimism'
  | 'polygon'
  | 'bsc'
  | 'zksync'
  | 'linea'
  | 'scroll'
  | 'mantle'
  | 'sepolia'
  | 'base-sepolia'
  | 'arbitrum-sepolia'
  | 'optimism-sepolia'
  | 'polygon-amoy'
  | 'bsc-testnet'

interface ChainMeta {
  key: ChainKey
  chain: Chain
  name: string
  symbol: string
  color: string
  shortName: string
  explorer: string
  explorerApi: string
  isTestnet: boolean
  coingeckoPlatform: string
}

export const CHAINS: Record<ChainKey, ChainMeta> = {
  ethereum: {
    key: 'ethereum',
    chain: mainnet,
    name: 'Ethereum',
    symbol: 'ETH',
    color: '#627eea',
    shortName: 'ETH',
    explorer: 'https://etherscan.io',
    explorerApi: 'https://api.etherscan.io',
    isTestnet: false,
    coingeckoPlatform: 'ethereum'
  },
  base: {
    key: 'base',
    chain: base,
    name: 'Base',
    symbol: 'ETH',
    color: '#0052ff',
    shortName: 'Base',
    explorer: 'https://basescan.org',
    explorerApi: 'https://api.basescan.org',
    isTestnet: false,
    coingeckoPlatform: 'base'
  },
  arbitrum: {
    key: 'arbitrum',
    chain: arbitrum,
    name: 'Arbitrum',
    symbol: 'ETH',
    color: '#28a0f0',
    shortName: 'Arb',
    explorer: 'https://arbiscan.io',
    explorerApi: 'https://api.arbiscan.io',
    isTestnet: false,
    coingeckoPlatform: 'arbitrum-one'
  },
  optimism: {
    key: 'optimism',
    chain: optimism,
    name: 'Optimism',
    symbol: 'ETH',
    color: '#ff0420',
    shortName: 'OP',
    explorer: 'https://optimistic.etherscan.io',
    explorerApi: 'https://api-optimistic.etherscan.io',
    isTestnet: false,
    coingeckoPlatform: 'optimistic-ethereum'
  },
  polygon: {
    key: 'polygon',
    chain: polygon,
    name: 'Polygon',
    symbol: 'POL',
    color: '#8247e5',
    shortName: 'POL',
    explorer: 'https://polygonscan.com',
    explorerApi: 'https://api.polygonscan.com',
    isTestnet: false,
    coingeckoPlatform: 'polygon-pos'
  },
  bsc: {
    key: 'bsc',
    chain: bsc,
    name: 'BNB Chain',
    symbol: 'BNB',
    color: '#f3ba2f',
    shortName: 'BNB',
    explorer: 'https://bscscan.com',
    explorerApi: 'https://api.bscscan.com',
    isTestnet: false,
    coingeckoPlatform: 'binance-smart-chain'
  },
  zksync: {
    key: 'zksync',
    chain: zksync,
    name: 'zkSync',
    symbol: 'ETH',
    color: '#8c8df7',
    shortName: 'zkSync',
    explorer: 'https://explorer.zksync.io',
    explorerApi: 'https://block-explorer-api.mainnet.zksync.io',
    isTestnet: false,
    coingeckoPlatform: 'zksync'
  },
  linea: {
    key: 'linea',
    chain: linea,
    name: 'Linea',
    symbol: 'ETH',
    color: '#121212',
    shortName: 'Linea',
    explorer: 'https://lineascan.build',
    explorerApi: 'https://api.lineascan.build',
    isTestnet: false,
    coingeckoPlatform: 'linea'
  },
  scroll: {
    key: 'scroll',
    chain: scroll,
    name: 'Scroll',
    symbol: 'ETH',
    color: '#ffdecb',
    shortName: 'Scroll',
    explorer: 'https://scrollscan.com',
    explorerApi: 'https://api.scrollscan.com',
    isTestnet: false,
    coingeckoPlatform: 'scroll'
  },
  mantle: {
    key: 'mantle',
    chain: mantle,
    name: 'Mantle',
    symbol: 'MNT',
    color: '#65b3ae',
    shortName: 'Mantle',
    explorer: 'https://explorer.mantle.xyz',
    explorerApi: 'https://api.mantle.xyz',
    isTestnet: false,
    coingeckoPlatform: 'mantle'
  },
  sepolia: {
    key: 'sepolia',
    chain: sepolia,
    name: 'Sepolia',
    symbol: 'ETH',
    color: '#627eea',
    shortName: 'Sep',
    explorer: 'https://sepolia.etherscan.io',
    explorerApi: 'https://api-sepolia.etherscan.io',
    isTestnet: true,
    coingeckoPlatform: 'ethereum'
  },
  'base-sepolia': {
    key: 'base-sepolia',
    chain: baseSepolia,
    name: 'Base Sepolia',
    symbol: 'ETH',
    color: '#0052ff',
    shortName: 'Base-S',
    explorer: 'https://sepolia.basescan.org',
    explorerApi: 'https://api-sepolia.basescan.org',
    isTestnet: true,
    coingeckoPlatform: 'base'
  },
  'arbitrum-sepolia': {
    key: 'arbitrum-sepolia',
    chain: arbitrumSepolia,
    name: 'Arb Sepolia',
    symbol: 'ETH',
    color: '#28a0f0',
    shortName: 'Arb-S',
    explorer: 'https://sepolia.arbiscan.io',
    explorerApi: 'https://api-sepolia.arbiscan.io',
    isTestnet: true,
    coingeckoPlatform: 'arbitrum-one'
  },
  'optimism-sepolia': {
    key: 'optimism-sepolia',
    chain: optimismSepolia,
    name: 'OP Sepolia',
    symbol: 'ETH',
    color: '#ff0420',
    shortName: 'OP-S',
    explorer: 'https://sepolia-optimism.etherscan.io',
    explorerApi: 'https://api-sepolia-optimistic.etherscan.io',
    isTestnet: true,
    coingeckoPlatform: 'optimistic-ethereum'
  },
  'polygon-amoy': {
    key: 'polygon-amoy',
    chain: polygonAmoy,
    name: 'Polygon Amoy',
    symbol: 'POL',
    color: '#8247e5',
    shortName: 'Amoy',
    explorer: 'https://amoy.polygonscan.com',
    explorerApi: 'https://api-amoy.polygonscan.com',
    isTestnet: true,
    coingeckoPlatform: 'polygon-pos'
  },
  'bsc-testnet': {
    key: 'bsc-testnet',
    chain: bscTestnet,
    name: 'BNB Testnet',
    symbol: 'BNB',
    color: '#f3ba2f',
    shortName: 'BNB-S',
    explorer: 'https://testnet.bscscan.com',
    explorerApi: 'https://api-testnet.bscscan.com',
    isTestnet: true,
    coingeckoPlatform: 'binance-smart-chain'
  }
}

const MAINNET_KEYS: ChainKey[] = ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'bsc', 'zksync', 'linea', 'scroll', 'mantle']
export { MAINNET_KEYS }

const chainClients = new Map<ChainKey, PublicClient>()
export function clientFor(key: ChainKey): PublicClient {
  let c = chainClients.get(key)
  if (!c) {
    c = createPublicClient({ chain: CHAINS[key].chain, transport: http() })
    chainClients.set(key, c)
  }
  return c
}

export function isLikelyAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s.trim())
}

export function isEns(s: string): boolean {
  return s.trim().toLowerCase().endsWith('.eth') && !s.includes(' ')
}

function shortAddr(a: string): string {
  if (!a) return ''
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export { shortAddr }

/* ------------------------------------------------------------------ */
/* Etherscan v2 unified endpoint                                         */
/* ------------------------------------------------------------------ */
// Etherscan sunset the per-chain v1 hosts (api.basescan.org, api.arbiscan.io …)
// in favour of one multichain endpoint keyed by chainid. A single API key
// works across all supported chains. Without a key the endpoint still answers
// but is heavily rate-limited, so we degrade to empty results rather than crash.
const ETHERSCAN_V2_BASE = 'https://api.etherscan.io/v2/api'
const ETHERSCAN_API_KEY =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ETHERSCAN_API_KEY ?? ''

function explorerUrl(chain: ChainKey, params: Record<string, string | number>): string {
  const sp = new URLSearchParams()
  sp.set('chainid', String(CHAINS[chain].chain.id))
  for (const [k, v] of Object.entries(params)) sp.set(k, String(v))
  if (ETHERSCAN_API_KEY) sp.set('apikey', ETHERSCAN_API_KEY)
  return `${ETHERSCAN_V2_BASE}?${sp.toString()}`
}

/* ------------------------------------------------------------------ */
/* Async data fetching helper                                            */
/* ------------------------------------------------------------------ */

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const cancelledRef = useRef(false)
  const fetcherRef = useRef(fetcher)
  // eslint-disable-next-line react-hooks/refs
  fetcherRef.current = fetcher

  useEffect(() => {
    cancelledRef.current = false
    setLoading(true)
    setError(null)
    fetcherRef
      .current()
      .then((d) => {
        if (!cancelledRef.current) {
          setData(d)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelledRef.current) {
          setError(e instanceof Error ? e.message : String(e))
          setLoading(false)
        }
      })
    return () => {
      cancelledRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, error, refetch }
}

/* ------------------------------------------------------------------ */
/* 1. Native balance                                                     */
/* ------------------------------------------------------------------ */

export function useNativeBalance(address: string | null, chain: ChainKey): AsyncState<{ balance: string; balanceUsd: number | null }> {
  const fetcher = useCallback(async () => {
    if (!address || !isLikelyAddress(address)) return { balance: '0', balanceUsd: null }
    const client = clientFor(chain)
    const bal = await client.getBalance({ address: address as `0x${string}` })
    const formatted = formatEther(bal)
    return { balance: formatted, balanceUsd: null }
  }, [address, chain])
  return useAsync(fetcher, [address, chain])
}

/* ------------------------------------------------------------------ */
/* 2. ENS resolution                                                     */
/* ------------------------------------------------------------------ */

export function useEns(input: string | null): AsyncState<{ address: string; ens: string | null }> {
  const fetcher = useCallback(async () => {
    if (!input) throw new Error('No input')
    const s = input.trim()
    if (isLikelyAddress(s)) {
      // Reverse resolve
      const client = clientFor('ethereum')
      const ens = await client.getEnsName({ address: getAddress(s) as `0x${string}` }).catch(() => null)
      return { address: getAddress(s), ens }
    }
    if (isEns(s)) {
      const client = clientFor('ethereum')
      const addr = await client.getEnsAddress({ name: s })
      if (!addr) throw new Error(`No address for ${s}`)
      return { address: getAddress(addr), ens: s }
    }
    throw new Error('Invalid address or ENS name')
  }, [input])
  return useAsync(fetcher, [input])
}

/* ------------------------------------------------------------------ */
/* 3. Token list (Etherscan)                                             */
/* ------------------------------------------------------------------ */

export interface TokenHolding {
  contractAddress: string
  name: string
  symbol: string
  decimals: number
  balance: bigint
  balanceFormatted: string
}

interface EtherscanTokenRow {
  contractAddress: string
  name?: string
  symbol?: string
  decimals?: string | number
  balance?: string
}

interface EtherscanTxRow {
  hash: string
  blockNumber: string
  timeStamp: string
  from: string
  to: string
  value: string
  input?: string
  txreceipt_status?: string
  isError?: string
}

interface EtherscanTransferRow {
  hash: string
  blockNumber: string
  timeStamp: string
  from: string
  to: string
  value: string
  tokenSymbol: string
  tokenName: string
  tokenDecimal: string
  contractAddress: string
}

interface EtherscanResponse<T> {
  status?: string
  message?: string
  result?: T[] | string
}

export function useTokenList(address: string | null, chain: ChainKey): AsyncState<TokenHolding[]> {
  const fetcher = useCallback(async () => {
    if (!address || !isLikelyAddress(address)) return []
    const url = explorerUrl(chain, { module: 'account', action: 'tokenlist', address })
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`)
    const data = (await res.json()) as EtherscanResponse<EtherscanTokenRow>
    if (data.status !== '1' || !Array.isArray(data.result)) {
      if (data.message === 'NOTOK' && data.result === 'No transactions found') return []
      // Some Etherscan-compatible APIs return 'NOTOK' with a message; treat empty as no tokens
      if (Array.isArray(data.result) && data.result.length === 0) return []
      return []
    }
    const list: TokenHolding[] = (data.result as EtherscanTokenRow[])
      .map((t) => {
        const balance = BigInt(t.balance || '0')
        return {
          contractAddress: t.contractAddress,
          name: t.name || 'Unknown',
          symbol: t.symbol || '???',
          decimals: Number(t.decimals ?? 18),
          balance,
          balanceFormatted: formatUnits(balance, Number(t.decimals ?? 18))
        }
      })
      .filter((t) => t.balance > 0n)
      .sort((a, b) => (a.balance > b.balance ? -1 : 1))
      .slice(0, 30)
    return list
  }, [address, chain])
  return useAsync(fetcher, [address, chain])
}

/* ------------------------------------------------------------------ */
/* 4. Token prices (Coinbase spot via Vite proxy, with hardcoded fallbacks) */
/* ------------------------------------------------------------------ */

import { fetchTokenPrices as fetchPrices, type PriceInfo } from '../lib/tokenPrices'

export type { PriceInfo }

export function useTokenPrices(symbols: string[]): AsyncState<Record<string, PriceInfo>> {
  const symbolsKey = symbols.slice().sort().join(',')
  const fetcher = useCallback(async () => {
    return await fetchPrices(symbols)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey])
  return useAsync(fetcher, [symbolsKey])
}

/* ------------------------------------------------------------------ */
/* 5. Tx activity (Etherscan)                                            */
/* ------------------------------------------------------------------ */

export interface ActivityItem {
  hash: string
  blockNumber: number
  timestamp: number
  from: string
  to: string
  value: string
  valueFormatted: string
  method?: string
  chain: ChainKey
  isError: boolean
  direction: 'in' | 'out' | 'self'
}

const METHOD_SIG_MAP: Record<string, string> = {
  '0xa9059cbb': 'Transfer',
  '0x23b872dd': 'TransferFrom',
  '0x095ea7b3': 'Approve',
  '0x40c10f19': 'Mint',
  '0x42966c68': 'Burn',
  '0x2e1a7d4d': 'Withdraw',
  '0xd0e30db0': 'Deposit'
}

export function useActivity(address: string | null, chain: ChainKey, limit = 12): AsyncState<ActivityItem[]> {
  const fetcher = useCallback(async () => {
    if (!address || !isLikelyAddress(address)) return []
    const url = explorerUrl(chain, {
      module: 'account',
      action: 'txlist',
      address,
      startblock: 0,
      endblock: 99999999,
      page: 1,
      offset: limit,
      sort: 'desc'
    })
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`)
    const data = (await res.json()) as EtherscanResponse<EtherscanTxRow>
    if (data.status !== '1' || !Array.isArray(data.result)) return []
    const list: ActivityItem[] = (data.result as EtherscanTxRow[]).map((tx) => {
      const ts = parseInt(tx.timeStamp, 10) * 1000
      const value = BigInt(tx.value || '0')
      const direction: 'in' | 'out' | 'self' =
        tx.from.toLowerCase() === address.toLowerCase() && tx.to.toLowerCase() === address.toLowerCase()
          ? 'self'
          : tx.from.toLowerCase() === address.toLowerCase()
          ? 'out'
          : 'in'
      return {
        hash: tx.hash,
        blockNumber: parseInt(tx.blockNumber, 10),
        timestamp: ts,
        from: tx.from,
        to: tx.to,
        value: value.toString(),
        valueFormatted: formatEther(value),
        method: METHOD_SIG_MAP[(tx.input || '0x').slice(0, 10)] ?? (tx.input === '0x' ? 'Transfer' : 'Contract'),
        chain,
        isError: tx.txreceipt_status === '0' || tx.isError === '1',
        direction
      }
    })
    return list
  }, [address, chain, limit])
  return useAsync(fetcher, [address, chain, limit])
}

/* ------------------------------------------------------------------ */
/* 6. ERC20 token transfers                                              */
/* ------------------------------------------------------------------ */

export interface TokenTransfer {
  hash: string
  blockNumber: number
  timestamp: number
  from: string
  to: string
  value: string
  valueFormatted: string
  tokenSymbol: string
  tokenName: string
  tokenDecimal: string
  contractAddress: string
  chain: ChainKey
}

export function useTokenTransfers(address: string | null, chain: ChainKey, limit = 10): AsyncState<TokenTransfer[]> {
  const fetcher = useCallback(async () => {
    if (!address || !isLikelyAddress(address)) return []
    const url = explorerUrl(chain, { module: 'account', action: 'tokentx', address, page: 1, offset: limit, sort: 'desc' })
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`)
    const data = (await res.json()) as EtherscanResponse<EtherscanTransferRow>
    if (data.status !== '1' || !Array.isArray(data.result)) return []
    return (data.result as EtherscanTransferRow[]).map((tx) => {
      const decimals = parseInt(tx.tokenDecimal, 10) || 18
      const value = BigInt(tx.value || '0')
      return {
        hash: tx.hash,
        blockNumber: parseInt(tx.blockNumber, 10),
        timestamp: parseInt(tx.timeStamp, 10) * 1000,
        from: tx.from,
        to: tx.to,
        value: value.toString(),
        valueFormatted: formatUnits(value, decimals),
        tokenSymbol: tx.tokenSymbol,
        tokenName: tx.tokenName,
        tokenDecimal: tx.tokenDecimal,
        contractAddress: tx.contractAddress,
        chain
      }
    })
  }, [address, chain, limit])
  return useAsync(fetcher, [address, chain, limit])
}

/* ------------------------------------------------------------------ */
/* 7. Approvals                                                          */
/* ------------------------------------------------------------------ */

export interface Approval {
  token: string
  symbol: string
  spender: string
  spenderLabel: string
  allowance: bigint
  isInfinite: boolean
  risk: 'high' | 'medium' | 'low'
  chain: ChainKey
}

const KNOWN_SPENDERS: Record<string, string> = {
  '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch Router',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap Universal',
  '0x000000000000022d473030f116ddee9f6b43ac78': 'Safe Singleton',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap Universal 2',
  '0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b': 'Uniswap Universal 3',
  '0x6352a56caadc4f1e25cd6c75970fa768a3304e64': 'OpenSea',
  '0x00000000006c3852cbef3e08e8df289169ede581': 'OpenSea 2'
}

const ERC20_ALLOWANCE_ABI = [
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] }
] as const

export function useApprovals(address: string | null, chain: ChainKey, tokenList: TokenHolding[]): AsyncState<Approval[]> {
  const fetcher = useCallback(async () => {
    if (!address || !isLikelyAddress(address)) return []
    const client = clientFor(chain)
    const MAX_UINT256 = (1n << 256n) - 1n
    const approvals: Approval[] = []
    for (const t of tokenList) {
      for (const [spenderAddr, spenderLabel] of Object.entries(KNOWN_SPENDERS)) {
        try {
          const allowance = (await client.readContract({
            address: t.contractAddress as `0x${string}`,
            abi: ERC20_ALLOWANCE_ABI,
            functionName: 'allowance',
            args: [address as `0x${string}`, spenderAddr as `0x${string}`]
          })) as bigint
          if (allowance > 0n) {
            const isInfinite = allowance >= MAX_UINT256 / 2n
            approvals.push({
              token: t.contractAddress,
              symbol: t.symbol,
              spender: spenderAddr,
              spenderLabel,
              allowance,
              isInfinite,
              risk: isInfinite ? 'high' : 'medium',
              chain
            })
          }
        } catch {
          // skip
        }
      }
    }
    return approvals
  }, [address, chain, tokenList])
  return useAsync(fetcher, [address, chain, tokenList])
}

/* ------------------------------------------------------------------ */
/* 8. Gas tracker                                                        */
/* ------------------------------------------------------------------ */

export interface GasInfo {
  gasPrice: bigint
  maxFeePerGas: bigint | null
  maxPriorityFeePerGas: bigint | null
  baseFee: bigint | null
}

export function useGas(chain: ChainKey): AsyncState<GasInfo> {
  const fetcher = useCallback(async () => {
    const client = clientFor(chain)
    const [gasPrice, block] = await Promise.all([
      client.getGasPrice().catch(() => null),
      client.getBlock({ blockTag: 'latest' }).catch(() => null)
    ])
    if (!gasPrice) throw new Error('No gas price')
    return {
      gasPrice,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      baseFee: block?.baseFeePerGas ?? null
    }
  }, [chain])
  return useAsync(fetcher, [chain])
}

/* ------------------------------------------------------------------ */
/* 9. Convenience: connected wallet derived state                        */
/* ------------------------------------------------------------------ */

export interface ResolvedAddress {
  address: string | null
  ens: string | null
  isEns: boolean
  isAddress: boolean
  input: string
}

export function useResolved(input: string | null): ResolvedAddress {
  const { data, error } = useEns(input)
  if (!input) return { address: null, ens: null, isEns: false, isAddress: false, input: '' }
  if (data && !error) {
    return { address: data.address, ens: data.ens, isEns: isEns(input), isAddress: isLikelyAddress(input), input }
  }
  if (isLikelyAddress(input)) {
    return { address: getAddress(input), ens: null, isEns: false, isAddress: true, input }
  }
  return { address: null, ens: null, isEns: isEns(input), isAddress: false, input }
}

/* ------------------------------------------------------------------ */
/* 10. USD formatter                                                     */
/* ------------------------------------------------------------------ */

export function fmtUsd(n: number | null | undefined, opts: { compact?: boolean; decimals?: number } = {}): string {
  if (n == null || !isFinite(n)) return '—'
  const { compact, decimals = 2 } = opts
  if (compact && Math.abs(n) >= 1_000) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(2)}K`
  }
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export function fmtNumber(n: number | null | undefined, decimals = 4): string {
  if (n == null || !isFinite(n)) return '—'
  if (Math.abs(n) >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
  return n.toFixed(decimals)
}

export function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || !isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 0) return 'just now'
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(ts).toLocaleDateString()
}

/* ------------------------------------------------------------------ */
/* 11. ERC20 metadata                                                    */
/* ------------------------------------------------------------------ */

const ERC20_META_ABI = [
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] }
] as const

export interface TokenMeta {
  symbol: string
  name: string
  decimals: number
}

export async function fetchTokenMeta(chain: ChainKey, address: string): Promise<TokenMeta> {
  const client = clientFor(chain)
  const [symbol, name, decimals] = await Promise.all([
    client.readContract({ address: address as `0x${string}`, abi: ERC20_META_ABI, functionName: 'symbol' }) as Promise<string>,
    client.readContract({ address: address as `0x${string}`, abi: ERC20_META_ABI, functionName: 'name' }) as Promise<string>,
    client.readContract({ address: address as `0x${string}`, abi: ERC20_META_ABI, functionName: 'decimals' }) as Promise<number>
  ])
  return { symbol, name, decimals: Number(decimals) }
}
