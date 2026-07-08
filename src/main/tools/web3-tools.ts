// Web3 read-only tools. All write operations (signing) happen in the
// renderer through Reown AppKit + wagmi. The main process must never
// touch a private key.
import { createPublicClient, http, formatUnits, getAddress, isAddress } from 'viem'
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
import type { ToolDefinition } from './registry'

/* ---------- Chain registry (EVM mainnets + testnets) ---------- */

export const WEB3_CHAINS = {
  ethereum: {
    chain: mainnet,
    name: 'Ethereum',
    symbol: 'ETH',
    color: '#627eea',
    explorer: 'https://etherscan.io'
  },
  base: { chain: base, name: 'Base', symbol: 'ETH', color: '#0052ff', explorer: 'https://basescan.org' },
  arbitrum: {
    chain: arbitrum,
    name: 'Arbitrum',
    symbol: 'ETH',
    color: '#28a0f0',
    explorer: 'https://arbiscan.io'
  },
  optimism: {
    chain: optimism,
    name: 'Optimism',
    symbol: 'ETH',
    color: '#ff0420',
    explorer: 'https://optimistic.etherscan.io'
  },
  polygon: {
    chain: polygon,
    name: 'Polygon',
    symbol: 'POL',
    color: '#8247e5',
    explorer: 'https://polygonscan.com'
  },
  bsc: { chain: bsc, name: 'BNB Chain', symbol: 'BNB', color: '#f3ba2f', explorer: 'https://bscscan.com' },
  zksync: {
    chain: zksync,
    name: 'zkSync',
    symbol: 'ETH',
    color: '#8c8df7',
    explorer: 'https://explorer.zksync.io'
  },
  linea: { chain: linea, name: 'Linea', symbol: 'ETH', color: '#121212', explorer: 'https://lineascan.build' },
  scroll: { chain: scroll, name: 'Scroll', symbol: 'ETH', color: '#ffdecb', explorer: 'https://scrollscan.com' },
  mantle: { chain: mantle, name: 'Mantle', symbol: 'MNT', color: '#65b3ae', explorer: 'https://explorer.mantle.xyz' },
  sepolia: {
    chain: sepolia,
    name: 'Sepolia',
    symbol: 'ETH',
    color: '#627eea',
    explorer: 'https://sepolia.etherscan.io'
  },
  'base-sepolia': {
    chain: baseSepolia,
    name: 'Base Sepolia',
    symbol: 'ETH',
    color: '#0052ff',
    explorer: 'https://sepolia.basescan.org'
  },
  'arbitrum-sepolia': {
    chain: arbitrumSepolia,
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    color: '#28a0f0',
    explorer: 'https://sepolia.arbiscan.io'
  },
  'optimism-sepolia': {
    chain: optimismSepolia,
    name: 'OP Sepolia',
    symbol: 'ETH',
    color: '#ff0420',
    explorer: 'https://sepolia-optimism.etherscan.io'
  },
  'polygon-amoy': {
    chain: polygonAmoy,
    name: 'Polygon Amoy',
    symbol: 'POL',
    color: '#8247e5',
    explorer: 'https://amoy.polygonscan.com'
  },
  'bsc-testnet': {
    chain: bscTestnet,
    name: 'BNB Testnet',
    symbol: 'BNB',
    color: '#f3ba2f',
    explorer: 'https://testnet.bscscan.com'
  }
} as const

export type ChainKey = keyof typeof WEB3_CHAINS

function chainKey(input: string): ChainKey {
  const k = input.toLowerCase().trim() as ChainKey
  if (k in WEB3_CHAINS) return k
  // Friendly aliases
  const alias: Record<string, ChainKey> = {
    eth: 'ethereum',
    mainnet: 'ethereum',
    arb: 'arbitrum',
    'arbitrum-one': 'arbitrum',
    op: 'optimism',
    matic: 'polygon',
    'polygon-pos': 'polygon',
    bnb: 'bsc',
    'op-bnb': 'bsc',
    zk: 'zksync',
    zksync: 'zksync',
    linea: 'linea',
    scroll: 'scroll',
    mantle: 'mantle',
    testnet: 'sepolia'
  }
  return alias[k] ?? 'ethereum'
}

