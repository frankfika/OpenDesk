# OpenDesk 全面审查报告

> **项目**: OpenDesk v0.1.0 | **日期**: 2026-06-19 | **审查方式**: 5 个并行 Agent 审查 + 主 Agent 综合
> **审查范围**: 架构、功能、UX/UI、安全/性能、状态管理

---

## 执行摘要

OpenDesk 是一个视觉精致、功能丰富的 Electron 桌面 AI 助手，但在**核心安全、架构债务、P0 功能缺失**和**状态管理性能**方面存在严重问题。5 个独立审查 Agent 从不同维度交叉验证了多个关键发现。

**最关键的结论**（所有 5 个 Agent 一致或高度共识）：

1. **安全红线** — `sandbox: false` 关闭了 Chromium 渲染器沙箱，IPC 文件工具无路径验证，Shell 白名单可轻易绕过，Artifacts 渲染存在 XSS 向量。这 8 个安全问题中有 7 个被评定为 Critical（CVSS 7.0-9.0）。
2. **架构债务** — `handlers.ts` 879 行 God File 违反单一职责，Turn/Item 领域模型完全缺失（与 PRODUCT.md 规格不符），store 间循环依赖严重。
3. **功能错位** — P0 核心功能（文件夹持久化、Computer Use 完整实现、审批策略、CSGHub Lite 集成）大量缺失，但 v2 功能（MCP、Skills、Artifacts、Ensemble、Memory）已提前实现。这是典型的**v0 功能债 + v2 功能膨胀**。
4. **性能崩溃** — 消息列表无虚拟滚动，streaming 每 token 触发全 App 重渲染，O(n²) 消息查找，同步磁盘写入无防抖。长对话（500+ 条）将不可用。
5. **UX 暗模式系统崩溃** — Tailwind 的 `darkMode: 'class'` 与 `globals.css` 的 `[data-theme="dark"]` 冲突，导致所有 `dark:` 前缀类无效。这是根本性的主题系统 bug。

**整体评估**：代码质量在 v2 功能（Ensemble、MCP、Artifacts）上展现了工程深度，但 v1 基础（安全、持久化、审批、沙箱）尚未达到生产级。建议在修复 P0 安全问题和架构债务之前，暂停所有新功能开发。

---

## 1. 风险总览：Top 20 最严重问题

按**严重程度 × 影响范围 × 修复难度**排序。所有引用均附代码路径。

| # | 问题 | 严重程度 | 影响 | 代码位置 | 修复难度 |
|---|------|---------|------|---------|---------|
| 1 | **sandbox: false** — 渲染器无沙箱保护 | 🔴 Critical | 任何 XSS/依赖污染 = 全系统权限 | `src/main/index.ts:29` | 低 |
| 2 | **IPC 文件工具无路径验证** — 渲染器可读写任意文件 | 🔴 Critical | `/etc/passwd`、`.bashrc`、密钥文件均可访问 | `src/main/ipc/handlers.ts:864-867` | 低 |
| 3 | **Shell 白名单可绕过** — `bash -c "rm -rf /"` 通过验证 | 🔴 Critical | 任意代码执行 | `src/main/tools/builtins.ts:128-155` | 中 |
| 4 | **SVG/Mermaid XSS via dangerouslySetInnerHTML** | 🔴 Critical | AI 生成 SVG 可执行 JS，窃取 API Key | `src/renderer/src/components/artifacts/ArtifactRenderer.tsx:182-183,243` | 低 |
| 5 | **Artifact iframe sandbox 过宽** — `allow-scripts` 允许挖矿/数据外泄 | 🔴 Critical | AI 生成 HTML 可执行任意 JS | `src/renderer/src/components/artifacts/ArtifactRenderer.tsx:96-102` | 低 |
| 6 | **MCP 无沙箱运行任意命令** | 🔴 Critical | 任何 MCP 服务器 = 完整用户权限 | `src/main/mcp/client.ts:85` | 中 |
| 7 | **Desktop IPC 绕过 `desktopEnabled` 设置** | 🔴 Critical | 关闭桌面控制后仍可截图/枚举窗口 | `src/main/ipc/handlers.ts:821-856` | 低 |
| 8 | **API Key 可通过 `getApiKey` + `fetchModels` 外泄** | 🔴 Critical | 渲染器可窃取所有 Key 并发送到任意 URL | `src/main/ipc/handlers.ts:340-356`, `src/renderer/src/store/settings.ts:102-109` | 低 |
| 9 | **Streaming 每 token 触发全 App 重渲染** | 🔴 Critical | 长对话卡顿，CPU 100% | `AppShell.tsx:63`, `chat.ts:163-181` | 中 |
| 10 | **消息列表无虚拟滚动 + O(n²) 查找** | 🔴 Critical | 500+ 条消息 = 不可用 | `ChatPanel.tsx:506-578`, `ChatPanel.tsx:519` | 中 |
| 11 | **Workspace 数据不在文件夹内 — 核心差异化失败** | 🔴 Critical | 产品#1承诺「文件夹=工作」未实现 | `src/main/ipc/handlers.ts:111-214`（全局 `userData` 存储） | 高 |
| 12 | **Dark mode 系统完全崩溃** — Tailwind `dark:` 类全部无效 | 🔴 Critical | 暗模式下所有硬编码颜色失效 | `tailwind.config.ts:3` vs `globals.css` `[data-theme="dark"]` | 低 |
| 13 | **debouncedSave 竞态 — 数据丢失** | 🔴 Critical | 切换 thread 时可能保存到错误 thread | `chat.ts:94-103` | 低 |
| 14 | **Workspace 删除不级联清理 Threads/Messages** | 🔴 Critical | 数据孤儿，磁盘泄漏 | `workspace.ts:121-130`, `handlers.ts:526-536` | 低 |
| 15 | **settings store 先 set 后 IPC — 数据不一致** | 🔴 Critical | IPC 失败时 UI 显示成功但重启丢失 | `settings.ts:112-131` | 低 |
| 16 | **AppleScript 字符串注入** | 🟡 Warning | macOS 远程代码执行 | `src/main/tools/desktop-tools.ts:26-32` | 低 |
| 17 | **approvalMode 定义但未执行** | 🟡 Warning | 用户设置「每次确认」被忽略 | `src/main/ipc/handlers.ts:72`, `executor.ts` | 中 |
| 18 | **handlers.ts 879 行 God File** | 🟡 Warning | 无法测试，回归风险高 | `src/main/ipc/handlers.ts` | 高 |
| 19 | **Store 间循环依赖** | 🟡 Warning | 死循环风险，测试困难 | `workspace.ts:12-13`, `chat.ts:3` | 中 |
| 20 | **没有 `aria-live` + 所有交互元素缺 focus 指示器** | 🟡 Warning | 可访问性全面失败 | `Message.tsx:601`, 全项目 `outline-none` | 低 |

