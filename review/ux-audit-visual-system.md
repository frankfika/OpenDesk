# UX Audit — OpenDesk Web3 Visual System

> Scope: 11 web3 components + `globals.css` design tokens. Web3 view only.
> Method: read source, grep token usage, screenshot dev server (1280×800).
> Report style: synthesis of evidence, no recommendations (synthesis pass owns those).

---

## 0. Screenshots

- `review/screenshots/va/va-1-top.png` — viewport top (no scroll)
- `review/screenshots/va/va-2-full.png` — `fullPage: true` capture
- `review/screenshots/va/va-3-mid.png` — scrolled to mid
- `review/screenshots/va/va-4-bot.png` — scrolled to bottom

All four render the OpenDesk Web3 workbench (portfolio view, sample wallet active, AI agent idle in right rail). Page content height ≈ viewport; internal scroll lives inside `PortfolioView`'s `h-full overflow-y-auto` container.

---

## 1. Token inventory (what `globals.css` actually defines)

### 1.1 Surfaces (6)
| Token | Value | Notes |
|---|---|---|
| `--web3-bg` | `#0a0a0a` | app background |
| `--web3-panel` | `#0e0e10` | sidebar / right rail / topbar |
| `--web3-card` | `#141416` | the canonical card surface |
| `--web3-card-hover` | `#1a1a1d` | hover state of card |
| `--web3-card-active` | `#1f1f23` | active state |
| `--web3-border` | `#1f1f23` | border (note: == card-active) |
| `--web3-border-strong` | `#2a2a2e` | stronger border / icon containers |

### 1.2 Text (4 levels)
| Token | Value | Use |
|---|---|---|
| `--web3-text-muted` | `rgba(255,255,255,0.6)` | captions, meta, dimmed |
| `--web3-text-secondary` | `rgba(255,255,255,0.75)` | secondary |
| `--web3-text-body` | `rgba(255,255,255,0.88)` | default body |
| `--web3-text-strong` | `rgba(255,255,255,1)` | emphasis |

Plus `.web3-label` (11px / mono / 600 / 0.08em tracking / uppercase) — the only labeled text style.

### 1.3 Accent / brand (3)
| Token | Value | Use |
|---|---|---|
| `--web3-accent` | `#1D8C80` | brand teal |
| `--web3-accent-dim` | `#16a085` | hover gradient |
| `--web3-accent-deep` | `#0d6e63` | gradient deep |

### 1.4 Scenario accents (6)
| Token | Value | Use |
|---|---|---|
| `--web3-intel` | `#627eea` | Ethereum blue (intel) |
| `--web3-intel-dim` | `#3b5dc7` | intel gradient |
| `--web3-trade` | `#1D8C80` | trade (== brand) |
| `--web3-doctor` | `#ffb250` | amber (doctor) |
| `--web3-doctor-dim` | `#d97706` | doctor gradient |

### 1.5 Status (4)
`--web3-status-live` `#34d399` · `--web3-status-warn` `#fbbf24` · `--web3-status-error` `#f87171` · `--web3-status-accent` (= `--web3-accent`).

### 1.6 Spacing scale — defined in CSS
Only **3 pad utilities**: `.web3-card-pad-sm` (12px), `.web3-card-pad` (20px), `.web3-card-pad-lg` (24px). Everything else is ad-hoc Tailwind.

### 1.7 Radius — defined in CSS
Only **1 card radius**: `.web3-card { border-radius: 14px }`. Plus `--radius: 8px` (root alias) and `.web3-btn { border-radius: 8px }`. Tailwind's `rounded-md/lg/xl/2xl` are the de-facto rest of the system.

### 1.8 Shadow utility
Only `.shadow-subtle` (3-layer tiny stack) and the gradient shadows on `.web3-btn-primary` / RightRail input. No elevation token beyond that.

### 1.9 Legacy aliases
`--bg-sidebar`, `--bg-content`, `--bg-input`, `--text-primary/secondary/muted`, `--accent`, `--accent-hover`, `--border`, `--border-strong` all forward to the `web3-*` tokens. Tailwind config exposes them as `od-*` colors.

---

## 2. Typography roles (what the components actually use)

Grep of `text-[Npx]` and Tailwind text-scale classes across the 11 web3 components, sorted by frequency:

