# AI 调度工具 许愿评估 — 2026-07-11

> 类型: feature wish assessment · 不是 audit, 不写实施 PR
> 触发: Frank 拿了一个用户需求(把 Codex/GPT/Claude/Grok/Cursor 等订阅接进来, 按优势/价格/速度/上下文自动选, 复杂任务拆规划/执行/搜索/审核调子智能体), 问 OpenDesk 能不能加
> 范围: market 现状 + OpenDesk 现有底盘 + 技术可行性 + 接入点 + 拍板清单

---

## 1. 这个 wish 在 2026 年的市场坐标

**"AI 调度/路由" 已经从"锦上添花"变成基础设施层, 类比微服务时代的 API Gateway.**

- **OpenRouter** (300+ 模型, 10-30% 加价) 是早期范式: 一个端点统一所有模型, 但只做转发不做智能选
- **LiteLLM** (开源, 100+ providers) 把范式推进到 "代理 + 标准化协议 + 故障转移", 是事实标准
- **Portkey** / **Helicone** / **Unify AI** / **Cloudflare AI Gateway** 各自占据一个纵切: 治理、可观测、基准驱动路由、边缘缓存
- **Crazyrouter** (627+ 模型, 约官方 55% 价) 是 2026 新势力, 把 LLM + 图片/视频/音乐/Agent 一个端点收齐
- **LLMRouter** (UIUC 开源, 16+ 路由策略) 把"路由"做成学术课题: KNN/SVM/MLP/Elo/Graph/Bandit/Agentic 全部可插拔
- **Cursor Auto/Composer** 是 IDE 层最被称赞但最不透明的实现: 用户喜欢"不用选模型", 抱怨"我不知道它选了什么, 贵不贵, 准不准"
- **GPT-5 system card** 自己披露: 内部就是 "fast model + deep reasoning model + real-time router" 三件套, router 是核心组件
- **2026-06**: Cursor 收购 Continue.dev, AI 编程工具从"插件竞争"进入"平台整合"阶段

**结论**: 用户这个 wish 不是空想, 是行业共识. 唯一缺的是"透明 + 用户可控 + 跨订阅" 这件事没人做干净 — Cursor 把前两个都吃了, OpenRouter/LiteLLM 把后两个吃了, **没人在桌面端做"既透明又能统一管多订阅"的网关**.

---

## 2. OpenDesk 现在的底子(比看上去厚)

我快速扫了一遍, 发现这个 wish **不是从零开始, 60-70% 的基础设施已经在了**:

| 已有的能力 | 位置 | 跟 wish 的对应关系 |
|---|---|---|
| 14 个 provider 预设 (OpenAI/Anthropic/Gemini/DeepSeek/Ollama/Groq/Grok/Mistral/Doubao/Kimi/GLM/Qwen/OpenRouter/b.ai) | `src/shared/providers.ts:15-122` | ✅ "接进来" 已经支持 |
| API key 隔离 + 测试 + 模型列表拉取 | `src/preload/index.ts:28-39`, `src/main/index.ts:84-115` | ✅ 多凭证管理已经能跑 |
| 健康检查 + provider 故障事件 | `src/main/providers/health-checker.ts`, `provider:healthChanged` IPC | ✅ Fallback 兜底有 hook |
| 完整的 orchestration 层: agent-run / ensemble / arbitrator / run-tracker / tool-coordinator | `src/main/orchestration/*.ts` (6 个文件) | ✅ "拆规划/执行/搜索/审核" 已经有跑道 |
| 每个 run 都带 `runId / agentId / providerId / model` 标签 | `src/main/orchestration/agent-run.ts:18-30, 60-67` | ✅ 透明追溯的元数据已经埋好 |
| Ollama 本地模型自动检测 | `src/main/index.ts:84-142` | ✅ "本地 + 云" 混跑已经能 demo |
| Experts + Skills 系统 + Marketplace | `src/preload/index.ts:476-503, 76-82, 581-666` | ✅ "子智能体" 已经有角色抽象 |
| Scheduler (cron) + 持久化 changelog | `app.scheduler.*`, `app.changelog.*` IPC | ✅ "定时跑、留档审计" 已经能跑 |
| Web3 Trade panel + Wallet Doctor + Intel | `src/renderer/src/components/web3/*` | (现有产品主线, 不冲突) |

**缺的(从无到有)就这几块**:

