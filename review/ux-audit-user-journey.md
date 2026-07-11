# OpenDesk Web3 视图 · 用户旅程 audit (v0.4.2)

**视角**: Frank, 多链老用户 + OpenDesk owner, 日常查 LP / 审批 / 收币
**关键发现**: 第一眼要看的"全链总 USD"和"最近进出"被埋得最深; Mission 卡片和右侧 chat 重复表达同一意图; 4 个 mission 全跳到 chat 输入框, 用户看不到"任务已开始"
**方法**: 8 源文件 + 4 视图拼合, 仅描述现状与缺口, 不给实施建议

---

## 1. 真实用户故事

1. **Frank 周一过 5 链持仓**: 进 web3 想要总 USD + 各链 break down. 实际只看到 Ethereum 余额, 切链要挨个点 pill, 无全链总.
2. **Frank 担心上周 USDC approve 是 infinite**: 进 Wallet Doctor 想"扫自己". 实际必须手粘地址, DoctorPanel 不读 wagmi 的 `address`, 连了钱包也不自动填 viewAddress.
3. **Frank 收到一笔 USDC, 想看谁发的**: transfer 行只渲染 "Transfer USDC +0.5", 不渲染对端地址, 必须跳 Etherscan 才能看 from/to.
4. **Frank 在 Base 上发 0.001 ETH 测连通**: Trade 选 example → 文本进 textarea → 还要点 Run → 再到右栏 Send. 3 跳, 钱包未连时只在 chat 弹一句 "Connect first" 然后消失.
5. **Frank 给 agent 喂一个 tx hash 问"是不是 rug pull"**: command center 只接 ENS/0x, 粘 hash → ENS 失败 → 落 chat 分析分支, agent 永远分析不出 tx 语义, 也没"我处理不了这个"的回执.

## 2. 入口断层

1. **4 个 mission 全跳到 chat 输入框**: `runScenario` 派发 fill-input + setActiveScenario. 在 chat 视图时 setActiveScenario 是 no-op, 用户看不到任何变化, 实际事件已塞右栏, 无 toast / 高亮提示"去右栏发送".
2. **"Approval danger check" 派发 set-doctor-address 但 DoctorPanel 未 mount**: 当前 active 是 chat, 事件进虚空, viewAddress 不变, 用户以为扫了实际没扫.
3. **"Whale teardown" 写死 vitalik.eth**: 覆盖用户刚粘的地址上下文, brantly.eth 被清.
4. **TopBar Gas 写死 `useGas('ethereum')`**: Base/Polygon 用户看到 L1 gas, 工具栏与实际链不一致.
5. **TradePanel "Run" 不真的开 signature card**: 走 fill-input → 右栏接管; 实际 TxConfirmCard 浮右下, 与 Trade 视图无视觉关联, "准备好的交易"不在视线焦点.
6. **DoctorPanel Scan 按钮: 空 / 乱码 / ENS 失败 三种无反馈**, viewAddress 不变, 用户以为组件坏了.
7. **RightRail 在 Electron 无 provider**: 弹 "Press ⌘, to set one up.", 错误是 dev 错误, 不在普通用户能 follow 的引导路径里; 浏览器模式 runWeb3Agent 又能跑出"假成功"答复, 两条路径结果不一致.

## 3. 重复信息

1. **ETH 价格 + 24h 涨跌** 出现在 TopBar (line 36) 和 PortfolioView snapshot (line 309) 两处, 无去重, 切链时两个数字各自重算, 用户不知道哪个是 truth.
2. **链选择器 4 种形态**: TopBar 网络切换(只显当前) / PortfolioView pills(5+more) / TradePanel "Chain coverage" 装饰网格 / DoctorPanel pills(6 个). 同 6 链 4 种 UI, 互不相通.
3. **"vitalik.eth" / 0xd8da…045 硬编码 4+ 处**: PortfolioView missions / IntelPanel QUICK_PICKS / RightRail SCENARIO_PROMPTS(intel + chat). 新用户看到 4 个 vitalik, 误以为 demo 地址.
4. **同一笔 tx 在 TxConfirmCard + RightRail 出现 2 次**: openSignerCheck / native-transfer 同时 setPendingTxRequest + addMessage, 同一笔交易"金额 / 链 / 描述"在两处各讲一遍.

## 4. 卡住场景

1. **钱包连了 PortfolioView 不联动**: viewAddress 被 mission 清掉后, 顶部 "My wallet" (line 240) 是唯一回路径, 按钮位置弱, 不显眼.
2. **钱包在未支持链 (Sepolia / testnet L2)**: TopBar 找不到 currentChainMeta → chain switcher 整块消失; PortfolioView activeChain 写死 ethereum, 用户以为钱包没连, 实际是 RPC 链 ID 不在 CHAINS 表里.
3. **DoctorPanel 链选错导致假阴性**: 上次 BSC 扫过 viewAddress 留着, 粘新地址 → 扫 BSC 找 approval → 0 个报"干净", 实际新地址可能是 Ethereum 上 8 个无限授权的巨鲸.
4. **ENS resolve 5xx 静默失败**: `/api/ens/ens/resolve/${v}` catch 返回 null, 反复粘反复卡, 无错无重试, 也没有"ENS 解析服务不可用"提示.
5. **三处 API 错误各自有 ErrorRow+Retry, 但没合并**: 三个独立红条, 用户看不出是不是同一根因(CORS / rate limit / RPC 挂); 整页无 "last updated" 时间戳, 数据陈旧度不可知, 看似有数据可能是 10 分钟前的快照.
