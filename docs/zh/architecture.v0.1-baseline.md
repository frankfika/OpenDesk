# OpenDesk 架构文档

> 版本：v0.1.0 | 日期：2026-06-12

## 1. 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron 桌面壳                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Main Process (Node.js 20+)                            │ │
│  │  - Window Manager / Tray / Global Shortcuts          │ │
│  │  - IPC bridge (完整 API 层)                            │ │
│  │  - Workspace / Thread / Message 持久化                 │ │
│  │  - Provider 管理 / API Key 加密存储                      │ │
│  │  - Desktop Capture / Emergency Stop                  │ │
│  │  - AGENTS.md 扫描 / Doctor 诊断                        │ │
│  │  - File Tools (read/write/list/patch)                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Preload (contextIsolation: true, sandbox: true)     │ │
│  │  - contextBridge 暴露完整 API 到 renderer              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Renderer (React 18 + TypeScript 5 + Zustand)          │ │
│  │  - shadcn/ui + Radix UI + Tailwind + Framer Motion   │ │
│  │  - 4 个 Store (settings / workspace / chat / theme)   │ │
│  │  - Glassmorphism UI 设计                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 2. 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 桌面壳 | Electron | 31.0.1 | 跨平台桌面应用 |
| 构建工具 | electron-vite | 2.3.0 | 构建 + 热更新 |
| 前端框架 | React | 18.3.1 | UI 渲染 |
| 状态管理 | Zustand | 4.5.4 | 全局状态 |
| UI 组件 | Radix UI | 1.x | 无样式可访问组件 |
| 样式 | Tailwind CSS | 3.4.4 | 原子化 CSS |
| 动画 | Framer Motion | 12.40.0 | 过渡动画 |
| 图标 | Lucide React | 1.17.0 | SVG 图标 |
| Markdown | react-markdown | 9.0.1 | 消息渲染 |
| AI SDK | openai / @anthropic-ai/sdk | 4.56 / 0.27 | Provider 适配 |

## 3. 目录结构

```
OpenDesk/
├── docs/
│   ├── PRODUCT.md          # 产品需求文档（PRD）
│   └── ARCHITECTURE.md     # 本文件
├── plan.md                 # 优化计划
├── src/
│   ├── main/               # Electron Main 进程
│   │   ├── index.ts        # 入口：窗口、托盘、快捷键
│   │   ├── ipc/
│   │   │   └── handlers.ts # 所有 IPC handler
│   │   ├── providers/
│   │   │   ├── base.ts     # Provider 接口定义
│   │   │   ├── openai.ts   # OpenAI / Ollama 适配
│   │   │   └── anthropic.ts # Anthropic 适配
│   │   ├── tools/
│   │   │   └── file-tools.ts # 文件系统工具
│   │   ├── workspace.ts    # Workspace CRUD
│   │   ├── agents-md.ts    # AGENTS.md 扫描
│   │   ├── doctor.ts       # 系统诊断
│   │   ├── tray.ts         # 系统托盘
│   │   └── shortcuts.ts    # 全局快捷键
│   ├── preload/
│   │   └── index.ts        # contextBridge API 暴露
│   ├── renderer/
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.tsx      # 入口（主题 + 引导）
│   │       ├── main.tsx     # React 挂载
│   │       ├── env.d.ts
│   │       ├── styles/
│   │       │   └── globals.css  # CSS 变量 + 主题 + prose
│   │       ├── lib/
│   │       │   ├── utils.ts     # 工具函数
│   │       │   └── api-stub.ts # Browser 降级存根
│   │       ├── store/
│   │       │   ├── settings.ts  # 设置 + Provider 管理
│   │       │   ├── workspace.ts # Workspace + Thread 管理
│   │       │   ├── chat.ts      # 消息 + 流式 + 持久化
│   │       │   ├── theme.ts     # 主题管理
│   │       │   └── skills.ts    # Skills 扫描
│   │       └── components/
│   │           ├── layout/
│   │           │   ├── AppShell.tsx    # 整体布局壳
│   │           │   └── Sidebar.tsx     # 侧边栏（Workspace 树）
│   │           ├── chat/
│   │           │   ├── ChatPanel.tsx   # 聊天面板
│   │           │   ├── InputBar.tsx    # 输入栏（附件、模型选择）
│   │           │   ├── Message.tsx     # 消息行（reasoning/tool/error）
│   │           │   ├── CodeBlock.tsx   # 代码块（复制按钮）
│   │           │   ├── MessageActions.tsx # 消息操作菜单
│   │           │   └── StreamCursor.tsx # 流式光标
│   │           ├── settings/
│   │           │   ├── SettingsModal.tsx  # 设置弹窗（6 标签）
│   │           │   └── ProviderForm.tsx   # Provider 添加表单
│   │           └── onboarding/
│   │               └── OnboardingModal.tsx # 首次启动引导
│   └── shared/
│       └── types.ts         # 全栈共享类型定义
├── out/                     # 构建输出
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── electron.vite.config.ts
```

## 4. 数据流

### 4.1 消息发送流程

```
用户输入 → InputBar
  → ChatStore.addMessage() → 本地状态更新
  → IPC: chat:send → Main Process
    → Provider.stream() → AI API 流式响应
    → IPC: chat:token → Renderer
      → ChatStore.appendToken() → UI 更新
    → IPC: chat:done → Renderer
      → ChatStore.setStreaming(false)
      → ChatStore.saveThread() → 持久化到磁盘
```

