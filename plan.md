# OpenDesk 优化计划 v1.0

> 基于竞品调研（Kimi Work、Trae、Codex、Claude Desktop）和当前代码差距分析

## 一、当前核心差距

### 1.1 架构层（最严重）
| # | 差距 | 影响 | 优先级 |
|---|---|---|---|
| 1 | **无 Workspace/文件夹关联** | 产品最核心的差异化功能缺失 | P0 |
| 2 | **无持久化** | threads、messages 重启丢失 | P0 |
| 3 | **类型定义过于简单** | 缺少 Turn、Item、完整 Thread 等实体 | P0 |
| 4 | **无 AGENTS.md 加载** | 产品文档强调的功能未实现 | P1 |
| 5 | **IPC 接口不完整** | 缺少 workspace、desktop、doctor 等 | P1 |

### 1.2 UI 层
| # | 差距 | 影响 | 优先级 |
|---|---|---|---|
| 1 | **无主题切换** | 有 CSS 变量但无 UI 控制 | P1 |
| 2 | **无系统托盘** | 桌面应用基础功能缺失 | P1 |
| 3 | **无全局快捷键** | 无法快速呼出/紧急停止 | P1 |
| 4 | **消息无操作菜单** | 不能复制、重新生成、编辑、分叉 | P1 |
| 5 | **代码块无复制按钮** | 基础功能缺失 | P1 |
| 6 | **无文件附件/拖拽** | 多模态缺失 | P2 |
| 7 | **Settings 标签不完整** | 缺少 Workspaces、Desktop、Doctor | P1 |
| 8 | **无启动引导** | 首次使用体验差 | P1 |
| 9 | **无状态栏** | 缺少系统状态展示 | P2 |

### 1.3 功能层
| # | 差距 | 影响 | 优先级 |
|---|---|---|---|
| 1 | **Provider 模型列表不能自动获取** | 需手动输入模型名 | P1 |
| 2 | **无 Token 失效处理** | 401/403 时无引导 | P2 |
| 3 | **无健康检查** | 无法知道 provider 是否可用 | P2 |
| 4 | **无 reasoning/thinking 展示** | 现代 AI 必备 | P2 |
| 5 | **无文件系统工具** | shell/file_read/file_write 未实现 | P2 |

### 1.4 桌面集成
| # | 差距 | 影响 | 优先级 |
|---|---|---|---|
| 1 | **无系统托盘** | 桌面应用标配 | P1 |
| 2 | **无全局快捷键** | 无法快速唤醒 | P1 |
| 3 | **无窗口管理优化** | 最小化、恢复等行为不完善 | P2 |
| 4 | **无 Computer Use 基础** | 截图、鼠标、键盘 | P3 |

## 二、实施阶段

### Phase 1: 核心架构升级（基础层）
- [ ] 重写类型定义（types.ts）- 完整 Workspace/Thread/Turn/Item/Provider 模型
- [ ] 实现 Workspace Store - 文件夹关联、CRUD、持久化
- [ ] 实现 Chat Store 持久化 - messages 按 thread 保存到磁盘
- [ ] 扩展 IPC handlers - workspace、desktop、doctor 接口
- [ ] 实现 AGENTS.md 扫描和加载

### Phase 2: Main 进程增强
- [ ] 系统托盘（Tray）- 图标、右键菜单、最小化到托盘
- [ ] 全局快捷键 - ⌘⇧Space 呼出、⌘. 紧急停止、⌘K 聚焦输入
- [ ] 窗口管理优化 - 启动行为、最小化恢复、多屏支持
- [ ] 文件系统工具 - shell、file_read、file_write 基础实现
- [ ] 主题持久化

### Phase 3: UI/UX 全面优化
- [ ] Sidebar 重构 - Workspace 分组、文件夹关联、搜索
- [ ] ChatPanel 增强 - 欢迎页优化、空状态、状态栏
- [ ] Message 组件升级 - 操作菜单、代码块复制、reasoning 展示
- [ ] InputBar 完善 - 文件拖拽、附件、模型自动获取
- [ ] SettingsModal 扩展 - Workspaces、Desktop、General、Doctor 标签
- [ ] 主题切换 UI
- [ ] 启动引导（Onboarding）

### Phase 4: Provider & Chat 功能完善
- [ ] Provider 模型列表自动获取（/v1/models）
- [ ] Token 失效检测和引导
- [ ] 健康检查机制
- [ ] 流式输出优化
- [ ] 消息编辑/重新生成/分叉

### Phase 5: 文档与交付
- [ ] 更新 PRODUCT.md 实现状态
- [ ] 编写 ARCHITECTURE.md
- [ ] 编写 CHANGELOG.md
- [ ] 截图验证