**统计**：Critical 15 项，Warning 5 项。Critical 中安全 8 项、功能 3 项、性能 2 项、状态 2 项。

---

## 2. 按领域详细发现

### 2.1 架构审查（Architecture_Reviewer）

**核心发现**：Main 进程层背负严重技术债务，Renderer 架构相对健康。

#### 🔴 Critical

- **C1 — `sandbox: false` 与 ARCHITECTURE.md 矛盾**（`src/main/index.ts:29`）
  - 架构文档 §2 明确写 `sandbox: true`，但代码设为 `false`。
  - 如果这是故意为之（某些 Node.js 依赖需要），应在代码中注释说明原因。但目前无任何注释。

- **C2 — `ApprovalMode` 类型不匹配**（`src/shared/types.ts:41` vs `handlers.ts:72` vs `settings.ts:46`）
  - 类型定义：`'ask' | 'auto-edits' | 'auto-all' | 'bypass'`
  - 实际默认值：`'suggest'`（不在类型中）
  - 这是 latent bug，任何基于 `approvalMode` 分支的代码都会漏掉默认 case。

- **C3 — `handlers.ts` 879 行 God File**（`src/main/ipc/handlers.ts`）
  - 混合了：settings 持久化、API Key 加密、thread/message 持久化、draft 持久化、chat streaming（单聊 + ensemble）、model fetching、桌面截图、IPC 注册。
  - 模块级可变变量 `settings` 和 `abortControllers` 被所有 handler 共享，无隔离。
  - `doChatStream` 177 行，混合 provider 构建、skill 加载、memory 注入、工具执行、错误分类。
  - **建议**：拆分为 `settings-service.ts`、`thread-service.ts`、`chat-service.ts`、`model-service.ts`、`key-store.ts`。`handlers.ts` 只做 IPC 路由。

- **C4 — Memory 提取使用错误的消息数组**（`handlers.ts:718-727`）
  - 提取记忆时用的是 `messages`（原始用户输入），而非 `currentMessages`（包含 AI 回复和工具结果的完整对话）。
  - 后果：AI 回答和工具结果中的知识永远不被记忆。

- **C5 — `doChatStream` 错误分类过于脆弱**（`handlers.ts:728-743`）
  - 使用字符串子串匹配（`includes('model')`、`includes('does not exist')`）来分类错误类型。
  - 例如网络错误消息包含 "model not found" 会被错误分类为 `model` 类型而非 `network`。
  - 建议：使用 HTTP 状态码或 SDK 错误对象类型。

#### 🟡 Warning

- **W1 — Turn/Item 抽象缺失**（`src/shared/types.ts`）
  - PRODUCT.md §F-D-1 定义 Thread→Turn→Item 三层状态机。实际代码使用扁平的 `Message` 接口，用 `kind?: MessageKind` 区分类型。
  - 后果：无法做 per-turn token 统计、回滚、streaming item 级事件、审计追踪。

- **W2 — 循环依赖通过动态 `require()` 规避**（`src/main/tools/executor.ts:13`）
  ```typescript
  // Import dynamically to avoid circular dependency with workspace module
  const { listWorkspaces } = require('../workspace')
  ```
  - 这是架构 smell，绕过 TypeScript 类型检查和 tree-shaking。
  - 建议：提取 `getWorkspacePath()` 到独立的 `workspace-resolver.ts`。

- **W3 — 配置路径逻辑在 4 个模块重复**
  - `handlers.ts:101-127`、`workspace.ts:15-23`、`memory/store.ts:6-10`、`health-checker.ts:15-19`
  - 建议：创建 `src/main/paths.ts` 统一导出。

- **W4 — 工具调用去重使用非确定性 `JSON.stringify`**（`tool-coordinator.ts:11-13`）
  - `JSON.stringify` 键序不保证一致，相同参数可能产生不同 key。
  - Ensemble 模式下同一工具调用可能被执行多次。

- **W5 — `applyPatch` 是 naive 实现**（`file-tools.ts:63-121`）
  - 不处理重叠 hunk、context line 验证、`\ No newline at end of file`、Windows CRLF。
  - 建议：使用 `git apply` 或成熟库（如 `diff`）。

- **W6 — `buildTools` 每次聊天重新扫描所有 skills**（`executor.ts:128-148`）
  - 同步文件 I/O 阻塞主线程，无缓存。
  - 建议：按 workspace 缓存，skill 增删时失效。

- **W7 — `builtins.ts` 457 行混合 4 种工具**（`file-tools.ts` 被 shadow）
  - 包含 shell 白名单（250+ 命令）、危险模式 regex、4 个文件工具、7 个桌面工具、1 个 shell 工具、1 个 web 搜索工具。
  - 建议：拆分为 `shell-security.ts`、`file-tools.ts`、`desktop-tools.ts`、...。

- **W8 — `doctor.ts` `checkDiskSpace` 检查的是内存而非磁盘**（`doctor.ts:55-68`）
  - 使用 `freemem()` / `totalmem()`，不是磁盘空间。

- **W9 — `provider:healthChanged` IPC 事件在 preload 中无监听**（`handlers.ts:876`）
  - main 发送但 renderer 收不到，事件孤儿化。