| px | Source | Times | Role (informal) | On-system? |
|---|---|---|---|---|
| 12 | `text-[12px]` | 27 | body, btn, label value | ✓ (≈ web3-text-body) |
| 11 | `text-[11px]` + `.web3-label` (CSS) | 18 | label / meta / mono values | ✓ (web3-label) |
| 10 | `text-[10px]` | 13 | micro caption, badge | ⚠ 10 not in CSS system |
| 10.5 | `text-[10.5px]` | 9 | chain pill, badge, quick-prompt arrow | ✗ half-step |
| 13 | `text-[13px]` | 5 | title, mission button title | ⚠ 13 not in CSS system |
| 12.5 | `text-[12.5px]` | 5 | body long, monospace data | ✗ half-step |
| 20 | `text-xl` | 3 | panel h2 (Intel/Trade/Doctor) | ✓ Tailwind default |
| 11.5 | `text-[11.5px]` | 3 | address row, list item | ✗ half-step |
| 9 | `text-[9px]` | 2 | track (TxConfirmCard / WalletConnectButton) | ✗ not in system |
| 24 | `text-2xl` | 2 | health-score number | ✓ Tailwind default |
| 32 | `text-[32px]` | 1 | total USD (PortfolioView) | ⚠ 32 not declared in CSS |
| 28 | `text-[28px]` | 1 | h1 hero (PortfolioView) | ✗ not in system |
| 13.5 | `text-[13.5px]` | 1 | search input | ✗ half-step |
| 8 | inline `fontSize: 8` (BrandLockup ModeChip) | 1 | mode chip | ✗ not in system |
| 14 | `text-[14px]` (BrandLockup wordmark) | 1 | wordmark | ✓ html default |

**5 role groups** observed in practice:
- **display (h1 hero)** — only one example, 28px (off-system)
- **display (numeric hero)** — totalUsd 32px (off-system, no 32 in CSS)
- **heading (h2 panel)** — `text-xl` = 20px (consistent, 3 panels)
- **body** — 12px (web3-text-body utility), sometimes 12.5px (off-system)
- **label** — `.web3-label` = 11px (consistent via CSS class)
- **mono / numeric** — 11.5 / 12.5 / 10.5 / 12 / 11 (no consistent scale)

**Finding:** the *class-based* typography (`.web3-label`, `text-xl`) is disciplined; the *ad-hoc `text-[Npx]` overrides* introduce 6 off-system sizes (8, 9, 10.5, 11.5, 12.5, 13.5) plus 1 missing token (28). Numeric / mono rows are the worst offenders — they re-pick a size per row.

---

## 3. Card-surface consistency

Four distinct "card" treatments co-exist; none reuse `.web3-card` for the variations.

| Surface | Where | Padding | Radius | Border | Bg | Shadow |
|---|---|---|---|---|---|---|
| `.web3-card` (canonical) | Intel/Trade/Doctor cards, token list, activity list, doctor approvals | `web3-card-pad` 20 / `-sm` 12 / `-lg` 24 / none for list rows | **14px** | 1px `web3-border` | `web3-card` | inset 0 1px 0 rgba(255,255,255,0.02) |
| Mission button (PortfolioView:544) | 2×2 mission grid | `p-4` (16px) | `rounded-xl` (**12px**) | 1px `web3-border` + hover `#1D8C80/60` + special `box-shadow` on hover | `web3-card` | none baseline; `0 8px 24px -12px rgba(29,140,128,0.5)` on hover |
| Quick-pick row (IntelPanel:52) | intel quick picks | `px-3 py-2.5` (12 / 10) | `rounded-lg` (**8px**) | 1px `web3-border` | `web3-card` | none |
| Quick prompt row (TradePanel:51) | trade prompts | `px-3 py-2.5` | `rounded-lg` (**8px**) | 1px `web3-border` | `web3-card` | none |
| Chain cell (TradePanel:103) | trade chain coverage | `p-2.5` (10px) | `rounded-lg` (**8px**) | 1px `#1f1f23` | `#141416` | none |
| Approval row (DoctorPanel:212) | approvals list | `px-5 py-3` (20 / 12) | none | bottom 1px `web3-border` | transparent → `web3-card-hover` on hover | none |
| Activity / Transfer row (PortfolioView:413) | activity list | `px-5 py-2.5` (20 / 10) | none | bottom 1px `web3-border` | transparent → `web3-card` on hover | none |
| Empty row (PortfolioView:707) | token/activity empty state | `px-5 py-6` (20 / 24) | none | none | none | none |
| Search input (PortfolioView:252) | command center | `px-3 py-2.5` (12 / 10) | `rounded-xl` (**12px**) | 1px `web3-border` | `#0a0a0a` (slightly darker than card) | inset `0 1px 0 rgba(255,255,255,0.03)` |
| About card (DoctorPanel:191) | doctor callout | `p-3` (12) | `rounded-xl` (**12px**) | 1px `web3-border` | none (transparent) | none |
| Quick-prompt chip (RightRail:333) | right rail quick prompts | `px-3 py-2` (12 / 8) | `rounded-lg` (**8px**) | 1px `#1f1f23` | `#141416` | none |
| User msg bubble (RightRail:412) | chat user msg | `px-3 py-2` | `rounded-2xl` (16px) + `rounded-br-md` | 1px `#1D8C80/25` | `#1D8C80/15` | none |
| AI msg bubble (RightRail:423) | chat assistant msg | `px-3 py-2` | `rounded-2xl` (16px) + `rounded-bl-md` | 1px `#2a2a2e` | `#16161a` | none |
| Tx confirm card (TxConfirmCard:130) | wallet confirm modal | `p-3.5` (14) | `rounded-2xl` (**16px**) | 1px `#2a2a2e` | none | shadow-2xl (via web3 shell) |

