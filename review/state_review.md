# OpenDesk 状态管理审查报告

> 审查范围：src/renderer/src/store/ 全部 7 个 Zustand store + 消费者组件
> 审查日期：基于 v0.1.0 代码

---

## 执行摘要

OpenDesk 使用 Zustand 进行状态管理，7 个 store 覆盖 settings、workspace、chat、theme、skills、artifacts、toast。整体架构可用，但存在**严重的 store 间循环依赖**、**性能问题**（O(n²) 查找、全组件重渲染）、**竞态条件**和**缺失的模式**（乐观更新、undo、状态归一化）。Chat store（700 行）承载了过多职责，是所有问题的核心。

**严重程度分布**：Critical × 6, Warning × 8, Info × 5

---

## 🔴 Critical Issues

### CRIT-1：Store 间循环依赖（死循环风险）

`workspace.ts` 直接 `import { useSettingsStore } from './settings'` 和 `import { useChatStore } from './chat'`。`chat.ts` 也 `import { useSettingsStore } from './settings'`。`theme.ts` 同样引用 `settings`。

```typescript
// workspace.ts:12
import { useSettingsStore } from './settings'
import { useChatStore } from './chat'

// chat.ts:3
import { useSettingsStore } from './settings'

// theme.ts:2
import { useSettingsStore } from './settings'
```

**风险**：
- 如果未来 `settings.ts` 反向引用 `workspace` 或 `chat`，会形成循环依赖，导致模块加载失败或运行时错误。
- 跨 store 直接调用（如 `useSettingsStore.getState().update(...)`）破坏了 store 的独立性和可测试性。
- 这种架构在测试时需要 mock 整个 store 链，增加了测试复杂度。

**建议**：引入一个中央事件总线或 Action 层。Store 只管理自己的状态，不直接调用其他 store。需要跨 store 通信时通过事件发布/订阅。

### CRIT-2：Chat Store 700 行 God Object — 职责过载

`chat.ts` 同时管理：单聊消息、工具调用、Ensemble 多 Agent 流、仲裁、线程切换、附件、消息编辑/删除/重新生成/分叉。这是 700 行代码，是整个应用中最大的单个模块。

**后果**：
- 难以测试：需要构造复杂的初始状态来测试单个功能
- 耦合严重：任何修改都可能影响其他功能
- 类型爆炸：`ChatState` 接口有 40+ 个属性

**建议**：拆分为 `chat-core.ts`、`chat-ensemble.ts`、`chat-tools.ts`、`chat-thread.ts` 等模块，通过 Zustand 的 `create` 组合或 Context API 组合。

### CRIT-3：Streaming 每 token 触发全 App 重渲染

`chat.ts` 的 `appendToken` 每次更新 `messages` 数组，创建新数组引用。`AppShell.tsx` 使用 `const { newThread } = useChatStore()`（无 selector），**整个 AppShell 组件会在每个 streaming token 时重渲染**。

```typescript
// AppShell.tsx:63
const { newThread } = useChatStore()
```

`AppShell` 包含 `Sidebar`、`ChatPanel`、`SkillsPanel`、`FilePanel`、`SettingsModal`、`OnboardingModal` 等全部子组件。这意味着**每个 streaming token 会重新渲染整个应用**。

```typescript
// chat.ts:163-181
appendToken: (token) => {
  set(s => {
    const msgs = [...s.messages]  // 新数组
    const last = msgs[msgs.length - 1]
    if (last && last.role === 'assistant') {
      msgs[msgs.length - 1] = { ...last, content: last.content + token }  // 新对象
    } else {
      msgs.push({ ... })  // 新数组
    }
    if (s.threadId) debouncedSave(s.threadId, msgs)
    return { messages: msgs }  // 触发所有 subscribers
  })
}
```

此外，`ChatPanel.tsx` 在 `messages` 变化时执行 `scrollIntoView`，而 `messages` 在 `appendToken` 时更新，导致每次 token 都触发滚动计算。

