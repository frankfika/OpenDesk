# OpenDesk Changelog

## v0.7.0 — 2026-06-23

The "Productivity Leap" release — Skills Marketplace, RAG v2, Claw remote control, Settings · Workflow panel.

### ✨ 新增

- **Skills Marketplace 完整版**
  - `src/main/marketplace/lock.ts`：版本锁定到 `userData/marketplace.lock.json`，survives 重启
  - IPC：`marketplace:installed / uninstall / checkUpdates / findInstalled`
  - 已装 / 发现双 tab UI：`installedIds` 状态 + 更新提示 + 重新安装 + 移除
  - semver 比较：`0.1.0-beta` < `0.1.0`（pre-release tag sort）
- **RAG v2**
  - `src/main/rag/v2/vector.ts`：TF-IDF cosine + Reciprocal-Rank Fusion
  - `src/main/rag/v2/hybridSearch.ts`：FTS5 + 向量混合编排（`HybridSearcher.search` + 一次性 `hybridSearch`）
  - 中文用 bigram、英文用 word；sub-linear TF saturation；idf = log(1 + N/df)
  - 可调权重 `ftsWeight` / `vectorWeight`；默认 0.6 / 0.4
  - IPC：`rag:hybridSearch` + `rag:indexAndSearch`
- **Claw 远程控制（Telegram bot）**
  - `src/main/claw/telegram.ts`：长轮询实现，可输入 @BotFather 拿到的 token
  - `src/main/claw/manager.ts`：单例管理 + 配置持久化 + 状态广播
  - 自动按 4000 字 chunk 分割 Telegram 消息（避免超过 4096 限制）
  - IPC：`claw:getConfig / updateConfig / start / stop / sendMessage / isRunning / onMessage / onStatus / onError`
  - 其它平台（WeChat / WeCom / Lark / DingTalk）排期到 v0.8.0
- **Settings · Workflow 面板**
  - 4 个 sub-tab：定时任务 / 变更记录 / 技能市场 / Claw
  - 一站式管理 v0.6 / v0.7 全部新功能（无需切到 Section Rail）

### 🔧 工具

- `scripts/capture-screenshots.mjs` 新增 13/14/15 三张 workflow 截图
- README + README_EN 加 3 张 workflow 截图
- Roadmap 把 v0.7.0 标记为「已发版」

### 📊 验证

- Typecheck (main + web): **0 errors**
- ESLint: **0 warnings**
- vitest: **95/95** passing
- Build: succeed（30 skills bundled）

## v0.7.0-alpha.1 — 2026-06-23

### ✨ 新增

- **Skills Marketplace**（`src/main/marketplace/registry.ts` + `MarketplacePanel.tsx`）
  - 策划 registry 一键安装；复用现有 `skills:importFromGitHub` IPC
  - 内置 8 个 fallback 条目（awesome-readme / translation-pro / sql-migration / web3-portfolio-pro / regex-builder / commit-message / interview-transcript / crypto-news-digest）
  - 可选从 `frankfika/opendesk-skills/main/registry.json` 拉远程 registry，5s 超时降级
  - 分类筛选 / 搜索 / 已验证徽章 / 版本号显示

## v0.6.2 — 2026-06-23

### ✨ 新增

- **8 个新 Skill（22 → 30 / 30，v0.6.0 路线图全部完成）**：
  - `image-alt-text` — WCAG 友好的 alt 文本（图标 / 截图 / 图表 / 首图）
  - `seo-optimizer` — Title / Meta / 标题 / 关键词 / Schema / 链接 审计 + 评分
  - `accessibility-checker` — WCAG 2.1 AA / AAA 审计（perceivable / operable / understandable / robust）
  - `voice-memo` — 音频文件 → 转写 + 摘要 + 行动项，含说话人标签
  - `podcast-transcript` — RSS / Spotify / Apple URL → 节目简报，含引用 + 章节索引
  - `slack-drafter` — Slack / Discord / Teams 消息草稿，含格式 + 语气模板
  - `wechat-publisher` — 公众号文章草稿，5 种正文模板 + SEO + 封面图 prompt
  - `markdown-formatter` — Markdown 美化（标题 / 列表 / 代码 / 表格），含 diff 输出

## v0.6.1 — 2026-06-23

### ✨ 新增

- **WorkerPool runner 接入 chat pipeline**：
  - 新增 `src/renderer/src/lib/chatPipeline.ts`：`runChat()` 订阅 `chat:token` + `chat:done`，累加 token，120s 超时兜底
  - 每个 worker 拿到唯一 `pool-...-<providerId>` threadId，token 流正确路由
