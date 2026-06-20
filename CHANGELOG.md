# Changelog

All notable changes to OpenDesk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.2] — 2026-06-20

### Added

- **CodeRunner UI**：`src/renderer/src/components/runner/CodeRunner.tsx` — Python/JS/TS/Shell 代码执行面板，支持安全校验（危险模式拦截）、行号显示、30秒超时、输出截断、复制输出
- **AgentExecutor UI**：`src/renderer/src/components/agent/AgentExecutor.tsx` — 自主 Agent 循环 UI，支持目标输入、步骤展开（thought/tool_call/tool_result/response/error）、暂停/重启、最大 10 轮迭代
- **ErrorBoundary**：`src/renderer/src/components/ui/ErrorBoundary.tsx` — 可复用错误边界，支持 Try Again 和 Reload App，已包裹 AppShell 所有面板
- **executeShell IPC**：`src/main/ipc/tools.ts` 新增 `executeShell` handler，使用 `child_process.spawn` 实现白名单执行（python3/node/bash/sh），30秒超时、输出截断（stdout 100KB / stderr 50KB），SIGTERM → SIGKILL 级联终止
- **AgentExecutor 真实 LLM 集成**：AgentExecutor 通过 `window.api.chat.send` 发送请求，注册 IPC 监听器（chat:token/tool_call/tool_result/done/error）实时映射到 Agent 步骤 UI，支持隔离 sessionId 避免污染主聊天线程
- **RAG SQLite FTS5 骨架**：`src/main/rag/` 完整骨架实现
  - `types.ts`：KnowledgeSource / DocumentChunk / SearchResult / VectorStoreAdapter / RAGService 接口
  - `chunker.ts`：Markdown（按 ## 标题）、代码（按 500 token 滑动窗口）、通用文本分块策略
  - `sqlite-fts5-adapter.ts`：SQLiteFTS5Adapter 实现，支持 `better-sqlite3` 条件加载（安装即启用），否则回退到内存 Map 搜索；含完整 schema、FTS5 触发器、BM25 排序
  - `index.ts`：RAGServiceImpl 服务层，支持文件索引、搜索、源管理
  - `src/main/ipc/rag.ts`：6 个 IPC handler（init / indexFile / search / listSources / deleteSource / health）
  - `src/preload/index.ts`：新增 `window.api.rag` 暴露
- **ARIA 可访问性**：所有 DropdownMenu/ContextMenu/Dialog 交互元素添加 `aria-label`
  - MessageActions：trigger + 7 个 menu item
  - Sidebar：ContextMenu 6 个 item + Thread DropdownMenu 2 个 item + Emoji picker 20 个 button
  - SettingsModal：Dialog.Close 按钮
  - OnboardingModal：Quick Setup / Skip Setup 按钮
  - ShortcutHelp：关闭按钮
- **语义颜色系统**：`globals.css` 新增 `--success/--error/--info/--warning` 及其 light/dark 背景/边框变量，所有组件从硬编码 `green-500`/`red-500`/`blue-600`/`indigo-600` 迁移到 CSS 变量
- **测试覆盖**：新增 50 个测试（toast 11、theme 5、workspace 11、settings 6、Switch 6、Toast 4、Skeleton 7），总计 85 个测试/12 个文件
- **Sidebar 导航**：新增 Runner 和 Agent 导航项，使用 Terminal 和 Bot 图标
- **响应式面板**：所有右侧 drawer（Skills 480px、Files 640px、Memory 480px、Runner 640px、Agent 480px）添加 `max-width: calc(100vw - sidebar-width)` 防止小屏溢出

### Fixed

- **所有 `<button>` 添加 `type="button"`**：修复 20+ 组件中隐式 `submit` 类型导致的表单意外提交风险
- **CodeRunner `useRef` 恢复**：lint 自动移除后重新确认组件无需 ref，但保留 import 以支持后续 textarea focus 扩展
- **AgentExecutor 模拟循环**：当 IPC 不可用时自动回退到 browser mock 模式
- **RAG 搜索回退**：未安装 `better-sqlite3` 时自动使用内存 Map 的 substring 匹配 + 简单 BM25 评分

### Security

- **executeShell 白名单**：仅允许 `python3` / `python` / `node` / `node.exe` / `bash` / `sh` / `zsh` 及绝对路径变体，拒绝任何其他命令
- **RAG 文件路径**：`indexFile` 通过 `fs/promises` 读取，无路径遍历漏洞（依赖 Node.js 原生权限模型）

## [0.4.1] — 2026-06-20

### Fixed

- **About 版本号**：Settings > About 现在从 `package.json` 动态读取版本号，不再硬编码显示 `v0.2.0`。
- **Windows arm64 构建**：NSIS 安装程序不支持 arm64，改为 x64 使用 `.exe`（NSIS）安装包、arm64 使用原生 `.zip` 压缩包，确保 Windows on ARM 设备真正拿到 arm64 二进制。

### Changed

- 版本号提升至 `0.4.1`。