## 三、竞品关键洞察

### Kimi Work
- **三栏布局**：左侧任务列表、中间对话、右侧结果预览
- **本地文件深度操作**：直接拖拽、读取、编辑本地文件
- **Agent Swarm**：300+ 子 Agent 并行
- **WebBridge**：AI 自主操作浏览器
- **定时任务（Cron）**：内置 Cron 引擎

### Trae
- **三模式架构**：IDE / Builder / SOLO Coder
- **Figma 转代码**：设计稿一键转前端代码
- **MCP 集成**：1.1 万工具
- **中文全界面**：本土化体验极致

### Codex
- **Rust Core + JSON-RPC**：80+ crate，前后端解耦
- **AGENTS.md**：项目级 system prompt，层级发现链
- **Skills 系统**：.codex/skills/ 目录组织
- **多 Agent 并行**：6 线程并发
- **400K 上下文**：Diff-based forgetting

### Claude Desktop
- **Computer Use**：截图 → 视觉理解 → 执行 → 验证循环
- **Projects**：知识库 + 自定义指令 + 组织化历史
- **Artifacts**：HTML/React/Mermaid/SVG/Code 内嵌渲染
- **Skills**：SKILL.md 跨平台可移植
- **MCP**：AI 的 USB-C 接口
- **Cowork 模式**：本地 VM + 文件访问 + 多步骤任务

## 四、设计决策

1. **保持 Electron + React + TypeScript 栈** - 与当前一致，生态成熟
2. **暂不引入 Rust Core** - v1 用 Node.js 实现核心，降低复杂度
3. **Workspace 优先于 Projects** - 按产品文档，文件夹 = workspace 是核心差异化
4. **MCP 和 Artifacts 放到 v2** - v1 先做好基础聊天 + Workspace + Provider
5. **Computer Use 基础框架** - v1 实现截图 API，v2 实现完整循环
6. **Skills 保持兼容** - 继续扫描 .codex/skills 和 .claude/skills

## 五、文件变更清单

### 新增文件
- `src/shared/types.ts` - 完整重写
- `src/main/workspace.ts` - Workspace 管理
- `src/main/agents-md.ts` - AGENTS.md 扫描
- `src/main/tray.ts` - 系统托盘
- `src/main/shortcuts.ts` - 全局快捷键
- `src/main/tools/` - 文件系统工具
- `src/renderer/src/store/workspace.ts` - 重写
- `src/renderer/src/store/chat.ts` - 重写（持久化）
- `src/renderer/src/store/theme.ts` - 主题管理
- `src/renderer/src/components/workspace/` - Workspace 相关组件
- `src/renderer/src/components/onboarding/` - 启动引导
- `src/renderer/src/components/chat/CodeBlock.tsx` - 代码块复制
- `src/renderer/src/components/chat/MessageActions.tsx` - 消息操作

### 修改文件
- `src/main/index.ts` - 托盘、快捷键、窗口管理
- `src/main/ipc/handlers.ts` - 扩展 IPC 接口
- `src/preload/index.ts` - 暴露新 API
- `src/renderer/src/App.tsx` - 主题、引导
- `src/renderer/src/components/layout/AppShell.tsx` - 整体布局
- `src/renderer/src/components/layout/Sidebar.tsx` - Workspace 分组
- `src/renderer/src/components/chat/ChatPanel.tsx` - 状态栏、欢迎页
- `src/renderer/src/components/chat/Message.tsx` - 操作菜单、reasoning
- `src/renderer/src/components/chat/InputBar.tsx` - 附件、模型获取
- `src/renderer/src/components/settings/SettingsModal.tsx` - 新标签
- `src/renderer/src/components/settings/ProviderForm.tsx` - 模型列表
- `src/renderer/src/styles/globals.css` - 主题变量优化

## 六、验收标准

- [ ] 能打开文件夹作为 workspace，侧边栏按 workspace 分组显示 threads
- [ ] 关闭重启后所有 workspace、threads、messages 自动恢复
- [ ] 系统托盘常驻，右键可新建对话/退出
- [ ] 全局快捷键 ⌘⇧Space 呼出窗口
- [ ] 主题可切换（浅色/深色/跟随系统），重启保持
- [ ] 消息可复制、可重新生成、可编辑后重发
- [ ] 代码块有复制按钮
- [ ] Provider 添加时可自动获取模型列表
- [ ] AGENTS.md 被加载并显示在状态栏
- [ ] Settings 有 Providers、Workspaces、Desktop、General 标签
- [ ] 首次启动有 3 步引导