- **ChangeLog 持久化到 SQLite**：
  - 新增 `src/main/changeLog/store.ts`（better-sqlite3，WAL 模式，2 个索引）
  - 模块加载用 `require()` + try/catch fallback，无原生二进制也能 build
  - 新增 IPC：`changelog:record / update / list / clear`
  - `useChangeLog` Zustand store 首次挂载从磁盘 hydrate
- **8 个新 Skill（14 → 22 / 30）**：
  - `email-drafter` / `data-explorer` / `sql-helper` / `pdf-summarizer` / `youtube-transcript` / `interview-questions` / `crypto-portfolio` / `api-doc-fetcher`

### 🔧 改动

- `chat:done` IPC 通过 `window.api.chat.onDone` 暴露（合并；payload 增加可选 `error`）
- 5 张新截图：`08-experts-panel.png` / `09-scheduler-panel.png` / `10-scheduler-create.png` / `11-section-rail-overview.png` / `12-worker-pool-modal.png`

## v0.6.0 — 2026-06-23

WorkBuddy 启发合集。10/10 模块全部发版。

### ✨ 新增

- **三大工作模式（Ask / Plan / Craft）** in `WorkModeSwitch.tsx`
  - 映射到现有 `approvalMode` enum（不动 executor）；`bypass` 移到 Settings → Advanced
- **MiddleColumn 搜索**（useMemo 过滤 Thread 标题）
- **Artifact 多格式导出（Word / Excel / PPTX / Markdown）** via `docx` + `xlsx` + `pptxgenjs`
- **Expert Panel**：6 个垂直专家 in `src/main/experts/registry.ts`
- **Scheduler（cron / 自动化）** 基于 `node-cron`，持久化到 `userData/scheduler/tasks.json`
- **七大板块导航**（`SectionRail` + `SectionDock`）：助理 / 项目 / 专家 / 自动化 / 文件 / 知识库 / 灵感
- **Multi-Agent Worker Pool**（`workerPool.ts` + `WorkerPoolPanel.tsx`）—— runner stub（v0.6.0）；真接入 v0.6.1
- **ChangeLog（结果区）** 含 Zustand store + per-thread 条目
- **工作流沉淀（Save as Template）** 把 Skill 复制到 `~/.opendesk/skills/<name>`
- **8 个新 Skill（6 → 14）**：
  - `ocr-invoice` / `sales-insight` / `xhs-publisher` / `weekly-report` / `meeting-notes` / `competitor-watch` / `resume-screener` / `code-review-expert`

### 🔧 工具

- 新依赖：`docx@^9.0.2` / `xlsx@^0.18.5` / `pptxgenjs@^3.12.0` / `node-cron@^3.0.3`
- 类型 stub：`src/main/types/node-cron.d.ts`（typed `cron.validate` + `cron.schedule`）

### v0.6.0-alpha.1（pre-release）

- WorkMode + 侧边栏搜索 + 8 个新 Skill 第一批切片（commit `42838bb`）

## v0.5.0 — 2026-06-22

### ✨ 新增

- **Web3 Workbench**（根视图）：wagmi + Reown AppKit + 12 主网/测试网
- ENS 解析、Etherscan / Basescan / Arbiscan 实时链上数据
- Wallet Doctor：ERC-20 授权审计
- TxConfirmCard：每笔链上交易都要二次确认
- 三大场景 Skill：Chain Intel / One-Liner Trade / Wallet Doctor
- 45+ 类型错误 → 0
- 64 lint 警告 → 0
- 95/95 vitest 通过
- e2e 测试中硬编码的 DeepSeek key 移除

## v0.4.1 — 2026-06-20

### 修复

- **About 版本号**：Settings > About 现在正确显示当前版本号（从 `package.json` 读取），不再固定显示 `v0.2.0`。
- **Windows arm64 支持**：NSIS 安装包不支持 arm64，改为 x64 提供 `.exe` 安装程序、arm64 提供原生 `.zip` 压缩包。

## v0.1.0 — 2026-06-12

### 🎉 首次发布（完整版）

基于竞品调研（Kimi Work、Trae、Codex、Claude Desktop）的全面重构和优化。**所有核心功能一次到位，无 v2 遗留。**

### ✨ 新增功能