**建议**：
- 使用 Zustand selector：将 `newThread` 提取到单独的 hook 中
- `AppShell` 不应订阅 `chat` store 的 `messages`
- 使用 `shallow` 比较：只在特定字段变化时重渲染
- 引入消息缓冲池：将 streaming token 缓冲到 local ref，每 50ms 或每 10 个 token 批量更新一次 state

### CRIT-4：DebouncedSave 竞态条件（数据丢失风险）

```typescript
// chat.ts:94-103
let saveTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSave(threadId: string, messages: Message[]) {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    if (window.api?.thread?.saveMessages) {
      window.api.thread.saveMessages(threadId, messages).catch(console.error)
    }
  }, 600)
}
```

**问题**：
1. `saveTimeout` 是**全局变量**，不是 per-thread 的。如果用户在 600ms 内切换 thread，新 thread 的消息会覆盖旧 thread 的消息，或旧 thread 的消息被错误保存到新 thread。
2. `appendToken` 调用 `debouncedSave(s.threadId, msgs)`，但 `threadId` 来自闭包。如果 `switchThread` 在 600ms 内发生，旧 thread 的 messages 可能被错误写入新 thread。
3. 没有持久化错误处理：如果 `saveMessages` 失败（磁盘满、权限问题），没有重试机制，用户数据丢失。

**建议**：
- 将 `saveTimeout` 改为 `Map<string, Timeout>`（per-thread）
- `switchThread` 时强制 `flush` 当前 pending save
- 添加 save 失败的重试和错误提示

### CRIT-5：Workspace 删除后 Messages 未清理

```typescript
// workspace.ts:121-130
removeWorkspace: async (id) => {
  if (window.api?.workspace?.remove) {
    await window.api.workspace.remove(id)
  }
  set(s => {
    const workspaces = s.workspaces.filter(w => w.id !== id)
    const activeWorkspaceId = s.activeWorkspaceId === id ? (workspaces[0]?.id ?? null) : s.activeWorkspaceId
    return { workspaces, activeWorkspaceId, threads: activeWorkspaceId === id ? [] : s.threads }
  })
}
```

**问题**：`removeWorkspace` 只清除了当前 store 中的 `threads` 数组，但**没有删除该 workspace 下的所有 thread 的 messages 文件**。在 `handlers.ts` 中，`thread:delete` 会删除 messages 文件，但 `workspace:remove` 只调用 `removeWorkspace`，不级联删除 threads。

查看 `handlers.ts` workspace:remove：
```typescript
ipcMain.handle('workspace:remove', (_e, id: string) => {
  return removeWorkspace(id)
})
```

`workspace.ts` (main process) 的 `removeWorkspace` 没有清理 threads 或 messages。

**后果**：数据孤儿——磁盘上存在不属于任何 workspace 的 threads 和 messages 文件。

**建议**：在 `removeWorkspace` 中先获取该 workspace 的所有 threads，逐一删除 thread 的 messages 文件，再删除 workspace。

### CRIT-6：Settings Store 的 set-before-IPC 竞态

```typescript
// settings.ts:112-131
addProvider: async (config, apiKey) => {
  const providers = [...get().settings.providers, config]
  try {
    if (window.api?.settings?.set) {
      await window.api.settings.set({ providers })
    }
    if (window.api?.settings?.setApiKey) {
      await window.api.settings.setApiKey(config.id, apiKey)
    }
  } catch (e) {
    console.error('Failed to add provider:', e)
  }
  set(s => ({
    settings: {
      ...s.settings,
      providers,
      activeProviderId: s.settings.activeProviderId ?? config.id
    }
  }))
}
```

**问题**：`set` 在 `try-catch` 外部！如果 IPC 调用失败（例如安全存储失败），store 已经 optimistic 地更新了状态，但磁盘没有持久化。用户看到 provider 添加成功，但重启后消失。

`updateProvider` 和 `removeProvider` 也有同样问题。

**建议**：先 IPC 成功，再更新 store。如果 IPC 失败，不更新 store 并抛出错误让 UI 处理。

---

## 🟡 Warning Issues

### WARN-1：Theme Store 缺少 cleanup 和持久化错误处理

`theme.ts` 在 store 创建时注册 `mediaQuery.addEventListener`，但从不移除。在 Electron 中这可能是可接受的（renderer 进程不频繁重建），但如果是 web 或重载场景，会导致内存泄漏和重复事件。

