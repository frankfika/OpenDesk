# OpenDesk Web3 视图 · 重构 SPEC (v0.5)

> 输入: 3 份 audit (user-journey / visual-system / competitor)  
> 目标: 解决 P0 用户故事 + 视觉/竞品最大差距  
> 字数: < 1500 字

---

## 1. 5 个 P0 用户故事

### S1 · 一眼看全链总资产
- **现状**: 进 web3 只看到 Ethereum 余额, 切链挨个点 pill, 无全链总 USD.
- **痛点**: 多链老用户第一眼想要的 break-down 不存在.
- **重构后**: 顶部"总资产"一行大字 (32px mono) + 24h 涨跌 + 链分布条 (DeBank 30+ 链风, 折叠). 钱包连了自动汇总, 不点任何链也能看到 Ethereum 51% / Arbitrum 18% / Base 15%.

### S2 · Wallet Doctor 扫自己
- **现状**: 必须手粘地址; DoctorPanel 不读 wagmi `address`, 钱包连了也不自动填; Scan 按钮空/乱码/ENS 失败三态无反馈, viewAddress 不变以为坏了.
- **痛点**: "扫自己"是核心用例, 反而最重摩擦.
- **重构后**: 进 Doctor 自动从 wagmi 读 address 填 viewAddress (右上角可改); Scan 按钮 3 态明确 (loading spinner / 0 个空态 / 错误红条 + 重试), viewAddress 变更时 toast 提示.

### S3 · 看到 transfer 来自谁
- **现状**: activity row 只渲染 "Transfer USDC +0.5", from/to 地址必须跳 Etherscan.
- **痛点**: 收到一笔币要追来源, 必走外链.
- **重构后**: transfer row 渲染 from + to 地址 (缩略 0x…+ ENS), 点击单行展开 inline 详情卡 (tx hash / time / block). 鼠标 hover 出 ENS 完整名.

### S4 · Trade 0.001 ETH 测连通
- **现状**: example → 文本进 textarea → 点 Run → 右栏 Send, 3 跳; 钱包未连只在 chat 弹一句 "Connect first" 消失.
- **痛点**: 3 跳且"准备好的交易"不在视线焦点 (TxConfirmCard 浮右下与 Trade 视图无视觉关联).
- **重构后**: TradePanel example 1 click 直接生成 draft tx, 浮在 Trade 视图右上 (TxConfirmCard), 1 跳提交. 钱包未连先 inline 提示"连接后可签" 不消失.

### S5 · 给 agent 喂 tx hash 问 rug pull
- **现状**: command center 只接 ENS/0x 正则; 粘 tx hash → ENS 失败 → 落 chat 分支, agent 永远分析不出 tx 语义, 无"我处理不了这个"回执.
- **痛点**: 哈希输入黑洞, 用户以为 agent 还在想.
- **重构后**: search input 接受 ENS / 0x / **tx hash (0x + 64 hex)** / **token symbol (USDC, ETH)** / **合约地址**, 路由到对应视图. 不识别的输入 0.5s 内弹"暂不支持, 试试地址或 token".

---

## 2. 3 个视觉原则

1. **密度对齐 DeBank/Zerion, 留白节奏对齐 Phantom**. Electron 窗口 1280×800 抄不了 Phantom 48px 大字留白, 但 1 屏要塞 30+ 链 + 3 协议 tab + 4 列表 — 走彭博风密集布局, 字号 5 档拉开层级.
2. **Card 圆角收口到 2 档**. `8px` (rounded-lg) 用于 list row / quick-pick / input; `14px` (`.web3-card`) 用于 card / panel. 砍掉 mission tile 12px、chat bubble 16px、tx confirm 16px — 全部归 14. TxConfirmCard 例外保留 14, 不再独立.
3. **字号收口到 5 档 utility**. `10px` (track / micro) / `11px` (`.web3-label`) / `12px` (body) / `20px` (text-xl, h2) / `32px` (display-l, numeric hero). 半档 8/9/10.5/11.5/12.5/13.5/28 全部 collapse 到邻近整档. 新建 `.web3-text-display` (32) 工具类.

---

## 3. 改动清单 (按 ROI 排序)

