# OpenDesk 产品文档

> **服务个人用户的 AI 桌面助手**
> Model-agnostic · Computer-Use capable · Folder-as-workspace · BYOK · Apache 2.0

| 项目 | 内容 |
|---|---|
| 文档版本 | v0.1.0-draft |
| 最后更新 | 2026-06-11 |
| 文档类型 | 产品白皮书 + PRD（产品需求文档） |
| 状态 | 规划中（待评审） |
| 作者 | OpenDesk 产品团队 |
| 许可证 | Apache 2.0 |

---

## 目录

- [1. 文档信息](#1-文档信息)
- [2. 产品概述](#2-产品概述)
- [3. 市场背景与机会](#3-市场背景与机会)
- [4. 目标用户](#4-目标用户)
- [5. 竞品分析](#5-竞品分析)
- [6. 差异化定位](#6-差异化定位)
- [7. 核心价值主张](#7-核心价值主张)
- [8. 产品形态](#8-产品形态)
- [9. 功能规格](#9-功能规格)
- [10. UX 流程](#10-ux-流程)
- [11. 信息架构](#11-信息架构)
- [12. 数据模型](#12-数据模型)
- [13. 技术架构](#13-技术架构)
- [14. API 设计](#14-api-设计)
- [15. 安全与隐私](#15-安全与隐私)
- [16. 性能指标](#16-性能指标)
- [17. 商业模式](#17-商业模式)
- [18. 开源策略](#18-开源策略)
- [19. 路线图](#19-路线图)
- [20. 风险与缓解](#20-风险与缓解)
- [21. 验收标准](#21-验收标准)
- [22. 附录](#22-附录)

---

## 1. 文档信息

### 1.1 文档目的

本文档是 OpenDesk 的**唯一权威产品说明**，面向：

- **产品经理**：定义范围、优先级、验收标准
- **设计师**：用户流程、信息架构、交互细节
- **工程师**：技术约束、数据模型、API 契约
- **社区贡献者**：路线图、可参与方向
- **潜在用户**：评估 OpenDesk 是否满足自己的需求

### 1.2 文档维护

- 所有重大变更须更新本文档并通过评审
- 重大版本（v1.0 / v2.0 等）需整体复核
- 任何字段变更须保留修改记录

### 1.3 关联文档

- 后续将产出：架构文档、协议规范、用户手册、贡献指南

---

## 2. 产品概述

### 2.1 产品愿景（Vision）

> **OpenDesk 致力于成为个人用户桌面里那个能听、能看、能动、能接任何 AI 的私人 AI 同事。**

我们相信：

1. **AI 不应该被绑定于某一家厂商**——任何用户想用的 AI（GPT、Claude、Gemini、国产、开源）都应当无缝可用
2. **AI 不应该只活在浏览器里**——它应当能看见用户的屏幕、动用户的鼠标、敲用户的键盘，成为真正的桌面伙伴
3. **AI 不应该忘记用户的工作**——它应当以用户的文件夹为锚点，记住每一次对话的上下文
4. **AI 工具应该属于个人**——不是租来的服务，而是装在用户本机、由用户掌控的工具

### 2.2 使命（Mission）

> **让每一个个人用户的桌面，都拥有一个永远在线、永不遗忘、自由切换、永不背叛的 AI 同事。**

### 2.3 一句话定位

**"一个能帮你做事的桌面 AI 助手，模型随便换，本地也能跑，工作记得住。"**

### 2.4 核心承诺

| # | 承诺 | 量化指标 |
|---|---|---|
| 1 | **模型无关** | 支持 OpenAI、Anthropic、Google、DeepSeek、豆包、GLM、Kimi、Ollama、CSGHub Lite，以及任意 OpenAI 兼容 / Anthropic 兼容自定义端点 |
| 2 | **桌面真交互** | v1 内置屏幕捕获、鼠标/键盘输入、窗口管理；权限可控、可随时中止 |
| 3 | **文件夹即工作** | 任何文件夹一键成为 workspace；workspace 内可开 N 个 thread；所有对话完整持久化 |
| 4 | **Token / Model 动态管理** | UI 一键切换 provider / model / 更新 Token；无需重启；Token 失效智能引导 |
| 5 | **本地优先** | 集成 CSGHub Lite 本地推理引擎；断网可用；隐私数据不出端 |
| 6 | **个人优先** | 单用户、单 Agent + Subagent；BYOK（自带 API Key）；**无任何团队/订阅/企业功能** |
| 7 | **Apache 2.0 全栈开源** | Rust core + Electron 壳 + 协议规范；社区可审计、可二次开发 |

### 2.5 不是什么

为了把"个人 AI 同事"做透，我们**明确不做**：

- ❌ 团队协作（Manager/Worker 多 Agent 编排、共享 workspace、团队空间）
- ❌ 频道适配（Feishu / Slack / Matrix / 微信）
- ❌ 订阅套餐 / 速通次数 / 算力排队
- ❌ 企业版 / SSO / SCIM / 审计日志
- ❌ 云端同步个人对话（v2 可选；v1 完全本地）
- ❌ VS Code fork 路线（不做 IDE 形态；独立壳更轻）
- ❌ Marketplace 抽成 / 插件付费
- ❌ 默认绑定任何 AI 厂商

---

## 3. 市场背景与机会

### 3.1 行业趋势

2024-2026 年是 AI 编程 / AI 助理从"玩具"走向"工具"的拐点：

- **OpenAI Codex Desktop / CLI**（2025）—— 把 AI Agent 装进开发者的工作流
- **Anthropic Claude Desktop**（2025-2026）—— 通用 AI 助手 + Computer Use
- **Cursor / Windsurf / Trae**（2024-2026）—— AI IDE 三国杀
- **Microsoft Copilot、Notion AI、Linear AI** —— 把 AI 嵌入既有 SaaS
- **本地模型崛起**：Ollama、LM Studio、CSGHub Lite 让"完全本地"成为可能

### 3.2 用户痛点

以下痛点基于对目标用户群的观察与假设，待后续用户访谈验证：

| 痛点 | 现状 | 后果 |
|---|---|---|
| **模型绑定** | 想用 Claude 写代码、GPT 做研究、Gemini 翻译——被迫在 N 个 App 间切换；或者被某一家锁定 | 体验割裂 + 成本高 |
| **Token 管理混乱** | 升级、过期、配额用尽时 API 报错不友好；手动改配置文件令人痛苦 | 工作流中断 |
| **桌面操作做不了** | 现有 AI 工具只能在浏览器或 IDE 内"做"事；填表、装应用、跨工具流程做不了 | 自动化覆盖率低 |
| **工作上下文丢失** | 每次新对话从零开始；老对话搜不到；项目历史断裂 | 重复劳动 |
| **云端隐私担忧** | 敏感代码、客户数据、隐私内容上传第三方让人不安 | 不敢用 |
| **闭源不可控** | 厂商功能路线图由人决定；定制能力差；被弃用风险 | 长期不可靠 |
| **多端不同步** | 桌面、Web、手机体验差异大；同一个任务跨端割裂 | 效率低 |

### 3.3 机会窗口

我们认为存在一个清晰的窗口：

> **"个人用户需要一个能接所有 AI、能在桌面做事、能记住你工作、本地可跑、开源可控的桌面 AI 助手。"**

目前没有产品能同时满足这 5 点：
- Codex 强但绑 GPT
- Claude 桌面强但闭源 + 不可定制
- CSGClaw 强但面向团队
- CSGHub Lite 强但只做推理
- Trae 强但闭源 + 国产模型中心化
- Cursor / Windsurf 强但 IDE 形态 + 绑模型

**OpenDesk 恰好切入这个空白**。

---

## 4. 目标用户

### 4.1 用户画像（Persona）

#### Persona A：独立开发者 Alex（35%）
- **背景**：5-10 年经验的全栈工程师，做 side project
- **痛点**：在不同 AI 之间切来切去（GPT 写代码、Claude 调架构、Gemini 翻译）；写完代码还要在浏览器 / 终端 / IDE 间切
- **梦想**：一个 AI 同事，能写代码、跑命令、改文件、看屏幕截图给我反馈
- **预算**：愿意买 OpenAI/Anthropic API；不想被订阅绑定
- **技术能力**：高；能在本地跑 Docker / Ollama

#### Persona B：知识工作者 Beth（25%）
- **背景**：产品经理 / 咨询顾问 / 研究员
- **痛点**：大量工作跨应用（写 PRD、查资料、整理文档、做图）；现有 AI 工具都是聊天框，产出的内容要复制粘贴
- **梦想**：一个能直接操作桌面应用、生成可视化结果的 AI
- **预算**：偏向按量付费
- **技术能力**：中；不想折腾命令行

#### Persona C：创业者 Chris（15%）
- **背景**：0-1 阶段创始人 / 独立开发者
- **痛点**：要快、要省、要灵活；预算敏感；要兼顾多个 AI 才能做出高质量产品
- **梦想**：一个工具搞定所有事——从需求到原型到代码到文档
- **预算**：精打细算
- **技术能力**：中-高

#### Persona D：隐私敏感用户 Dana（10%）
- **背景**：金融 / 法律 / 医疗 / 政府的个人用户
- **痛点**：客户数据、合同、病历等不能上云
- **梦想**：完全本地跑 AI，零数据外泄
- **预算**：愿意为本地模型花硬件钱
- **技术能力**：中

#### Persona E：多模型爱好者 Eli（15%）
- **背景**：技术博主 / AI 重度用户 / 早期采纳者
- **痛点**：每个新模型出来都要试一遍；现有工具不支持灵活切换
- **梦想**：一个 UI 就能试遍所有模型；可视化对比结果
- **预算**：高
- **技术能力**：高

### 4.2 用户故事

> **US-1（Alex）**：作为独立开发者，我希望能"配置 OpenAI + Claude + Ollama 三个 provider，在 Chat 框一键切换"——这样我可以用 GPT-5.5 写代码、用 Claude 调架构、没网时用本地 Qwen。

> **US-2（Alex）**：作为独立开发者，我希望能"打开我 ~/projects/my-app 这个文件夹，在这个文件夹下和 AI 开 5 个不同的对话：'重构登录模块'、'添加单元测试'、'修复 bug #123'、'起 PR'、'部署到 Vercel'"——这样每次的 AI 回答都被记录，下次接着说。

> **US-3（Beth）**：作为产品经理，我希望能"让 AI 打开 Figma，截图某个设计稿，然后用画图工具标注，写到 PRD"——这样我不用自己截图、复制、写。

> **US-4（Beth）**：作为产品经理，我希望能"在桌面里开 3 个 workspace：'Q3 规划'、'客户调研'、'PRD 草稿'，每个里面有自己的对话历史"——这样工作不串。

> **US-5（Chris）**：作为创业者，我希望能"用 OpenAI 写代码，用 Claude 写融资 PPT 文案，用 DeepSeek 翻译英文材料"——同一个工作流，不同 AI 干不同的活。

> **US-6（Dana）**：作为隐私敏感用户，我希望能"完全离线跑本地模型，我的代码和客户数据永远不出本机"——CSGHub Lite 内嵌，断网也能用。

> **US-7（Eli）**：作为多模型爱好者，我希望能"同一个 prompt 在 GPT-5.5、Claude Opus 4.8、Gemini 2.5、Qwen3 上同时跑，并排对比回答"——这样我选最强的。

> **US-8（Alex）**：作为独立开发者，我希望能"AI 帮我跑 `npm install && npm test`，捕获屏幕上的报错，告诉我哪里出问题"——Computer Use 让 AI 真做事。

> **US-9（Alex）**：作为独立开发者，我希望能"AI 打开 GitHub，搜索 OpenCSG/csgclaw，clone 到本地，build 起来，跑一个 demo"——多步桌面操作。

> **US-10（Alex）**：作为独立开发者，我希望能"openai 的 API key 过期了，应用弹窗引导我更新，而不是默默报错"——智能提示。

### 4.3 非目标用户

为了保持产品焦点，以下用户**不是 v1/v2 目标**：

- ❌ 大型企业 IT 部门（需要 SSO、审计、合规）
- ❌ 跨地域协作团队（需要共享工作空间、权限管理）
- ❌ 只想"和 AI 聊聊天"的轻度用户（直接用 ChatGPT / Claude.ai 网页就够了）

---

## 5. 竞品分析

### 5.1 五个核心参照产品

| 产品 | 出品方 | 类型 | 核心定位 |
|---|---|---|---|
| **OpenAI Codex Desktop** | OpenAI | 代码编程 Agent | "One agent for everywhere you code" |
| **OpenCSGs/csgclaw** | OpenCSG | 多 Agent 协作平台 | "Your own personal AI team" |
| **OpenCSGs/csghub-lite** | OpenCSG | 本地 LLM 运行器 | Ollama 风格本地推理 |
| **Trae Desktop** | 字节跳动 | AI IDE | "Your 10x AI Coding Engineer" |
| **Claude Desktop** | Anthropic | 通用 AI 助手 | "AI Agent 操作系统" |

### 5.2 详细对比

#### 5.2.1 OpenAI Codex Desktop（https://github.com/openai/codex）

- **核心定位**：开发者用的代码编程 Agent，可在 CLI、IDE 扩展、桌面三种形态运行
- **技术栈**：96.1% Rust（codex-rs 是核心），Bazel + Cargo + Nix
- **架构亮点**：
  - **Rust core + thin UI shells**：80+ crate，core 单一被多端复用
  - **Thread → Turn → Item** 三层抽象，每个 item 有 `started → delta → completed` 生命周期
  - **JSON-RPC app-server 协议**：stdio / unix / ws 三种 transport
  - **平台原生沙箱**：macOS Seatbelt / Linux bubblewrap / Windows AppContainer
  - **AGENTS.md 机制**：项目级 system prompt 注入
  - **rollout.jsonl 持久化**：JSONL 追加 + fsync + atomic rename
  - **StateDb（SQLite）**：session 索引、cursor pagination
  - **本地 provider**：ollama、lmstudio crate
- **做得好的**：工程标准极高、沙箱严、协议清晰
- **做得不好的**：
  - 强绑定 OpenAI（Responses API 风格）；多 provider 支持浅
  - 桌面交互（Computer Use）能力弱
  - 没有"工作空间"概念（一个项目 = 一个 thread）
  - 不支持任何国产模型

#### 5.2.2 OpenCSGs/csgclaw（https://github.com/OpenCSGs/csgclaw）

- **核心定位**：多 Agent 协作平台，Manager + Workers 模式
- **技术栈**：Go 63.6% + TypeScript 20.8%
- **架构亮点**：
  - **5 层模型**：Channel → Room → Participant → Agent → Runtime → Sandbox
  - **Channel 适配器**：内置 IM / Feishu / Matrix
  - **Sandbox 后端**：BoxLite / Docker / CSGHub
  - **Runtimes**：PicoClaw（默认）/ OpenClaw / Codex
  - **slash commands**：approve / reject / cancel / reassign
  - **多 Provider**：CSGHub Lite + OpenAI + Codex + Claude Code
- **做得好的**：多 Agent 编排成熟、IM 集成、多 Provider 配置
- **做得不好的**：
  - **太重**：个人用户用不到 Manager/Worker
  - 团队场景设计（团队协作 / 频道），与个人用户错位
  - 桌面交互（Computer Use）几乎没有
  - 启动较重

#### 5.2.3 OpenCSGs/csghub-lite（https://github.com/OpenCSGs/csghub-lite）

- **核心定位**：Ollama 风格的本地 LLM 运行器
- **技术栈**：Go 52% + TypeScript 21.4% + Python 19.7%
- **架构亮点**：
  - **llama.cpp + GGUF** 后端，支持 SafeTensors 自动转换
  - **多模态**：视觉（llama.cpp multimodal）、Diffusers（图像生成）、ASR（Whisper/FunASR）
  - **Ollama 兼容 REST API** + **OpenAI 兼容**端点
  - **Web UI 内嵌二进制**
  - **一键启动**：`csghub-lite run <model>`
- **做得好的**：本地推理体验极佳，多模态支持全
- **做得不好的**：
  - 只做推理；没有 Agent / 对话 / 工具调用
  - 没有 GUI（只有 Web UI 和 CLI）
  - 没有工作空间 / 会话概念

#### 5.2.4 Trae Desktop（https://www.trae.cn）

- **核心定位**：字节跳动出品的 AI IDE，定位"10x AI Coding Engineer"
- **技术栈**：VS Code 1.104 fork（未开源）
- **架构亮点**：
  - **三种模式**：Chat / Builder（实时预览）/ SOLO Coder（自主 Agent）
  - **CUE 智能上下文引擎**：Smart Import / Smart Rename / 编辑预测
  - **MCP marketplace**（带 OAuth）
  - **Skills**（Global + Project）
  - **嵌套 Rules**（Personal + Project + 子目录 .traerules）
  - **Worktree 任务隔离**
  - **云端任务**（速通次数付费）
  - **多端同步**：Desktop + Web + Mobile + 远程桌面
  - **国产模型中心**：豆包/GLM/Kimi/DeepSeek + Claude/GPT
- **做得好的**：UX 极致、国产模型体验最好
- **做得不好的**：
  - **闭源**（用户无法审计 / 二次开发）
  - **IDE 形态太重**（VS Code fork 包袱大）
  - **云端任务收费**（速通次数）违反个人工具定位
  - **桌面交互弱**（主要是远程桌面控制）

#### 5.2.5 Claude Desktop（https://claude.com/download）

- **核心定位**：Anthropic 官方通用 AI 助手桌面
- **技术栈**：Electron + React + TS（闭源）
- **架构亮点**：
  - **三种模式**：Chat / Code / Cowork
  - **Projects**：系统提示 + 知识库文件 + 持久化
  - **Skills**（SKILL.md 格式，跨平台可移植）
  - **MCP**（Google Drive / Slack / GitHub / Jira / Notion 等）
  - **Computer Use**（屏幕控制，业界标杆）
  - **Artifacts**（HTML/React/Mermaid/SVG 内嵌渲染）
  - **Dispatch**（手机 → 桌面）
  - **Routines**（定时任务）
- **做得好的**：Computer Use 体验最好、Artifacts 体验最好、Skills 跨平台
- **做得不好的**：
  - **闭源**（无法定制 / 二次开发）
  - **无 BYOK**（必须订阅 Anthropic；不能用自己的 OpenAI Key）
  - **强绑定 Anthropic 模型**（不支持 GPT、Gemini、国产）
  - **跨端体验不一致**（Web / Desktop / Mobile 各自为政）

### 5.3 综合对比矩阵

| 维度 | Codex Desktop | CSGClaw | CSGHub Lite | Trae Desktop | Claude Desktop | **OpenDesk 取向** |
|---|---|---|---|---|---|---|
| 开源 | ✅ Apache 2.0 | ✅ Apache 2.0 | ✅ Apache 2.0 | ❌ 闭源 | ❌ 闭源 | ✅ **Apache 2.0** |
| 桌面形态 | CLI + IDE 扩展 + 桌面 | Web + 桌面 | Web + CLI | VS Code fork | Electron | **Electron（独立壳）** |
| 多模型 | 🟡 浅（仅 ollama/lmstudio） | ✅ 多 provider | ❌ 只做推理 | ✅ 国产 + 国外 | ❌ 只 Anthropic | ✅ **任意 OpenAI/Anthropic 兼容 + 本地** |
| 桌面交互 | 🟡 弱 | ❌ 无 | ❌ 无 | 🟡 远程桌面 | ✅ **Computer Use** | ✅ **Computer Use v1 核心** |
| 工作空间 | ❌ 单 thread | ✅ Team/Room | ❌ 无 | ✅ Project | ✅ Projects | ✅ **文件夹 = workspace** |
| 多会话持久化 | ✅ rollout | ✅ teams | ❌ 无 | ✅ | ✅ Project 内 | ✅ **workspace 内多 thread 全持久化** |
| Token 动态管理 | 🟡 codex doctor | ✅ | 🟡 | ✅ | ❌ 无 BYOK | ✅ **UI 完整 CRUD** |
| AGENTS.md | ✅ | ❌ | ❌ | 🟡 .traerules | ❌ | ✅ **v1 内置 + 向后兼容** |
| MCP | 🟡 新支持 | ❌ | ❌ | ✅ marketplace | ✅ | ⏳ v2 引入 |
| Skills | ✅ | ✅ | ❌ | ✅ 闭源 | ✅ SKILL.md | ⏳ v2 引入 |
| Artifacts | ❌ | ❌ | ❌ | 🟡 弱 | ✅ 内嵌渲染 | ⏳ v2 引入 |
| 本地模型 | 🟡 ollama | 🟡 通过 CSGHub | ✅ 核心 | ❌ | ❌ | ✅ **CSGHub Lite 内嵌** |
| 团队协作 | ❌ | ✅ 核心 | ❌ | ✅ 企业版 | ✅ Team | ❌ **明确不做** |
| 商业模式 | 免费 + 订阅 | 开源 | 开源 | 免费 + 速通 | 订阅 | **免费 + Apache 2.0** |

### 5.4 关键洞察

1. **Codex 的工程标准**（Rust core 拆 crate、AGENTS.md、rollout 持久化、平台沙箱）值得全学
2. **CSGClaw 的多 Provider 协作思路**值得借鉴，但**个人版本要简化为单 Agent + Subagent**
3. **CSGHub Lite 的本地推理**是基础设施，必须深度集成
4. **Trae 的国产模型 + UX**值得学，但**不要闭源 + 不要 IDE fork + 不要云任务收费**
5. **Claude 的 Computer Use + Artifacts + Skills + Projects**值得学，但**要开源 + 要多模型 + 不要绑 Anthropic**

---

## 6. 差异化定位

### 6.1 核心差异化（10 点）

| # | 差异化 | 对标 |
|---|---|---|
| 1 | **桌面真交互**：v1 内置 Computer Use，看屏幕、动鼠标、敲键盘 | vs Codex 仅 shell 工具 |
| 2 | **真·任意 AI**：任何 OpenAI / Anthropic 兼容端点都接 | vs Trae 内置模型中心、Codex 绑 GPT |
| 3 | **本地优先**：CSGHub Lite 进程内嵌，零步骤启动 | vs Claude 闭源云、Codex 强绑 OpenAI |
| 4 | **个人优先**：单 Agent + Subagent，无团队功能 | vs CSGClaw 团队 Manager/Worker、Trae 速通订阅 |
| 5 | **Apache 2.0 全栈开源** | vs Trae / Claude 闭源 |
| 6 | **Rust core 跨平台一致** | vs Claude 单端、Trae 闭源 |
| 7 | **AGENTS.md + Codex 风格工程标准** | vs Trae 闭源 .traerules |
| 8 | **平台原生沙箱** | vs Trae 三种模式、CSGClaw BoxLite |
| 9 | **CSGHub Lite 深度集成** | vs Codex 浅 Ollama 支持 |
| 10 | **渐进式 v1 → v4**：30 天能跑，半年完整 | vs Claude 全功能压上、Trae 速通商业化 |

### 6.2 定位宣言

> **"OpenDesk 是个人用户的桌面 AI 工作台。它能接任何 AI，能在桌面上做事，能记住你每个文件夹的工作，且完全开源、本地可跑。"**

---

## 7. 核心价值主张

### 7.1 价值主张画布

| 维度 | 内容 |
|---|---|
| **目标用户** | 个人开发者、知识工作者、创业者、隐私敏感用户、多模型爱好者 |
| **痛点** | 模型绑定、Token 混乱、桌面做不了事、上下文丢失、隐私担忧、闭源不可控 |
| **产品** | OpenDesk —— 桌面 AI 助手 |
| **关键能力** | 多模型路由、桌面交互、文件夹工作区、Token 动态管理、本地优先、Apache 2.0 |
| **收益** | 自由切换 AI 厂商 + 真做事 + 永久记忆 + 隐私可控 + 长期可靠 |
| **差异化** | 全栈开源 + 多模型 + Computer Use + 文件夹工作区 |
| **证明** | 30 天交付可用 v1；Apache 2.0 协议；GitHub 公开开发 |

### 7.2 价值主张陈述（Value Proposition Statement）

> **对** 个人开发者、知识工作者、创业者、隐私敏感用户
> **OpenDesk 是** 一个桌面 AI 助手
> **它能** 接任何 AI 的 API、能在桌面上做事、能以文件夹为锚点记住你所有工作
> **不同于** Codex（绑 GPT）、Claude 桌面（闭源、绑 Anthropic）、CSGClaw（团队）、Trae（闭源、IDE fork）
> **它** 全栈 Apache 2.0 开源、本地可跑、个人优先

---

## 8. 产品形态

### 8.1 平台支持

| 平台 | v1 | v1.1 | v2 |
|---|---|---|---|
| macOS（Apple Silicon） | ✅ | ✅ | ✅ |
| macOS（Intel） | ✅ | ✅ | ✅ |
| Windows 10/11 | 🟡 实验 | ✅ | ✅ |
| Linux（Ubuntu/Debian） | 🟡 实验 | ✅ | ✅ |
| Linux（其他） | 🟡 社区 | 🟡 社区 | 🟡 社区 |

### 8.2 形态选择

- **Electron 桌面应用**（主形态）
- **Web 端**（v2 引入，共享 Rust core）
- **CLI 入口**（v1.2 引入，便于脚本化和 CI）
- **移动端**（v3 远期）

**为什么不选 Tauri / VS Code fork / Swift 原生？**

- Tauri：包体小但生态不如 Electron；shadcn/ui 完整支持 Electron
- VS Code fork（Trae 路线）：太重；偏离"个人 AI 同事"的轻量定位
- Swift 原生：放弃 Windows / Linux

### 8.3 应用入口

- **主窗口**：默认 1200×800 启动，可缩放、可全屏
- **系统托盘**：常驻；右键菜单（设置、退出、紧急停止）
- **全局快捷键**：
  - `⌘⇧Space` / `Ctrl+Shift+Space`：呼出主窗口
  - `⌘.` / `Ctrl+.`：紧急停止所有 AI 操作
  - `⌘K` / `Ctrl+K`：聚焦输入框
- **首次启动引导**：3 步完成首次对话（选 workspace → 配 provider → 开聊）

### 8.4 关键交互原则

1. **键盘优先**：所有操作可键盘完成
2. **可中断**：任何 AI 操作可随时取消（紧急停止按钮始终可见）
3. **可重试**：任何失败操作可一键重试
4. **可恢复**：崩溃后从最后 checkpoint 恢复对话
5. **零配置可用**：内置 1 个示例 provider，首次启动可立刻试

---

## 9. 功能规格

### 9.1 P0 —— v1 必须

按用户硬指标重要性排序：

#### P0-A. 文件夹即工作记录（**用户硬指标 #1**）

- **F-A-1** 侧边栏顶部 "+ Open Folder" 按钮，选择文件夹后自动注册为 workspace
- **F-A-2** 同一文件夹被打开后只注册一次；二次打开直接定位
- **F-A-3** 侧边栏按 workspace 分组，每个 workspace 下显示其 threads（按时间倒序）
- **F-A-4** 单击 thread → 右侧加载完整历史对话，可继续、可分叉、可重命名
- **F-A-5** "New Thread" 按钮在当前 workspace 下创建新会话
- **F-A-6** 所有 thread 持久化到 `{folder}/.opendesk/threads/<id>/rollout.jsonl`
- **F-A-7** 重启应用后所有 workspace 和 thread 自动恢复
- **F-A-8** 文件夹被移动/重命名后能重新关联（uuid + 路径双向记录）
- **F-A-9** 文件夹被删除时 workspace 进入 "Missing" 状态（可恢复或清理）
- **F-A-10** "Recent Workspaces" 列表（启动时显示最近 5 个）

#### P0-B. API Token & 多模型动态管理（**用户硬指标 #2**）

- **F-B-1** 顶部下拉栏：左侧 Provider 选择，右侧 Model 选择
- **F-B-2** Provider / Model 切换无需重启应用
- **F-B-3** 设置页 "Providers & Models" 标签：完整 CRUD UI
- **F-B-4** "Add Provider" 向导：选类型 → 填 baseURL → 填 API Key → 测连接 → 选默认模型
- **F-B-5** "Edit Token"：点击任意 provider 直接更新 API Key（不用删了再加）
- **F-B-6** "Test Connection"：每行一个测试按钮
- **F-B-7** "Delete Provider"：二次确认
- **F-B-8** "Export / Import Config"：分享配置（不含 API Key）
- **F-B-9** Token 失效（401/403）时弹窗引导更新
- **F-B-10** Token 配额耗尽时引导切换其他 provider
- **F-B-11** 所有 API Key 走 OS keyring（macOS Keychain / Windows Credential Manager / Linux Secret Service）

#### P0-C. 桌面真交互（**用户硬指标 #3**）

- **F-C-1** 屏幕捕获：全屏 / 指定窗口 / 指定区域；多屏支持
- **F-C-2** 鼠标输入：移动 / 单击 / 双击 / 右键 / 拖拽 / 滚轮
- **F-C-3** 键盘输入：单键 / 组合键 / 文本输入（支持中文 IME）
- **F-C-4** 窗口管理：列出所有可见窗口（标题、应用、坐标、尺寸）、激活窗口、关闭窗口
- **F-C-5** 安全护栏：白名单应用、黑名单危险动作、用户随时中止
- **F-C-6** 紧急停止：全局热键 `⌘.` / `Ctrl+.`，UI 按钮始终可见
- **F-C-7** 桌面交互权限请求：首次启用时清晰引导用户授权（macOS Accessibility / Windows UIA / Linux AT-SPI）
- **F-C-8** 平台原生沙箱保护所有 shell / 文件操作

#### P0-D. Agent Loop + 工具

- **F-D-1** Thread → Turn → Item 三层状态机
- **F-D-2** 基础工具集：shell / file_read / file_write / apply_patch / web_search
- **F-D-3** 流式输出（首字 < 2s P95）
- **F-D-4** 流中断 / 续传
- **F-D-5** 审批策略：read 类不审批，write/shell/desktop 类可配置（每次/危险时/永不）
- **F-D-6** rollout.jsonl 持久化（Codex 同款）
- **F-D-7** SQLite 索引

#### P0-E. 多 AI 路由

- **F-E-1** Provider trait 抽象
- **F-E-2** 7 个内置 provider 适配器：openai / anthropic / google / ollama / csghub_lite / generic_openai_compat / generic_anthropic_compat
- **F-E-3** 健康检查 + fallback 链
- **F-E-4** 运行时热切换

#### P0-F. 本地模型兜底

- **F-F-1** CSGHub Lite 进程内嵌（默认模式）
- **F-F-2** 启动时检查 + 自动 spawn + 健康检查
- **F-F-3** 网络断开时自动 fallback 到本地
- **F-F-4** 用户可选"独立进程"模式（OpenDesk 不 spawn，只调已启动的 csghub-lite）

#### P0-G. AGENTS.md

- **F-G-1** 从 cwd 向上逐级加载 AGENTS.md
- **F-G-2** 合并为单一 system prompt
- **F-G-3** UI 显示"已加载 N 个 AGENTS.md"
- **F-G-4** 向后兼容：识别 `.cursorrules` / `.traerules` / `.opendesk/AGENTS.md`
- **F-G-5** Token 预算提示（>10K 警告）

### 9.2 P1 —— v1 内置轻量

- **F-1-1** 启动引导（首次 3 步完成对话）
- **F-1-2** "Recent Workspaces" 启动时列表
- **F-1-3** 系统托盘 + 全局快捷键
- **F-1-4** macOS Dock / Windows JumpList
- **F-1-5** 自动更新（electron-updater）
- **F-1-6** `opendesk doctor` 一键诊断（Codex doctor 风格）
- **F-1-7** Provider 配置导入/导出
- **F-1-8** 跨 workspace 搜索历史 thread

### 9.3 P2 —— v1 之前明确不做

- ❌ Manager/Worker 多 Agent 编排
- ❌ Feishu/Matrix/微信频道适配
- ❌ Team room / 审批流
- ❌ 企业版 / 订阅 / SSO / SCIM
- ❌ 云端任务排队（速通模式）
- ❌ VS Code fork / IDE 形态
- ❌ 闭源 / 厂商锁定

### 9.4 P3 —— v2 再做（按优先级）

- **F-3-1** MCP 客户端 + Marketplace
- **F-3-2** Skills 系统（SKILL.md 格式，跨平台可移植）
- **F-3-3** Artifacts 渲染（HTML/React/Mermaid/SVG/Code）
- **F-3-4** Plan Mode（先规划后执行）
- **F-3-5** Worktree 任务隔离（Git）
- **F-3-6** Memories / Chronicle 长期记忆
- **F-3-7** 嵌入式 RAG（CSGHub Lite BGE 嵌入）
- **F-3-8** Subagent（Codex 模式，单 Agent + 短命 Subagent）
- **F-3-9** CLI 入口
- **F-3-10** VS Code 扩展（通过 app-server 协议桥接）
- **F-3-11** Web 端（共享 Rust core）
- **F-3-12** 跨设备同步（workspace 元信息）

### 9.5 P4 —— v3 远期

- ⏳ Mobile 端（iOS / Android）
- ⏳ 多模态实时（语音 / 视频）
- ⏳ 智能硬件联动
- ⏳ Marketplace 生态（官方认证 / 社区贡献）

---

## 10. UX 流程

### 10.1 首次启动

```
启动应用
  ↓
[引导第 1 步] 欢迎页：OpenDesk 介绍 + 一键进入
  ↓
[引导第 2 步] 选择/创建第一个 workspace（默认：用户主目录）
  ↓
[引导第 3 步] 配置第一个 provider（默认预填 OpenAI / Anthropic / Ollama）
  ↓
[引导第 4 步] 可选：测试连接 + 选默认模型
  ↓
进入主界面：侧边栏 workspace 列表 + Chat 框 + 顶部下拉
  ↓
输入"你好" → 看到 AI 回复
```

### 10.2 打开新 Workspace

```
侧边栏顶部 "+ Open Folder" 按钮
  ↓
弹原生文件夹选择器
  ↓
选中文件夹 → 自动注册为 workspace
  ↓
侧边栏展开新 workspace → 出现 "New Thread" 按钮
  ↓
点击 "New Thread" → 右侧 Chat 框空 + 输入框聚焦
  ↓
输入消息 → 看到 AI 回复
```

### 10.3 配置新 Provider

```
打开设置 → "Providers & Models" 标签
  ↓
点击 "Add Provider" 按钮
  ↓
向导第 1 步：选类型（OpenAI 兼容 / Anthropic 兼容 / Google / Ollama / CSGHub Lite / 自定义）
  ↓
向导第 2 步：填 baseURL（预填常见厂商）
  ↓
向导第 3 步：填 API Key（自动入 OS keyring，显示"已保存"掩码）
  ↓
向导第 4 步：测连接（发一个最小请求）→ ✓ / ✗ + 错误信息
  ↓
向导第 5 步：选默认模型（自动拉取该 provider 的模型列表）
  ↓
完成 → 新 provider 出现在顶部下拉栏
```

### 10.4 切换 Provider/Model

```
顶部下拉栏左侧：点击 → 列出所有 provider → 选 → 切
  或
顶部下拉栏右侧：点击 → 列出当前 provider 的模型 → 选 → 切
  ↓
零延迟生效（Zustand store + 异步预热）
  ↓
下次 AI 消息自动用新选择
```

### 10.5 桌面交互流程

```
AI 需要做桌面操作（用户说"打开 Chrome 搜索 OpenCSG"）
  ↓
AI 工具调用：desktop_capture → 截屏 → 把图发给 AI
  ↓
AI 决策：点 Chrome 图标 → 工具调用 desktop_click(x, y)
  ↓
[权限检查] 该操作是否在白名单？
  ├─ 在 → 执行
  └─ 不在 → 弹窗让用户确认
  ↓
执行 → 截图反馈给 AI
  ↓
AI 继续：点搜索框 → desktop_type("OpenCSG") → desktop_press_key("Return")
  ↓
完成 → AI 返回文字描述
```

### 10.6 Token 失效处理

```
AI 请求返回 401/403
  ↓
弹窗："您的 {provider} API Key 已失效，请更新"
  ↓
两个按钮：
  - [立即更新] → 跳转到设置页该 provider 的 Edit Token
  - [切换其他 provider] → 跳转到顶部下拉栏
  ↓
更新完成 / 切换完成 → 继续对话
```

### 10.7 紧急停止

```
任何时刻用户按 `⌘.` / `Ctrl+.` 或点紧急停止按钮
  ↓
所有正在运行的 AI 操作立即取消
  ↓
Tool execution 中断
  ↓
UI 状态恢复"可输入" + 显示"已中止"
  ↓
用户可继续输入或切换
```

---

## 11. 信息架构

### 11.1 主窗口布局

```
┌─────────────────────────────────────────────────────────────┐
│  [Provider▾] [Model▾]   [Workspace Title]   [🛑Stop] [⚙️]   │ ← Top Bar
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│ Workspaces│              Chat Panel                          │
│  ├─ 🏠 ~ │   ┌──────────────────────────────────────────┐  │
│  │  └ 📁  │   │ AI: 你好！我是 OpenDesk AI              │  │
│  ├─ 📁 Proj│   │                                          │  │
│  │  └ 📁  │   │ User: 帮我看看 ~/Desktop 有什么         │  │
│  ├─ 📁 ...│   │                                          │  │
│  │        │   │ Tool: desktop_capture(screenshot.png)    │  │
│  │  + New │   │ AI: 我看到桌面上有 ...                   │  │
│          │   │                                          │  │
│          │   └──────────────────────────────────────────┘  │
│          │                                                   │
│          │   [📎] [📷] [Type message...  ] [➤ Send]         │ ← Input
│          │                                                   │
├──────────┴──────────────────────────────────────────────────┤
│ Status: csghub-lite: healthy | OpenAI: healthy | 12k tok    │ ← Status
└─────────────────────────────────────────────────────────────┘
```

### 11.2 设置页结构

```
Settings
├── Providers & Models (P0)
│   ├── Provider 列表（卡片）
│   ├── Add Provider 向导
│   ├── Edit Token
│   ├── Test Connection
│   └── Export / Import
├── Workspaces (P0)
│   ├── 已注册 workspace 列表
│   ├── 打开/移除/重新关联
│   ├── Default Provider/Model per workspace
│   └── Recent Workspaces
├── Desktop & Computer Use (P0)
│   ├── 权限状态（macOS Accessibility / Windows UIA）
│   ├── 授权引导
│   ├── 白名单应用
│   ├── 黑名单动作
│   └── 紧急停止快捷键
├── General (P1)
│   ├── 主题（浅色/深色/跟随系统）
│   ├── 字体大小
│   ├── 语言（i18n）
│   └── 启动行为
├── Doctor (P1)
│   ├── 一键诊断
│   └── 历史报告
├── About
│   ├── 版本
│   ├── 更新检查
│   └── 链接（GitHub / 文档 / 反馈）
```

### 11.3 Chat 面板

- **消息流**：按时间倒序（最新在最下），自动滚动
- **消息类型**：
  - User Message（用户输入）
  - Assistant Message（AI 回复）
  - Reasoning（思考过程，Codex 风格可折叠）
  - Tool Call（工具调用，可展开看详情）
  - Tool Result（工具结果，可展开看详情）
  - Screenshot（截图缩略图，点击放大）
  - Desktop Action（桌面操作记录：点击/输入/窗口切换）
  - Error（错误信息，含"重试"按钮）
- **可执行的操作**（每条消息右键菜单）：
  - 复制
  - 重新生成（AI 消息）
  - 编辑后重新发送（用户消息）
  - 分叉（从此处开新 thread）
  - 删除

---

## 12. 数据模型

### 12.1 核心实体

```typescript
// Workspace：文件夹 = 工作记录
interface Workspace {
  id: string;                   // UUID
  folderPath: string;           // 物理文件夹绝对路径
  name: string;                 // 用户可改
  createdAt: string;            // ISO 8601
  updatedAt: string;
  description?: string;
  defaultProvider?: string;     // 该 workspace 默认 provider
  defaultModel?: string;
  tags: string[];
  status: 'active' | 'missing' | 'archived';
}

// Thread：会话，隶属于一个 workspace
interface Thread {
  id: string;                   // UUID
  workspaceId: string;          // 引用 Workspace
  title: string;
  createdAt: string;
  updatedAt: string;
  provider: string;             // 此 thread 用的 provider
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  status: 'active' | 'archived';
}

// Turn：一次用户输入触发的多轮交互
interface Turn {
  id: string;
  threadId: string;
  userMessage: string;
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'awaiting_approval';
}

// Item：原子事件
interface Item {
  id: string;
  turnId: string;
  kind: 'user_message' | 'assistant_message' | 'reasoning'
      | 'tool_call' | 'tool_result' | 'desktop_action'
      | 'screenshot' | 'error';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'awaiting_approval';
  createdAt: string;
  payload: any;                 // JSON 内容（消息文本、工具参数、截图 base64 等）
}

// Provider：AI 后端配置
interface ProviderConfig {
  name: string;                 // 用户起的名字，如 "openai-prod"
  kind: 'openai' | 'anthropic' | 'google' | 'ollama'
      | 'csghub_lite' | 'generic_openai_compat' | 'generic_anthropic_compat';
  apiKeyRef: string;            // "keyring:opendesk:openai-prod"
  baseUrl?: string;             // 可选，覆盖默认
  defaultModel: string;
  models: string[];             // 可用模型列表
  embedded?: boolean;           // 是否内嵌子进程（如 csghub-lite）
}

// Model：模型元信息
interface ModelInfo {
  id: string;
  displayName: string;
  contextWindow?: number;
  supportsVision: boolean;
  supportsTools: boolean;
}
```

### 12.2 存储位置

```
~/.opendesk/                                    # 全局
├── workspaces.sqlite                           # 全局 workspace 索引
├── providers.json                              # provider 元信息（不含 API Key）
├── state.db                                    # SQLite（user prefs、recent 等）
└── keyring:opendesk:<provider>                 # OS keyring（API Key）

{folder}/.opendesk/                             # 每个 workspace
├── workspace.json                              # workspace 元信息
├── index.sqlite                                # 该 workspace 内 threads 索引
└── threads/<thread_id>/
    ├── rollout.jsonl                           # 完整 Item 流（Codex 同款）
    ├── meta.json                               # 标题/标签/时间/token
    └── attachments/                            # 截图/文件附件
```

### 12.3 关键不变量

1. **崩溃一致性**：每次 tool result 写入即 fsync + atomic rename
2. **可恢复性**：启动时从最后一条完整 item 恢复
3. **多端一致性**：v1 不做云同步；v2 引入可选用 CRDT 同步 workspace 元信息
4. **脱敏**：API Key 永不入日志、永不入配置导出
5. **可移植**：整个 `~/.opendesk/` 可整体打包带走（除 OS keyring）

---

## 13. 技术架构

### 13.1 总体架构

```
┌──────────────────────────────────────────────────────────────┐
│                    Electron 桌面壳                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Main Process (Node.js 20+)                            │  │
│  │  - Window Manager / Tray / Auto-updater                │  │
│  │  - IPC bridge (JSON-RPC over stdio to Rust core)       │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Preload (contextIsolation: true, sandbox: true)       │  │
│  │  - contextBridge 暴露最小化 API                         │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Renderer (React 18 + TypeScript 5)                    │  │
│  │  - shadcn/ui + Radix UI + Tailwind                    │  │
│  │  - Zustand 状态管理                                    │  │
│  │  - xterm.js (v2)                                       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │  NAPI / napi-rs
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  Rust Core (opendesk-*)                      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  opendesk-core                                       │    │
│  │  - Agent Loop (Thread→Turn→Item 状态机)              │    │
│  └─────────────────────────────────────────────────────┘    │
│       │           │            │           │         │      │
│       ▼           ▼            ▼           ▼         ▼      │
│  opendesk-model  opendesk-    opendesk-    opendesk- opendesk│
│  (Router + 7     tools        sandbox      desktop  workspace│
│   providers)     (builtin +   (Seatbelt/   (Computer (folder  │
│                  dynamic)     bwrap/Win)    Use)     record)  │
│       │                                                     │
│       ▼                                                     │
│  opendesk-providers (CRUD + health)                          │
│  opendesk-keyring  (OS keyring)                              │
│  opendesk-rollout  (Codex 同款 JSONL + StateDb)              │
│  opendesk-doctor   (Codex codex doctor 同款)                 │
│  opendesk-protocol (wire types，零业务逻辑)                   │
│  opendesk-napi     (NAPI 暴露层)                             │
└──────────────────────────┬───────────────────────────────────┘
                           │
        ┌──────────────────┼────────────────────┐
        ▼                  ▼                    ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
│ CSGHub Lite  │   │ CSGClaw      │   │  任意 AI 厂商    │
│ (进程内嵌)   │   │ (HTTP 协议   │   │  (OpenAI 兼容)   │
│ :11435       │   │  消费/可选)  │   │  OpenAI/Anthropic│
│ GGUF/llama   │   │              │   │  /Google/DeepSeek│
│ .cpp 多模态  │   │              │   │  /豆包/GLM/Kimi  │
└──────────────┘   └──────────────┘   └──────────────────┘
```

### 13.2 模块划分（Rust crates）

| Crate | 职责 | v1 状态 |
|---|---|---|
| `opendesk-protocol` | JSON-RPC wire types；零业务逻辑 | 待实现 |
| `opendesk-core` | Thread→Turn→Item 状态机 | 待实现 |
| `opendesk-model` | Provider trait + 路由器 | 待实现 |
| `opendesk-providers` | Provider CRUD + 切换 + doctor | 待实现 |
| `opendesk-keyring` | OS keyring 凭据 | 待实现 |
| `opendesk-workspace` | 文件夹 = 工作记录 | 待实现 |
| `opendesk-rollout` | JSONL 持久化 + StateDb | 待实现 |
| `opendesk-napi` | NAPI 桥接 Node.js | 待实现 |

### 13.3 关键技术选型

| 维度 | 选型 | 理由 |
|---|---|---|
| 桌面壳 | Electron 28+ | 生态最熟、跨平台一致、shadcn/ui 支持完整 |
| 主进程 | Node.js 20+ | Electron 标配 |
| 核心业务 | Rust（napi-rs 桥接） | 性能、沙箱、桌面交互 native 访问 |
| 前端 | React 18 + TypeScript 5 | 生态最熟 |
| 状态 | Zustand | 与 React 19 并发模式契合 |
| UI 库 | shadcn/ui + Radix + Tailwind | 灵活、可定制 |
| 嵌入式 DB | better-sqlite3 | 同步、零依赖、快 |
| 通信 | JSON-RPC 2.0 | 标准化、stdio/uds/ws 多 transport |
| 沙箱（shell） | 平台原生 | Seatbelt / bwrap / AppContainer |
| 沙箱（桌面） | 独立 trait | macOS Acc / Windows UIA / Linux AT-SPI |
| 凭据 | OS Keyring | 行业标准 |
| 打包 | electron-builder | 跨平台 DMG/EXE/AppImage |
| 自动更新 | electron-updater | 业界成熟 |

### 13.4 学习 Codex Desktop（20 条）

**Codex 1**: Rust core 拆 crate 工程化（80+ crate）→ 完全照搬
**Codex 2**: Thread → Turn → Item 三层抽象 → 完全照搬
**Codex 3**: JSON-RPC app-server 协议（stdio / unix / ws）→ 完全照搬
**Codex 4**: apply_patch 工具 → v1 引入
**Codex 5**: 平台原生沙箱 → 完全照搬
**Codex 6**: AGENTS.md 注入 → v1 引入
**Codex 7**: Memories + Chronicle → v2
**Codex 8**: ExecPolicy 系统 → v1 简单版，v2 完整 DSL
**Codex 9**: rollout.jsonl 持久化 → 完全照搬
**Codex 10**: 模型路由抽象 → 完全照搬
**Codex 11**: 本地 provider（ollama/lmstudio）→ 完全照搬 + 深度集成 CSGHub Lite
**Codex 12**: MCP / rmcp-client → v2
**Codex 13**: Code mode（V8）→ v2
**Codex 14**: skills / plugins → v2
**Codex 15**: tools 抽象 + Responses API → v1
**Codex 16**: core-plugins / core-skills → v2
**Codex 17**: protocol 极简设计 → 完全照搬
**Codex 18**: state db + otel → state db v1，otel v1.1
**Codex 19**: ext-style traits → 完全照搬
**Codex 20**: codex doctor → v1 引入

---

## 14. API 设计

### 14.1 JSON-RPC 2.0 over stdio（v1）

主进程 ↔ Rust core 通过 stdio JSON-RPC 通信，每行一个 JSON 对象。

**请求**：
```json
{"jsonrpc":"2.0","id":1,"method":"thread/start","params":{"workspaceId":"...","message":"hello"}}
```

**响应**：
```json
{"jsonrpc":"2.0","id":1,"result":{"threadId":"...","items":[...]}}
```

**流式**（SSE-style over stdio）：
```json
{"jsonrpc":"2.0","method":"turn/delta","params":{"threadId":"...","itemId":"...","delta":"hel"}}
```

### 14.2 核心方法列表

#### Thread / Turn
- `thread/start` - 创建新 thread
- `thread/list?workspaceId=...` - 列出 threads
- `thread/get` - 获取 thread 详情
- `thread/fork` - 从某 item 分叉
- `thread/rename` - 重命名
- `thread/delete` - 删除
- `turn/start` - 发起新 turn（流式）
- `turn/cancel` - 取消进行中的 turn
- `item/patch` - 修改 item

#### Workspace
- `workspace/add` - 注册文件夹为 workspace
- `workspace/list` - 列出所有 workspaces
- `workspace/get` - 获取 workspace 详情
- `workspace/remove` - 移除（不删除文件夹）
- `workspace/relink` - 重新关联（移动/重命名后）

#### Provider / Model（v1 用户硬指标）
- `providers/list` - 列出所有 provider
- `providers/add` - 添加 provider
- `providers/update` - 更新 provider
- `providers/remove` - 删除 provider
- `providers/test` - 测连接
- `providers/set_default` - 设置默认
- `models/list` - 列出当前 provider 的模型
- `models/switch` - 切换当前模型

#### Desktop（v1 用户硬指标）
- `desktop/capture` - 截屏
- `desktop/windows` - 列窗口
- `desktop/activate` - 激活窗口
- `desktop/click` - 鼠标点击
- `desktop/type` - 键盘输入
- `desktop/key` - 按键
- `desktop/emergency_stop` - 紧急停止

#### Tools
- `tools/list` - 列出可用工具
- `tools/invoke` - 手动调用工具

#### Rules
- `rules/resolve` - 给定 cwd 返回最终合并的 rules

#### Sessions
- `sessions/list` - 列出（跨 workspace 搜索）
- `sessions/export` - 导出 thread

#### Doctor
- `doctor/run` - 跑 `opendesk doctor`

### 14.3 错误码

| Code | 含义 |
|---|---|
| -32700 | Parse error |
| -32600 | Invalid request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| -32001 | Server overloaded（Codex 同款：建议 retry with backoff） |
| -32010 | Auth failed (401/403) |
| -32011 | Quota exceeded (429) |
| -32020 | Permission denied (desktop) |
| -32030 | Sandbox escape attempted |
| -32050 | Workspace missing |
| -32051 | Thread not found |

---

## 15. 安全与隐私

### 15.1 安全原则

1. **最小权限**：任何操作都需要明确授权
2. **沙箱优先**：所有 shell / 文件操作默认走沙箱
3. **可中断**：任何 AI 操作可被随时中止
4. **可审计**：所有操作有日志（本地）
5. **零明文**：所有 API Key 走 OS keyring，永不落盘明文

### 15.2 凭据管理

- **API Key**：全部入 OS keyring
  - macOS：Keychain
  - Windows：Credential Manager
  - Linux：Secret Service / GNOME Keyring
- **Key 命名空间**：`opendesk:<provider_name>`
- **日志脱敏**：所有日志自动过滤 `api_key` / `token` / `password` 字段
- **内存清理**：进程退出时清零敏感内存（用 `zeroize` crate）

### 15.3 沙箱

#### Shell 沙箱（平台原生）

- **macOS**：`sandbox-exec` + Seatbelt profile
  - 默认 profile：deny all network, allow read to cwd, allow write to cwd
  - 用户可配置：增加白名单网络/路径
- **Linux**：`bubblewrap`（bwrap）
  - 用户命名空间隔离
  - 默认 mount namespace、pid namespace
- **Windows**：AppContainer + Job Object
  - 限制文件系统访问
  - 限制网络访问

#### 桌面交互沙箱（独立）

- **macOS**：需用户授权 Accessibility（系统弹窗）
- **Windows**：需 UIA 权限
- **Linux**：AT-SPI
- **统一 trait**：`DesktopSandbox` 与 `ShellSandbox` 解耦
- **可降级**：开发模式可关闭（仅警告）

### 15.4 Computer Use 安全

- **强制确认开关**：用户启用 Computer Use 时显式提示风险
- **白名单应用**：默认所有应用；用户可限制只允许某些应用
- **黑名单危险动作**：删除文件、确认对话框点击等需二次确认
- **紧急停止**：全局热键 + UI 按钮始终可见
- **操作日志**：所有桌面操作记录到 thread（可回看）
- **截图保险**：每次 desktop action 前自动截图，便于事后审计

### 15.5 隐私边界

- **v1 完全本地**：所有对话、所有数据、所有模型配置都在 `~/.opendesk/`
- **云同步可选**（v2）：用户显式开启，且端到端加密
- **遥测默认关闭**：无任何匿名遥测；用户可选择加入（v1.1）
- **模型数据流向**：用户消息 → 选中的 AI provider → 该 provider 的隐私政策
  - OpenDesk 不缓存、不转售
  - 用户切到本地模型时，零数据外发

---

## 16. 性能指标

| 指标 | 目标 | 测量方法 |
|---|---|---|
| 冷启动 | 点击图标到首字 < 2s | Playwright + stopwatch |
| 内存（空闲） | < 400 MB | `ps aux \| grep opendesk` |
| 内存（长会话 1000 轮） | < 1 GB | 同上 |
| 首字延迟（P95） | < 2s | 各 provider 压测 |
| 流式持续输出 | 无卡顿 | 主观 + 帧率监测 |
| Provider 切换 | < 100ms | 前端 store 计时 |
| CSGHub Lite spawn | < 5s | stopwatch |
| 持久化写入 | < 50ms / item | benchmark |
| 多 workspace 列表 | 100 个 workspace 列表 < 100ms | benchmark |
| 桌面截图 | < 200ms / 帧 | benchmark |

---

## 17. 商业模式

### 17.1 定位

**纯工具 + 永久免费 + 接受捐赠**。

OpenDesk 不是一个 SaaS，**不是**：
- ❌ 订阅服务
- ❌ 按调用次数收费
- ❌ 速通排队
- ❌ 企业版
- ❌ 抽成 marketplace

### 17.2 收入来源（可选）

- **GitHub Sponsors**：开源捐赠
- **Open Collective**：透明收支
- **云服务（v2 可选）**：跨设备同步（用户付费买云空间）
- **企业支持合同**（v3 可选）：提供 SLA、定制开发、咨询

### 17.3 与 OpenCSG 生态的关系

```
┌─────────────────────┐
│      OpenDesk       │ ← 个人 AI 桌面入口（本产品）
│   (个人 AI 桌面)    │
└──────┬──────────────┘
       │ 协同
       ├─► 消费 CSGHub Lite 的本地推理能力
       │
       └─► 可选消费 CSGClaw 的 /responses API
           （个人用户多开场景；不强依赖）

┌─────────────────────┐
│      CSGClaw        │ ← 团队场景的协作入口
│  (Manager/Worker)   │
└──────┬──────────────┘
       │ 包含
       └─► 内部使用 CSGHub Lite 作为模型 provider

┌─────────────────────┐
│     CSGHub Lite     │ ← 本地推理引擎（基础设施）
│  (Ollama 风格)      │
└─────────────────────┘
```

OpenDesk = **个人场景的桌面入口**（Apache 2.0 免费）
CSGClaw = **团队场景的协作入口**（Apache 2.0 免费）
CSGHub Lite = **本地推理引擎**（Apache 2.0 免费）

三者形成 OpenCSG "个人 + 团队 + 基础设施" 的完整 AI 产品矩阵，**全部 Apache 2.0 开源**。

---

## 18. 开源策略

### 18.1 许可证

- **代码**：Apache 2.0（用户可商用、可修改、可分发，须保留版权）
- **文档**：CC BY 4.0
- **Logo / 品牌**：OpenCSG 商标条款

### 18.2 仓库组织

- **主仓库**：https://github.com/OpenCSGs/opendesk
- **monorepo**：`apps/` + `crates/` + `adapters/` + `docs/`
- **CI**：GitHub Actions
  - PR 触发：cargo test + pnpm test + lint
  - main 触发：构建 + release
- **Release**：GitHub Releases + 自动化 changelog

### 18.3 治理

- **BDFL 模式**（v1 早期）：核心团队决策
- **RFC 流程**（v1.1 起）：重大变更走 RFC
- **贡献者协议**（CLA）：所有贡献者签 Apache CLA
- **安全披露**：security@opencsg.com（PGP）

### 18.4 社区

- **GitHub Discussions**：用户问答、想法交流
- **Discord / Slack**：实时交流
- **月度社区会议**：路线图同步、Q&A
- **贡献指南**：CONTRIBUTING.md
- **行为准则**：CODE_OF_CONDUCT.md

---

## 19. 路线图

### 19.1 v0.1.0 —— 30 天 MVP

**目标**：跑通 Hello Agent + 1 个 workspace + 1 个 provider + 1 个工具

| 里程碑 | 周 | 关键交付 |
|---|---|---|
| M0 | 1-2 | 项目骨架 + Electron 壳 + Rust workspace + OpenAI 适配器 + 1 个工具 |
| M1 | 3-4 | 文件夹 workspace + 7 个 provider 适配器 + 桌面交互 v1 + Token 管理 UI |
| M2 | 5-6 | CSGHub Lite 进程内嵌 + AGENTS.md + 紧急停止 + 打磨 + v0.1.0 Release |

**验收**：用户能打开一个文件夹、配 5 个 provider、AI 帮做 3 步桌面任务

### 19.2 v0.5.0 —— 90 天 完整 P0

| 里程碑 | 周 | 关键交付 |
|---|---|---|
| M3 | 7-8 | Windows / Linux 完整支持 + 沙箱完善 + 性能优化 |
| M4 | 9-10 | doctor 诊断 + provider 导入导出 + 跨 workspace 搜索 |
| M5 | 11-12 | 嵌入式 provider 插件 + Subagent (Codex 模式) + 打磨 |

**验收**：v0.5.0 在 macOS / Windows / Linux 三端都能跑全套 P0

### 19.3 v1.0.0 —— 180 天 GA

| 里程碑 | 周 | 关键交付 |
|---|---|---|
| M6 | 13-16 | MCP 客户端 + 5 个内置 MCP server |
| M7 | 17-20 | Skills 系统（SKILL.md 格式）+ 10 个示例 Skills |
| M8 | 21-24 | Artifacts 渲染（HTML/React/Mermaid/SVG） + 性能调优 + 文档 + 营销 + v1.0.0 Release |

**验收**：v1.0.0 GA 可在官网下载，Apache 2.0 协议

### 19.4 v2.0.0 —— 12 个月

- Memories / Chronicle 长期记忆
- Worktree 任务隔离
- Plan Mode
- CLI 入口
- VS Code 扩展（app-server 协议桥接）
- Web 端（共享 Rust core）

### 19.5 v3.0.0 —— 18 个月

- Mobile 端
- 跨设备同步（可选云服务）
- 实时多模态（语音/视频）
- Marketplace 生态

---

## 20. 风险与缓解

| 风险 | 等级 | 缓解 |
|---|---|---|
| **多 Provider 兼容矩阵爆炸** | 🔴 高 | Provider trait 严格约束；适配器层只翻译协议不创造语义；用 mock server 跑测试矩阵；CI 跑 7+ provider smoke test |
| **桌面交互权限被 OS 拒** | 🔴 高 | 首次启动清晰引导用户授权；权限被拒时降级到"截图+提示用户操作" |
| **Computer Use 安全责任** | 🔴 高 | 文档明确风险；UI 显式确认开关；紧急停止全局热键；操作日志；白名单应用支持 |
| **模型"无关性"失守** | 🔴 高 | Provider trait 强制；feature flag 矩阵测试；不内置任何"GPT 特有"功能 |
| **凭据泄露** | 🔴 高 | OS keyring 强制；本地加密存储；日志脱敏；网络请求拦截；进程退出清零 |
| **CSGHub Lite 进程崩溃** | 🟡 中 | 独立进程隔离 + 健康检查 + UI 提示 + 不影响桌面主功能 |
| **Rust↔Node NAPI 性能** | 🟡 中 | 类型化 payload + 批量更新；大文件流式 |
| **macOS Sandbox 限制桌面交互** | 🟡 中 | Computer Use 工具默认运行在沙箱外，但受用户权限门控；可单独关闭 |
| **rollout.jsonl 损坏** | 🟡 中 | 每次写入即 fsync + atomic rename；启动时校验最后一行；损坏时提示用户 |
| **CSGClaw API 变更** | 🟢 低 | 仅走 OpenAI 兼容 `/responses` 协议；不绑内部结构 |
| **个人 vs 团队叙事混淆** | 🟢 低 | 文案/首页/教程明确"个人 AI 同事"；团队场景指向 CSGClaw 互补 |
| **开源贡献质量参差** | 🟡 中 | PR 模板 + CI 强制 + 至少 1 个核心维护者 review |
| **用户量增长导致 CSGHub Lite 压力** | 🟢 低 | CSGHub Lite 可水平扩展；用户可改用独立部署 |
| **法律风险**（API ToS、AI 内容版权）| 🟡 中 | 用户责任自负；OpenDesk 不缓存、不分发；合规文档清晰 |

---

## 21. 验收标准

### 21.1 v0.1.0 验收

- [x] 启动应用后 2s 内能输入"你好"并看到 AI 回复
- [x] 顶部下拉栏能切换至少 3 个 provider（OpenAI / Anthropic / Ollama）无需重启
- [x] 设置页能添加新 provider（向导式）、更新 API Key、测连接、删除
- [x] 侧边栏能打开一个文件夹作为 workspace；在 workspace 内新建 2 个 thread；两个 thread 的对话互不干扰
- [x] 关闭重启应用后所有 workspace 和 thread 都在
- [ ] AI 能完成 1 个桌面任务（"打开 Chrome 搜索 OpenCSG，截图"）— Computer Use 完整循环 v2 实现
- [x] 紧急停止热键 `⌘.` 能立即中止任何 AI 操作
- [x] macOS 上所有 API Key 入 Keychain（用 `security find-generic-password` 验证）— 使用 Electron safeStorage
- [ ] CSGHub Lite 进程内嵌可启动、断网自动 fallback — v2 实现
- [x] AGENTS.md 被加载并显示在状态栏

### 21.2 v1.0.0 验收

- [ ] 上述 11 项全部通过
- [ ] macOS / Windows / Linux 三端都能跑全套 P0
- [ ] MCP 至少支持 5 个内置 server
- [ ] Skills 至少支持 10 个示例
- [ ] Artifacts 至少支持 HTML / React / Mermaid / SVG / Code
- [ ] 完整文档：用户手册、贡献指南、API 规范
- [ ] 100 个真实用户完成 1 周试用，NPS ≥ 40

---

## 22. 附录

### 22.1 术语表

| 术语 | 含义 |
|---|---|
| **Workspace** | 一个文件夹 = 一个工作记录容器 |
| **Thread** | 一次完整对话；隶属于 Workspace |
| **Turn** | 一次用户输入触发的多轮交互 |
| **Item** | Turn 内的原子事件（消息、工具调用、截图等） |
| **Provider** | 一个 AI 后端（OpenAI / Anthropic / Ollama 等） |
| **Model** | 一个具体 AI 模型（gpt-5.5 / claude-opus-4.8 等） |
| **BYOK** | Bring Your Own Key（用户自带 API Key） |
| **MCP** | Model Context Protocol（Anthropic 主导的工具扩展协议） |
| **Skill** | 可复用的能力包（SKILL.md 格式） |
| **Computer Use** | AI 操作桌面 UI 的能力（截图 + 输入） |
| **Sandbox** | 隔离执行环境（平台原生） |
| **Rollout** | 会话持久化文件（Codex 命名，rollout.jsonl） |
| **AGENTS.md** | 项目级 system prompt 文件（Codex 命名） |
| **StateDb** | SQLite 元信息索引（Codex 命名） |

### 22.2 参考资料

- [OpenAI Codex Desktop](https://github.com/openai/codex)
- [OpenCSGs/csgclaw](https://github.com/OpenCSGs/csgclaw)
- [OpenCSGs/csghub-lite](https://github.com/OpenCSGs/csghub-lite)
- [Trae Desktop](https://www.trae.cn)
- [Claude Desktop](https://claude.com/download)
- [Model Context Protocol](https://modelcontextprotocol.io/)

### 22.3 修订历史

| 版本 | 日期 | 修改人 | 摘要 |
|---|---|---|---|
| v0.1.0-draft | 2026-06-11 | OpenDesk 产品团队 | 初稿 |

### 22.4 反馈

- GitHub Issues：https://github.com/OpenCSGs/opendesk/issues
- 邮件：opendesk@opencsg.com
- 社区：Discord / GitHub Discussions

---

> **OpenDesk — 让每个个人用户的桌面，都拥有一个私人 AI 同事。**
> Apache 2.0 · OpenCSG · https://github.com/OpenCSGs/opendesk
