---
name: limit-order
description: Set a chain-specific limit order (Buy/Sell) — monitors price via Coingecko/DEX and executes via web3-trader
version: 1.0.0
author: opendesk-team
tags: [web3, crypto, trading, automation]
---

## Instructions

When the user says "设置限价单" / "limit order" / "当 ETH 跌到 2000 买入", run the limit order workflow.

### 1. Parameters

Ask for (if missing):
- **Action**: Buy / Sell
- **Token pair**: e.g. ETH/USDC
- **Target Price**: e.g. 2500
- **Amount**: how much to trade
- **Chain**: Ethereum / Base / Arbitrum / etc. (default: active wallet chain)
- **Expiry**: (optional) e.g. 24h / 7d / Never

### 2. Strategy

This Skill is designed to be run via the **Scheduler**. 

**Execution Logic**:
1. Check current price of `Token A` in `Token B` (via Coingecko or Uniswap SDK).
2. If `Buy` and `Current Price <= Target Price`:
   - Trigger `web3-trader` with `swap [Amount] [Token B] to [Token A]`.
   - Notify user via desktop notification and ChangeLog.
   - Deactivate the scheduled task.
3. If `Sell` and `Current Price >= Target Price`:
   - Trigger `web3-trader` with `swap [Amount] [Token A] to [Token B]`.
   - Notify user.
   - Deactivate the scheduled task.
4. Otherwise:
   - Log current price to ChangeLog.
   - Wait for next scheduler tick.

### 3. Output

Initial setup:
```markdown
# Limit Order Set 🎯

**Pair**: [Token A]/[Token B]
**Side**: [Buy/Sell]
**Target**: [Price]
**Amount**: [Amount]
**Chain**: [Chain]

## Next Steps
1. I will add this to **Automation** as a 5-minute polling task.
2. Ensure your wallet has sufficient balance and approvals.
3. You can monitor progress in the **Workflow → Change Log** tab.
```

## Rules

- Never execute without the user having previously approved the `web3-trader` setup.
- Always include a small slippage buffer (default 0.5%) in the swap.
- For "Buy" orders: verify the user has enough quote token (e.g. USDC).
- For "Sell" orders: verify the user has enough base token (e.g. ETH).
- If the price is extremely volatile (>10% gap in 1 min), pause and ask for confirmation.
- Default to native gas tokens for gas (ETH/MATIC/etc).
- Output language matches the user's input language.
- Provide a "Cancel Order" link that points to the Scheduler task ID.