`setTheme` 中 `settingsStore.update({ theme })` 是 fire-and-forget，没有 `await` 或错误处理。如果 IPC 失败，theme 切换在 UI 上看起来成功，但重启后恢复旧主题。

```typescript
// theme.ts:42-50
setTheme: (theme) => {
  const resolved = resolveTheme(theme)
  set({ theme, resolvedTheme: resolved })
  applyTheme(resolved)
  const settingsStore = useSettingsStore.getState()
  if (settingsStore.loaded) {
    settingsStore.update({ theme }).catch(console.error)  // fire-and-forget
  }
}
```

### WARN-2：Chat Store 的 O(n) 查找在 Message 列表中

`appendArbitrationToken` 和 `finalizeArbitration` 使用 `findIndex` 在 `messages` 数组中查找 `arbitrationMessageId`：

```typescript
// chat.ts:593-594
const idx = s.messages.findIndex(m => m.id === run.arbitrationMessageId)
```

对于长对话（1000+ messages），这是 O(n) 操作。每次仲裁 token 追加都触发一次线性搜索。如果仲裁过程很长，累积性能问题严重。

**建议**：维护 `messageId -> index` 的 Map，或使用归一化状态（`byId` + `allIds`）。

### WARN-3：No 状态归一化 — 嵌套数组导致性能问题

所有 store 使用**数组**存储列表（workspaces、threads、messages）。这种结构在 Zustand 中性能差：

- `find()` 和 `findIndex()` 是 O(n)
- 更新单个 item 需要复制整个数组
- `filter()` 和 `map()` 创建新数组，触发所有 subscribers

正确的做法（Redux/Zustand 最佳实践）是使用**归一化状态**：

```typescript
interface NormalizedState {
  byId: Record<string, Message>
  allIds: string[]
  activeId: string | null
}
```

这样更新单个 message 只需 `byId[msgId] = newMsg`，不触发其他组件重渲染。

### WARN-4：没有乐观更新（Optimistic Updates）

所有用户操作（添加 workspace、创建 thread、发送消息）都等待 IPC 成功后更新 store。UI 在 IPC 期间没有反馈，用户可能认为点击无效而重复操作。

例如：
```typescript
// workspace.ts:98-119
addWorkspace: async (folderPath, name) => {
  // ...browser mock fallback
  const workspace = await window.api.workspace.add()
  if (!workspace) throw new Error('No folder selected')
  set(s => ({ workspaces: [workspace, ...s.workspaces], activeWorkspaceId: workspace.id }))
  get().setActiveWorkspace(workspace.id)
  return workspace
}
```

用户点击 "Open Folder" 后，如果文件夹选择器延迟（用户在选择文件夹），UI 没有任何 loading 状态。选择完成后才更新 store。

### WARN-5：Zustand Selector 未使用（全组件重渲染）

多个组件使用 `useStore()` 无 selector，导致整个组件重渲染：

```typescript
// AppShell.tsx
const { newThread } = useChatStore()
const { createThread, activeWorkspace, loadWorkspaces, workspaces } = useWorkspaceStore()
const { settings, load: loadSettings, loaded: settingsLoaded } = useSettingsStore()
const { setTheme, toggleTheme } = useThemeStore()
```

`AppShell` 订阅了 `chat`、`workspace`、`settings`、`theme` 4 个 store。任何 store 的微小变化都会重渲染整个 `AppShell`。

同样的问题在 `Sidebar.tsx`（订阅 `workspace`、`settings`、`skills`、`theme`）和 `ChatPanel.tsx`（订阅 7 个 store）中存在。

### WARN-6：缺少全局 Loading/Error 状态

没有一个 central store 管理 "正在加载" 或 "全局错误" 状态。每个组件需要自己处理 loading（例如 `SettingsModal.tsx` 的 `runningDoctor`）。这导致：
- 代码重复
- 用户体验不一致（有的操作有 loading，有的没有）
- 无法做全局 loading 遮罩

### WARN-7：缺少 Undo/Redo