- **W10 — `desktop-tools.ts` 仅 macOS**（全部函数）
  - 所有桌面控制使用 AppleScript。Windows/Linux 无实现。

- **W11 — Shell 白名单过于宽泛**
  - 包含 `rm`、`ssh`、`scp`、`docker`、`kubectl`、`terraform`、`aws`、`chmod`、`chown`、`shutdown`、`reboot`、`curl`、`wget`、`eval`、`exec` 等。
  - 白名单如此之广，实际上等于允许任意系统修改。

- **W12 — `Message` 类型过载**（`src/shared/types.ts:5-21`）
  - 15+ 可选字段覆盖工具调用、Ensemble 元数据、仲裁信息。无编译时安全。

- **W13 — `ARCHITECTURE.md` 严重过时**
  - 声称 `sandbox: true`（实际 false）
  - 声称 MCP 未实现（实际完整实现）
  - 声称 Skills 仅扫描兼容（实际完整执行）
  - 未提及 Ensemble/多 Agent 模式
  - 声称 4 个 store（实际 7+）

#### 🟢 Info

- `fetchModels` 错误被静默吞掉（`catch { return [] }`），用户看到空下拉框无诊断信息
- `applyPatch` 路径拼接使用字符串插值而非 `join()`（`file-tools.ts:43`）
- `openai.ts` 使用 `as any` 绕过 SDK 类型检查（`openai.ts:57`）
- `AnthropicProvider` 硬编码 `max_tokens: 8096`（`anthropic.ts:65`）
- `Google` / `generic` provider 类型返回 `null`（`builder.ts:16-18`），UI 允许添加但聊天时静默失败
- `run-tracker.ts` 的 `activeRuns` Map 在错误抛出时可能永远不清理（内存泄漏）

---

### 2.2 功能审查（Feature_Reviewer）

**核心发现**：P0 实现率 34%，v2 功能提前实现 3 个完整 + 2 个部分。存在「v0 功能债 + v2 功能膨胀」。

#### P0 功能实现矩阵（44 项）

| 状态 | 数量 | 比例 |
|------|------|------|
| ✅ 完全实现 | 15 | 34% |
| 🟡 部分实现 | 14 | 32% |
| ❌ 缺失 | 15 | 34% |

**P0 中完全缺失的关键项（5 项）**：
1. **F-A-6** — 线程不在 `{folder}/.opendesk/` 中持久化，而是全局 `userData/opendesk/messages/`
2. **F-C-2/C-3** — 无鼠标/键盘控制（Computer Use 是 #3 硬指标）
3. **F-D-5** — 无审批策略（`approvalMode` 存在但不执行）
4. **F-F-1** — 无 CSGHub Lite 集成（仅 Ollama 自动检测）
5. **F-D-6/D-7** — 无 `rollout.jsonl` / SQLite（Codex 风格持久化）

**P0 中部分实现的典型项**：
- F-A-7 重启恢复：workspace/thread 元数据恢复，但 messages 从全局路径而非 workspace 文件夹恢复
- F-C-1 屏幕捕获：仅全屏，无窗口/区域选择
- F-C-4 窗口管理：可列出窗口，但无法激活/关闭
- F-E-2 7 个适配器：实际只有 3 个核心（OpenAI、Anthropic、Ollama），其余通过 OpenAI 兼容端点映射

#### P1 功能（8 项）

| 状态 | 数量 | 比例 |
|------|------|------|
| ✅ 完全实现 | 3 | 38% |
| 🟡 部分实现 | 2 | 25% |
| ❌ 缺失 | 3 | 38% |

#### P3 提前实现（v2 不应在 v1 中）

| 功能 | 规格 | 实际状态 | 评估 |
|------|------|---------|------|
| MCP Client | ⏳ v2 | ✅ 完整实现 | **PREMATURE** |
| Skills System | ⏳ v2 | ✅ 完整实现 | **PREMATURE** |
| Artifacts Rendering | ⏳ v2 | ✅ 完整实现 | **PREMATURE** |
| Memory Service | ⏳ v2 | 🟡 部分实现 | **PREMATURE** |
| Ensemble / Subagent | ⏳ v2 | 🟡 部分实现 | **PREMATURE** |

#### 超出规格的功能（21 项）

包括：Ensemble Mode、Compare Mode、Agent Mode、Toast System、File Panel、Command Palette、Global Search、Theme System、Draft Auto-Save、@file/@workspace/#thread 提及、Skill Picker、Agent Activity Bar、Emoji Icon Picker、Arbitrator Confidence Display、Token Estimate、Network Status、Message Context Menu、Screenshot Attachment、Drag & Drop、Paste Image、Message Actions（右键菜单）。

**评估**：大多数是优质的 UX 增强，但 Ensemble/Compare/Agent Mode 的复杂度与 P0 的缺失不成比例。

#### 8 个集成问题

1. **数据模型不匹配**：规格 Thread→Turn→Item，实际扁平 Message[]
2. **Workspace 数据不可移植**：所有数据在 `~/Library/Application Support/opendesk/`，移动项目文件夹即断联
3. **System Prompt Token 膨胀**：Memory + AGENTS.md + Skills + Workspace 上下文无 token 预算管理
4. **Ensemble/Normal 代码路径分叉**：`doChatStream` 和 `doEnsembleChat` 完全独立，修复需做两遍
5. **MCP 工具未接入 Chat 循环**：MCP 工具被发现但 `doChatStream` 只传 `buildTools()`（文件工具+shell），MCP 工具从未被 AI 调用
6. **Skills vs. AGENTS.md 优先级不明**：两者都注入 system prompt，无文档或强制优先级
7. **File Panel 与 File Tools 竞态**：File Panel 直接编辑文件，AI 文件工具不知情，可能覆盖
8. **Streaming 无错误恢复**：流式错误后部分消息已入 store，无「从断点恢复」机制

---

### 2.3 UX/UI 审查（UX_Reviewer）

**核心发现**：视觉设计精致，但暗模式系统崩溃、可访问性全面失败、性能 anti-pattern 严重。约 70% 达到竞品（Kimi Work / Trae / Claude Desktop）的 UX 水平。

