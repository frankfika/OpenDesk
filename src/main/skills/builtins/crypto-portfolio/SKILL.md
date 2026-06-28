---
name: crypto-portfolio
description: Analyse a wallet's on-chain holdings — allocation, P&L, risk, rebalance suggestions
version: 1.0.0
author: opendesk-team
tags: [crypto, web3, portfolio, defi, analysis]
---

## Instructions

When the user provides a wallet address and asks "分析这个钱包" / "看看我的资产" / "我该怎么 rebalance", run an on-chain portfolio analysis.

### 1. Discover

Detect chain: if user doesn't say, scan the address on the **4 major L2-friendly EVMs** in this order:
- Ethereum mainnet
- Base
- Arbitrum
- Optimism

(Polygon / BSC are opt-in — ask if needed.)

For each chain:
- Native balance
- ERC-20 token balances (via Etherscan-compatible API or The Graph)
- LP positions (Uniswap V2/V3, Curve, Aerodrome)
- Staking / Lending (Lido stETH, Aave aTokens, Compound cTokens)
- NFTs (count only; don't fetch metadata unless asked)

### 2. Pricing

Use CoinGecko for USD prices (cached 5 minutes per symbol).
- For native tokens: `coingecko_id` from a local table
- For tokens not on CoinGecko: show `unknown` and skip P&L
- For stablecoins: pegged to $1 unless depeg detected (show a flag)

### 3. Allocation

Compute:
- % by chain
- % by category: Native / Stable / L1 / L2 / DeFi / NFT / Other
- % by top 5 tokens (concentration risk)
- Stable ratio (stablecoin / total)

### 4. P&L

If the user supplies a cost basis (per-token buy price + amount), compute realised and unrealised P&L.

If no cost basis supplied, default to "zero cost" view:
- Current value per token
- 7-day price change %
- 30-day price change %

### 5. Risk Flags

Surface:
- **Concentration**: top 1 token > 50% of portfolio
- **Stable depeg**: any stablecoin trading < $0.99 or > $1.01
- **Dust tokens**: > 20 tokens with USD value < $1
- **Inactive approvals**: open ERC-20 approvals to contracts you haven't used in 30 days (cross-reference with Wallet Doctor)
- **High-risk protocols**: any LP in unaudited or recently-hacked protocols (maintain a known-bad list)
- **Liquidity risk**: any position in tokens with < $1M 24h volume

### 6. Rebalance Suggestions

Default to conservative suggestions only (no auto-trading):
- If stable ratio < 10%: "consider taking some risk off the table"
- If top 1 token > 50%: "consider diversifying"
- If dust > 20 tokens: "consider sweeping dust to ETH via 1inch" (provide the URL pattern, don't actually call)
- For each LP with impermanent loss > 5%: explain the IL in plain language

### 7. Output

Markdown report:

```markdown
# Portfolio Report — [地址最后 4 位] — [日期]

## 总览
- 总净值: $X (变动 -/+ Y% 7d)
- 链分布: ETH 60% / Base 25% / Arbitrum 15%
- 最大持仓: USDC ($X, Y%)
- 稳定币占比: Z%

## 持仓明细
| Token | 链 | 余额 | 单价 | USD | 占比 | 7d |
|-------|----|----|------|-----|------|----|
| ETH | ethereum | 1.5 | $3000 | $4500 | 30% | -2% |

## 风险
- 🟡 集中度风险: ETH 占 60%
- 🟢 无 depeg
- 🟢 无高风险协议

## 建议
- ...
```

## Rules

- Always show "as of" date and explicit data sources
- Never invent price data — if a token has no quote, show it but don't fudge P&L
- For privacy: by default show only the last 4 chars of the address; allow the user to "reveal full address" explicitly
- Don't recommend a specific CEX / DEX — present options neutrally
- For DeFi positions, show underlying protocol risk separately from token risk
- If a token's name/symbol is ambiguous, include the contract address for clarity
- For transactions to mixers (Tornado, Railgun): note "this address has interacted with privacy protocols" but don't speculate
- For large amounts (> $100K), remind the user that on-chain analysis is public and to consider OPSEC