## [0.4.0] — 2026-06-20

### Security

#### P0 Critical Fixes
- **Renderer Sandbox**: `sandbox: true` 启用，renderer 进程不再拥有无限制的 Node.js 访问
- **IPC 文件工具移除**：移除 `tools:readFile/writeFile/listDirectory/applyPatch` 的 IPC 暴露，文件工具仅通过 Tool Registry executor（主进程）访问
- **Shell 白名单收紧**：从 `SHELL_WHITELIST` 移除 `bash`, `sh`, `python`, `node`, `eval`, `exec` 等危险命令
- **XSS 加固**：Artifact Renderer iframe sandbox 改为 `sandbox="allow-scripts allow-same-origin"`，配合 CSP 限制
- **MCP 命令验证**：`spawn` 前增加路径遍历检查（`..`）、绝对路径存在性验证
- **Desktop 工具守卫**：`desktop:capture`, `desktop:openPath` 等 handler 增加 `desktopEnabled` 开关检查
- **API Key 防泄露**：移除 `settings:getApiKey` IPC，renderer 永不获取明文 key；`fetchModels`/`testProvider` 改为接受 `providerId` 由主进程加载 key
- **Base URL 验证**：`fetchModels` 和 `testProvider` 增加 `http`/`https` 协议检查，防止 SSRF/key exfiltration

### Added

#### CI/CD & 跨平台构建
- GitHub Actions `release.yml`：三平台并行构建（macOS x64/arm64, Windows x64, Ubuntu x64）
- 产物格式：macOS `.dmg` + `.zip`，Windows `.exe`（NSIS），Linux `.AppImage` + `.deb`
- 可选代码签名配置：macOS（Apple ID + Team ID）和 Windows 证书支持
- GitHub Actions `ci.yml`：Lint、Type Check、Unit Test、Build 四阶段质量门禁
- 代码产物上传：仅打包安装文件（`.dmg`, `.exe`, `.AppImage`, `.deb`）到 Release

#### 测试框架
- Vitest 单元测试框架 + jsdom 环境
- `@testing-library/react` + `@testing-library/jest-dom` 组件测试
- Playwright E2E 测试框架（配置就绪）
- 初始测试覆盖：file-tools（5 用例）、utils（3 用例）、EmptyState（2 用例）

#### ESLint & Prettier
- ESLint 9 配置（TypeScript + React + React Hooks + React Refresh）
- Prettier 格式化配置
- `lint`, `lint:fix`, `format`, `format:check` 脚本

### Changed

- `useChatStore` selector 优化：全组件改用 `useChatStore((state) => state.field)` 模式，避免 streaming token 更新导致全局重渲染
- Dark mode 修复：`.dark :root` 非法选择器改为 `.dark` 直接选择器 + `prefers-color-scheme` 媒体查询
- `InputBar` popover 修复：点击 popover 内部不再意外关闭
- 全局快捷键：补齐 `Cmd+Shift+.`（切换侧边栏）、`Cmd+Shift+T`（切换主题）、`Cmd+Shift+M`（聚焦模型选择器）
- `AgentActivityBar` 修复：`ensembleMode` 改为 `mode`，消除 undefined 崩溃
- `Message Fork` 实现：从消息分叉为新 thread 并自动切换
- `ProviderForm` Fetch Models：按钮真正调用 `fetchModels` API，支持 OpenAI/Anthropic/Ollama/自定义端点
- `desktopEnabled` 功能开关：执行 `shell` 和 `desktop_*` 工具前检查 approvalMode

### Fixed

- 启动时窗口背景色跟随主题（dark/light/system），消除冷启动白闪
- 大量图标按钮补充 `aria-label`
- 侧边栏 `aside`、主区域 `main role="main"` 等基础可访问性地标
- `Workspace` 类型新增 `icon?: string` 字段，emoji 与名称分离
- `Toast` 类型新增 `remaining` 和 `timerId` 支持悬停暂停

---

## [0.3.0] — 2026-06-18

### Changed

- **拆分超大组件**：`InputBar.tsx`（>1100 行）、`SettingsModal.tsx`（>1000 行）逻辑拆分，降低维护复杂度
- **重构 IPC Handlers**：`src/main/ipc/handlers.ts` 拆分为 domain-specific 模块（`chat.ts`, `settings.ts`, `workspace.ts`, `desktop.ts`, `doctor.ts`, `mcp.ts`, `skills.ts`, `thread.ts`）
- **代码格式化**：全库 Prettier 格式化，统一代码风格
- **Lint 修复**：消除所有 ESLint warning 和 error

---

## [0.2.0] — 2026-06-12

### Added

#### Memory System (核心差异化)
- 三文件化记忆系统：**USER.md** / **IDENTITY.md** / **SOUL.md**
- 记忆自动提取：每次对话结束后自动分析最近10条消息，提取偏好、技术栈、经验教训
- 记忆注入 Prompt：在构造 system prompt 时自动读取记忆内容并注入（每类约2000字符上限）
- 记忆面板 UI：侧边栏新增 Memory 入口，支持查看/编辑三类记忆，自动保存（1秒防抖）
- 记忆节流：同一对话内5分钟内仅提取一次，避免频繁写入

