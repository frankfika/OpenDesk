# OpenDesk — Project Memory

> 双重消费者:
> 1. **Mavis agent** (任何 agent 在 OpenDesk 仓库工作时读这个)
> 2. **OpenDesk runtime** (src/main/agents-md.ts 启动时扫描 `AGENTS.md`/`.cursorrules`/`.traerules` 并注入 LLM context)
>
> 所以: 写给"在 OpenDesk 工作的 agent"看, 而不是写给人类用户的 changelog.

## 1. 项目本质

OpenDesk = Frank 个人副业的 **Electron 桌面 AI 工作台**, 主业在 OpenCSG 做 IR.
- 仓库: `/Users/fangchen/Baidu/GitHub/OpenDesk` (本地) / `frankfika/OpenDesk` (远端)
- 当前包版本: `package.json` 仍是 `0.4.2`, **版本号长期不升** — CHANGELOG 记录功能演进但 release tag 滞后, 不要靠 package.json 判断项目新鲜度
- Owner: Frank 一个人, **不是团队**, 不要假设有 PR review / 同事配合

定位从 v0.1 的"通用 AI 桌面助手"演化为 **"Web3 多链钱包情报 + AI agent 工作台"** (v0.5+). 老的 chat 体验仍是 default view, 但 Web3 Workbench 是产品主线.

## 2. 关键入口 (踩过坑)

| 角色 | 路径 | 备注 |
|---|---|---|
| Renderer root | `src/renderer/src/App.tsx` | 当前渲染 **AppShell** (不是 Web3Shell). AppShell 含 far-left ViewRail 切 3 view: `assistant` (default) / `trade` / `web3` |
| 计划中的新 root | `src/renderer/src/components/web3/Web3Shell.tsx` | 注释说 "replaces AppShell as the app's root", 已写好但 App.tsx 还没切过去. 切 root 时同步改 App.tsx |
| Web3 view 主体 | `src/renderer/src/components/web3/Web3Workbench.tsx` | 3-column: TopBar / LeftSidebar / RightRail, 装 PortfolioView/IntelPanel/TradePanel/DoctorPanel/TxConfirmCard |
| Main 入口 | `src/main/index.ts` | 启动 workspace/provider/memory/MCP/skills/ensemble |
| **AGENTS.md 加载器** | `src/main/agents-md.ts` | runtime 递归扫 `AGENTS.md`/`.cursorrules`/`.traerules`, 注入 LLM context — **本文件改了会被 OpenDesk LLM 读到** |
| IPC bridge | `src/preload/index.ts` | 暴露 `window.api.workspace/chat/memory/skills/mcp/rag/tools/app` |
| Zustand stores | `src/renderer/src/store/*.ts` | 13 个: artifacts/changeLog/chat/memory/sections/settings/skills/theme/toast/trade/view/web3/workspace |

## 3. Stack 速记

- **Electron 28+** + electron-vite (main/preload/renderer 三 process)
- **React 18 + TypeScript 5.5** + Vite
- **Tailwind 3.4** + CSS variables (`globals.css` 定义 `--bg-*/--text-*/--accent/*` token, 别写硬编码颜色)
- **Zustand 4.5** (per-domain store, 不上 Redux)
- **Wagmi 3.6 + Viem 2.53 + Reown AppKit 1.8** (Web3 wallet stack; `Web3Providers` 在 App.tsx 顶层)
- **Radix UI** (Dialog/Tabs/Tooltip/ContextMenu/ScrollArea) — 用 primitive 不造轮子
- **Framer Motion 12** (动画)
- **node-cron 3** (main process 调度)
- 平台: macOS (.icns) / Windows (.ico) / Linux (.png) 三套打包 — electron-builder

## 4. 工作流约定 (跟 Frank 协作)

- **Frank 说话省字** — 三个字能说清的事别写一段. 直接给结论, 不解释为什么.
- **audit → synthesis 拆分**: Frank 偏好 2 段工作流
  1. **Audit 任务**: 写真实用户故事 / 入口断层 / 重复信息 / 卡住场景, 引用源码行号, **不写建议段**
  2. **Synthesis 任务**: 拿 audit 缺口出设计修复方案 (SPEC / 重构计划)
  - 报告格式: 中文, **< 800 中文字**, 4-5 段, 用户故事用"角色 X 在场景 Y 想做 Z, 实际是..."句式
  - **不要把建议塞进 audit**
