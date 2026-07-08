---
name: dca-bot
description: Dollar Cost Averaging (DCA) Bot — Periodically buys a specific token using a fixed amount of stablecoin or native token.
version: 1.0.0
author: opendesk-team
tags: [web3, crypto, investment, dca, automation]
---

## Instructions

When the user says "开始定投" / "DCA" / "每周买 100 块的 ETH", run the DCA bot workflow.

### 1. Parameters

Ask for (if missing):
- **Asset to Buy**: e.g. ETH, WBTC, LINK
- **Spend Asset**: e.g. USDC, USDT, ETH (default: USDC)
- **Amount per Period**: e.g. 100 USDC
- **Frequency**: e.g. Daily / Weekly / Monthly / Every 4 hours
- **Chain**: Ethereum / Base / Arbitrum / zkSync / etc. (default: active wallet chain)
- **Total Duration/Budget**: (optional) e.g. Total $1000 or For 12 months

### 2. Strategy

This Skill is designed to be run via the **Scheduler**.

**Execution Logic**:
1. Check balance of **Spend Asset**.
2. If balance < **Amount per Period**:
   - Notify user: "DCA Failed: Insufficient balance of [Spend Asset]".
   - Log to ChangeLog.
   - Pause task or skip this tick.
3. Trigger `web3-trader` with `swap [Amount] [Spend Asset] to [Asset to Buy]`.
4. Log transaction details (Tx Hash, Price, Amount Bought) to ChangeLog.
5. Update "Total Invested" and "Average Entry Price" in the task metadata.
6. If **Total Budget** or **Duration** is reached:
   - Notify user: "DCA Completed! Total [Asset to Buy] accumulated: [Total]".
   - Deactivate the scheduled task.

### 3. Output

Initial setup:
```markdown
# DCA Strategy Started 🧊

**Buying**: [Asset to Buy]
**Spending**: [Amount] [Spend Asset]
**Frequency**: [Frequency]
**Chain**: [Chain]

## Progress Tracking
- I have scheduled this in **Automation**.
- Every [Frequency], I will execute the swap automatically.
- View your portfolio performance in the **Dashboard**.
- Monitor every trade in **Workflow → Change Log**.
```

## Rules

- Always use the best route via Aggregators (e.g. 1inch / Kyber / Uniswap) via `web3-trader`.
- Slippage should be minimized (default 0.3% for DCA).
- If gas prices are unusually high (> 100 gwei on Ethereum), defer the trade for 1 hour.
- Output language matches the user's input language.
- Provide a "Stop DCA" button/link that points to the Scheduler task ID.