#### 🔴 Critical（5 项）

1. **Dark mode 系统完全崩溃**（`tailwind.config.ts:3`）
   - `tailwind.config.ts` 使用 `darkMode: 'class'`，需要 `<html class="dark">`。
   - `globals.css` 使用 `[data-theme="dark"]` 设置属性。
   - 结果：所有 `dark:bg-*`、`dark:text-*`、`dark:border-*` 前缀**永远不会匹配**。
   - 影响：Toast、InputBar、Message、SkillCard 等组件的暗模式全部失效。
   - 修复：将 `tailwind.config.ts` 改为 `darkMode: ['class', '[data-theme="dark"]']` 或统一使用 `class` 模式。

2. **O(n²) 消息索引查找**（`ChatPanel.tsx:519`）
   ```typescript
   const globalIdx = messages.findIndex(m => m.id === msg.id)
   ```
   - 在 `messageGroups.map` 循环内执行，100 条消息 = 10,000 次比较/渲染。
   - Streaming 时每 token 重新渲染，累积计算量爆炸。
   - 修复：预计算 `Map<string, number>` 或从 group index 推导。

3. **无 `aria-live` 用于流式内容**（`Message.tsx:601`）
   - 屏幕阅读器用户无法感知 AI 回复正在生成。StreamCursor 已 `aria-hidden`，但消息容器没有 `aria-live`。

4. **所有交互元素缺 focus 指示器**
   - 全项目滥用 `outline-none` 而无 `focus-visible:ring-2` 替代。键盘导航完全不可见。
   - 违反 WCAG 2.1 §2.4.7。

5. **InputBar 监听器每击键重新挂载**（`InputBar.tsx:124`）
   - `useEffect` 依赖 `[text]`，每次输入都 remove/re-add 事件监听器。

#### 🟠 High（16 项，精选）

- **硬编码亮模式颜色破坏暗模式**：`ChatPanel.tsx:268` (`bg-indigo-50`)、`ChatPanel.tsx:273` (`bg-emerald-50`)、`Message.tsx:411` (`border-emerald-200`)、`Message.tsx:466` (`bg-red-50/60`)、`SkillCard.tsx:13` (`SOURCE_COLORS` 全亮模式)。这些颜色在暗模式下不可见或刺眼。
- **Native `confirm()` 对话框**（`Sidebar.tsx:99,133`）：删除 thread/workspace 时使用原生确认框，破坏视觉一致性。
- **Slide-in panels 无焦点陷阱**（`AppShell.tsx:175-200`）：SkillsPanel、FilePanel、MemoryPanel 是自定义 `motion.div`，键盘焦点可逃逸到 chat 区域。
- **Onboarding modal 嵌套 Dialog 结构**（`OnboardingModal.tsx:82`）：`Dialog.Content` 嵌套在 `Dialog.Overlay` 内，Radix 期望它们为兄弟节点。
- **Scroll-to-bottom 按钮重叠输入栏**（`ChatPanel.tsx:565`）：`fixed bottom-28` 是 magic number，附件增多时重叠。
- **TitleBar 是死代码**（`TitleBar.tsx:1`）：导出但从未被 `AppShell.tsx` 导入，drag region 分散在 ChatPanel 和 Sidebar 中。
- **Workspace picker 仅鼠标离开关闭**（`ChatPanel.tsx:205`）：`onMouseLeave` 过于敏感，应点击外部或按 Escape 关闭。
- **FilePanel tree 无 loading skeleton**（`FilePanel.tsx:307`）：显示纯文本 "Loading…" 而非 Skeleton 组件。
- **Error boundary 按钮颜色硬编码**（`AppShell.tsx:45`）：暗模式下 `var(--accent)` = `#FAFAFA`，按钮接近白底白字 = 不可见。
- **未实现的键盘快捷键仍在帮助文档中**：`ShortcutHelp.tsx` 列出 12 个快捷键（`⌘1-9`、⌘[/]、⌘⇧↑ 等）但 `AppShell.tsx` 无对应 handler。信任侵蚀。

#### 🟡 Medium（14 项，精选）

- 图标按钮缺 `aria-label`（`title` 属性不足）
- `CodeBlock.tsx` 的 `hljs.highlight()` 在主线程同步运行，大代码块阻塞渲染
- `CommandPalette.tsx` 的 `⌘K` 与 `GlobalSearch` 的 `⌘K` 冲突，无 `stopPropagation`
- `AnimatePresence popLayout` 在 100+ 消息列表上昂贵
- `AgentActivityBar` 的 `AnimatePresence` 在 `ChatPanel` 中每次 streaming 状态变化都触发出入动画
- Emoji picker 无 Escape 关闭 handler
- `SuggestionCard` hover scale 与 CSS translate-y 冲突

#### 竞品 UX 差距

| 功能 | Kimi Work | Trae | Claude Desktop | OpenDesk | 差距 |
|------|-----------|------|----------------|----------|------|
| 消息内搜索 | ✅ | — | ✅ | ❌ | **Missing** |
| Continue generating | — | — | ✅ | ❌ | **Missing** |
| 消息分支可视化 | — | — | ✅ | ⚠️ fork 无 UI | **Missing** |
| 内联文件预览 | ✅ | — | ❌ | ❌ | **Missing** |
| 主题切换 | ✅ | ✅ | ✅ | ⚠️ 系统崩溃 | **Critical** |
| 键盘快捷键 | ✅ | ✅ | ✅ | ⚠️ 大量未实现 | **Gap** |

---

### 2.4 安全与性能审查（Security_Performance_Reviewer）

**核心发现**：8 个 Critical 安全问题 + 3 个 Critical 性能问题，需要立即修复才能发布。

#### 🔴 Critical Security（8 项）