#### Workspace / 文件夹即工作区
- **Workspace 管理**：打开文件夹自动注册为 Workspace，侧边栏树形展示
- **Thread 分组**：每个 Workspace 下可创建多个 Thread，对话互不干扰
- **持久化**：Workspace、Thread、Message 全部持久化到本地磁盘
- **重新关联**：文件夹移动/重命名后可重新关联路径
- **AGENTS.md 扫描**：自动从 Workspace 目录向上递归扫描 AGENTS.md、.cursorrules、.traerules

#### 多 Provider / 模型管理
- **7 种 Provider 类型**：OpenAI、Anthropic、Ollama、OpenAI-Compatible、Google、Generic
- **模型列表自动获取**：支持从 /v1/models 或 /api/tags 自动拉取可用模型
- **API Key 加密存储**：使用 Electron safeStorage，永不明文落盘
- **连接测试**：添加 Provider 时可一键测试连接
- **Token 编辑**：无需删除重建，直接更新 API Key
- **健康状态指示**：Provider 卡片显示绿/黄/红状态点

#### Computer Use 桌面真交互
- **完整工具调用循环**：AI 返回 tool_calls → 执行工具 → 返回结果 → 继续对话（最多 5 轮迭代）
- **屏幕截图**：`desktop_capture` 工具，支持 full/window/area
- **鼠标控制**：`desktop_click` 工具，支持左/右键、双击、指定坐标
- **键盘输入**：`desktop_type` 工具，支持文本输入；`desktop_key` 工具，支持组合键
- **窗口管理**：`desktop_windows` 列出所有窗口；`desktop_activate` 激活指定窗口
- **安全护栏**：需用户在 Settings 中开启 `desktopEnabled`，未开启时拒绝执行
- **实现方式**：macOS 使用 AppleScript（osascript），跨平台原生，不依赖外部 npm 包

#### Artifacts 渲染系统（Claude Desktop 同款）
- **HTML 渲染**：iframe + srcdoc，注入 Tailwind CDN，支持交互按钮/表单
- **React 渲染**：iframe 内注入 React + ReactDOM + Babel standalone，JSX 实时编译执行
- **Mermaid 图表**：`mermaid.render()` 异步生成 SVG，支持缩放/下载
- **SVG 渲染**：直接内嵌，支持缩放/下载
- **Code/Markdown**：复用现有组件，支持复制/下载/打印
- **右侧滑出面板**：标签栏切换、拖拽调整宽度、多 artifact 并存
- **自动提取**：AI 消息中的 ` ```html ` / ` ```mermaid ` / ` ```svg ` / ` ```tsx ` 代码块自动识别，点击 Preview 创建 artifact
- **安全设计**：iframe `sandbox="allow-scripts"`（不含 same-origin/popups），完全隔离

#### MCP 客户端（Model Context Protocol）
- **完整 MCP 实现**：JSON-RPC 2.0 over stdio，自主实现（不依赖 @anthropic-ai/mcp 包）
- **多 Server 管理**：同时连接多个 MCP Server，工具自动聚合
- **工具命名空间**：自动添加 `{serverName}_{toolName}` 前缀，避免冲突
- **5 个预设一键添加**：
  - Filesystem：`npx -y @modelcontextprotocol/server-filesystem /path`
  - GitHub：`npx -y @modelcontextprotocol/server-github`（需 Token）
  - SQLite：`npx -y @modelcontextprotocol/server-sqlite /path/to/db`
  - Fetch：`npx -y @modelcontextprotocol/server-fetch`
  - Puppeteer：`npx -y @modelcontextprotocol/server-puppeteer`
- **错误恢复**：启动失败标记 error，进程崩溃自动重连（最多 3 次）
- **集成 Chat 流**：MCP 工具与内置工具统一调度，AI 自动选择调用

#### 文件系统工具（AI 可操作文件）
- **`file_read`**：读取文件内容
- **`file_write`**：写入文件（自动创建目录）
- **`file_list`**：列出目录内容（JSON 返回）
- **`apply_patch`**：应用 unified diff patch
- **安全限制**：所有文件操作限制在当前 Workspace 目录内，`../` 等目录遍历攻击被拦截