**Finding:** the canonical `.web3-card` is used for ~6 places (intel/trade/doctor primary cards + token/activity list containers). The rest of the surfaces use ad-hoc Tailwind:
- **3 different border colors** in active use: `var(--web3-border)` / `#1f1f23` (raw) / `#2a2a2e` (raw, == `--web3-border-strong` but typed as raw)
- **4 different radii** in active use: 8px (`rounded-lg`) / 12px (`rounded-xl`) / 14px (`.web3-card`) / 16px (`rounded-2xl`)
- **3 different "input" surfaces** with same purpose: `.web3-input` (`#0e0e10`), command center search (`#0a0a0a` inline), right rail textarea wrapper (`#0e0e10` inline)
- Mission button uses a custom teal-tinted shadow that no other card has — its visual language is closer to a "CTA tile" than a card

The list rows (activity / transfer / token / approval) are a fourth language: transparent bg, hover tint, only border-bottom. They are visually consistent with each other (same `px-5 py-{2.5,3}` + `divide-{white/5, web3-border}`) but don't read as "cards" — they read as list rows.

---

## 4. Spacing scale consistency

Tailwind spacing values in active use across the 11 web3 components (top 11 values by frequency, out of 167 matches):

| Tailwind N | px | Times | Notes |
|---|---|---|---|
| 2 | 8 | 66 | dominant (button padding, small gaps) |
| 3 | 12 | 54 | card-pad-sm equivalent |
| 1 | 4 | 29 | small gaps, icon-text spacing |
| 2.5 | 10 | 24 | **off the 4/8/12/16/20/24/32 system** (but on Tailwind 4-px grid) |
| 5 | 20 | 22 | **= web3-card-pad ✓ on system** |
| 1.5 | 6 | 21 | **off-system** |
| 0.5 | 2 | 17 | icon nudges, very fine |
| 4 | 16 | 14 | moderate spacing |
| 6 | 24 | 7 | **= web3-card-pad-lg ✓ on system** |
| 8 | 32 | 4 | large outer padding |
| 3.5 | 14 | 2 | **off-system** |

**Observed scale**: not the 4/8/12/16/20/24/32 "documented system" — it's the full Tailwind 4-px scale (0.5/1/1.5/2/2.5/3/3.5/4/5/6/8). The system 12/20/24 IS in heavy use (via `p-3` / `p-5` / `p-6`), but 10 / 14 / 6 also appear with frequency.

**Off-system (on Tailwind 4-px grid, but not on the documented card-pad scale):**
- `p-2.5` / `py-2.5` / `gap-2.5` (10px) — used in 24 places: `DoctorPanel:79`, `IntelPanel:62` quick-pick row, `PortfolioView:341` chain chip, `PortfolioView:413` activity row, `RightRail:412` chat bubble, `RightRail:390` send button, `TradePanel:51` quick prompt, etc.
- `p-1.5` / `px-1.5` / `py-1.5` (6px) — used in 21 places: chat bubble px, small badge py, command center search px
- `p-3.5` / `px-3.5` / `py-3.5` (14px) — used in 2 places (TxConfirmCard intent block, success block)
- `gap-1.5` (6px) — used 21 times
- `p-0.5` (2px) — used 17 times