| ID | 发现 | CVSS | 位置 | 修复 |
|----|------|------|------|------|
| SEC-001 | `sandbox: false` | ~8.1 | `index.ts:29` | 设为 `true` |
| SEC-002 | IPC 文件工具无路径验证 | ~8.5 | `handlers.ts:864-867` | 移除或加白名单 |
| SEC-003 | Shell 白名单可绕过 | ~9.0 | `builtins.ts:128-155` | 移除解释器或加 sandbox |
| SEC-004 | SVG/Mermaid XSS | ~7.5 | `ArtifactRenderer.tsx:182-183,243` | 用 DOMPurify 或 iframe sandbox |
| SEC-005 | iframe sandbox 过宽 | ~7.0 | `ArtifactRenderer.tsx:96-102` | 限制为 `sandbox=""` 或加 CSP |
| SEC-006 | MCP 无沙箱运行任意命令 | ~8.8 | `mcp/client.ts:85` | 验证命令 + 最小 env + 隔离 |
| SEC-007 | Desktop IPC 绕过设置 | ~7.5 | `handlers.ts:821-856` | 加 `desktopEnabled` 检查 |
| SEC-008 | API Key 外泄 | ~7.8 | `handlers.ts:340-356` | 移除 `getApiKey`，验证 URL |

#### 🟡 Warning Security（5 项）

- **SEC-009** — `approvalMode` 定义但未执行。`executor.ts` 不检查审批模式。
- **SEC-010** — `isPathAllowed` 存在符号链接遍历和 TOCTOU 竞态。`resolve()` 跟随 symlink，且 `startsWith` 可被路径前缀攻击。
- **SEC-011** — 错误消息泄露内部路径和潜在 API Key。`chat:error` 直接发送原始错误消息。
- **SEC-012** — AppleScript 字符串注入。`desktop-tools.ts` 中 `x`、`y`、`text`、`key` 直接嵌入脚本字符串。
- **SEC-013** — `fetchModels` 无 URL 验证，存在 SSRF 风险。可访问 `169.254.169.254`（AWS 元数据）。

#### 🔴 Critical Performance（3 项）

| ID | 发现 | 位置 | 影响 |
|----|------|------|------|
| PERF-001 | 无虚拟滚动 | `ChatPanel.tsx:506-578` | 500+ 消息时不可用 |
| PERF-002 | InputBar 监听器依赖数组 14 项 | `InputBar.tsx:183-267` | 内存泄漏、重复消息处理 |
| PERF-003 | Main 进程同步磁盘写入 | `handlers.ts:157-159,194-196,212-214` | 阻塞 I/O、SSD 磨损、数据损坏风险 |

#### 🟡 Warning Performance（7 项）

- **PERF-004** — 每 token 独立 IPC 消息，2000 token = 2000 次 IPC 往返。建议缓冲 16ms 批量发送。
- **PERF-005** — `AnimatePresence mode="popLayout"` 在消息列表上昂贵。100+ 消息时布局重计算。
- **PERF-006** — 截图内存复制 5 次（base64 → Uint8Array → Blob → File → base64 → 磁盘）。4K 截图 50-100MB。
- **PERF-007** — 无代码分割。SkillsPanel、FilePanel、MemoryPanel、SettingsModal 等全部 eager import。
- **PERF-008** — Zustand 订阅无 shallow 比较。`AppShell` 订阅 `workspaces` 导致整个应用重渲染。
- **PERF-009** — Bundle 大小未验证。`mermaid` (~2.5MB)、`highlight.js` (~150KB 全语言)、`framer-motion` (~150KB)。

---

### 2.5 状态管理审查（State_Reviewer）

**核心发现**：Store 间循环依赖严重，chat store 700 行 God Object，streaming 导致全 App 重渲染，debouncedSave 存在竞态条件。

#### 🔴 Critical（6 项）

1. **Store 间循环依赖**（`workspace.ts:12-13`, `chat.ts:3`, `theme.ts:2`）
   - `workspace` → `settings` + `chat`
   - `chat` → `settings`
   - `theme` → `settings`
   - 跨 store 直接调用 `useOtherStore.getState().action()` 破坏独立性和可测试性。

2. **Chat Store 700 行 God Object**
   - 单聊消息、工具调用、Ensemble 多 Agent 流、仲裁、线程切换、附件、消息编辑/删除/重新生成/分叉全部在一个 store 中。
   - `ChatState` 接口有 40+ 属性。

3. **Streaming 每 token 触发全 App 重渲染**
   - `AppShell.tsx:63`：`const { newThread } = useChatStore()`（无 selector）
   - `AppShell` 包含 Sidebar、ChatPanel、SkillsPanel、FilePanel、SettingsModal、OnboardingModal 等全部子组件
   - 每个 streaming token 重渲染整个应用
   - 修复：使用 Zustand selector，将 `newThread` 提取到独立 hook

4. **debouncedSave 竞态条件**（`chat.ts:94-103`）
   - `saveTimeout` 是**全局变量**，非 per-thread
   - 600ms 内切换 thread 会导致消息保存到错误 thread
   - 无持久化错误处理（磁盘满、权限失败时无重试）

5. **Workspace 删除后 Messages 未清理**
   - `workspace.ts:121-130` 只清除 store 中的 `threads` 数组
   - `handlers.ts` 的 `workspace:remove` 不级联删除 threads 的 messages 文件
   - 磁盘上存在孤儿数据

6. **Settings Store 先 set 后 IPC**（`settings.ts:112-131`）
   - `addProvider` 中 `set` 在 `try-catch` 外部
   - IPC 失败时 store 已更新但磁盘未持久化
   - 用户看到添加成功，重启后消失

#### 🟡 Warning（8 项）