### 4.2 Workspace 切换流程

```
用户点击 Workspace → Sidebar
  → WorkspaceStore.setActiveWorkspace()
    → 加载该 Workspace 的 Threads
    → ChatStore.switchThread(null) → 清空消息
  用户点击 Thread
    → WorkspaceStore.setActiveThread()
      → ChatStore.switchThread(threadId)
        → 保存旧 Thread 消息
        → 加载新 Thread 消息
```

### 4.3 主题切换流程

```
用户点击主题按钮 → ThemeStore.setTheme()
  → 更新 document.documentElement.classList
  → 同步到 SettingsStore.update({ theme })
  → IPC: settings:set → 持久化
```

## 5. 持久化策略

| 数据 | 存储位置 | 格式 | 说明 |
|------|----------|------|------|
| Settings | `userData/opendesk/settings.json` | JSON | Provider 配置、主题、行为 |
| API Keys | `userData/opendesk/keys.bin` | 加密二进制 | safeStorage 加密 |
| Workspaces | `userData/opendesk/workspaces.json` | JSON | Workspace 元信息 |
| Threads | `userData/opendesk/threads.json` | JSON | Thread 元信息 |
| Messages | `userData/opendesk/messages/<threadId>.json` | JSON | 按 Thread 分离 |

## 6. IPC API 契约

### Settings
- `settings:get` → `AppSettings`
- `settings:set` → `boolean`
- `settings:setApiKey` → `boolean`
- `settings:getApiKey` → `string | null`
- `settings:testProvider` → `boolean`
- `settings:fetchModels` → `ModelInfo[]`

### Workspace
- `workspace:list` → `Workspace[]`
- `workspace:add` → `Workspace | null`（自动弹出文件夹选择器）
- `workspace:remove` → `boolean`
- `workspace:update` → `Workspace | null`
- `workspace:relink` → `Workspace | null`（自动弹出或传入路径）
- `workspace:scanAgentsMd` → `AgentsMdInfo`

### Thread
- `thread:list` → `Thread[]`
- `thread:create` → `Thread`
- `thread:update` → `Thread | null`
- `thread:delete` → `boolean`
- `thread:loadMessages` → `Message[]`
- `thread:saveMessages` → `boolean`

### Chat（流式，使用 ipcMain.on / ipcRenderer.send）
- `chat:send` → 无返回（通过 `chat:token` / `chat:done` / `chat:error` 事件）
- `chat:abort` → 无返回
- `chat:regenerate` → 无返回
- `chat:editMessage` → 无返回

### Desktop
- `desktop:capture` → `string`（base64 PNG）
- `desktop:emergencyStop` → `boolean`
- `desktop:getWindows` → `WindowInfo[]`

### Doctor
- `doctor:run` → `DoctorReport`

### Skills
- `skills:list` → `Skill[]`

### App 事件（Main → Renderer）
- `app:new-chat` → 新建对话
- `app:open-settings` → 打开设置
- `app:focus-input` → 聚焦输入框
- `desktop:emergencyStop` → 紧急停止

## 7. 安全设计

1. **API Key 加密**：使用 Electron `safeStorage` 加密存储，永不明文落盘
2. **contextIsolation**：Preload 与 Renderer 隔离，仅暴露白名单 API
3. **sandbox**：Renderer 进程沙箱化
4. **桌面操作权限**：Computer Use 需用户显式启用（`desktopEnabled` 设置）
5. **紧急停止**：全局快捷键 `Cmd/Ctrl+.` 可立即中止所有 AI 操作

## 8. 主题系统

CSS 变量定义在 `globals.css` 的 `:root` 中，支持浅色/深色/跟随系统三种模式：

```css
:root {
  --bg-sidebar: rgba(249, 249, 251, 0.65);
  --bg-content: rgba(255, 255, 255, 0.65);
  --text-primary: #111827;
  --accent: #0F172A;
  --border: rgba(228, 228, 231, 0.6);
}

[data-theme="dark"] :root {
  --bg-sidebar: rgba(24, 24, 27, 0.65);
  --bg-content: rgba(9, 9, 11, 0.65);
  --text-primary: #FAFAFA;
  --accent: #FAFAFA;
  --border: rgba(39, 39, 42, 0.6);
}
```

切换方式：`document.documentElement.setAttribute('data-theme', 'dark')`

## 9. 性能优化

1. **消息保存 Debounce**：600ms 延迟，避免频繁磁盘写入
2. **虚拟滚动**：消息列表使用原生 overflow-y-auto，自动滚动到底部
3. **按需加载**：Workspace 切换时才加载 Threads，Thread 切换时才加载 Messages
4. **Tree Shaking**：electron-vite 自动处理，renderer bundle ~990KB

## 10. 扩展点

| 扩展点 | 当前状态 | 未来计划 |
|--------|----------|----------|
| MCP 客户端 | ❌ 未实现 | v2 引入 |
| Artifacts 渲染 | ❌ 未实现 | v2 引入（HTML/React/Mermaid/SVG） |
| Skills 系统 | 🟡 扫描兼容 | v2 完整实现（SKILL.md 加载执行） |
| Computer Use 完整循环 | 🟡 截图基础 | v2 完整实现（截图→AI→执行→验证） |
| 本地模型（CSGHub Lite） | 🟡 Ollama 兼容 | v2 深度集成 |
| CLI 入口 | ❌ 未实现 | v2 引入 |
| Web 端 | ❌ 未实现 | v2 引入 |