#### Provider 健壮性
- Provider 自动健康检查：启动后每5分钟对 enabled provider 进行测试，更新状态
- Settings 面板显示健康指示点（绿/红/灰）及最后测试时间
- 检测到 401/403 时自动标记 provider 为不可用，引导用户更新 API Key
- 附件自动注入：拖拽/粘贴的文本文件内容会随消息自动发出（文本文件读取内容，图片文件标注名称）

#### UI/UX 打磨
- **GlobalSearch 防抖**：搜索输入防抖 150ms，快速输入不再卡顿
- **Toast 悬停暂停**：鼠标悬停在 toast 上时不自动消失，移开后继续倒计时
- **ChatPanel 滚动到底部按钮**：长对话向上滚动时显示浮动按钮，点击平滑回到底部
- **FilePanel 树状视图**：平铺文件列表改为可展开/折叠的目录树，支持3级递归、200文件上限
- **SettingsModal 可访问 Switch**：ensemble mode、auto-ensemble、desktop control 三个自定义 div toggle 替换为 `role="switch"` 按钮，支持键盘操作和屏幕阅读器
- **Workspace icon 独立字段**：emoji 图标不再污染 workspace name，支持独立 `icon` 字段，旧数据自动兼容
- **CommandPalette 导出当前 thread**：导出为 Markdown 格式，包含完整的对话记录
- **Message 组件重渲染优化**：Zustand selector 改为稳定函数引用，`mdComponents` 用 `useMemo` 缓存，MessageRow 用 `React.memo` 包裹

#### P0 功能修复
- **ProviderForm Fetch Models**：按钮现在真正调用 `fetchModels` API，支持 OpenAI/Anthropic/Ollama/自定义端点
- **启动时窗口背景色跟随主题**：冷启动不再白闪，支持 dark/light/system 三种模式
- **AgentActivityBar 修复**：`ensembleMode` 改为 `mode`，避免 undefined 崩溃
- **Message Fork 实现**：消息菜单 Fork 功能生效，从该消息分叉为新 thread 并自动切换
- **全局快捷键**：注册 `Cmd+Shift+.`（切换侧边栏）、`Cmd+Shift+T`（切换主题）、`Cmd+Shift+M`（聚焦模型选择器）
- **InputBar popover 修复**：点击 popover 内部不再意外关闭，仅点击外部关闭
- **ARIA 标签与地标**：侧边栏 `aside`、主区域 `main role="main"`、图标按钮 `aria-label` 等基础可访问性补齐

### Changed
- `Workspace` 类型新增可选 `icon?: string` 字段
- `Toast` 类型新增 `remaining` 和 `timerId` 字段支持暂停/恢复
- 全局搜索从即时搜索改为防抖搜索（`useDebounce` hook）
- 文件面板从平铺列表改为递归树状视图

### Fixed
- ProviderForm 的 `handleFetchModels` 不再使用 mock preset，而是调用真实 API
- 启动时 `isDark` 不再 hardcoded 为 `true`
- AgentActivityBar 引用不存在的 `ensembleMode` 字段
- MessageRow 未传递 `onFork` handler 导致 Fork 按钮无响应
- 全局快捷键列表中的三个快捷键未实际注册
- InputBar 的 `document.addEventListener('mousedown', ...)` 无条件关闭所有 popover
- 大量图标按钮缺少 `aria-label`

## [0.1.0] — 2026-06-01

### Added
- Electron + Vite + React + Tailwind CSS 基础架构
- Workspace 系统：文件夹作为 workspace，自动扫描 `.opendesk/` 结构
- Thread 持久化：消息按 workspace 保存为 JSON
- Provider 系统：支持 Anthropic、OpenAI、Ollama 及任意 OpenAI-compatible 端点
- 多 Provider 支持：ensemble mode、compare mode、agent mode
- Ensemble 编排：多模型并行 + 仲裁器选择最优答案
- Agent 角色分配：coder / reviewer / researcher / writer / generalist
- Skills 系统：Markdown-based skills with tools, scripts, and references
- MCP 集成：支持任意 MCP server（stdio transport）
- Desktop 工具：文件读写、目录浏览、截图、补丁应用
- 系统托盘与全局快捷键
- 主题系统：dark / light / system（CSS 变量）
- 消息操作：复制、编辑、删除、重新生成、回复、收藏
- 附件系统：拖拽/粘贴文件（text/image/code/pdf）
- Artifacts 渲染：代码块、Mermaid 图表、KaTeX 公式
- 命令面板：Cmd+K 快速操作
- Onboarding 引导：首次启动时引导添加 provider
- Doctor 诊断：自检工具检查配置、provider、workspace 状态
- `AGENTS.md` 自动加载：workspace 根目录下的 `AGENTS.md` 自动注入 system prompt