#### Shell 工具
- **`shell`**：执行白名单命令（ls, cat, grep, find, git, npm, node, python, curl 等 200+）
- **安全护栏**：
  - 危险字符拦截：`;`, `&`, `` ` ``, `$` 等可链式执行字符
  - 危险模式拦截：`rm -rf /`, `mkfs`, `dd if=/dev/zero`, fork bomb 等
  - 管道限制：`|` 允许，但每个命令首词必须在白名单中
  - 超时限制：30 秒自动终止

#### Web 搜索工具
- **`web_search`**：DuckDuckGo HTML 搜索，返回标题/链接/摘要 JSON

#### 工具调用循环（核心架构）
- **OpenAI 格式**：`chat.completions.create({ tools, stream: true })`，解析 `delta.tool_calls`
- **Anthropic 格式**：`messages.stream({ tools })`，解析 `content_block_start` + `input_json_delta`
- **UI 展示**：tool_call 消息显示工具名称和参数（可展开 JSON）；tool_result 显示结果
- **持久化**：所有工具调用和结果自动保存到 thread JSON
- **多工具并行**：单轮可执行多个工具，结果统一回传

### 📁 新增文件（30+）

| 文件 | 说明 |
|------|------|
| `src/main/tools/registry.ts` | 工具注册表（OpenAI/Anthropic 格式转换） |
| `src/main/tools/builtins.ts` | 12 个内置工具定义（文件/桌面/Shell/搜索） |
| `src/main/tools/desktop-tools.ts` | 6 个桌面控制工具（AppleScript 实现） |
| `src/main/mcp/client.ts` | MCP 客户端核心（JSON-RPC 2.0 + stdio） |
| `src/main/mcp/mcp-bridge.ts` | MCP 桥接器（多客户端管理 + 工具聚合） |
| `src/renderer/src/store/artifacts.ts` | Artifacts 全局状态管理 |
| `src/renderer/src/components/artifacts/ArtifactRenderer.tsx` | Artifacts 渲染引擎（6 种类型） |
| `src/renderer/src/components/artifacts/ArtifactPanel.tsx` | Artifacts 右侧面板 |
| `src/main/workspace.ts` | Workspace CRUD + 文件夹选择 |
| `src/main/agents-md.ts` | AGENTS.md 递归扫描 |
| `src/main/tray.ts` | 系统托盘 |
| `src/main/shortcuts.ts` | 全局快捷键 |
| `src/main/doctor.ts` | 系统诊断 |
| `src/main/tools/file-tools.ts` | 文件系统工具 |
| `src/renderer/src/store/theme.ts` | 主题管理 Store |
| `src/renderer/src/components/chat/CodeBlock.tsx` | 代码块组件 |
| `src/renderer/src/components/chat/MessageActions.tsx` | 消息操作菜单 |
| `src/renderer/src/components/onboarding/OnboardingModal.tsx` | 首次启动引导 |
| `docs/ARCHITECTURE.md` | 架构文档 |
| `docs/CHANGELOG.md` | 本文件 |
  - `Cmd/Ctrl+K`：聚焦输入框
  - `Cmd/Ctrl+N`：新建对话
  - `Cmd/Ctrl+,`：打开设置
- **窗口管理**：关闭窗口最小化到托盘（不退出），Dock/任务栏点击恢复

#### 聊天体验
- **流式输出**：首字 < 2s，实时打字机效果
- **消息操作菜单**：复制、重新生成、编辑后重发、删除
- **代码块复制按钮**：每个代码块右上角显示语言标签和一键复制
- **Reasoning/Thinking 展示**：折叠面板展示 AI 思考过程（Codex 风格）
- **Tool Call / Tool Result 展示**：可展开查看工具调用详情
- **Error 高亮**：红色背景高亮错误消息
- **Provider 彩色头像**：OpenAI 绿色、Anthropic 橙色、Ollama 紫色
- **文件拖拽/粘贴**：支持拖拽文件到输入框，粘贴图片自动转为附件
- **截图按钮**：一键截图并作为附件添加到消息

#### 设置面板（6 个标签页）
- **Providers & Models**：Provider CRUD、模型自动获取、连接测试
- **Workspaces**：已注册 Workspace 列表、状态显示、Relink/Remove
- **Desktop & Computer Use**：启用开关、权限状态、白名单配置
- **General**：主题切换（Light/Dark/System）、语言、启动行为、字体大小
- **Doctor**：一键系统诊断（Node/Electron/Provider/Workspace/内存/网络）
- **About**：版本号、更新检查、GitHub/文档链接

#### 主题系统
- **Light / Dark / System 三模式**：System 模式自动跟随 OS
- **Glassmorphism 设计**：半透明背景 + backdrop-blur + 渐变背景
- **CSS 变量驱动**：所有颜色通过 CSS 变量控制，切换无闪烁

#### 首次启动引导
- **3 步引导**：Welcome → Create Workspace → Add Provider
- **可跳过**：每步均可 Skip，自动创建默认 Workspace

#### Skills 生态系统（超越 Codex）
- **多来源扫描**：`~/.opendesk/skills/`（全局）+ `{workspace}/.opendesk/skills/`（项目级）+ `~/.codex/skills/`（Codex 兼容）+ `~/.claude/skills/`（Claude 兼容）+ 内置 Skills
- **渐进式加载**：L1 元信息（~100 tokens）→ L2 完整 SKILL.md（<5K tokens）→ L3 引用+脚本（按需）
- **Skill 即工具**：Skills 可通过 YAML frontmatter 定义 `tools[]`，自动注册为 Provider 可用工具
- **脚本执行**：`scripts/` 目录下的 .js/.py/.sh/.ts 文件自动映射为工具 handler
- **导入/导出**：从文件夹导入、从 GitHub 导入（`owner/repo` 简写）、导出为可分享目录
- **3 个内置 Skills**：code-reviewer、git-helper、doc-writer
- **创建模板**：一键生成 SKILL.md 模板并保存到 `~/.opendesk/skills/`
- **激活机制**：Thread 级激活，L1 信息自动注入 system prompt
- **完整 UI**：SkillsPanel（搜索/筛选/排序）+ SkillCard（激活开关/来源标签）+ SkillDetailModal（Markdown 渲染/导出/删除）+ SkillImportModal（文件夹/GitHub 双模式）

#### 文件系统工具
- `file_read` / `file_write` / `file_list` / `apply_patch`
- Workspace 目录限制，防止目录遍历攻击

#### Shell 工具
- 200+ 白名单命令（ls, cat, grep, git, npm, node, python, curl 等）
- 危险命令拦截（rm -rf /, mkfs, fork bomb 等）
- 管道安全检查，30 秒超时

#### Web 搜索
- `web_search`：DuckDuckGo HTML 搜索，返回标题/链接/摘要 JSON

### 🔧 技术改进

- **类型系统全面重写**：完整 Workspace/Thread/Message/Provider/Settings/Skill 类型定义
- **Store 层重构**：5 个独立 Zustand Store（settings/workspace/chat/theme/skills），职责清晰
- **IPC 层扩展**：从 5 个接口扩展到 35+ 个，覆盖所有功能
- **Preload 安全**：contextIsolation + sandbox，最小化 API 暴露
- **Error Boundary**：全局错误边界，崩溃后可 Reload

### 📁 新增文件（35+）

| 文件 | 说明 |
|------|------|
| `src/main/skills/scanner.ts` | 多来源 Skills 扫描器（7 种来源） |
| `src/main/skills/loader.ts` | 渐进式加载系统（L1/L2/L3） |
| `src/main/skills/executor.ts` | Skill 工具执行引擎（.js/.py/.sh/.ts） |
| `src/main/skills/portability.ts` | 导入/导出/创建模板 |
| `src/main/skills/builtins/` | 3 个内置 Skill（code-reviewer/git-helper/doc-writer） |
| `src/main/mcp/client.ts` | MCP 客户端核心（JSON-RPC 2.0 + stdio） |
| `src/main/mcp/mcp-bridge.ts` | MCP 桥接器（多客户端管理 + 工具聚合） |
| `src/main/tools/registry.ts` | 工具注册表（OpenAI/Anthropic 格式转换） |
| `src/main/tools/builtins.ts` | 12 个内置工具定义 |
| `src/main/tools/desktop-tools.ts` | 6 个桌面控制工具（AppleScript） |
| `src/main/workspace.ts` | Workspace CRUD + 文件夹选择 |
| `src/main/agents-md.ts` | AGENTS.md 递归扫描 |
| `src/main/tray.ts` | 系统托盘 |
| `src/main/shortcuts.ts` | 全局快捷键 |
| `src/main/doctor.ts` | 系统诊断 |
| `src/main/tools/file-tools.ts` | 文件系统工具 |
| `src/renderer/src/store/theme.ts` | 主题管理 Store |
| `src/renderer/src/store/artifacts.ts` | Artifacts 全局状态 |
| `src/renderer/src/store/skills.ts` | Skills 完整状态管理 |
| `src/renderer/src/components/chat/CodeBlock.tsx` | 代码块组件 |
| `src/renderer/src/components/chat/MessageActions.tsx` | 消息操作菜单 |
| `src/renderer/src/components/artifacts/ArtifactRenderer.tsx` | Artifacts 渲染引擎（6 种类型） |
| `src/renderer/src/components/artifacts/ArtifactPanel.tsx` | Artifacts 右侧面板 |
| `src/renderer/src/components/skills/SkillCard.tsx` | Skill 卡片 |
| `src/renderer/src/components/skills/SkillsPanel.tsx` | Skills 管理面板 |
| `src/renderer/src/components/skills/SkillDetailModal.tsx` | Skill 详情弹窗 |
| `src/renderer/src/components/skills/SkillImportModal.tsx` | Skill 导入弹窗 |
| `src/renderer/src/components/onboarding/OnboardingModal.tsx` | 首次启动引导 |
| `docs/ARCHITECTURE.md` | 架构文档 |
| `docs/CHANGELOG.md` | 本文件 |

### 🐛 修复问题

- 修复了 Store 中 `useXxxStore.getState()` 在组件中的反模式调用
- 修复了 `workspace:add` IPC 参数不匹配问题
- 修复了 `fetchModels` 参数顺序不一致问题
- 修复了 `relinkWorkspace` 在 IPC 和 UI 中的参数传递

### ⚠️ 已知限制

| 功能 | 状态 | 说明 |
|------|------|------|
| Computer Use 完整循环 | ✅ 已实现 | 截图→AI分析→执行→验证，最多5轮迭代 |
| MCP 客户端 | ✅ 已实现 | stdio transport + 工具发现 + 调用 |
| Artifacts 渲染 | ✅ 已实现 | HTML/React/Mermaid/SVG/Code/Markdown |
| Skills 生态系统 | ✅ 已实现 | 多来源扫描 + 渐进式加载 + 脚本执行 + 导入导出 |
| 文件系统工具 | ✅ 已实现 | read/write/list/patch，Workspace 目录限制 |
| Shell 工具 | ✅ 已实现 | 白名单 + 危险拦截 + 超时 |
| Web 搜索 | ✅ 已实现 | DuckDuckGo 搜索 |
| 本地模型 | 🟡 Ollama 兼容 | CSGHub Lite 可通过 OpenAI-compatible 端点接入 |
| CLI 入口 | ❌ 未实现 | 远期计划 |
| Web 端 | ❌ 未实现 | 远期计划 |

### 📊 竞品对标

| 维度 | OpenDesk v0.1.0 | Kimi Work | Trae | Codex | Claude Desktop |
|------|-----------------|-----------|------|-------|----------------|
| 开源 | ✅ Apache 2.0 | ❌ 闭源 | ❌ 闭源 | ✅ Apache 2.0 | ❌ 闭源 |
| 多模型 | ✅ 7+ Provider | ✅ 内置 | ✅ 内置 | 🟡 有限 | ❌ 仅 Anthropic |
| Workspace | ✅ 文件夹关联 | ✅ 本地文件 | ✅ Project | ❌ 单 Thread | ✅ Projects |
| 桌面交互 | ✅ Computer Use | ✅ WebBridge | 🟡 远程桌面 | 🟡 弱 | ✅ Computer Use |
| 系统托盘 | ✅ | ✅ | ✅ | ❌ | ✅ |
| 全局快捷键 | ✅ | ✅ | ✅ | ❌ | ✅ |
| 主题切换 | ✅ 3 模式 | ✅ | ✅ | 🟡 | ✅ |
| 启动引导 | ✅ 3 步 | ✅ | ✅ | ❌ | ✅ |
| 诊断工具 | ✅ Doctor | ❌ | ❌ | ✅ codex doctor | ❌ |
| AGENTS.md | ✅ | ❌ | 🟡 .traerules | ✅ | ❌ |
| Artifacts | ✅ HTML/React/Mermaid/SVG | ✅ | 🟡 弱 | ❌ | ✅ |
| MCP | ✅ 5 预设 | ❌ | ✅ | 🟡 | ✅ |
| Skills | ✅ 扫描+执行 | ❌ | ✅ 闭源 | ✅ | ✅ |
| 文件系统工具 | ✅ read/write/list/patch | ✅ | ✅ | ✅ | ✅ |
| Shell 工具 | ✅ 白名单+安全 | ✅ | ✅ | ✅ | ✅ |
| Web 搜索 | ✅ DuckDuckGo | ✅ | ✅ | ❌ | ❌ |

---

> **OpenDesk — 让每个个人用户的桌面，都拥有一个私人 AI 同事。**
> Apache 2.0 · https://github.com/OpenCSGs/opendesk