function clientFor(key: ChainKey) {
  const def = WEB3_CHAINS[key]
  return createPublicClient({ chain: def.chain, transport: http() })
}

/* ---------- Common ERC20 ABI fragments ---------- */

const ERC20_METADATA_ABI = [
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] }
] as const

const ERC20_BALANCE_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] }
] as const

const ERC20_ALLOWANCE_ABI = [
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] }
] as const

/* ---------- Tool 1: web3_resolveENS ---------- */

export const web3ResolveEnsTool: ToolDefinition = {
  name: 'web3_resolveENS',
  description:
    'Resolve an ENS name (e.g. vitalik.eth) to an Ethereum address, or reverse-resolve an address to an ENS name. Use this whenever the user provides an ENS / .eth name. Chain is always Ethereum mainnet for ENS.',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'Either an ENS name (e.g. "vitalik.eth") or an Ethereum address (0x...)' }
    },
    required: ['input']
  },
  handler: async (args) => {
    const input = String(args.input || '').trim()
    if (!input) throw new Error('input is required')
    const client = clientFor('ethereum')
    try {
      if (isAddress(input)) {
        const addr = getAddress(input)
        const ens = await client.getEnsName({ address: addr })
        return JSON.stringify(
          { input, address: addr, ens: ens ?? null, resolved: true },
          null,
          2
        )
      }
      if (!input.toLowerCase().endsWith('.eth') && !input.includes('.')) {
        throw new Error(`Input "${input}" is not a valid ENS name or address`)
      }
      const addr = await client.getEnsAddress({ name: input })
      if (!addr) return JSON.stringify({ input, address: null, resolved: false, note: 'ENS name has no forward resolution' }, null, 2)
      return JSON.stringify(
        { input, address: getAddress(addr), ens: input, resolved: true },
        null,
        2
      )
    } catch (e) {
      return JSON.stringify({ input, resolved: false, error: e instanceof Error ? e.message : String(e) }, null, 2)
    }
  }
}

/* ---------- Tool 2: web3_getBalance ---------- */

export const web3GetBalanceTool: ToolDefinition = {
  name: 'web3_getBalance',
  description:
    'Get the native coin (ETH / BNB / POL) balance of an address on a specific chain. If tokenAddress is provided, returns the ERC20 balance instead.',
  parameters: {
    type: 'object',
    properties: {
      address: { type: 'string', description: 'Wallet address (0x...) or ENS name' },
      chain: { type: 'string', description: 'Chain key: ethereum, base, arbitrum, optimism, polygon, bsc, sepolia, etc.' },
      tokenAddress: { type: 'string', description: 'Optional ERC20 token contract address to query balance of' }
    },
    required: ['address', 'chain']
  },
  handler: async (args) => {
    const rawAddress = String(args.address || '').trim()
    const chain = chainKey(String(args.chain || 'ethereum'))
    const tokenAddress = args.tokenAddress ? String(args.tokenAddress).trim() : null

    if (!rawAddress) throw new Error('address is required')
    const client = clientFor(chain)
    let address = rawAddress
    if (!isAddress(address)) {
      const resolved = await client.getEnsAddress({ name: address })
      if (!resolved) throw new Error(`Cannot resolve "${address}" to a wallet address`)
      address = resolved
    } else {
      address = getAddress(address)
    }

    if (!tokenAddress) {
      const balance = await client.getBalance({ address: address as `0x${string}` })
      const symbol = WEB3_CHAINS[chain].symbol
      return JSON.stringify(
        {
          address,
          chain,
          chainName: WEB3_CHAINS[chain].name,
          balance: formatUnits(balance, 18),
          symbol,
          balanceRaw: balance.toString()
        },
        null,
        2
      )
    }

    if (!isAddress(tokenAddress)) throw new Error(`Invalid token contract: ${tokenAddress}`)
    const token = getAddress(tokenAddress)
    const [balance, decimals, symbol, name] = await Promise.all([
      client.readContract({ address: token as `0x${string}`, abi: ERC20_BALANCE_ABI, functionName: 'balanceOf', args: [address as `0x${string}`] }) as Promise<bigint>,
      client.readContract({ address: token as `0x${string}`, abi: ERC20_METADATA_ABI, functionName: 'decimals' }) as Promise<number>,
      client.readContract({ address: token as `0x${string}`, abi: ERC20_METADATA_ABI, functionName: 'symbol' }) as Promise<string>,
      client.readContract({ address: token as `0x${string}`, abi: ERC20_METADATA_ABI, functionName: 'name' }) as Promise<string>
    ])
    return JSON.stringify(
      {
        address,
        chain,
        chainName: WEB3_CHAINS[chain].name,
        tokenAddress: token,
        tokenName: name,
        tokenSymbol: symbol,
        balance: formatUnits(balance, Number(decimals)),
        balanceRaw: balance.toString()
      },
      null,
      2
    )
  }
}