1. **路由策略层** — 现状: 用户手选 provider + model. 缺: 一个 `router.ts` 接 `TaskIntent → 选 Provider+Model` 的策略
2. **透明 UI** — 现状: changelog 里有 record, 但没专门的 "这次为啥选它" 视图. 缺: 一个悬停/抽屉显示 routing decision tree
3. **订阅/tier 概念** — 现状: 只有"API key". 缺: "我的 ChatGPT Plus 还剩多少 / 我的 Cursor Pro 还在不在有效期" 这种订阅维度
4. **成本/额度引擎** — 现状: 没计费. 缺: token × 价格表 + 月度配额 + 预警
5. **路由策略的 marketplace** — 现状: skills marketplace 有. 缺: 用户能装"代码用 Claude, 翻译用 DeepSeek, 长文用 Gemini" 这种 routing policy pack

**重要观察**: 上面 5 块都是"上层" 东西, **不需要重写主进程**. `Provider.stream()` 接口已经足够通用 (`src/main/providers/base.ts`), routing 只是包一层.

---

## 3. 用户的真痛点 vs Cursor 的真问题

> "Cursor 的调度其实挺好的, 但不够透明, 也不够自由"

**用户故事 1 (透明痛点)**: Frank 在 Cursor 用 Auto 模式写一个 200 行的重构, 30 分钟后发现花了 $4.20. 不知道是哪个模型、为什么、能不能换更便宜的. 想复现只能从头跑, 没有 "decision log" 可以查.

**用户故事 2 (自由痛点)**: Frank 想用 Cursor Pro 月费里送的 GPT-5 额度写代码, 但用 Claude API 写文档 (因为质量更好). Cursor 不让, 只能二选一. 想 "哪些任务走 Cursor 额度, 哪些走我的 API" 都没入口.

**用户故事 3 (拆解痛点)**: Frank 让 AI 做一个"调研 OpenAI 5 篇新论文, 总结技术趋势"的任务. 想要: 搜索用便宜的 (Perplexity / Sonar), 总结用 Gemini 长上下文, 写报告用 Claude. 现在要在 3 个 tab 切, 中间手动搬内容.

**OpenDesk 能给的差异化 (Cursor 给不了的)**:
- **完全的决策可追溯**: 每次 `runId` 都能回放, "这个 answer 是 Sonnet 出的, 因为路由策略 X 匹配到 Y 模式, 成本 $0.003, 用时 1.2s"
- **多凭证混跑**: 一个 chat 里, "用 Cursor 订阅里的 GPT-5 写代码 + 我自己 API key 的 Claude 写文档" 真的能在一轮对话里并存
- **本地优先 + 云兜底**: Ollama 本地能跑就本地跑, 跑不动自动接云, 这是 Cursor 给不了的
- **可分享的 routing policy**: 我配好 "代码用 X / 长文用 Y / 翻译用 Z" 一键导出 JSON, 团队 / 朋友能装

**Cursor 给的 OpenDesk 给不了的**: 跟仓库的紧耦合 (Cursor 看的是整个代码库 context, OpenDesk 是 chat-based workbench). 短期 OpenDesk 不要正面刚 Cursor 的代码工作流, 而是做 "**多模型透明调度**" 这件事, 让 Cursor 用户来 OpenDesk 当 "调度控制台" 用.

---

## 4. 技术可行性 — 能做, 6-8 周 MVP, 风险可控

| 子模块 | 难度 | 复用现有 | 估时 | 风险点 |
|---|---|---|---|---|
| 1. `router.ts` 策略层 (任务意图 → 选模型) | S | 复用 `Provider` 接口 + 已有 task classification (ensemble 里) | 1 周 | 路由策略的 "意图识别" 是个 ML 问题, MVP 可以用 rule-based + 用户手工 override |
| 2. 透明 UI (decision panel + 路由树) | M | 复用 `Message` 上的 `providerId/model/runId/agentId` 已有元数据 | 1 周 | UI 设计要跟现有 chat 整合, 不另起炉灶 |
| 3. 订阅/tier 管理 (Cursor Pro / ChatGPT Plus / Claude Max 等) | M | 扩展 `AppSettings.providers`, 加 `tier: 'api' \| 'subscription' \| 'oauth'` | 1-2 周 | Cursor/ChatGPT 这种**不暴露 API** 的订阅需要走 cli bridge 或 web scrape, **是最不确定的一环** |
| 4. 成本/额度引擎 (token × price × quota) | M | 复用 `onAgentDone` 已经带回的 `inputTokens/outputTokens` (`preload/index.ts:171-181`) | 1 周 | 价格表要持续维护, 考虑接 LiteLLM 的 `model_prices_and_context_window.json` |
| 5. Routing policy marketplace (一键装策略包) | S | 复用 `app.marketplace.*` 全部 | 0.5 周 | 几乎零成本, 复用 marketplace |
| 6. ensemble/arbitrator 的 fallback (单 provider 挂时自动接备用) | S | 复用 `health-checker` + `run-tracker` | 0.5 周 | Fallback 链的级数要限制, 否则 cost 爆 |

