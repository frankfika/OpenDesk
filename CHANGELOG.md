# Changelog

All notable changes to OpenDesk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2025-06-20

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

## [0.1.0] — 2025-06-01

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
