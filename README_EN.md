<div align="center">

<img src="resources/logo-1024.png" alt="OpenDesk" width="128" height="128">

# OpenDesk

> **An AI desktop assistant that runs any model, uses any chain, and drives your desktop.**

Model-agnostic · Web3 Workbench · Computer-Use capable · Folder-as-workspace · BYOK · Apache 2.0

![Version](https://img.shields.io/badge/Version-v0.5.0-1D8C80?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-31.0-47848F?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square)
![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)

[✨ Features](#-features) · [📸 Screenshots](#-screenshots) · [🚀 Quick Start](#-quick-start) · [📦 Download](#-download) · [🔒 Security](#-security--privacy)

[简体中文](./README.md) | __English__

---

![Home — Web3 Workbench default view (v0.5.0)](./docs/assets/02-home.png)

</div>

## 📌 What is this

OpenDesk is a **desktop AI workbench** that puts "talk to AI", "manage your crypto wallet", "drive your desktop", and "ship code" into a single Electron app:

- 🧠 **Multi-model**: OpenAI / Anthropic / DeepSeek / Ollama / any OpenAI-compatible endpoint, with BYOK encrypted at rest.
- ⛓️ **Web3 Workbench**: Reown AppKit + wagmi — scan a QR to connect 300+ wallets, native ENS, live on-chain data, Wallet Doctor approvals audit.
- 🖥️ **Computer Use**: `desktop_capture` / `desktop_click` / `desktop_type` — the AI actually moves your cursor and types for you.
- 🛠️ **Skills + MCP**: SKILL.md compatible with Claude Code and Codex; any MCP server plugs in.
- 📁 **Folder-as-workspace**: open any folder, auto-discover `AGENTS.md`, attach files, save threads.

## 🧭 Core workflow: Plan → Confirm → Execute

Same lineage as WorkBuddy, Manus, and Claude Computer Use — **the AI never touches your files blindly. It lays out the plan, waits for your nod, then acts**:

```
┌─────────────────────────────────────────────────────────────┐
│  1️⃣ Plan    AI parses your request and breaks it into       │
│              numbered steps                                  │
│  2️⃣ Confirm You pick an Approval Mode in the toolbar        │
│              (auto edits / auto all / bypass / ask)          │
│  3️⃣ Execute Each tool call streams live into the message    │
│              log — file, command, or tx, with status icons   │
└─────────────────────────────────────────────────────────────┘
```

Four Approval Modes (toggle from the `ShieldAlert` icon in the toolbar):

| Mode | Behaviour | When to use |
|------|-----------|-------------|
| **Auto edits** | File edits auto-approve; shell & desktop ask | Daily coding / writing docs |
| **Auto all** | All tool calls auto-approve | Trusted bulk runs |
| **Bypass** | Skip approval entirely | CI / automation scripts |
| **Ask** | Anything risky prompts a confirm modal | Unfamiliar code / high-stakes ops |

Web3 transactions get an **extra** `TxConfirmCard`: amount, gas, target contract, risk score — **nothing hits the chain until you click Confirm**.

## ✨ Features

### 1. 🧠 Multi-Provider Management

- **7 Provider types**: OpenAI · Anthropic · DeepSeek · Ollama · OpenAI-Compatible · Google · Generic
- **Auto model discovery**: pulls the model list from `/v1/models` or `/api/tags`
- **BYOK**: API keys encrypted with Electron `safeStorage`, never written to disk in plaintext
- **Connection test**: one-click ping, with live green/yellow/red status

![Settings — Providers](./docs/assets/06-settings.png)

### 2. ⛓️ Web3 Workbench (new in v0.5.0)

- **Reown AppKit + wagmi**: 300+ wallets, WalletConnect v2, native EIP-1193
- **12 mainnets + testnets**: Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, plus their full Sepolia counterparts
- **ENS resolution**: type `vitalik.eth`, get the address
- **Live on-chain data**: native balance, token list, recent activity (via Etherscan / Basescan / Arbiscan …)
- **Wallet Doctor**: scans ERC-20 `approve` allowances, flags unlimited + suspicious contracts
- **Three scenario Skills**:
  - `Chain Intel`: on-chain intel + whale tracking
  - `One-Liner Trade`: natural-language trading (ENS → quote → send)
  - `Wallet Doctor`: batch-revoke risky approvals

| Chain Intel | One-Liner Trade | Wallet Doctor |
|-------------|-----------------|---------------|
| ![Intel](./docs/assets/03-intel.png) | ![Trade](./docs/assets/04-trade.png) | ![Doctor](./docs/assets/05-doctor.png) |

### 3. 🖥️ Computer Use (real desktop control)

- **Screen capture**: `desktop_capture` — full / window / area
- **Mouse control**: `desktop_click` — single / double / right / coordinates
- **Keyboard input**: `desktop_type` and `desktop_key` — text + hotkeys
- **Window management**: `desktop_windows` lists them, `desktop_activate` switches to one
- **Safety rail**: user must opt in via Settings → `desktopEnabled`. Off by default.

### 4. 🔌 MCP + Skills

- **Full MCP client**: JSON-RPC 2.0 over stdio, **no** `@anthropic-ai/mcp` dependency
- **5 preset servers**: Filesystem, SQLite, Fetch, Slack, GitHub — one-click add
- **Cross-platform Skills**: compatible with `.codex/skills` and `.claude/skills`, plain Markdown
- **6 built-in Skills**: Code Reviewer · Doc Writer · Git Helper · Web3 Intel · Web3 Onboarder · Web3 Trader

### 5. 📁 Folder-as-workspace

- **Open a folder = create a workspace**: tree view, thread grouping, AGENTS.md auto-loaded
- **Persistence**: all state in a local SQLite DB — survives restarts
- **Attachments**: drop a file into the input bar, the AI reads and references it

## 📸 Screenshots

| Onboarding (first launch) | Main view (Web3 Workbench) |
|---------------------------|----------------------------|
| ![Onboarding](./docs/assets/01-onboarding.png) | ![Home](./docs/assets/02-home.png) |

| Chain Intel | One-Liner Trade |
|-------------|-----------------|
| ![Intel](./docs/assets/03-intel.png) | ![Trade](./docs/assets/04-trade.png) |

| Wallet Doctor | Settings — Providers |
|---------------|------------------------|
| ![Doctor](./docs/assets/05-doctor.png) | ![Settings](./docs/assets/06-settings.png) |

| Skills panel (30 built-in Skills, v0.6.2 closing) |
|--------------------------------------------|
| ![Skills](./docs/assets/07-skills-panel.png) |

| Workflow Settings · Scheduler | Workflow Settings · Claw |
|------------------------------|-------------------------|
| ![Scheduler](./docs/assets/13-workflow-scheduler.png) | ![Claw](./docs/assets/14-workflow-claw.png) |

| Workflow Settings · Marketplace (installed / remote) |
|------------------------------------------------------|
| ![Marketplace](./docs/assets/15-workflow-marketplace.png) |

| Experts panel (6 vertical experts) | Automation / scheduled tasks |
|--------------------------------------|------------------------------|
| ![Experts](./docs/assets/08-experts-panel.png) | ![Scheduler](./docs/assets/09-scheduler-panel.png) |

| Scheduled-task create | Worker Pool (multi-agent parallel) |
|------------------------|-------------------------------------|
| ![Scheduler Create](./docs/assets/10-scheduler-create.png) | ![WorkerPool](./docs/assets/12-worker-pool-modal.png) |

## 🎯 Typical Use Cases

> **For non-technical readers**: five concrete scenarios that show what OpenDesk actually does for you. Every one runs out of the box — no plugins required.

### Scenario 1 — E-commerce ops: bulk-merge sales sheets

> Prompt: *"Merge the 12 store Excel files under `~/Desktop/2026Q1` into one sheet, sort by region, and rank the top 3."*

OpenDesk scans the folder → reads every xlsx → merges data → writes `Summary_2026Q1.xlsx` plus a `TOP3_regions.png` bar chart.

### Scenario 2 — Finance / admin: OCR invoices → reimbursement sheet

> Prompt: *"Pull every invoice in `~/Documents/发票/`, extract the fields, and build a reimbursement sheet."*

Fires the built-in **`ocr-invoice`** Skill (v0.6.0) → OCRs each PDF/image → extracts amount/date/vendor/tax-id → writes `Reimbursement_2026Q1.xlsx` where every field links back to the source invoice.

### Scenario 3 — Sales ops: CRM insight report

> Prompt: *"Analyse `~/CRM/Q1.csv` and tell me which customers are likely to churn this month, what's driving lost deals, and what's the forecast for next month."*

Fires the built-in **`sales-insight`** Skill (v0.6.0) → runs pandas-style statistics → returns a three-section report plus three charts. Paste it straight into your weekly review.

### Scenario 4 — On-chain research: profile an unfamiliar address

> Prompt: *"Investigate 0xd8da...6045 over the last 30 days and give me an investor profile."*

Routed through **Web3 Workbench → Chat**: calls Etherscan → grabs txs, transfers, token deltas → returns one of three labels: whale / active trader / passive holder.

### Scenario 5 — Wallet checkup: revoke risky approvals

> Open **Wallet Doctor** → click *Scan all approvals*.

The app lists every ERC-20 `approve` and **red-flags** "unlimited allowance + unknown contract". Hit `Revoke` → `TxConfirmCard` for a second confirmation → one click to revoke on-chain.

### Scenario 6 — Content creation: draft a full article in one shot

> Prompt: *"Read `~/Notes/topics.md`, write a 2000-word WeChat post with a hook-style title."*

OpenDesk reads the Markdown → asks the LLM to draft → uses `desktop_type` to paste it into Pages / Word → renders an HTML preview in the right-side Artifact panel → **one-click `.docx` export**.

### Scenario 7 — DevOps: hotfix from the train

> On your commute, scan the Claw QR with your phone → voice-prompt *"line 47 of `api/users.ts` may NPE — add a guard"*.

The desktop OpenDesk receives the remote instruction → auto-Plans → you tap Yes on your phone to Confirm → it executes → compiles → commits → opens a PR. *(Remote control ships in v0.6.0 — see Roadmap.)*

### Scenario 8 — Scheduled task: auto-run the daily report at 9 AM

> In the **Automation** tab create a task: cron `0 9 * * 1-5` + *"Run yesterday's sales data, write the daily report into `~/Reports/`"*.

OpenDesk fires the Skill on cron in the background → drops the artefact into the target folder → optional "on done" notify (system / Webhook / Telegram bot). *(Ships in v0.6.0.)*

## 🆚 OpenDesk vs other AI desktop assistants

| Dimension | **OpenDesk** | WorkBuddy (Tencent) | Claude Desktop | Cursor |
|-----------|--------------|---------------------|----------------|--------|
| Form factor | Desktop workbench (Electron) | Desktop agent (proprietary) | Desktop chat | IDE |
| Models | BYOK, all providers | Hunyuan / DeepSeek / GLM / Kimi | Anthropic only | OpenAI / Anthropic |
| Web3 native | ✅ wagmi + Reown + 12 chains | ❌ | ❌ | ❌ |
| Computer use | ✅ macOS / Win / Linux | ✅ Windows only | ❌ | ❌ |
| Three work modes | ✅ Ask / Plan / Craft (v0.6.0) | ✅ | ❌ | ❌ |
| Seven-section nav | ✅ Assistant / Projects / Experts / Automation / Files / KB / Inspiration (v0.6.0) | ✅ | ❌ | ❌ |
| Multi-Agent parallelism | ✅ Ensemble → Worker Pool (v0.6.0) | ✅ multi-window | ❌ | ❌ |
| Preset Skill count | 30+ (expanded in v0.6.0) | 30+ | dozens | 0 |
| Expert system | ✅ Skill wrapper (v0.6.0) | ✅ 140+ vertical experts | ❌ | ❌ |
| Scheduled tasks (Automation) | ✅ node-cron (v0.6.0) | ✅ | ❌ | ❌ |
| Multi-format export | ✅ Word / Excel / PPT (v0.6.0) | ✅ | ⚠️ Markdown only | ❌ |
| Folder-as-workspace | ✅ + AGENTS.md | ✅ | ⚠️ half-baked | ❌ (project-as-workspace) |
| MCP client | ✅ self-rolled, 5 presets | ✅ | ✅ | ❌ |
| Cross-platform Skills | ✅ `.codex/skills` / `.claude/skills` | ✅ OpenClaw | ✅ | ❌ |
| Local-first | ✅ SQLite on disk | ✅ fully local | ⚠️ partial | ❌ |
| Remote control | ✅ Claw (v0.6.0) | ✅ five major IMs | ❌ | ❌ |
| Open source | ✅ Apache 2.0 | ❌ proprietary | ❌ proprietary | ❌ proprietary |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- macOS 11+ / Windows 10+ / Linux (x86_64 or arm64)

### Install & run

```bash
git clone https://github.com/frankfika/OpenDesk.git
cd opendesk
npm install        # auto-patches viem/ox tempo KeyAuthorization
npm run dev        # dev mode (Electron + hot reload)
```

### First launch

1. The **Onboarding** modal appears — pick a Workspace (any folder) and an AI Provider.
2. For Web3, click **Connect Wallet** in the top bar — scan a QR or pick a wallet → Web3 Workbench.
3. For Computer Use, open Settings → General → enable `desktopEnabled`.

### Build a production package

```bash
npm run build           # compile main / preload / renderer
npm run package         # electron-builder → dist/
```

## 📦 Download

> GitHub Releases are published automatically by `electron-builder` to `frankfika/OpenDesk`.

| Platform | Arch | Installer |
|----------|------|-----------|
| macOS | Apple Silicon (M1/M2/M3/M4) | `OpenDesk-0.5.0-arm64.dmg` |
| macOS | Intel | `OpenDesk-0.5.0-x64.dmg` |
| Windows | x64 | `OpenDesk-0.5.0-x64.exe` |
| Windows | arm64 | `OpenDesk-0.5.0-arm64.zip` |
| Linux | x64 | `OpenDesk-0.5.0-x64.AppImage` / `.deb` |

Head to the [Releases page](https://github.com/frankfika/OpenDesk/releases) to grab a prebuilt binary.

## 🏗️ Project Structure

```
opendesk/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── ipc/                 # IPC handlers (web3 / settings / workspace …)
│   │   ├── providers/           # AI provider adapters (OpenAI / Anthropic / Ollama …)
│   │   ├── tools/               # built-in tools (file / web3-tools / builtins)
│   │   ├── rag/                 # SQLite FTS5 + typed adapter
│   │   └── persistence.ts       # better-sqlite3 persistence
│   ├── preload/                 # safe IPC bridge exposing window.api
│   ├── renderer/                # React + Tailwind frontend
│   │   └── src/components/
│   │       ├── chat/            # ChatPanel / InputBar / Message / MentionPopover …
│   │       ├── settings/        # ProvidersPanel / EnsemblePanel / GeneralPanel …
│   │       ├── web3/            # Web3Workbench / PortfolioView / DoctorPanel …
│   │       └── layout/          # AppShell / LeftColumn / MiddleColumn
│   └── shared/                  # types shared across main / preload / renderer
├── docs/                        # product docs + architecture + screenshots
├── e2e/                         # Playwright + Electron e2e
├── scripts/
│   ├── capture-screenshots.mjs  # README screenshot script (captures real app)
│   └── patch-ox-tempo.sh        # postinstall viem/ox compat patch
└── resources/                   # icons / logo
```

## 🧪 Testing

```bash
npm test              # vitest unit tests (95 cases)
npm run test:e2e      # Playwright + Electron e2e (4 cases; 3 need DEEPSEEK_API_KEY)
npm run lint          # ESLint, 0 warnings
```

Three-way verification (CI):

```bash
npx tsc --noEmit -p tsconfig.node.json    # main-process typecheck
npx tsc --noEmit -p tsconfig.web.json     # renderer typecheck
npm run lint && npm test                  # lint + vitest
```

## 🔒 Security & Privacy

- **Local-first**: all data lives in `userData` + SQLite, no cloud sync
- **Zero telemetry**: nothing is collected, nothing is uploaded
- **API key encryption**: Electron `safeStorage` (macOS Keychain / Windows DPAPI / Linux libsecret)
- **Sandboxed artifacts**: iframe `sandbox="allow-scripts"`, isolated from the main process
- **Permission model**: desktop actions require explicit opt-in via Settings
- **Web3 caution**: every on-chain transaction goes through `TxConfirmCard` with amount, gas, and target contract shown before signing

## 🛣️ Roadmap

> Ordered by real user demand, not engineering complexity. Priorities shift with community feedback.
>
> **Every v0.6.0 item ships within 1–2 sprints on the current architecture** — most are battle-tested patterns from WorkBuddy (Tencent Cloud, 2026-03).

### 🚀 v0.6.0 — WorkBuddy-inspired release (core delta)

> ✅ = shipped (in v0.6.0-alpha.1 or later)

| Module | What ships | Path | Effort | Status |
|--------|-----------|------|--------|--------|
| **Three work modes** | Ask / Plan / Craft switcher in TopBar | Reuse current Approval Mode (4 levels → 3 semantic modes) | 3 days | ✅ v0.6.0 |
| **Seven-section nav** | Assistant / Projects / Experts / Automation / Files / KB / Inspiration | Add segmented control to LeftSidebar | 2 days | ✅ v0.6.0 |
| **Multi-Agent parallelism** | Multiple threads run concurrently, independent progress bars | Extend current Ensemble mode with a Worker Pool | 5 days | ✅ v0.6.0 (runner in v0.6.1) |
| **30+ preset Skills** | Grow from 6 to 30+ | Write 24 `SKILL.md` templates (Xiaohongshu ops, Excel merge, OCR invoice, sales insight, …) | 5 days | ✅ 30/30 (v0.6.2) |
| **Expert system** | Wrap Skills as domain experts | Skill + pinned system prompt + entry point | 3 days | ✅ v0.6.0 |
| **Multi-format export** | One-click export to Word / Excel / PPT from Artifacts | `docx` + `xlsx` + `pptxgenjs` | 4 days | ✅ v0.6.0 |
| **Scheduled tasks (Automation)** | "Run the daily report at 9 AM" | `node-cron` + IPC + SQLite persistence | 4 days | ✅ v0.6.0 |
| **Sidebar search + grouping** | Search box at top of MiddleColumn | Upgrade existing thread list | 1 day | ✅ v0.6.0 |
| **Results panel (file-change log)** | Extract tool calls into a dedicated panel | Split off current Message stream | 4 days | ✅ v0.6.0 |
| **Workflow persistence** | "Save as Template" button on Skills | Add save path in SkillPanel | 2 days | ✅ v0.6.0 |

**v0.6.0 total: ≈ 5–6 weeks (one engineer full-time) · v0.6.2 close: 10/10 modules ✅ + 30/30 Skills ✅**

### 📦 v0.7.0 — Productivity leap (shipped)

- **Skills Marketplace**: 8 entries, one-click install + version pinning + automatic update check
- **RAG v2**: FTS5 BM25 + TF-IDF vector hybrid retrieval + Reciprocal-Rank Fusion
- **Claw remote control**: Telegram bot (long polling) as the first ship; WeChat / WeCom / Lark / DingTalk moved to v0.8.0
- **Settings · Workflow panel**: unified manager for Scheduler / Change Log / Marketplace / Claw
- Multi-format export → standard plugin (any Skill can register a custom exporter)

### 🌐 v0.8.0 — Web3 advanced

- Limit orders / DCA / multisig
- More testnets (zkSync / Linea / Scroll)
- ENS subdomain management

### 👥 v0.9.0 — Team collaboration

- Shared workspaces + role-based access
- Multi-user audit log
- Skill Marketplace ratings + comments

### 🏢 v1.0.0 — Stable API + plugin marketplace + white-label

- Public plugin API (third-party tools, Skills, Providers)
- White-label packaging (company name / logo / domain / theme)
- Full SLA + commercial support

## 🤝 Contributing

PRs welcome! Read `CONTRIBUTING.md` first. Dev loop:

```bash
npm run dev           # dev mode
npm run lint:fix      # auto-fix lint
npm run format        # prettier
npm test              # keep it 95/95 green
```

## 📬 Community

- GitHub Issues: [report bugs / request features](https://github.com/frankfika/OpenDesk/issues)
- GitHub Discussions: [tech talk](https://github.com/frankfika/OpenDesk/discussions)

## 📜 License

Apache 2.0 — see [LICENSE](./LICENSE).

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) · [React](https://react.dev/) · [Zustand](https://github.com/pmndrs/zustand)
- [viem](https://viem.sh/) · [wagmi](https://wagmi.sh/) · [Reown AppKit](https://reown.com/appkit)
- [Tailwind CSS](https://tailwindcss.com/) · [Radix UI](https://www.radix-ui.com/) · [Framer Motion](https://www.framer.com/motion/)
- Inspired by [Claude Desktop](https://claude.ai/download) · [Codex](https://openai.com/index/openai-codex/) · [Kimi Work](https://kimi.moonshot.cn/) · [Trae](https://www.trae.ai/)

---

<div align="center">
Made with ❤️ by the OpenDesk team — since 2026
</div>
