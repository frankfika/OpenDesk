# 深度调研：AI Router / 多模型调度 / 订阅桥接 (2026-07-11)

> 上一版 `ai-router-wish-2026-07-11.md` 没 get 到"**订阅**"这个核心 (我跑去查 API key 了). 这版专门查 5 块:
> 1. ChatGPT Plus / Claude Pro / Cursor Pro 怎么变成 API (真实方案)
> 2. AI Router 主流项目 (活跃度 / 真实功能 / star 数)
> 3. Cursor 调度内部机制 (公开情报)
> 4. 多 Agent 编排 state-of-the-art
> 5. OpenDesk 自盘 (具体到 file:line)

---

## 1. 订阅桥接: ChatGPT Plus / Claude Pro / Cursor Pro → API

**结论先放**: 桥接有 3 条真实路径, 都不干净, 但每条都有 1k+ 活跃用户在跑.

**路径 A — 自建 OAuth 中转 (推荐 frank 看这个)**:
[Wei-Shaw/claude-relay-service](https://github.com/Wei-Shaw/claude-relay-service) (1870 commits, v1.1.303 / 2026-04-15) 实际机制:
- 用户在 `claude.ai` 走 OAuth 授权拿 code, 喂给中转服务
- 服务用 OAuth session 反代 Anthropic 官方, 暴露兼容 OpenAI / Anthropic / Gemini / Codex / **Antigravity** (Cursor 反代 Claude Opus 4.5) / **Droid CLI** (Factory AI 的代理) / **Cherry Studio** 的 7 路端点
- **多账户管理** + **自动轮换** + **账号级 503/5xx TTL 冷却** + **User-Agent 客户端限制** (识别 ClaudeCode/Gemini-CLI 拒绝浏览器绕过)
- 暴露的端点前缀: `/claude/` `/antigravity/api/` `/droid/claude/` `/gemini/` `/openai/` `/droid/openai/`
- **重要安全提示**: v1.1.248 及以下有管理员认证绕过漏洞, 必须 ≥ v1.1.249. 新版项目已迁到 [CRS 2.0 (sub2api)](https://github.com/Wei-Shaw/sub2api)

**路径 B — 桌面 GUI 切 provider**:
- [farion1231/cc-switch](https://github.com/farion1231/cc-switch) **50K stars / 130 万下载 / 11MB / Tauri 2 + Rust** — **几乎是 frank wish 的完整实现**: 7 款 CLI 工具统一配置 (Claude Code / Codex / Gemini CLI / OpenCode / OpenClaw / Claude Desktop / Hermes Agent), 50+ 厂商预设, **本地代理 + 故障转移 + Claude Code 热切换 + 用量追踪 + WebDAV 同步 + MCP/Skills 统一管理**
- [musistudio/claude-code-router](https://github.com/musistudio/claude-code-router) **510 commits, 2026 已演化为 Claude Code Router Desktop (CCR)** — 跨 CLI 工具的统一调度控制台, SQLite 配置 + Desktop UI, 监听 `localhost:8080` 本地网关, Proxy mode 抓 API 流量, Fusion models (base + vision/web search/MCP 合成)
- [QAA-Tools/ccproxy](https://github.com/QAA-Tools/ccproxy) 30 commits, 轻量 Claude API 反向代理, **还提供 `ccp2ccr.py` `ccp2ccswitch.py` `ccp2cliproxy.py` 转换工具** — 生态互通是趋势

**路径 C — 灰色产业 (Cursor Pro 试用续杯)**:
- [go-cursor-help](https://github.com/yuaotian/go-cursor-help) 通过修改 `telemetry.machineId / macMachineId / devDeviceId / sqmId` 重置 Cursor 14 天试用
- cursor-free-vip 自动注册 + 重置机器 ID 升 Pro
- **真实证据**: 截至 2025-12 这种"Cursor 续杯"已经产业化, 闲鱼淘宝 7 元起, **说明 Cursor 订阅限制确实紧, 用户绕过意愿极强**

**Cursor 自己怎么反制**: 2026-01 Cursor 推出 **动态上下文发现 (Dynamic Context Discovery)** (InfoQ 报道, A/B test 47% token 节约) — 但**没有**降订阅门槛. 实际是把 token 用量压下来, 缓解"无限慢速"带来的成本压力. 同时 2025-09 漏洞 [Oasis Security CVE](https://new.qq.com/rain/a/20250911A02F2A00): Cursor 默认关闭 workspace trust, `.vscode/tasks.json` 自动执行, "**易用性压倒安全**" — frank 做产品时要看这个反面教材.

---

## 2. AI Router 主流项目 (star / 真实功能)

| 项目 | 规模 | 核心机制 | frank 用得上吗 |
|---|---|---|---|
| [OpenRouter](https://openrouter.ai) | 400+ 模型, 商业化 | 一个 key 调所有, 智能路由 (最便宜/最快), 故障转移, 提示词缓存. **市场份额数据**: Qwen 3 Coder 编程细分 20.5%, Hy3 preview 4-29 总榜第一. | API 类订阅, frank 直接当 preset 加进 `src/shared/providers.ts` |
| [Portkey](https://portkey.ai) | 商业化 gateway | provider 聚合 + 缓存 + fallbacks + observability | 同上 |
| [Unify AI](https://unify.ai) | $1/credit, 商业化 | **神经网络预测模型质量** + 成本/速度/质量权衡 | API 类订阅, 上游是 OpenRouter-like |
| [Martian](https://martian.llms) | 商业化 | 模型路由 | 同上 |
| [Not Diamond](https://notdiamond.ai) | 28 integrations | AI gateway | 同上 |
| [lm-sys/RouteLLM](https://github.com/lm-sys/RouteLLM) | 175 commits, 学术 | 4 router 策略 (mf / sw_ranking / bert / causal_llm), MT Bench 85% 成本节约 + 95% GPT-4 质量, 强-弱模型二元对 | OpenDesk 可以直接 fork router 算法 |
| [ulab-uiuc/LLMRouter](https://github.com/ulab-uiuc/LLMRouter) | 1K+ stars, 1k commits/月增, 2025-12 发布 | 16+ 路由策略, Route + Training 解耦, 11 benchmark, plugin system, Gradio 交互 | OpenDesk 路由策略层可以参考它的 plugin 抽象 |
| [LiteLLM](https://github.com/BerriAI/litellm) | 28K+ stars | 100+ provider 统一接口, **事实标准** | 已经被 OpenRouter/CC-Switch 全用它, OpenDesk 没接 |
| [continuedev/continue](https://github.com/continuedev/continue) | **34.8K stars, 21,566 commits, 2.0.0 (2026-06-19) — 已 read-only** | 模型 provider + context provider + slash commands + agent. **被 Cursor 收购, 仓库不再维护**. 注释自述 "pioneering open-source coding agent" | **可读源码不参与维护** — frank 想抄调度算法直接读 `core/` 21k commits, 不用 fork |

**学术 vs 工程的真实差距**: 学术派 (RouteLLM / LLMRouter) 演示在 MT Bench / MMLU / GSM8K 上, 实际产品 (CC-Switch / CCR / ccproxy) 全部用 LiteLLM 套壳做. **OpenDesk 想要 router 别自己造轮子, 直接 import LiteLLM 是合理路径**.

---

## 3. Cursor 调度真实实现 (公开情报)

Cursor 是闭源产品, 内部不公开, 但 v1.2 更新日志 + InfoQ + 阿里妹 30 分钟实操 + 用户博客加在一起能拼出轮廓:

| 模块 | 行为 |
|---|---|
| **Agent To-Do 列表** (v1.2) | 复杂指令自动生成分步骤任务清单, 进度可视化. **这就是 frank 想要的"规划/执行/搜索/审核拆分"** |
| **Queued Messages** (v1.2) | 用户连续输入, 自动排队顺序执行 — **多任务串行调度** |
| **Memory GA** (v1.2) | 记住项目上下文/函数语义/历史交流, 持续优化 |
| **Git 冲突自动解决** (v1.2) | merge 时按按钮让 Agent 解决 |
| **语义搜索增强** (v1.2) | 新模型提升代码搜索 |
| **动态上下文发现** (2026-01, InfoQ) | 5 种技术省 47% token: ① 大规模输出写文件 ② 完整历史存文件 ③ 领域能力文件 + 语义搜索 ④ **MCP 工具按需动态加载** (不用时只传名称) ⑤ 终端输出同步到文件系统 |
| **三区** | 老版 CHAT (自然语言) / COMPOSER (生成可执行代码, 接收/拒绝) / BUG FINDER (贴报错自动诊断) |
| **上下文机制** | `@Files` `@Folders` `@Code` `@Docs` `@Git` `@Web` `@Codebase` `@Recommended` `@LibraryName` — **9 种粒度** |
| **Rules** | Project Rules (项目级) / User Rules (用户级) / `.cursorrules` (已弃用) — 三层规则叠加 |
| **Tab** | 智能补全, 多行编辑, "tab boy" — 比 Copilot 强 2 倍 |
| **MCP + Cursor** | 官方推 MCP, 接入各类平台生成基础设施 |
| **Composer 拒 API key** | 错误信息 "Composer relies on custom models that cannot be billed to an API key" — **Cursor 内部用自家训练模型, 不允许走 API key, 强行推订阅** |

**Cursor 调度的本质**: 1 个 routing layer (model 选 GPT-4o / Claude Opus / Cursor 自家模型) + 1 个 context layer (Rules + @ 引用 + MCP) + 1 个 tool layer (Composer / BUG FINDER / Tab) + 1 个 orchestration layer (Agent To-Do + Queued Messages + Memory). **4 层, 跟我们做 OpenDesk 想的 4 层 (router/context/tool/orchestration) 一样**. 不同的是 Cursor 走闭源 + 自家模型 + 订阅; frank 走开源 + 多订阅 + 透明.

---

## 4. 多 Agent 编排 state-of-the-art (2025-2026)

| 框架 | 范式 | 强项 | 弱项 | OpenDesk 评估 |
|---|---|---|---|---|
| **LangGraph** | 图节点 + 边 + 强状态 | 复杂决策链, 状态持久化, 断点续跑, 人工审批 | 学习曲线陡 | OpenDesk 现在是扁平 N-agent 并行 (`src/main/orchestration/ensemble.ts:165-268`), **想升级到 plan-execute-verify 层级化就要走图** |
| **AutoGen** (微软) | 对话 + 角色消息传递 | 多 Agent 协作灵活, 人机介入 | 状态管理弱 | OpenDesk 不需要这么灵活, 太重 |
| **CrewAI** | 角色 + 任务 + 工具 + 团队 | 上手快, 目标驱动, 业务级抽象 | 灵活性中 | OpenDesk 的 5 个 role (generalist/coder/reviewer/researcher/writer, `src/shared/agent-roles.ts:10-20`) 已经是这个雏形 |
| **OpenAI Swarm** | 极简 handoff | 新手友好 | 仅支持 OpenAI API | 太窄 |
| **MetaGPT** | 软件工程多角色 | 写软件 | 不通用 | 跟 OpenDesk coder role 重 |
| **Magentic-One** | 预配置多 agent | 不用配 | 黑盒 | 不适合 frank |
| **OpenCode (CLI)** | 本地 first AI 编码 CLI | 跨 provider | 还在早期 | frank 可用 |
| **Continue CLI** | Continue 团队出 | LSP 集成 | 仓库 read-only | 不建议 fork |

**多 agent 编排的真正成本**: 实测 (CSDN 2025-11) "生成促销方案并评估效果" 任务, AutoGen 23.5s / LangGraph 18.2s / CrewAI 27.6s — **LangGraph 性能最好, 但学习曲线最陡**. OpenDesk 现在的 ensemble 走 `Promise.allSettled` 并发 + 1 个 arbitrator, 性能 18s 级别应该能做到, 但**没有 plan-execute-verify 的层级化**, 复杂任务 (frank wish 的"规划/执行/搜索/审核") 拿不到.

---

## 5. OpenDesk 自盘 (file:line 级别的真材实料)

**LLM Provider**:
- `src/shared/providers.ts:15-122` 硬编码 **13 preset** (openai/anthropic/gemini/deepseek/ollama/groq/grok/mistral/doubao/kimi/glm/qwen/openrouter/bitai/custom), 字段 `{id, type, name, baseUrl, model, color}`
- `src/main/providers/` 实际只有 2 个 class: `OpenAIProvider` (包揽 openai/openai-compatible/ollama, `openai.ts:5`) + `AnthropicProvider` (`anthropic.ts:17`)
- `src/main/providers/builder.ts:7-19` `buildProvider()` 分流, **google/generic 是 null 占位** (没实现)
- `src/main/providers/health-checker.ts:13-58` 每 5 分钟探活 (`chat.completions.create({max_tokens:1})` ping, 5s timeout), in-memory `healthRecords` map
- `src/main/persistence.ts:18-20,61-76` API key 用 `electron.safeStorage` 加密存 `userData/keys.bin`, **renderer 永远拿不到明文** (preload 注释: `// NOTE: getApiKey removed to prevent API key exfiltration from renderer`)
- **零** 路由策略 / **零** subscription/tier/quota 概念 (grep `subscription|tier|quota` 全 src/ 零匹配)

**Orchestration**:
- `src/main/ipc/chat.ts:307-313` `chat:send` dispatcher: 1 provider 走 `doChatStream`, N provider 走 `doEnsembleChat`
- `src/main/orchestration/ensemble.ts:77-392` 主循环, 5 iterations, `Promise.allSettled` 并发跑所有 agent, tool call 按 `name::JSON.stringify(args)` 去重共享 (`tool-coordinator.ts:26-58`)
- `src/main/orchestration/arbitrator.ts:53-131` 1 个 judge provider, prompt 抓 `ANALYSIS/CONFIDENCE/FINAL_ANSWER` 三段, 失败回退"最长答案"
- `src/main/orchestration/run-tracker.ts` in-memory `Map<runId, ...>`, **不持久化, 进程死就丢**
- **不是 plan-execute-verify 层级化**, 是扁平 N-agent 并行 + 1 judge. role prompt 只在 system prompt 注入 (`src/shared/agent-roles.ts:3-32` 定义 generalist/coder/reviewer/researcher/writer 5 个 role)
- `runId/agentId/providerId/model` 元数据齐全 (`src/shared/types.ts:317-339`), 通过 `chat:agent:*` 13 路 event 推给 renderer

**第二 LLM 通道**:
- `src/main/ipc/analysis.ts:24,49` `analysis:run` 单次非流式调用, system prompt 硬编码 trading-analyst voice, 45s timeout. **router 也要覆盖这条**

**Cost / Token**:
- `src/renderer/src/store/chat.ts:540-541` cost 硬编码 `(inputTokens * 3 + outputTokens * 15) / 1_000_000` (**与实际 provider/model 无关, 全按 $3/M input + $15/M output**)
- token 估算在 `ensemble.ts:283-285` 用 `Math.ceil(content.length / 4)` 粗估

**Memory**:
- 3 个 markdown 文件 in `userData/memory/`: `USER.md` / `IDENTITY.md` / `SOUL.md`
- 注入: `src/main/ipc/chat.ts:86-99` 每次 `chat:send` 把 3 段 memory 前 2000 字符拼进 system prompt
- 提取: `src/main/memory/extractor.ts:5-122` **纯正则** (英中双语), 4 类 patterns, **不是 LLM 调用**

**RAG**:
- v1 (`src/main/rag/`) 走 SQLite FTS5 全文检索 + BM25-like scoring, **没有 embedding**, workspaceId 过滤是空操作 (`r.metadata.filePath.startsWith(workspaceId) || true`)
- v2 (`src/main/rag/v2/`) 走向量召回 + FTS5 reciprocal-rank fusion, **IPC 没暴露给 renderer** (`src/main/ipc/rag.ts:22-49` 注册了 `rag:hybridSearch` / `rag:indexAndSearch` handler, `preload/index.ts` 缺)
- `better-sqlite3` 没装时走 in-memory fallback

**Skills / Marketplace / Scheduler**:
- Skills: 5 个 source 目录按 priority 合并 (global 100 > workspace 95 > builtin 90 > codex 50 > claude 40), 34 个内置 skill, level 1/2/3 分级加载
- Marketplace: `registry.ts:30-122` 硬编码 8 个 curated entry, 远程源 URL 写但**没 fetch 实现**
- Scheduler: `node-cron`, 持久化 `userData/scheduler/tasks.json`, **不自己跑 LLM**, 触发后推 `scheduler:taskRunning` 给 renderer 调 `chat:send`

**Web3**:
- `src/renderer/src/App.tsx:13-22` 仍渲染 `AppShell`, **Web3Shell 没切 root**, 只在 ViewRail 切到 `web3` view
- 13 个 store (`src/renderer/src/store/`), 最大的 `settings.ts` (312L) 和 `chat.ts` (717L)
- `chat` IPC 是 chat 流唯一入口, 13 路 event 订阅

**启动时自动发现**:
- `src/main/index.ts:84-142` `autoDetectOllama()` 启动时探 `localhost:11434/v1/models`, 有就自动注册 `ollama-auto-${ts}` provider, 并设为 `activeProviderId`

---

## 6. 给你的 3 个 yes/no (重新切, 比上一版更具体)

上一版我估"6-8 周"是空话. 这版**先告诉 frank 别人已经做到哪, 再让你拍**:
- **CC-Switch = 90% 你的 wish** (50K stars, Tauri 2, 11MB, 开源, 7 CLI, 50 preset, 热切换). frank 如果只想要"调度控制台"不想要"agent 编排", 装 CC-Switch 就完事, OpenDesk 不需要做这块.
- **claude-relay-service = 你的"订阅接进来"核心问题的现成答案** (Wei-Shaw 维护, OAuth 反代 7 端点). frank 可以 fork 当 OpenDesk 后端.
- **CC Router Desktop = 跨 CLI 桌面控制台** (CCR 510 commits, Tauri 风格, SQLite 配置). frank 可以 fork.

**重新切 MVP**:

| 选项 | 周数 | 范围 | frank 的活 |
|---|---|---|---|
| **A. 不做** | 0 | 装 CC-Switch + claude-relay-service + LiteLLM, 推 frank 团队用 | 0 (装别人软件) |
| **B. 极窄** | 1.5-2 | OpenDesk 内接 **LiteLLM** 替代自有 `OpenAIProvider/AnthropicProvider`, 加 **OpenRouter preset**; ensemble 接 **token-aware router** (便宜→本地 ollama, 贵→claude opus); 透明 UI: 显示实际 cost/tokens/model/rule 命中原因 | 改 `src/main/providers/builder.ts:7-19` 换 LiteLLM backend, 改 `src/renderer/src/store/chat.ts:540-541` 删硬编码, 加 router UI |
| **C. 中等** | 4 | B + **订阅桥接层** (fork claude-relay-service 的 7 端点 OAuth 反代) + **routing policy** (task-class → model, 像 Cursor 的"动态上下文") + **cost engine** (per-model 单价表, 替换硬编码 $3/$15) + **ensemble 升级 plan-execute-verify** (LangGraph 风格图, 替换 `runEnsemble` 扁平循环) | 上面 B 全部 + 新 `src/main/router/` + 新 `src/main/billing/` + 改 `src/main/orchestration/ensemble.ts:77-392` |
| **D. 宽** | 8 | C + **多 agent 角色系统** (5 role 升级为 full agent, 有 memory / tool / sub-agent) + **marketplace 加 router 规则** (用户分享 routing policy) + **Agent To-Do 跟 Cursor 对齐** | C 全部 + 大改 `src/shared/agent-roles.ts` + marketplace 升级 |

**我建议 B**. 理由 (不藏):
- A 看起来亏 frank 时间, 但实际上**如果 frank 不打算跟 Cursor 在 IDE 上对刚, A 是最务实** — frank 的主业是 IR 不是 AI 工具
- B 是**最不容易烂尾**的 — LiteLLM 一接, 100+ provider 立刻可用, OpenRouter 已经是事实标准, OpenDesk 真正差的就是这一脚
- C/D 都涉及 fork claude-relay-service / CCR 几千行代码, frank 一人维护 8 周风险高

**等你 3 个 yes/no**:
1. A / B / C / D 选哪个?
2. B 是否走 mavis-team (4 个 worker 并行调研: LiteLLM 接入 / OpenRouter preset / ensemble router 升级 / 透明 UI 改), 还是直接 PR-by-PR?
3. SPEC 还是直接开干 (上次问过你, 你没拍)?
