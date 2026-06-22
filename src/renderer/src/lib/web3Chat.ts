// web3Chat — browser-mode chat handler.
//
// When running outside Electron (no `window.api.chat.send`), the right-rail
// AI agent is wired to this handler. It detects intent from the user message,
// pulls real on-chain data via viem + public RPCs, and renders a synthesized
// "agent reply" in the chat. This is the demo path so the workbench feels
// end-to-end without a real LLM.
import { createPublicClient, http, formatUnits, isAddress, type Address, type PublicClient } from 'viem'
import { mainnet, base, arbitrum, optimism, polygon, bsc, sepolia, baseSepolia, arbitrumSepolia, optimismSepolia, polygonAmoy, bscTestnet } from 'viem/chains'
import { CHAINS, type ChainKey } from '../hooks/useWeb3Data'
import { fetchTokenPrices, type PriceInfo } from './tokenPrices'
import { CHAIN_RPC } from './apiBase'

function makeClient(chain: Parameters<typeof createPublicClient>[0]['chain'], rpc?: string): PublicClient {
  return createPublicClient({ chain, transport: rpc ? http(rpc) : http() })
}

const CHAIN_CLIENTS: Record<ChainKey, PublicClient> = {
  ethereum: makeClient(mainnet, CHAIN_RPC.ethereum),
  base: makeClient(base, CHAIN_RPC.base),
  arbitrum: makeClient(arbitrum, CHAIN_RPC.arbitrum),
  optimism: makeClient(optimism, CHAIN_RPC.optimism),
  polygon: makeClient(polygon, CHAIN_RPC.polygon),
  bsc: makeClient(bsc, CHAIN_RPC.bsc),
  sepolia: makeClient(sepolia),
  'base-sepolia': makeClient(baseSepolia),
  'arbitrum-sepolia': makeClient(arbitrumSepolia),
  'optimism-sepolia': makeClient(optimismSepolia),
  'polygon-amoy': makeClient(polygonAmoy),
  'bsc-testnet': makeClient(bscTestnet)
}

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  }
] as const