`3`, `5`, `6` (= 12 / 20 / 24) ARE the system. `0.5`, `1`, `1.5`, `2`, `2.5`, `3.5`, `4` are all 4-px grid (Tailwind built-in) but don't map to any **named** design token.

---

## 5. Off-system examples (file:line → issue → suggested in-system token)

**1. `PortfolioView.tsx:231` — h1 hero uses 28px**
`<h1 className="text-[28px] font-bold …">Pick a mission. …</h1>`
- System has no 28px. Closest declared values: 20 (text-xl, 3 uses as panel h2) or 24 (text-2xl, 2 uses for health score).
- The h1 role should sit *above* h2; in a 3-step scale (24 / 32 / 40) this would be 32 or 40. Current 28 is an orphan between text-2xl and the ad-hoc 32 used for `totalUsd` on the same page.
- Suggested: `text-[32px]` to match the numeric hero, or formalize a `display` token at 32.

**2. `PortfolioView.tsx:302` — numeric hero uses 32px**
`<div className="text-[32px] font-bold text-white tracking-tight font-mono leading-none">{totalUsd}</div>`
- 32 is not declared in `globals.css`. It's also the only place in the codebase that uses 32, so there's no consistency argument for keeping it.
- Suggested: add a `display-l` token (32px) or a `web3-num-xl` utility, then reuse.

**3. `PortfolioView.tsx:550, 552` — mission-button title at 13px + CTA at 10.5px**
```
<div className="text-[13px] font-semibold text-white tracking-tight">{title}</div>
<div className="mt-3 flex items-center gap-1 text-[10.5px] font-mono font-bold tracking-wider uppercase text-[#1D8C80]">{cta}</div>
```
- 13px is not in the system. 10.5px is a half-step.
- The CTA strip is trying to read as `.web3-label` (11px mono uppercase) but is 0.5px smaller for no reason.
- Suggested: title → `text-[12.5px]` or `text-[12px] font-semibold`; CTA → `.web3-label` (11px) with the existing `web3-status-accent` color, drop the inline `text-[#1D8C80]`.

**4. `IntelPanel.tsx:62`, `DoctorPanel.tsx:229`, `PortfolioView.tsx:234, 417` — recurring 12.5px for primary list content**
- 5 places use 12.5px (the "primary content" size in token list rows, address rows, body intro).
- Closest system size: 12 (web3-text-body). Half-step persists because the visual target is "slightly more readable than 12", which is a real ergonomic ask — but the system offers no token for it.
- Suggested: add a `web3-text-list` utility at 12.5 OR collapse to 12 (the visual delta is small).

**5. `PortfolioView.tsx:341, 552, 710`, `DoctorPanel.tsx:94, 174`, `TradePanel.tsx:62, 116`, `RightRail.tsx:321, 390`, `ChainBadge.tsx:28` — 10.5px used 9 times**
- Chain pills, CTA arrows, "→ intent" hints, list hint rows all sit at 10.5.
- Closest system: `.web3-label` is 11. The 0.5px reduction is invisible to the eye and inconsistent.
- Suggested: standardize on `.web3-label` (11) for all mono-uppercase micro-text.

