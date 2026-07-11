# Trade Workstation

The new default view in OpenDesk (v0.8+). The `Web3Workbench` from
v0.7 is still available as a legacy view — press `Cmd+Shift+T` to
toggle.

## Why this exists

OpenDesk started as a general-purpose AI desktop assistant. It's
becoming a trading workstation: the operator's primary use case is
crypto + stocks, not "chat with an agent about arbitrary files". The
trade surface is now the home page; AI-driven flows (chat, skills,
memory) live in the chrome (top bar + drawers) instead of the centre.

## What's here

```
components/trade/
  TradeWorkbench.tsx         # Top-level layout (TopBar / Watchlist / Pane / BottomBar)
  TradeTopBar.tsx            # Brand, ticker tape, scenario tabs, clock, account
  TradeWatchlist.tsx         # Left rail: crypto + stocks tabs, search, add/remove
  TradeScenarioPane.tsx      # Routes the active scenario id
  TradeBottomBar.tsx         # Buy/Sell shortcuts, colour rule toggle, hotkey hints
  scenario-nav.ts            # Imperative helper to flip scenario
  format.ts                  # Price/pct formatters shared across the pane
  scenarios/
    ChartScenario.tsx        # Symbol + K-line table + summary panel (stock)
    OrderScenario.tsx        # Buy/Sell ticket (market/limit/stop)
    PositionsScenario.tsx    # Open positions + P&L
    NewsScenario.tsx         # RSS headlines for the selected symbol
    AnalysisScenario.tsx     # Deterministic summary (Phase 2: live LLM)
store/trade.ts                # Watchlist + selected symbol + colour direction
hooks/
  useTradeHotkeys.ts          # Global keyboard handler
  useStockData.ts              # Async hooks for Yahoo Finance
main/stocks/                  # Main-process Yahoo Finance client
main/ipc/stocks.ts             # IPC handlers
```

## UX choices

- **Dense layout** — 12.5 px base font, 32 px top/bottom bar, 28 px scenario header. The window is one screen, no scroll except inside scenarios.
- **Mono font** for prices — `ui-monospace, SF Mono, JetBrains Mono, Menlo` with `font-variant-numeric: tabular-nums`. Numbers line up.
- **Two colour rules** — US (green up / red down) default; CN (red up / green down) toggleable in the bottom bar. The user picks the convention, the workbench follows.
- **Keyboard-first** — every action has a hotkey. The list:
  - `1`–`5` — switch scenario (Chart / Order / Positions / News / AI Analysis)
  - `Tab` / `Shift+Tab` — cycle scenarios
  - `B` / `S` — open Order scenario for the selected symbol
  - `/` — focus watchlist search
  - `Space` — pause / resume the ticker tape
  - `Esc` — blur focused search input
  - `Cmd+K` — command palette (handled elsewhere)
  - `Cmd+Shift+T` — toggle back to the legacy Web3 workbench
- **Ticker tape** — CSS marquee, 60 s loop. Pauses on `Space`. The cells reuse the colour rule.
- **Local persistence** — watchlist, colour direction, last selected symbol survive a restart via `zustand/middleware`'s localStorage adapter.

## What's next (Phase 2+)

- Real K-line chart via `lightweight-charts` (TradingView) — replace the tabular `ChartScenario` body
- Crypto order routing via the connected wallet
- LLM-driven `AnalysisScenario` (currently a deterministic quote summary)
- `PositionsScenario` reconciliation against actual fills
- Alpaca paper trading for stock orders (currently a no-op that logs the intent to the change-log)