**总估时**: 6-8 周单人 (按 Frank 节奏 PR-by-PR 跑, 实际可能 8-10 周)

**最大风险 = #3 订阅桥接**: Cursor/ChatGPT Plus 不给 API, 真要做订阅混跑需要:
- (a) 让用户在 OpenDesk 里手动配 "这条 prompt 走我的 Cursor Pro 账号", 然后 OpenDesk 通过 **本地代理** 调用 Cursor 的 IDE 接口 (类似 Continue 的做法, 但 Continue 已被 Cursor 收购, 走它可能被卡)
- (b) 走 cli 桥接: 用户在本地跑 `codex` / `cursor-agent` CLI, OpenDesk 作为调度器 spawn 它们
- (c) **坦白不支持, 只做 API 类订阅** (OpenAI/Anthropic/xAI 给的官方 API key, 算 "sub-tier"), Cursor/Codex 走 fallback 提示

我建议 MVP 走 (c), 后期再补 (a) (b). 风险最小, 也符合 Frank "PR-by-PR" 的节奏.

---

## 5. 跟 OpenDesk 现有主线的契合度

- **Web3 Workbench 主线不冲突**: routing 是 chat 路径的能力增强, 不动 Web3 任何东西
- **能直接放大现有能力**:
  - `experts` 系统 (preload:476-503) — 每个 expert 可以声明 "我需要的 model 类别", router 帮它自动选
  - `scheduler` — 定时任务能配 "用最便宜的模型跑日报"
  - `arbitrator` (orchestration/arbitrator.ts) — 多模型对比时, 路由器能选 "这次用 GPT + Claude 对比, 下次用 Gemini + Claude" 自动省钱
  - `wallet doctor` / `intel panel` 的 AI 调用 — 现在写死一个 provider, 加 router 后能根据 token 数自动选
- **差异化定位**: OpenDesk 不去抢 Cursor 的 IDE 蛋糕, 而是当 **"调度控制台 + 多订阅钱包"** — 用户用 Cursor 写代码, 用 OpenDesk 调度 + 审计 + 配比多模型

---

## 6. Frank 拍板清单 (3 个 yes/no)

1. **要不要做?** (Y → 走 #2-3, N → 归档, 等下次有用户提再说)
2. **MVP 范围走窄还是走宽?**
   - 窄 = 只做 #1 router + #2 透明 UI + #5 marketplace 复用 (4 周, 风险最低, 给现有用户升级体验)
   - 宽 = 窄 + #3 订阅 + #4 成本引擎 (8 周, 真正差异化, 但 Cursor/ChatGPT Plus 桥接是个洞)
3. **是否启动 SPEC 工作流?** (Y → 我开 mavis-team 跑 product-manager + frontend-engineer + industry-analyst 三路, 出一份带 mockup 的 SPEC; N → 直接 PR-by-PR 干, 我每周报进度)

我的建议: **Y + 窄 + Y**. 窄不是因为不想要宽, 而是 #3 订阅桥接是 Cursor 收购 Continue 后的新地雷, 先让别人趟, 我们做上层. 等 SDK/bridge 模式稳了再补.

---

## 附录: 参考资料 (这次摸底来源)

- CSDN 2026 OpenRouter 7 替代品对比 (Crazyrouter/Portkey/LiteLLM/Helicone/Unify/Kong/CF)
- UIUC LLMRouter (16+ 路由策略: KNN/SVM/MLP/MF/Elo/Graph/Bandit/Agentic)
- 掘金 Continue.dev 被 Cursor 收购分析 (2026-06)
- 腾讯云 LLM Fallback 容错方案 (生产级 99.995% 可用率)
- OpenAI GPT-5 system card 关于 internal router 的披露
- Cursor Auto/Composer 用户评价 (透明性是最大槽点)

源 search 输出: `/Users/fangchen/.local/share/opencode/tool-output/tool_f515e194d001pgI1SD63CEOvyq` 等