- **Theme Store 无 cleanup**（`theme.ts:36`）：`mediaQuery.addEventListener` 注册但永不移除。`setTheme` 中 `settingsStore.update()` 是 fire-and-forget。
- **Chat Store O(n) 查找**（`chat.ts:593-594`）：`findIndex` 在消息数组中线性搜索仲裁消息 ID。长对话时性能差。
- **无状态归一化**：所有列表用数组存储，`find()`/`findIndex()` 是 O(n)，更新单 item 需复制整个数组。
- **无乐观更新**：所有操作等待 IPC 后更新 UI，期间无 loading 反馈。
- **Zustand Selector 未使用**：`AppShell.tsx`、`Sidebar.tsx`、`ChatPanel.tsx` 大量使用 `useStore()` 无 selector，导致整个组件重渲染。
- **无全局 Loading/Error 状态**：各组件自行处理（如 `runningDoctor`），不一致。
- **无 Undo/Redo**：消息删除、thread 删除不可逆。
- **`forkThread` 动态 import**（`chat.ts:345-365`）：`await import('./workspace')` 是循环依赖 hack，破坏静态分析。

---

## 3. 交叉验证矩阵

哪些问题被多个审查维度同时发现？交叉验证越强，问题越确定。

| 问题 | 架构 | 功能 | UX | 安全/性能 | 状态 | 交叉数 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| `sandbox: false` | ✅ | — | — | ✅ | — | **2** |
| `handlers.ts` God File | ✅ | ✅ | — | ✅ | — | **3** |
| approvalMode 未执行 | — | ✅ | — | ✅ | — | **2** |
| Workspace 不在文件夹内 | — | ✅ | — | ✅ | — | **2** |
| Turn/Item 缺失 | ✅ | ✅ | — | — | — | **2** |
| 消息列表 O(n²) + 无虚拟滚动 | — | — | ✅ | ✅ | — | **2** |
| Streaming 全 App 重渲染 | — | — | ✅ | ✅ | ✅ | **3** |
| Dark mode 系统崩溃 | — | — | ✅ | — | — | 1 |
| IPC 文件工具无验证 | — | — | — | ✅ | — | 1 |
| Shell 白名单绕过 | — | — | — | ✅ | — | 1 |
| SVG/Mermaid XSS | — | — | — | ✅ | — | 1 |
| MCP 无沙箱 | — | — | — | ✅ | — | 1 |
| Desktop IPC 绕过 | — | — | — | ✅ | — | 1 |
| API Key 外泄 | — | — | — | ✅ | — | 1 |
| debouncedSave 竞态 | — | — | — | — | ✅ | 1 |
| Store 循环依赖 | ✅ | — | — | — | ✅ | **2** |
| InputBar 监听器泄漏 | — | — | ✅ | ✅ | — | **2** |
| 同步磁盘写入 | ✅ | — | — | ✅ | — | **2** |
| 硬编码亮模式颜色 | — | — | ✅ | — | — | 1 |

**交叉验证最强的 5 个问题**：
1. `handlers.ts` God File（3 个维度）
2. Streaming 全 App 重渲染（3 个维度）
3. `sandbox: false` + 安全问题（2 维度）
4. Store 循环依赖（2 维度）
5. InputBar 监听器泄漏 + 同步磁盘写入（各 2 维度）

---

## 4. 改进路线图

### P0 — 立即修复（发布前必须完成）

**安全（8 项，全部 Critical）**

| # | 行动 | 文件 | 估计工时 |
|---|------|------|---------|
| P0-1 | 启用 `sandbox: true` | `src/main/index.ts:29` | 0.5h |
| P0-2 | 移除或限制 IPC 文件工具 | `src/main/ipc/handlers.ts:864-867` | 1h |
| P0-3 | 移除解释器（bash/python/node 等）从 Shell 白名单 | `src/main/tools/builtins.ts:15-97` | 1h |
| P0-4 | SVG/Mermaid 用 DOMPurify 或 iframe sandbox | `ArtifactRenderer.tsx:182-183,243` | 2h |
| P0-5 | iframe 限制为 `sandbox=""` 或加 CSP | `ArtifactRenderer.tsx:96-102` | 1h |
| P0-6 | MCP 命令验证 + 最小 env + 隔离运行 | `src/main/mcp/client.ts:85` | 4h |
| P0-7 | Desktop IPC 加 `desktopEnabled` 检查 | `src/main/ipc/handlers.ts:821-856` | 0.5h |
| P0-8 | 移除 `settings:getApiKey`，`fetchModels` 验证 URL | `handlers.ts:340-356`, `settings.ts:102-109` | 1h |

**功能（3 项）**

| # | 行动 | 文件 | 估计工时 |
|---|------|------|---------|
| P0-9 | 将 workspace 数据迁移到 `{folder}/.opendesk/` | `workspace.ts`, `handlers.ts` | 8h |
| P0-10 | 实现审批策略（write/shell/desktop 前弹窗确认） | `executor.ts`, `InputBar.tsx` | 4h |
| P0-11 | 集成 MCP 工具到 chat 循环 | `handlers.ts:607-620`, `buildTools()` | 2h |

**UX（2 项）**

| # | 行动 | 文件 | 估计工时 |
|---|------|------|---------|
| P0-12 | 修复 dark mode 系统（统一 `class` 或 `data-theme`） | `tailwind.config.ts`, `globals.css` | 2h |
| P0-13 | 替换所有 `outline-none` 为 `focus-visible:ring-2` | 全项目 | 2h |

**性能（3 项）**

| # | 行动 | 文件 | 估计工时 |
|---|------|------|---------|
| P0-14 | 修复 AppShell/组件的 Zustand selector | `AppShell.tsx`, `Sidebar.tsx`, `ChatPanel.tsx` | 2h |
| P0-15 | 修复 InputBar 监听器依赖数组（用 `getState()`） | `InputBar.tsx:183-267` | 1h |
| P0-16 | Main 进程加防抖异步写入 | `handlers.ts:157-159,194-196,212-214` | 2h |

**状态管理（2 项）**

| # | 行动 | 文件 | 估计工时 |
|---|------|------|---------|
| P0-17 | 修复 debouncedSave（per-thread Map + flush） | `chat.ts:94-103` | 1h |
| P0-18 | 修复 settings store 先 IPC 后 set | `settings.ts:112-131` | 1h |

**P0 总工时估计**：约 35-40 小时（1 人全职 1 周）。

---

### P1 — 短期修复（发布后 2-4 周）