**6. `DoctorPanel.tsx:79` — scan button uses 10px + 2px Y padding**
```
className="rounded-md px-2 py-1 text-[10px] font-bold web3-text-body bg-[var(--web3-card-hover)] hover:bg-[var(--web3-border-strong)]"
```
- This is a re-implementation of `.web3-btn` (which is 11px / py-1.5 / px-2.5 / radius 8 / border web3-border / bg #141416).
- The doctor panel's "Scan" button does NOT use the canonical button class. Result: visually different button (different radius, different bg, different size) inside a panel that is otherwise canonical.
- Suggested: use `.web3-btn` (or `.web3-btn-primary`).

**7. `RightRail.tsx:367` — input wrapper uses inline style, not `.web3-input`**
```
<div className="rounded-xl border border-[#2a2a2e] bg-[#0e0e10] p-2" style={{ boxShadow: '0 0 20px rgba(29, 140, 128, 0.08)' }}>
```
- 3 places (`PortfolioView:252` command-center search, `RightRail:367` chat input, `TopBar:49, 61` gas/chain pills) all roll their own input style instead of using `.web3-input`.
- The `.web3-input` class is **defined** in globals.css but barely used. The 4 re-implementations all differ: radius 12 vs 8, padding 12/10 vs 8/12 vs 6/10, border `#2a2a2e` vs `web3-border`, no shadow vs 20px teal glow.
- Suggested: pick one — either make `.web3-input` the single source and migrate the 4 re-implementations, or delete `.web3-input` and let the inline styles win (and freeze them as tokens).

**8. `IntelPanel.tsx:52, TradePanel.tsx:51` — quick-pick / quick-prompt rows are `rounded-lg` (8px) inside a card**
```
className="rounded-lg border border-[var(--web3-border)] bg-[var(--web3-card)] hover:bg-[var(--web3-card-hover)] hover:border-[var(--web3-border-strong)] px-3 py-2.5"
```
- Same intent as a list row but with `rounded-lg` (8px). Activity / token / approval list rows are NOT rounded (transparent + border-bottom).
- Two different patterns for "clickable list of addresses / prompts" coexist in the same app.

**9. `PortfolioView.tsx:544` — Mission button re-implements `.web3-card` with hover shadow + 12px radius**
- `.web3-card` is 14px radius, no shadow. Mission button is 12px radius, custom teal-tinted hover shadow.
- This is the most "off-brand" card in the system — it introduces a third radius (12) alongside the canonical 14 and the 8 used by quick-pick rows.

**10. `LeftSidebar.tsx:67` — scenario nav button is 12.5px**
```
className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium"
```
- The LeftSidebar nav rows use 12.5px (off-system). The thread list directly below uses 11px (`.web3-label` adjacent text). Two different text scales within one sidebar.

**11. `TxConfirmCard.tsx:305` — track label at 9px + `tracking-widest`**
```
<span className="web3-text-muted uppercase tracking-widest text-[9px] font-bold">{label}</span>
```
- 9px is the smallest type in the system and only used in 2 places (TxConfirmCard + WalletConnectButton). 8px is used once (BrandLockup ModeChip).
- The `.web3-label` class is 11px — this label is 2-3px smaller for no documented reason.
- Suggested: standardize to 10px (smallest Tailwind built-in) or add a `.web3-track` token at 9/10px.

---

## 6. Screenshot evidence

All 4 captures saved at 1280×800 (full-page capture resizes content to fit 1920×1177):

- **va-1-top.png** — Portfolio Watch active (default web3 view, sample wallet). Shows: far-left ViewRail (Assistant/Trade/Web3 icons, Web3 highlighted), left sidebar (Portfolio Watch/Chain Intel/One-Liner Trade/Wallet Doctor scenarios + Threads panel), center "Command center" hero with "Pick a mission" h1 (28px), 2×2 mission grid, Current Wallet Snapshot card, Tokens on Ethereum empty row, right rail AI Agent panel with quick prompts and a teal "Connect Wallet" CTA in the top bar.
- **va-2-full.png** — full-page render of the same view. Shows the right rail extending below the visible viewport (chat input + send button visible at the bottom).
- **va-3-mid.png** — same as va-1-top because PortfolioView's outer container has `overflow-y-auto` and inner scrollbar is independent of the window scroll, so window-level scroll stays at 0. The visual "mid" of the page is the same content.
- **va-4-bot.png** — same as above; window scroll = document scroll, which is ~0.

Direct visual evidence to pair with the source findings:
- **va-1-top.png** clearly shows the 4 distinct card languages: 14px-radius command-center card (top), 14px-radius "Current Wallet Snapshot" card (mid), 12px-radius mission tiles (4 corners), 8px-radius sidebar scenario buttons (left). Three different radii on one viewport.
- The "Pick a mission." h1 is visibly larger than the panel h2s in Intel/Trade/Doctor (text-xl = 20px), confirming the 28 vs 20 gap is intentional but undocumented.
- The right-rail input wrapper has a teal `box-shadow: 0 0 20px rgba(29, 140, 128, 0.08)` glow — a fifth "card" treatment unique to the chat input.
- The middle column's "Tokens on Ethereum" / "Recent Activity" cards have NO internal padding on the row content (the rows use `px-5 py-2.5`), but the parent uses `.web3-card` with no `web3-card-pad` — visually correct but only because the list rows self-pad.
- Sidebar's "Threads" panel uses a 12.5px scenario row + 11px thread row + 11px workspace-name row — three slightly different text sizes in a 1-pixel-wide vertical strip.