消息编辑、删除、thread 删除等操作都是不可逆的。没有 undo 栈。`deleteMessage` 只是 `filter` 掉消息，`deleteThread` 同样不可恢复。

### WARN-8：`forkThread` 动态 import 和循环依赖风险

```typescript
// chat.ts:345-365
forkThread: async (messageId) => {
  const workspaceStore = (await import('./workspace')).useWorkspaceStore.getState()
  // ...
}
```

使用动态 `import` 避免循环依赖，但这是一种 hack。它意味着模块系统无法静态分析依赖关系，代码拆分可能产生意外行为。这通常是循环依赖已经存在但尚未爆发的信号。

---

## 🟢 Info Issues

### INFO-1：Debounce 策略合理但实现粗糙

`chat.ts` 使用 600ms debounce 保存消息到磁盘，这是一个合理的策略。但实现缺少：
- per-thread timeout（已在上文批判）
- 应用关闭时的 flush（`beforeunload` 未处理）
- 最大等待时间（如果用户连续发送消息，debounce 可能无限延迟）

### INFO-2：Store 持久化与 IPC 解耦良好

每个 store 的数据持久化都通过 IPC 到 main process，而不是直接访问 localStorage 或文件系统。这保持了 renderer 的隔离性，符合 Electron 安全模型。这是一个好的设计决策。

### INFO-3：Theme 的 system 模式实现正确

`theme.ts` 使用 `matchMedia('prefers-color-scheme: dark')` 并监听系统主题变化，这是正确的实现。切换逻辑（dark → light → system → dark）也合理。

### INFO-4：`loadWorkspaces` 有合理的恢复逻辑

```typescript
// workspace.ts:57-96
loadWorkspaces: async () => {
  // 验证 restored IDs 仍然存在
  if (activeWorkspaceId && !workspaces.find(w => w.id === activeWorkspaceId)) {
    activeWorkspaceId = null
    activeThreadId = null
  }
  // 如果没有 active workspace，默认选第一个
  if (!activeWorkspaceId && workspaces.length > 0) {
    get().setActiveWorkspace(workspaces[0].id)
  }
}
```

这种防御性恢复逻辑是合理的。

### INFO-5：Chat Store 的 ensemble 状态管理有清晰的结构

`EnsembleRunState` 和 `AgentStream` 接口定义清晰，每个 agent 的流、状态、指标都独立管理。仲裁流程（startArbitration → appendArbitrationToken → finalizeArbitration）有明确的状态机。

---

## 改进建议（优先级排序）

### P0（立即修复）

1. **修复 AppShell 重渲染**：将 `useChatStore()` 改为 `useChatStore(s => s.newThread)`，并检查所有组件的 selector 使用
2. **修复 debouncedSave 竞态**：改为 per-thread Map，thread 切换时 flush
3. **修复 set-before-IPC**：settings store 的 addProvider/updateProvider/removeProvider 先 IPC 后 set
4. **修复 workspace 删除级联**：删除 workspace 时清理其 threads 和 messages
5. **拆 chat store**：将 ensemble 逻辑提取到独立 store，chat-core 只保留消息流和基本操作

### P1（短期）

6. **引入状态归一化**：将 `messages` 从数组改为 `byId` + `allIds` 结构
7. **引入乐观更新**：workspace/thread 操作先更新 UI 再调用 IPC，失败时回滚
8. **消除 store 间循环依赖**：通过事件总线或中央 action 层替代直接 `getState()` 调用
9. **添加全局 loading/error store**：统一管理异步操作状态
10. **添加 undo/redo**：为消息/线程操作添加 undo 栈

### P2（中期）

11. **引入 Immer**：使用 zustand/middleware 的 `immer` 简化不可变更新
12. **消息缓冲**：streaming token 缓冲 50ms 批量更新，减少重渲染频率
13. **持久化错误处理**：save 失败时显示 toast 错误并允许重试
14. **测试**：为每个 store 编写单元测试（需要解耦 IPC 依赖）

### P3（长期）

15. **评估 Redux Toolkit 或 Zustand 组合**：如果 store 继续膨胀，考虑更结构化的状态管理方案
16. **状态快照**：定期保存完整状态快照，支持崩溃恢复