| # | 行动 | 原因 | 文件 |
|---|------|------|------|
| P1-1 | 拆分 `handlers.ts` 为 service 模块 | 可测试性、维护性 | 新文件 5-6 个 |
| P1-2 | 实现 `Turn`/`Item` 领域模型 | 与 PRODUCT.md 对齐 | `types.ts` + stores |
| P1-3 | 修复循环依赖（提取 workspace-resolver） | 架构健康 | `executor.ts`, `workspace.ts` |
| P1-4 | 创建 `paths.ts` 统一配置路径 | 消除重复 | 新文件 |
| P1-5 | 确定性的工具调用去重 | Ensemble 正确性 | `tool-coordinator.ts:11` |
| P1-6 | 缓存 skill 扫描结果 | 减少 chat 延迟 | `executor.ts:128-148` |
| P1-7 | 修复 `applyPatch` 鲁棒性 | 避免文件损坏 | `file-tools.ts:63-121` |
| P1-8 | 添加 `provider:healthChanged` 到 preload | 完成 IPC 契约 | `preload/index.ts` |
| P1-9 | 修复 AppleScript 注入 | macOS 安全 | `desktop-tools.ts` |
| P1-10 | 实现 `isPathAllowed` 的 `realpath()` + 符号链接防护 | 路径安全 | `handlers.ts:91-99`, `executor.ts:21-29` |
| P1-11 | 错误消息脱敏（去除路径和 API Key） | 信息泄露 | `handlers.ts:728-743` |
| P1-12 | 验证 `fetchModels` URL（防止 SSRF） | 网络安全 | `handlers.ts:218-249` |
| P1-13 | 添加消息列表虚拟滚动 | 长对话性能 | `ChatPanel.tsx` + `react-window` |
| P1-14 | 预计算 message index Map（消除 O(n²)） | 渲染性能 | `ChatPanel.tsx:519` |
| P1-15 | 修复硬编码亮模式颜色 | 暗模式完整性 | `ChatPanel.tsx`, `Message.tsx`, `SkillCard.tsx` |
| P1-16 | 实现未实现的键盘快捷键或从帮助文档移除 | 信任 | `AppShell.tsx`, `ShortcutHelp.tsx` |
| P1-17 | 替换 native `confirm()` 为 Radix AlertDialog | 一致性 | `Sidebar.tsx` |
| P1-18 | 为 slide-in panels 加焦点陷阱 + Escape 关闭 | 可访问性 | `AppShell.tsx` |
| P1-19 | Workspace 删除级联清理 Threads/Messages | 数据完整性 | `workspace.ts`, `handlers.ts` |
| P1-20 | 引入全局 loading/error store | 统一体验 | 新 store |

---

### P2 — 中期（1-2 个月）

| # | 行动 | 原因 | 文件 |
|---|------|------|------|
| P2-1 | 拆分 Chat Store（chat-core / chat-ensemble / chat-tools） | 单一职责 | `chat.ts` → 3 文件 |
| P2-2 | 引入状态归一化（`byId` + `allIds`） | 性能 | 所有 list stores |
| P2-3 | 引入乐观更新 | UX 响应性 | workspace/chat stores |
| P2-4 | 引入事件总线替代 store 间直接调用 | 解耦 | 新模块 |
| P2-5 | 添加 undo/redo | 用户体验 | chat/workspace stores |
| P2-6 | 引入 Immer middleware | 简化不可变更新 | 所有 stores |
| P2-7 | 实现 Token 缓冲（50ms 批量更新） | 减少重渲染 | `chat.ts` |
| P2-8 | 实现 Token 预算管理（system prompt 预警） | 避免超出上下文 | `handlers.ts` |
| P2-9 | 实现 Computer Use 完整（鼠标/键盘/窗口） | P0 硬指标 | `desktop-tools.ts` |
| P2-10 | 集成 CSGHub Lite | 本地模型兜底 | 新模块 |
| P2-11 | 实现配置导出/导入 | P0 功能 | `settings.ts` + UI |
| P2-12 | 实现 `rollout.jsonl` + `better-sqlite3` | 持久化升级 | 新模块 |
| P2-13 | 实现 auto-updater（electron-updater） | P1 功能 | `index.ts` + 发布流程 |
| P2-14 | 实现消息内搜索 | 竞品差距 | `ChatPanel.tsx` |
| P2-15 | 实现 "Continue generating" 按钮 | 竞品差距 | `Message.tsx` + `chat.ts` |
| P2-16 | 实现消息分支可视化 | 竞品差距 | `Message.tsx` + 新组件 |
| P2-17 | 实现 `.cursorrules`/`.traerules` 兼容 | P0 承诺 | `agents-md.ts` |
| P2-18 | 实现 `maxTokens` 配置 | 可配置性 | `ProviderConfig` + providers |
| P2-19 | 实现 Google / generic provider | 防止静默失败 | `builder.ts` |
| P2-20 | 添加 `run-tracker.ts` TTL 清理 | 内存泄漏 | `run-tracker.ts` |
| P2-21 | 修复 `doctor.ts` 磁盘检查（用 `fs.statfs`） | 正确性 | `doctor.ts` |
| P2-22 | 更新 `ARCHITECTURE.md` | 文档同步 | `docs/ARCHITECTURE.md` |
| P2-23 | 添加 ESLint + Prettier 配置 | 代码一致性 | 根目录 |
| P2-24 | 截图存储为文件（非 base64 入消息） | 内存/磁盘优化 | `handlers.ts` + `InputBar.tsx` |
| P2-25 | 代码分割（React.lazy + Vite chunks） | 启动性能 | `AppShell.tsx` + `electron.vite.config.ts` |

---

### P3 — 长期（3-6 个月）

