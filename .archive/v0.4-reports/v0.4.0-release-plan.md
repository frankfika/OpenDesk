# OpenDesk v0.4.0 发版优化计划

> 目标：全面优化代码质量、补全测试、验证跨平台构建，确保发版质量
> 日期：2026-06-20

## Stage 1: 基础设施修复（串行）

### 1.1 CHANGELOG 补全
- 补充 v0.3.0 变更条目（从 Git 历史提取）
- 补充 v0.4.0 变更条目（从当前代码和 FIXES_SUMMARY 提取）
- 输出：CHANGELOG.md 更新

### 1.2 版本号一致性检查
- 确认 package.json version = 0.4.0
- 确认构建产物版本号一致
- 输出：确认无误

### 1.3 macOS 构建产物更新
- 清理旧的 0.3.0 构建产物
- 运行 `npm run package` 生成 0.4.0 dmg/zip
- 输出：dist/ 目录新产物

## Stage 2: 代码重构（可并行）

### 2.1 拆分 InputBar.tsx（Owner: Coder_A）
- **InputBar.tsx** (1,142行 → 目标 <300行)
- 拆分出：
  - `InputBarCore.tsx`：textarea + 基本输入逻辑
  - `InputBarEnsemble.tsx`：ensemble 配置 UI
  - `InputBarToolbar.tsx`：底部工具栏（截图、模型选择、模式切换等）
  - `InputBarDragDrop.tsx`：拖拽/粘贴逻辑
  - `useInputBar.ts`：自定义 hook，集中状态管理
- 禁止修改：chat.ts, workspace.ts, types.ts

### 2.2 拆分 SettingsModal.tsx（Owner: Coder_B）
- **SettingsModal.tsx** (1,016行 → 目标 <300行)
- 拆分出：
  - `SettingsModal.tsx`：仅外壳/Tab 容器
  - `GeneralTab.tsx`：通用设置 Tab
  - `ProvidersTab.tsx`：Provider 管理 Tab
  - `EnsembleTab.tsx`：Ensemble 设置 Tab
  - `MCPTab.tsx`：MCP 服务器 Tab
  - `AboutTab.tsx`：关于 Tab
- 禁止修改：settings.ts store, 其他组件

### 2.3 解耦循环依赖（Owner: Coder_C）
- **问题**：`chat.ts ↔ workspace.ts` 循环依赖
- **方案**：提取共享类型和工具函数到 `shared/` 或新建 `store-utils.ts`
- 输出：消除循环依赖，build 无警告

### 2.4 拆分其他超大文件（Owner: Coder_D）
- **Message.tsx** (652行)：拆分为 `Message.tsx` + `MessageContent.tsx` + `MessageActions.tsx`
- **ChatPanel.tsx** (605行)：拆分为 `ChatPanel.tsx` + `ChatPanelHeader.tsx` + `ChatPanelFooter.tsx`
- 禁止修改：Message store 逻辑

## Stage 3: 测试补全（可并行）

### 3.1 Store 测试（Owner: Tester_A）
- `chat.test.ts`：测试 message CRUD, streaming, ensemble, attachments
- `workspace.test.ts`：测试 workspace/thread CRUD
- `settings.test.ts`：测试 provider management, theme switching
- `skills.test.ts`：测试 skill CRUD

### 3.2 组件测试（Owner: Tester_B）
- `InputBarCore.test.tsx`：测试输入、发送、附件
- `Message.test.tsx`：测试消息渲染、操作
- `SettingsModal.test.tsx`：测试 Tab 切换、设置保存
- `Sidebar.test.tsx`：测试 workspace/thread 切换

### 3.3 工具函数测试（Owner: Tester_C）
- `file-tools.test.ts`：扩展现有测试
- `doctor.test.ts`：测试 Doctor 各检查项
- `utils.test.ts`：扩展现有测试

## Stage 4: 跨平台构建验证（串行）

### 4.1 Windows 构建
- `npx electron-builder --win`
- 验证 `.exe` 安装器生成
- 验证 icon 多分辨率包含

### 4.2 Linux 构建
- `npx electron-builder --linux`
- 验证 `.AppImage` 和 `.deb` 生成
- 验证 icon 显示

## Stage 5: 最终验证（串行）

### 5.1 全量质量检查
- `npm run lint` → 0 错误
- `npx tsc --noEmit` → 0 错误
- `npm run format:check` → 通过
- `npm test` → 全部通过

### 5.2 构建验证
- `npm run build` → 成功
- 三平台产物验证

### 5.3 发版准备
- 更新 RELEASE_CHECKLIST，标记完成项
- 生成最终报告

---

## 依赖关系图

```
Stage 1 (基础设施)
    │
    ├──→ Stage 2.1 (InputBar 拆分)
    │      ├──→ Stage 3.1 (InputBar 测试)
    │
    ├──→ Stage 2.2 (SettingsModal 拆分)
    │      ├──→ Stage 3.2 (SettingsModal 测试)
    │
    ├──→ Stage 2.3 (循环依赖)
    │      ├──→ Stage 3.1 (Store 测试)
    │
    ├──→ Stage 2.4 (其他文件拆分)
    │      ├──→ Stage 3.2 (组件测试)
    │
    └──→ Stage 4 (跨平台构建) ──→ Stage 5 (最终验证)
```

## 文件约定

- 所有新文件使用 PascalCase 命名（组件）或 camelCase（hooks/utils）
- 测试文件命名：`*.test.ts` 或 `*.test.tsx`
- 共享类型：`src/shared/types.ts`
- 共享工具：`src/shared/utils.ts`
- 工作区：`/Users/fangchen/Baidu/GitHub/OpenDesk`

## 质量标准

- 重构后每个文件 < 400 行
- 测试覆盖率 > 60%（至少新增 30 个测试用例）
- 零 TypeScript 错误
- 零 ESLint 错误
- 零格式化错误
- 构建产物版本号一致