// Common well-known tokens per chain (address → symbol).
const TOKENS_BY_CHAIN: Record<ChainKey, { address: Address; symbol: string; decimals: number }[]> = {
  ethereum: [
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18 },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8 },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18 },
    { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', decimals: 18 },
    { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', decimals: 18 },
    { address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', symbol: 'MATIC', decimals: 18 }
  ],
  base: [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18 },
    { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', symbol: 'USDbC', decimals: 6 }
  ],
  arbitrum: [
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6 },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6 },
    { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', decimals: 18 },
    { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB', decimals: 18 }
  ],
  optimism: [
    { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', decimals: 6 },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18 },
    { address: '0x4200000000000000000000000000000000000042', symbol: 'OP', decimals: 18 }
  ],
  polygon: [
    { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', decimals: 6 },
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
    { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'MATIC', decimals: 18 },
    { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH', decimals: 18 }
  ],
  bsc: [
    { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', decimals: 18 },
    { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', decimals: 18 },
    { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', decimals: 18 },
    { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'WETH', decimals: 18 }
  ],
  sepolia: [],
  'base-sepolia': [],
  'arbitrum-sepolia': [],
  'optimism-sepolia': [],
  'polygon-amoy': [],
  'bsc-testnet': []
}

const ENS_RESOLVER = '/api/ens/ens/resolve'

function pickChain(text: string): ChainKey {
  const t = text.toLowerCase()
  if (t.includes('arbitrum') || t.includes('arb')) return 'arbitrum'
  if (t.includes('base')) return 'base'
  if (t.includes('optimism') || t.includes('op ')) return 'optimism'
  if (t.includes('polygon') || t.includes('matic')) return 'polygon'
  if (t.includes('bsc') || t.includes('bnb')) return 'bsc'
  return 'ethereum'
}

function extractAddress(text: string): string | null {
  const m = text.match(/0x[a-fA-F0-9]{40}/)
  return m ? m[0] : null
}

function extractEns(text: string): string | null {
  const m = text.match(/([a-z0-9-]+\.eth)/i)
  return m ? m[1].toLowerCase() : null
}

async function resolveTarget(text: string): Promise<{ address: Address | null; ens: string | null }> {
  const addr = extractAddress(text)
  if (addr) return { address: addr as Address, ens: null }
  const ens = extractEns(text)
  if (ens) {
    try {
      const r = await fetch(`${ENS_RESOLVER}/${ens}`).then((r) => r.json()).catch(() => null)
      if (r?.address) return { address: r.address as Address, ens }
    } catch {
      /* ignore */
    }
  }
  return { address: null, ens }
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`
  if (n < 0.01) return `<$0.01`
  return `$${n.toFixed(2)}`
}

function fmtBalance(raw: bigint, decimals: number): string {
  const n = Number(formatUnits(raw, decimals))
  if (n === 0) return '0'
  if (n < 0.0001) return '<0.0001'
  if (n < 1) return n.toFixed(4)
  if (n < 1000) return n.toFixed(2)
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

interface TokenHolding {
  symbol: string
  balance: number
  usd: number
  chain: ChainKey
}

async function readTokenHoldings(address: Address, chain: ChainKey): Promise<TokenHolding[]> {
  const client = CHAIN_CLIENTS[chain]
  const tokens = TOKENS_BY_CHAIN[chain]
  const balances: { symbol: string; balance: number; raw: bigint; decimals: number }[] = []
  for (const t of tokens) {
    try {
      const raw = (await client.readContract({
        address: t.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address]
      })) as bigint
      if (raw > 0n) {
        balances.push({ symbol: t.symbol, balance: Number(formatUnits(raw, t.decimals)), raw, decimals: t.decimals })
      }
    } catch {
      /* skip */
    }
  }
  const symbols = balances.map((b) => b.symbol)
  const prices = (await fetchTokenPrices(symbols).catch(() => ({}))) as Record<string, PriceInfo>
  return balances
    .map((b) => ({
      symbol: b.symbol,
      balance: b.balance,
      usd: prices[b.symbol]?.usd ? b.balance * prices[b.symbol]!.usd : 0,
      chain
    }))
    .filter((b) => b.usd > 0 || b.balance > 0)
    .sort((a, b) => b.usd - a.usd)
}

async function readNativeBalance(address: Address, chain: ChainKey): Promise<{ balance: number; symbol: string; usd: number }> {
  const client = CHAIN_CLIENTS[chain]
  const symbol = CHAINS[chain].symbol
  try {
    const raw = await client.getBalance({ address })
    const balance = Number(formatUnits(raw, 18))
    const prices = (await fetchTokenPrices([symbol]).catch(
      () => ({})
    )) as Record<string, PriceInfo>
    const usd = prices[symbol]?.usd ? balance * prices[symbol]!.usd : 0
    return { balance, symbol, usd }
  } catch {
    return { balance: 0, symbol, usd: 0 }
  }
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export type AgentReply = {
  content: string
  meta?: Record<string, unknown>
}

// Public entry point. Async generator that yields one or more chunks.
export async function runWeb3Agent(userText: string, scenario: 'intel' | 'trade' | 'doctor' | 'chat'): Promise<AgentReply> {
  const text = userText.trim()

  // 1) Resolve target
  const { address, ens } = await resolveTarget(text)
  if (!address) {
    return {
      content: `I couldn't find an address or ENS in that message. Try \`vitalik.eth\`, \`ens.eth\`, or paste a 0x… address.`
    }
  }
  if (!isAddress(address)) {
    return { content: `That doesn't look like a valid Ethereum address: \`${address}\`` }
  }

  // 2) Pick chains to scan
  const primary = pickChain(text)
  const chains: ChainKey[] = [primary]
  if (scenario === 'intel') {
    // scan the mentioned chain + a couple of major ones for net worth
    for (const c of ['ethereum', 'base', 'arbitrum'] as ChainKey[]) if (!chains.includes(c)) chains.push(c)
  }

  // 3) Branch by intent
  if (scenario === 'doctor' || /approval|infinite|allowance|revoke|risk/i.test(text)) {
    return await runDoctor(address, ens, primary)
  }

  if (scenario === 'trade' || /swap|bridge|send|transfer|gas/i.test(text)) {
    return runTradeAdvice(text, address, ens, primary)
  }

  // default: intel
  return await runIntel(address, ens, chains)
}

async function runIntel(address: Address, ens: string | null, chains: ChainKey[]): Promise<AgentReply> {
  const allHoldings: TokenHolding[] = []
  const natResults: { chain: ChainKey; balance: number; symbol: string; usd: number }[] = []

  for (const c of chains) {
    const [holdings, native] = await Promise.all([readTokenHoldings(address, c), readNativeBalance(address, c)])
    allHoldings.push(...holdings)
    natResults.push({ chain: c, ...native })
  }

  const totalUsd = allHoldings.reduce((s, h) => s + h.usd, 0) + natResults.reduce((s, n) => s + n.usd, 0)
  const top = allHoldings.slice(0, 8)

  const head = ens
    ? `Dossier for **${ens}** (\`${shortAddr(address)}\`)`
    : `Dossier for \`${shortAddr(address)}\``

  const lines: string[] = []
  lines.push(head)
  lines.push('')
  lines.push(`**Net worth:** ${fmtUsd(totalUsd)}  ·  chains scanned: ${chains.length}`)
  lines.push('')
  if (top.length === 0 && natResults.every((n) => n.balance === 0)) {
    lines.push('_No balances found on the scanned chains._')
  } else {
    lines.push('**Top holdings**')
    top.forEach((h) => {
      const usd = h.usd > 0 ? `≈ ${fmtUsd(h.usd)}` : ''
      lines.push(`- \`${h.symbol}\` (${CHAINS[h.chain].name}) — ${fmtBalance(BigInt(Math.round(h.balance * 1e6)), 6).slice(0, 12)} ${usd}`)
    })
    const natNonZero = natResults.filter((n) => n.balance > 0)
    if (natNonZero.length) {
      lines.push('')
      lines.push('**Native balances**')
      natNonZero.forEach((n) => {
        const usd = n.usd > 0 ? ` ≈ ${fmtUsd(n.usd)}` : ''
        lines.push(`- ${n.balance.toFixed(4)} ${n.symbol} on ${CHAINS[n.chain].name}${usd}`)
      })
    }
  }

  lines.push('')
  lines.push('Next: try **Wallet Doctor** to scan risky approvals, or **One-Liner Trade** to simulate a swap.')

  return { content: lines.join('\n'), meta: { address, scenario: 'intel' } }
}

async function runDoctor(address: Address, ens: string | null, chain: ChainKey): Promise<AgentReply> {
  const holdings = await readTokenHoldings(address, chain)
  const lines: string[] = []
  lines.push(`Doctor scan for ${ens ? `**${ens}**` : `\`${shortAddr(address)}\``} on **${CHAINS[chain].name}**`)
  lines.push('')

  if (holdings.length === 0) {
    lines.push('No ERC-20 balances found. If approvals exist, they need token balance to drain — so this wallet is currently safe.')
  } else {
    lines.push('**Token balances found**')
    holdings.slice(0, 10).forEach((h) => {
      lines.push(`- \`${h.symbol}\` — ${fmtBalance(BigInt(Math.round(h.balance * 1e6)), 6).slice(0, 12)}${h.usd ? ` (≈ ${fmtUsd(h.usd)})` : ''}`)
    })
  }

  lines.push('')
  lines.push('**Approval scan**')
  lines.push('For a complete approval audit, this wallet needs to be the connected address so I can call `eth_getApproved` / `allowance(owner, …)` against each known spender. Click **Scan** in the Wallet Doctor panel for the live audit.')
  lines.push('')
  lines.push('Tip: revoke unused infinite allowances at [revoke.cash](https://revoke.cash)')

  return { content: lines.join('\n'), meta: { address, scenario: 'doctor' } }
}

function runTradeAdvice(text: string, address: Address, ens: string | null, chain: ChainKey): AgentReply {
  const lines: string[] = []
  lines.push(`Trade simulation for ${ens ? `**${ens}**` : `\`${shortAddr(address)}\``} on **${CHAINS[chain].name}**`)
  lines.push('')
  lines.push('**Drafted action**')
  lines.push(`> ${text}`)
  lines.push('')
  lines.push('**Simulation status**')
  lines.push('To simulate and sign a real transaction, the connected wallet must be the **signer**. Once you connect a wallet in the top bar, the agent will:')
  lines.push('1. Resolve the route (Uniswap V3 / V2 / 1inch aggregator)')
  lines.push('2. Estimate gas + slippage')
  lines.push('3. Pop a signature card → you sign in your wallet')
  lines.push('')
  lines.push('Connect your wallet at the top right, then re-run this prompt to execute the trade.')

  return { content: lines.join('\n'), meta: { address, scenario: 'trade' } }
}