/* ---------- Tool 3: web3_getTokenList ---------- */
// Uses Etherscan-compatible free API (no key required for limited calls).
// Endpoint format: https://api.etherscan.io/api?module=account&action=tokentx&address=...&page=1&offset=100&sort=desc

interface RawTokenRow {
  symbol?: string
  name?: string
  decimals?: string | number
  balance?: string
  contractAddress: string
}

interface RawTokenListResponse {
  status?: string
  result?: RawTokenRow[]
}

async function fetchTokenListFromExplorer(
  address: string,
  chain: ChainKey
): Promise<{ symbol: string; name: string; decimals: number; balance: string; contractAddress: string }[]> {
  const explorers: Record<ChainKey, string> = {
    ethereum: 'https://api.etherscan.io',
    sepolia: 'https://api-sepolia.etherscan.io',
    base: 'https://api.basescan.org',
    'base-sepolia': 'https://api-sepolia.basescan.org',
    arbitrum: 'https://api.arbiscan.io',
    'arbitrum-sepolia': 'https://api-sepolia.arbiscan.io',
    optimism: 'https://api-optimistic.etherscan.io',
    'optimism-sepolia': 'https://api-sepolia-optimistic.etherscan.io',
    polygon: 'https://api.polygonscan.com',
    'polygon-amoy': 'https://api-amoy.polygonscan.com',
    bsc: 'https://api.bscscan.com',
    'bsc-testnet': 'https://api-testnet.bscscan.com',
    zksync: 'https://block-explorer-api.mainnet.zksync.io',
    linea: 'https://api.lineascan.build',
    scroll: 'https://api.scrollscan.com',
    mantle: 'https://api.mantle.xyz'
  }
  const base = explorers[chain]
  const url = `${base}/api?module=account&action=tokenlist&address=${address}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = (await res.json()) as RawTokenListResponse
    if (data.status !== '1' || !Array.isArray(data.result)) return []
    return data.result.map((t) => ({
      symbol: t.symbol || '???',
      name: t.name || 'Unknown Token',
      decimals: Number(t.decimals ?? 18),
      balance: t.balance || '0',
      contractAddress: t.contractAddress
    }))
  } catch {
    return []
  }
}

export const web3GetTokenListTool: ToolDefinition = {
  name: 'web3_getTokenList',
  description:
    'List ERC20 tokens held by a wallet address on a specific chain. Returns symbol, name, contract address and balance. Useful for portfolio analysis.',
  parameters: {
    type: 'object',
    properties: {
      address: { type: 'string', description: 'Wallet address (0x...) or ENS name' },
      chain: { type: 'string', description: 'Chain key (ethereum, base, arbitrum, etc.)' }
    },
    required: ['address', 'chain']
  },
  handler: async (args) => {
    const rawAddress = String(args.address || '').trim()
    const chain = chainKey(String(args.chain || 'ethereum'))
    if (!rawAddress) throw new Error('address is required')
    const client = clientFor(chain)
    let address = rawAddress
    if (!isAddress(address)) {
      const resolved = await client.getEnsAddress({ name: address })
      if (!resolved) throw new Error(`Cannot resolve "${address}"`)
      address = resolved
    } else {
      address = getAddress(address)
    }
    const tokens = await fetchTokenListFromExplorer(address, chain)
    // Filter zero balances, sort by raw balance desc
    const enriched = tokens
      .filter((t) => BigInt(t.balance) > 0n)
      .map((t) => ({ ...t, balanceFormatted: formatUnits(BigInt(t.balance), t.decimals) }))
      .sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1))
      .slice(0, 50)
    return JSON.stringify(
      {
        address,
        chain,
        chainName: WEB3_CHAINS[chain].name,
        tokenCount: enriched.length,
        tokens: enriched
      },
      null,
      2
    )
  }
}

/* ---------- Tool 4: web3_getApprovals ---------- */

export const web3GetApprovalsTool: ToolDefinition = {
  name: 'web3_getApprovals',
  description:
    'Scan a wallet for ERC20 token approvals (allowances). Returns each approval with the spender, token, remaining allowance and a risk hint ("infinite" if allowance == uint256 max). Used by the "Wallet Doctor" feature to identify risky or stale approvals to revoke.',
  parameters: {
    type: 'object',
    properties: {
      address: { type: 'string', description: 'Wallet address (0x...) or ENS name' },
      chain: { type: 'string', description: 'Chain key' }
    },
    required: ['address', 'chain']
  },
  handler: async (args) => {
    const rawAddress = String(args.address || '').trim()
    const chain = chainKey(String(args.chain || 'ethereum'))
    if (!rawAddress) throw new Error('address is required')
    const client = clientFor(chain)
    let address = rawAddress
    if (!isAddress(address)) {
      const resolved = await client.getEnsAddress({ name: address })
      if (!resolved) throw new Error(`Cannot resolve "${address}"`)
      address = resolved
    } else {
      address = getAddress(address)
    }

    const tokens = await fetchTokenListFromExplorer(address, chain)
    const MAX_UINT256 = (1n << 256n) - 1n
    const approvals: { token: string; symbol: string; spender: string; allowance: string; isInfinite: boolean; risk: 'high' | 'medium' | 'low' }[] = []

    // Limit to first 25 tokens to avoid rate limits
    for (const t of tokens.slice(0, 25)) {
      try {
        // Common DEX / protocol spenders — user can extend
        const spenders = [
          { addr: '0x1111111254EEB25477B68fb85Ed929f73A960582', label: '1inch Router' },
          { addr: '0xE592427A0AEce92De3Edee1F18E0157C05861564', label: 'Uniswap V3 Router' },
          { addr: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', label: 'Uniswap Universal Router' },
          { addr: '0x000000000000022D473030F116dDEE9F6B43aC78', label: 'Safe Singleton' }
        ]
        for (const sp of spenders) {
          const allowance = (await client.readContract({
            address: t.contractAddress as `0x${string}`,
            abi: ERC20_ALLOWANCE_ABI,
            functionName: 'allowance',
            args: [address as `0x${string}`, sp.addr as `0x${string}`]
          })) as bigint
          if (allowance > 0n) {
            const isInfinite = allowance >= MAX_UINT256 / 2n
            approvals.push({
              token: t.contractAddress,
              symbol: t.symbol,
              spender: sp.label,
              allowance: allowance.toString(),
              isInfinite,
              risk: isInfinite ? 'high' : 'medium'
            })
          }
        }
      } catch {
        // skip token on error
      }
    }

    return JSON.stringify(
      {
        address,
        chain,
        chainName: WEB3_CHAINS[chain].name,
        approvalCount: approvals.length,
        highRiskCount: approvals.filter((a) => a.risk === 'high').length,
        approvals
      },
      null,
      2
    )
  }
}

/* ---------- Tool 5: web3_getTokenPrice ---------- */

export const web3GetTokenPriceTool: ToolDefinition = {
  name: 'web3_getTokenPrice',
  description:
    'Get the current USD price of a token by its CoinGecko id (e.g. "ethereum", "bitcoin", "usd-coin") or by contract address (try "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" for USDC on mainnet).',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'CoinGecko id (e.g. "ethereum", "bitcoin") OR a "chain:address" pair' }
    },
    required: ['id']
  },
  handler: async (args) => {
    const id = String(args.id || '').trim()
    if (!id) throw new Error('id is required')
    let url: string
    if (id.includes(':') && id.split(':').length === 2) {
      const [platform, addr] = id.split(':')
      const platformMap: Record<string, string> = {
        ethereum: 'ethereum',
        base: 'base',
        arbitrum: 'arbitrum-one',
        optimism: 'optimistic-ethereum',
        polygon: 'polygon-pos',
        bsc: 'binance-smart-chain'
      }
      const p = platformMap[platform.toLowerCase()] ?? platform
      url = `https://api.coingecko.com/api/v3/simple/token_price/${p}?contract_addresses=${addr}&vs_currencies=usd`
    } else {
      url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_24hr_change=true`
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`)
    const data = (await res.json()) as unknown
    return JSON.stringify(data, null, 2)
  }
}