### 必改 P0 (8 项)
| # | 文件:行 | 改什么 | 量 |
|---|---|---|---|
| 1 | `PortfolioView.tsx:231-360` | 顶部加"全链总 USD + 链分布条"区块, 替换 h1 28px → 32px, 链分布条从 5 pill 升级为可折叠 30 链 | **L** |
| 2 | `PortfolioView.tsx:115-118` | `runScenario` 不再全跳 chat, 改 1 click 启动 + 卡片显示 loading 状态 (S1/S5 入口) | L |
| 3 | `PortfolioView.tsx:252` | search input 扩展为 Phantom 式 search-first, 接受 5 种输入 (S5) | L |
| 4 | `DoctorPanel.tsx` | 自动从 wagmi 读 address 填 viewAddress; Scan 按钮 3 态反馈 (S2) | M |
| 5 | `PortfolioView.tsx:413` | transfer row 渲染 from/to + ENS, hover 展开 (S3) | S |
| 6 | `TopBar.tsx:14` | `useGas('ethereum')` 改 `useGas(currentChain)`, 跟钱包走 | S |
| 7 | `PortfolioView.tsx` | activeChain 默认跟 wagmi currentChain, 不再写死 ethereum | M |
| 8 | `TradePanel.tsx` | example 1 click → TxConfirmCard 浮在 Trade 右上, 钱包未连 inline 提示不消失 (S4) | M |

### 应改 P1 (5 项)
| # | 文件 | 改什么 | 量 |
|---|---|---|---|
| 1 | `globals.css` + 11 组件 | 圆角 8/14 二档制, 砍 12/16, mission tile 改 14, chat bubble 改 14 | M |
| 2 | `globals.css` + 11 组件 | 字号 5 档 utility, 6 个半档 collapse, 新建 `.web3-text-display` | M |
| 3 | `globals.css` + 4 input | `.web3-input` 收口, command-center / chat input / gas pill / chain pill 全部走统一类 | M |
| 4 | `PortfolioView.tsx` | 3 个独立 ErrorRow 合并, 加 "last synced 2min ago" 时间戳 | S |
| 5 | `useWeb3Data.ts:477` | useTokenList 拆 Wallet/DeFi 仓位, PortfolioView 加"By App/Token"协议 tab (Zerion 式) | L |

### 可缓 P2 (3 项)
| # | 文件 | 改什么 | 量 |
|---|---|---|---|
| 1 | `globals.css:153` | 1D8C80 单色加 1-2 渐变彩色记忆点 (Rainbow 风), 不抢主色 | S |
| 2 | `PortfolioView.tsx:420` | token 行 56×18 mini sparkline 升级为整盘 1H/1W/1Y/Max 走势 + 区间切换 | M |
| 3 | `components/web3/` | 新建 NFT tab + 组件 (目前 0 命中) | L |

---

## 4. 不要改的 (3 项)

1. **List row 透明 bg + 底 border 模式** (activity/transfer/token/approval 4 处). 视觉一致不丑, 改成圆角 card 反而割裂. 留.
2. **Tailwind 0.5/1.5/2.5 间距** (66/21/24 次使用). 频率高且不痛, 字号收口已覆盖 1.5 间距里的痛. 留到系统收口时一起处理.
3. **Legacy alias tokens** (`--bg-sidebar`, `--accent`, `--bg-input` 等). 即使已转发到 `web3-*`, 别现在删 — 等所有引用方迁移完再删, 避免一次改 200+ 处.

---

## 5. 验收标准 (5 个可观察现象)

1. **首屏一眼能看到自己钱包的总资产 + 24h 涨跌 + 链分布条, 不需要 scroll 或切链** (S1).
2. **进 Wallet Doctor, 钱包已连就自动填地址, Scan 按钮 3 态清晰 (loading spinner / 空态 / 错误红条+重试)** (S2).
3. **点 transfer 行, 1 秒内看到 from/to 地址 + ENS, 不需要跳 Etherscan** (S3).
4. **点 Whale teardown mission 卡片, 用户 2 秒内能看到分析开始 (卡片 loading 状态), 不会以为坏了** (S1+S5).
5. **粘一个 tx hash 进 command center, 0.5 秒内看到"暂不支持, 试试地址或 token"明确回执, 不会落 chat 黑洞** (S5).

---

**实施建议顺序**: P0 #6 (TopBar Gas) → #7 (activeChain) → #5 (transfer row) → #4 (Doctor) → #8 (Trade) → #1 (总资产) → #2 (runScenario) → #3 (search-first).  
先小后大, 每改一项跑一次 dev server 验证, 别一次性合并.