- **维护节奏**: PR-by-PR, 一次改一个 file, 跑 dev server 验证, 别一次性合 8 项. SPEC 末尾会有"实施顺序建议" — 照做.
- **不要 commit** 除非 Frank 明确说. Frank 习惯自己写 commit message.
- **owner 决定权**: SPEC 写完是给 Frank 拍板要不要实施, 不是自动开干.

## 5. 死代码 / 慎动区

- 老的 chat view 仍 active (是 AppShell 的 default), **不是 dead code** — 别去删 `src/renderer/src/components/chat/` 下任何东西, 那是 assistant view 的实际依赖
- `.archive/v0.4-reports/` 下的 v0.4 release docs 已归档, 别再引用 (git status 显示已经从根移过去了, 但 R 状态, 还没 commit)
- `docs/screenshots/legacy/opendesk-*.png` 同样在归档, 别在新文档里引用
- `--bg-sidebar` / `--accent` / `--bg-input` 等 legacy alias tokens — 别现在删, 等所有引用方迁移完再删 (一次改 200+ 处)
- Tailwind `0.5/1.5/2.5` 间距 (66/21/24 次使用) — 频率高且不痛, 留到系统收口时一起处理

## 6. 当前 audit 状态 (2026-07-11)

- **3 份 audit 完成 + verifier PASS**:
  - `review/ux-audit-competitor.md` (industry-analyst) — 12 gaps, 抄 DeBank/Phantom/Zerion/Rainbow 作业
  - `review/ux-audit-user-journey.md` — 5 个真实 P0 用户故事来源
  - `review/ux-audit-visual-system.md` (ui-ux-designer) — 6 段, 14 text-Npx / 4 圆角 / 11 off-system + 4 张 1280×800 截图
- **Synthesis SPEC** (product-manager 已交付): `review/ux-redesign-spec.md` — 97 行, 5 段, 949 中文字 (< 1500 预算)
  - 5 P0 故事 (S1 总资产 / S2 Wallet Doctor / S3 transfer 溯源 / S4 Trade 0.001 ETH / S5 search-first)
  - 3 视觉原则 (密度 DeBank + 留白 Phantom / 圆角 2 档 8+14 / 字号 5 档 utility)
  - 改动清单: P0×8 / P1×5 / P2×3, 每项带 `file:line` + S/M/L 量级
  - 3 项"不要改"防 over-engineer
  - 5 个可观察验收标准
- **下一步**: 等 Frank 拍板要不要按 SPEC 实施. SPEC 末尾有"实施顺序" — 先小后大, 一次改一项跑 dev server.

## 7. 关键文档指针 (不要重新写)

| 主题 | 文件 |
|---|---|
| 架构 | `ARCHITECTURE.md` (13KB) + `docs/zh/architecture.v0.1-baseline.md` (v0.1 baseline) |
| 产品定位 / Roadmap | `PRODUCT.md` (3.8KB) |
| 变更日志 | `CHANGELOG.md` (13KB, 截止 0.4.2 / 2026-06-20) |
| 用户文档 | `README.md` (20KB) + `README_EN.md` |
| 全项目 review | `review/2026-07-11-full-review.md` (200+ 文件, 33K LOC) + `review/architecture_review.md` / `feature_review.md` / `state_review.md` / `security_performance_review.md` |
| 当前 audit 三件套 | `review/ux-audit-{competitor,user-journey,visual-system}.md` |
| Web3 重构 SPEC | `review/ux-redesign-spec.md` |
| Plan 工作区 | `.mavis/plans/plan_*/` (board.md / outputs/ / workspace/) |

> AGENTS.md 只写"agent 必知"的事, 不重复 ARCHITECTURE.md 已经画过的架构图. 重复 = 给 OpenDesk runtime LLM 加 token 噪音.