/* ---------- Tool 6: web3_simulateTx ---------- */

export const web3SimulateTxTool: ToolDefinition = {
  name: 'web3_simulateTx',
  description:
    'Simulate an EVM transaction via eth_call (read-only) and return the decoded result + gas estimate. Use this to preview a swap, contract call, or transfer before the user signs.',
  parameters: {
    type: 'object',
    properties: {
      chain: { type: 'string', description: 'Chain key' },
      from: { type: 'string', description: 'Sender address' },
      to: { type: 'string', description: 'Target contract / recipient address' },
      data: { type: 'string', description: 'Hex calldata (0x...)' },
      value: { type: 'string', description: 'Optional value in wei (decimal string)' }
    },
    required: ['chain', 'from', 'to']
  },
  handler: async (args) => {
    const chain = chainKey(String(args.chain || 'ethereum'))
    const from = String(args.from || '').trim()
    const to = String(args.to || '').trim()
    const data = args.data ? String(args.data) : '0x'
    const value = args.value ? BigInt(String(args.value)) : 0n
    if (!isAddress(from) || !isAddress(to)) throw new Error('from / to must be valid addresses')
    const client = clientFor(chain)
    try {
      const result = await client.call({
        account: getAddress(from) as `0x${string}`,
        to: getAddress(to) as `0x${string}`,
        data: data as `0x${string}`,
        value
      })
      const gas = await client.estimateGas({
        account: getAddress(from) as `0x${string}`,
        to: getAddress(to) as `0x${string}`,
        data: data as `0x${string}`,
        value
      }).catch(() => null)
      const gasPrice = await client.getGasPrice().catch(() => null)
      return JSON.stringify(
        {
          chain,
          chainName: WEB3_CHAINS[chain].name,
          simulation: 'success',
          returnData: result.data,
          gasEstimate: gas?.toString() ?? null,
          gasPriceWei: gasPrice?.toString() ?? null,
          gasPriceGwei: gasPrice ? formatUnits(gasPrice, 9) : null
        },
        null,
        2
      )
    } catch (e) {
      return JSON.stringify(
        {
          chain,
          chainName: WEB3_CHAINS[chain].name,
          simulation: 'revert',
          error: e instanceof Error ? e.message : String(e)
        },
        null,
        2
      )
    }
  }
}