| # | 行动 | 原因 | 评估 |
|---|------|------|------|
| P3-1 | 评估 Rust core (`opendesk-core`) | PRODUCT.md 要求 | 决定迁移或更新规格 |
| P3-2 | 事件驱动架构（RxJS/EventEmitter） | 解耦 streaming、工具执行、IPC | 替代长 async 函数 |
| P3-3 | 添加单元测试 | 零测试覆盖率 | 从模块化 service 层开始 |
| P3-4 | 实现 vision 支持 | `ModelInfo` 有 `supportsVision` 但未实现 | 消息格式 + provider |
| P3-5 | 对话修剪/摘要 | 上下文窗口溢出 | 无机制处理长对话 |
| P3-6 | 错误重试/退避 | 网络抖动失败 | 当前无重试 |
| P3-7 | 实现 RAG（BGE 嵌入） | v2 功能 | 用 CSGHub Lite |
| P3-8 | Plan Mode（先规划后执行） | v2 功能 | 可见执行计划 |
| P3-9 | CLI 入口 | v2 功能 | `opendesk` CLI |
| P3-10 | Web 端 | v2 功能 | 共享核心 |
| P3-11 | 跨设备同步 | v3 功能 | CRDT 同步 |
| P3-12 | 移动端 | v3 功能 | iOS/Android |

---

## 5. 统计汇总

### 问题严重度分布

| 审查维度 | 🔴 Critical | 🟡 Warning | 🟢 Info | 总计 |
|---------|------------|----------|--------|------|
| 架构 | 6 | 12 | 17 | 35 |
| 功能 | 5 | 8 | 21 | 34 |
| UX/UI | 5 | 16 | 14 | 35 |
| 安全/性能 | 11 | 12 | 2 | 25 |
| 状态管理 | 6 | 8 | 5 | 19 |
| **合计** | **33** | **56** | **59** | **148** |

### 按领域分类

| 领域 | Critical | Warning | 小计 |
|------|----------|---------|------|
| 安全 | 8 | 5 | 13 |
| 性能 | 3 | 7 | 10 |
| 架构/代码 | 6 | 12 | 18 |
| 功能 | 5 | 8 | 13 |
| UX/UI | 5 | 16 | 21 |
| 状态管理 | 6 | 8 | 14 |

### 竞品差距（按重要性）

1. **主题系统** — OpenDesk 暗模式崩溃，竞品均稳定
2. **消息内搜索** — 缺失，Kimi/Claude 均有
3. **Continue generating** — 缺失，Claude 有
4. **消息分支可视化** — fork 存在但无 UI，Claude 有完整树
5. **键盘快捷键** — 大量文档化但未实现，竞品全部实现
6. **内联文件预览** — 缺失，Kimi 有
7. **Reasoning UI 动画** — 过于简单，竞品更精致
8. **消息反馈** — 无 thumbs up/down

---

## 6. 结论与建议

### 总体评估

**OpenDesk 是一个在「功能深度」上远超 v1 规格、但在「基础安全」和「核心功能」上尚未达标的项目。**

**优势**（应保留和继续）：
- 视觉设计精致，glassmorphism + CSS 变量系统有高级感
- Ensemble 多 Agent 仲裁模式展现了工程深度
- MCP 客户端、Skills 系统、Artifacts 渲染的实现质量高于预期
- 15 个预设 Provider、Ollama 自动检测、Toast 系统、Command Palette 等 UX 增强体现了产品直觉

**劣势**（必须修复）：
- **8 个 Critical 安全问题**使当前代码**不可用于生产**（`sandbox: false`、任意文件访问、Shell 绕过、XSS、MCP 无沙箱、API Key 外泄）
- **P0 核心功能缺失**（文件夹持久化、Computer Use 完整、审批策略、CSGHub Lite）与产品承诺差距大
- **性能问题**使长对话不可用（无虚拟滚动、O(n²) 查找、全 App 重渲染）
- **状态管理债务**（循环依赖、700 行 God Object、竞态条件）会随着功能增长而恶化
- **暗模式系统崩溃**是根本性的视觉 bug

### 具体建议

1. **立即暂停所有新功能开发**，集中资源修复 P0 安全问题和架构债务。
2. **v2 功能 feature-flag**：将 MCP、Skills、Artifacts、Ensemble、Memory 默认关闭，添加 `enableExperimental` 设置。v1 发布应只包含稳定的基础功能。
3. **安全优先**：`sandbox: true`、移除危险 IPC 通道、修复 Shell 白名单、XSS 防护，这 4 项必须在任何外部测试前完成。
4. **核心差异化回归**：将 workspace 数据迁移到项目文件夹内是产品的灵魂，必须优先于任何 v2 功能。
5. **引入代码审查和 CI**：当前零测试覆盖率、无 linting、ARCHITECTURE.md 严重过时。需要建立基础工程纪律。
6. **暗模式修复是 UX 的最低门槛**：当前暗模式不可用，这在 2025 年是不可接受的。

### 风险评级

| 维度 | 风险等级 | 理由 |
|------|---------|------|
| 安全 | 🔴 **极高** | 8 个 Critical 安全问题，CVSS 最高 9.0 |
| 功能 | 🟡 **高** | P0 缺失 34%，核心差异化未实现 |
| 性能 | 🟡 **高** | 长对话不可用，无虚拟滚动 |
| 可维护性 | 🟡 **高** | 879 行 God File，循环依赖，无测试 |
| UX | 🟡 **中** | 暗模式崩溃，但交互设计整体精致 |
| 架构 | 🟡 **中** | 分层清晰，但 Main 进程债务重 |

**综合风险评级：🔴 高 — 不建议在当前状态下发布或扩大用户测试。**

---

## 附录：产出文件清单

| 文件 | 描述 | 行数 |
|------|------|------|
| `review/plan.md` | 多 Agent Review 计划 | 88 |
| `review/architecture_review.md` | 架构审查报告 | 418 |
| `review/feature_review.md` | 功能审查报告 | 390 |
| `review/ux_review.md` | UX/UI 审查报告 | 374 |
| `review/security_performance_review.md` | 安全与性能审查报告 | 931 |
| `review/state_review.md` | 状态管理审查报告 | 340 |
| `review/OpenDesk_Review_Report.md` | **本综合报告** | — |

---

*报告由 5 个并行审查 Agent + 主 Agent 综合生成。所有代码引用均基于 commit e8b67fa (main branch)。*
