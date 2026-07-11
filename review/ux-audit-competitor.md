# OpenDesk Web3 视图 · 竞品对标 audit

**对比对象**: Phantom / Rainbow / Zerion / DeBank | **方法**: 抓 4 产品官网+app+profile 页(URL 见 §1) | **结论先说**: 4 家卷的是"任务流+风险可视化",OpenDesk 落后最多。

---

## 1. 4 产品首屏信息架构对比表

| 元素 | Phantom | Rainbow | Zerion | DeBank |
|---|---|---|---|---|
| top-1 | 大字余额 (cash hero $17,382.41) | 渐变彩色卡 + "Experience Crypto in Color" | 总资产 + 4 pill (Tokens/Perps/History/Stats) | banner + 余额 $5,168 -5.72% + TVF $370M |
| top-2 | "You get CASH $16,000" 转化 | ⌘K 菜单 + 快捷键 + wallet 切换 | 时间区间 1H/1W/1Y/Max + sparkline | 30+ 链分布 (Ethereum 51% / Arbitrum 18% / Base 15%…) |
| 任务入口 | search-first 顶栏搜索 | ⌘K command menu | 左侧 nav (Explore/Swap/Favorites) | 顶搜索 + Stream/Quest/Lucky Draw |
| 资产总览 | 极简大字无 break-down | NFT grid 优先 | tab + 时间区间 | **链 tab + 协议 tab 双轴(最强)** |
| 视觉风格 | 极简深色+渐变蓝紫 | 渐变彩色卡片(Apple Card 式) | 紧凑卡片(Stripe 式) | 高密度深色(彭博式) |
| 关键页 | phantom.app/cash | rainbow.me | app.zerion.io/0x…/overview | debank.com/profile/0xf7b1…e2d6 |

## 2. 4 产品"任务执行入口"模式

- **Phantom (search-first)**: 顶搜索 → 输地址/合约/ENS → 跳 token detail(看 TRUMP 页:Name/Symbol/Market Cap/Buy)。1 搜+1 点。
- **Rainbow (⌘K)**: "Press ⌘K and type your command. K=Magic Menu, X=Swap, S=Send"。1 ⌘K+1 键。
- **Zerion (tab+搜索)**: 左侧 nav 任务分类,内页 tab 切 Tokens/Perps/NFTs。1 nav+1 tab。
- **DeBank (双轴)**: 链 tab 30+ 全出 + 协议 tab 3 个 + token 4 列表。3 跳直达。

## 3. 4 产品"信息密度+留白"风格

- **Phantom 苹果式极简**: cash hero 一行余额+一行"You get CASH",其余留白,深色+蓝晕+渐变圆卡。
- **Rainbow 苹果式彩色**: "Experience Crypto in Color" 渐变彩虹背景,留白多但每块带冲击。
- **Zerion Stripe 式密集**: 一屏塞余额+4 pill+链过滤+sparkline+资产列表,紧凑有序,字号层级清晰。
- **DeBank 彭博式密度**: 一屏 30+ 链分布+3 协议 tab+token 4 列表+TVF/Followers,适合鲸鱼不适合新手。

## 4. OpenDesk 12 差距(按用户感知影响排序)

1. **(DeBank) 无"链+协议"双轴**: 只有 5 chain pill 横排(PortfolioView L332-360),DeBank 30+ 链全出+协议 tab。多链用户看不到 break-down。
2. **(Zerion) 无"任务流"首页**: 4 MissionButton 全跳 chat 不真成交(PortfolioView.tsx L115-118 runScenario→fill-input)。
3. **(Phantom) 余额视觉权重低**: 32px 数字+小字 24h(PortfolioView L302),Phantom cash hero 是 48px 大字。
4. **(DeBank) 鲸鱼指标全缺**: DeBank 头部一屏余额+TVF+Earnings+Followers 齐,OpenDesk 只有地址截+token 数+tx 数;且 TopBar.tsx L14 `useGas('ethereum')` 写死 L1 gas,Base/Polygon 用户工具栏与实际链不一致。
5. **(Rainbow) 无 ⌘K 结构化命令**: Web3Shell.tsx L111-114 ⌘K 只能搜 thread,不能 X=Swap/S=Send。
6. **(Phantom) search-first 缺失**: 搜索框藏 Command center 卡里(PortfolioView L160-168 写死 ENS/0x 正则),不接 tx hash/token symbol/合约。
7. **(Zerion) 整盘 sparkline 缺失**: 只有 token 行 56×18 mini(PortfolioView L420-428),无 1H/1W/1Y 整盘走势。
8. **(DeBank) token 6 列扫视成本高**: OpenDesk 是 logo+名+sparkline+数+USD+link,DeBank 是 4 列对齐表 (PortfolioView.tsx L400-430 整段 token row)。
9. **(Rainbow) 品牌色单调**: 单一 1D8C80 深青绿,缺渐变彩色记忆点 (styles/globals.css L153 `--web3-accent: #1D8C80`)。
10. **(Zerion) "By App/Token" 切换缺**: DeFi 仓位散落 token 列表,看不到"钱在 Aave/Uniswap/Lido 各多少" (useWeb3Data.ts L477 useTokenList 只按 symbol 聚合)。
11. **(Phantom) in-app swap 入口缺**: 看完 token 只能跳 Etherscan,无 Buy/Swap 大按钮 (PortfolioView.tsx L407 `href={explorer/token/...}` 跳外链,grep "swap|buy" PortfolioView.tsx 0 命中)。
12. **(Rainbow) NFT 模块全缺**: 无 NFT tab,持 NFT 用户无归属 (components/web3/ 下 grep -i nft 0 命中,无 NFT 组件)。

## 5. 抄 1 个元素最值的是什么

**抄 DeBank 双轴 → OpenDesk PortfolioView 顶部**(URL: debank.com/profile/0xf7b1…e2d6)。该页头部 30+ 链可展开列表 + 3 协议 tab(Wallet/Polymarket/Hyperliquid),OpenDesk 信息折叠太深,多链用户 80% 资产看不见。

**落地**: PortfolioView L332-360 5 chain pill → "全链总 USD + 折叠链列表";下方加协议 tab 行,数据从 useWeb3Data.ts L477 useTokenList 区分 Wallet/DeFi 仓位(借 Zerion "By App/Token")。不抄其他:Phantom 48px 受 Electron 窗口限制做不出;Rainbow ⌘K 是补充不核心;Zerion tab 跟 LeftSidebar 重复。**优先级最高**: OpenDesk 完全没有,4 个用户故事 3 个都靠它(全链 break down / DeFi 仓位分类 / 风险扫描前视图)。