/* ---------- Tool 7: web3_getSwapCalldata ---------- */

export const web3GetSwapCalldataTool: ToolDefinition = {
  name: 'web3_getSwapCalldata',
  description:
    'Get executable calldata + target address for a token swap via the 0x aggregator (best route across DEXes). Requires a ZEROX_API_KEY; without one it returns a non-executable route plan. Use native-token sentinel 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for ETH/BNB. Use this when the user wants to swap tokens.',
  parameters: {
    type: 'object',
    properties: {
      chain: { type: 'string', description: 'Chain key' },
      fromToken: { type: 'string', description: 'Address of token to sell' },
      toToken: { type: 'string', description: 'Address of token to buy' },
      amount: { type: 'string', description: 'Amount to sell in raw units (uint256 string)' },
      recipient: { type: 'string', description: 'Address to receive the bought tokens' },
      slippageBps: { type: 'number', description: 'Slippage tolerance in basis points (e.g. 50 = 0.5%)' }
    },
    required: ['chain', 'fromToken', 'toToken', 'amount', 'recipient']
  },
  handler: async (args) => {
    const chain = chainKey(String(args.chain || 'ethereum'))
    const fromToken = getAddress(String(args.fromToken))
    const toToken = getAddress(String(args.toToken))
    const amount = BigInt(String(args.amount))
    const recipient = getAddress(String(args.recipient))
    const slippage = Number(args.slippageBps || 50)

    // Uniswap V3 Router addresses (Universal Router where possible)
    const routers: Record<string, string> = {
      ethereum: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      base: '0x2626664c2602339C2442d185F4c85BB8288D60FC',
      arbitrum: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      optimism: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      polygon: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      bsc: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4' // PancakeSwap V3
    }

    const router = routers[chain] || routers.ethereum
    const chainId = WEB3_CHAINS[chain].chain.id
    const apiKey = process.env.ZEROX_API_KEY || process.env.ZRX_API_KEY || ''

    // No aggregator key configured — return a clearly non-executable route plan
    // rather than fake calldata, so the UI can prompt the user to add a key.
    if (!apiKey) {
      return JSON.stringify(
        {
          chain,
          chainId,
          router,
          fromToken,
          toToken,
          amount: amount.toString(),
          recipient,
          slippage,
          executable: false,
          note: 'Set ZEROX_API_KEY (from dashboard.0x.org) to fetch executable calldata via the 0x aggregator. Returning a route reference only — this calldata will NOT execute.',
          plan: {
            provider: 'Uniswap V3',
            estimatedOutput: 'unknown (no aggregator key configured)',
            calldata: '0x',
            requiresApproval: true,
            approvalAddress: router
          }
        },
        null,
        2
      )
    }

    // Live 0x allowance-holder quote — returns ready-to-send transaction data
    // without requiring a Permit2 signature.
    try {
      const sp = new URLSearchParams({
        chainId: String(chainId),
        sellToken: fromToken,
        buyToken: toToken,
        sellAmount: amount.toString(),
        taker: recipient,
        slippageBps: String(slippage)
      })
      const res = await fetch(`https://api.0x.org/swap/allowance-holder/quote?${sp.toString()}`, {
        headers: { '0x-api-key': apiKey, '0x-version': 'v2' },
        signal: AbortSignal.timeout(10000)
      })
      const quote = (await res.json().catch(() => ({}))) as {
        liquidityAvailable?: boolean
        buyAmount?: string
        minBuyAmount?: string
        transaction?: { to?: string; data?: string; value?: string; gas?: string }
        issues?: { allowance?: { spender?: string } | null }
        reason?: string
      }
      if (!res.ok || quote.liquidityAvailable === false || !quote.transaction?.data) {
        return JSON.stringify(
          {
            chain,
            chainId,
            executable: false,
            error: quote.reason || `0x quote failed (HTTP ${res.status})`,
            note: 'The 0x aggregator returned no executable route for this pair/amount.'
          },
          null,
          2
        )
      }
      const allowanceSpender = quote.issues?.allowance?.spender ?? null
      return JSON.stringify(
        {
          chain,
          chainId,
          provider: '0x Aggregator',
          executable: true,
          fromToken,
          toToken,
          amount: amount.toString(),
          recipient,
          slippageBps: slippage,
          buyAmount: quote.buyAmount,
          minBuyAmount: quote.minBuyAmount,
          transaction: {
            to: quote.transaction.to,
            data: quote.transaction.data,
            value: quote.transaction.value ?? '0',
            gas: quote.transaction.gas ?? null
          },
          requiresApproval: !!allowanceSpender,
          approvalAddress: allowanceSpender
        },
        null,
        2
      )
    } catch (e) {
      return JSON.stringify(
        {
          chain,
          chainId,
          executable: false,
          error: e instanceof Error ? e.message : String(e),
          note: 'Failed to reach the 0x aggregator.'
        },
        null,
        2
      )
    }
  }
}

/* ---------- Registration ---------- */

export const web3Tools: ToolDefinition[] = [
  web3ResolveEnsTool,
  web3GetBalanceTool,
  web3GetTokenListTool,
  web3GetApprovalsTool,
  web3GetTokenPriceTool,
  web3SimulateTxTool,
  web3GetSwapCalldataTool
]

export function registerWeb3Tools(registry: import('./registry').ToolRegistry): void {
  for (const t of web3Tools) registry.register(t)
}
