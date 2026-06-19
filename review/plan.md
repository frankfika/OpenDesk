# OpenDesk 多 Agent Review 计划

## 目标
对 OpenDesk 项目进行全面审查，覆盖架构、功能、UX、安全、性能、状态管理。

## 项目背景
- Electron 31 + React 18 + TypeScript 5 + Zustand + Tailwind CSS
- 桌面 AI 助手，支持多 Provider、Workspace、Ensemble、MCP、Skills、Artifacts
- v0.1.0，大量功能已超出计划文档，但部分核心能力仍有差距

## Stage 1: 并行审查（5 个 Agent 同时运行）

### Agent 1: 架构审查员 (Architecture_Reviewer)
- **类型**: explore（只读审查）
- **范围**: src/shared/types.ts, src/main/index.ts, src/preload/index.ts, src/main/ipc/handlers.ts, src/main/providers/, src/main/workspace.ts
- **重点**:
  - 架构分层是否清晰（Main/Preload/Renderer）
  - IPC 契约完整性与一致性
  - Provider 抽象是否合理
  - 类型定义的完整性（缺失 Turn/Item 等？）
  - 代码组织与模块边界
  - 与 PRODUCT.md 架构设计的对比
- **产出**: architecture_review.md

### Agent 2: 功能审查员 (Feature_Reviewer)
- **类型**: explore（只读审查）
- **范围**: 全项目源码 vs docs/PRODUCT.md 功能规格
- **重点**:
  - P0 功能实现状态（Workspace、多模型、持久化、Computer Use、AGENTS.md）
  - P1 功能实现状态（托盘、快捷键、引导、Provider 自动获取模型）
  - P2 功能实现状态（Token 失效、健康检查、reasoning、文件系统工具）
  - P3 功能实现状态（MCP、Skills、Artifacts、Ensemble）
  - 功能间集成问题
- **产出**: feature_review.md

### Agent 3: UX/UI 审查员 (UX_Reviewer)
- **类型**: explore（只读审查）
- **范围**: src/renderer/src/components/ 全部组件，src/renderer/src/store/，styles/
- **重点**:
  - 视觉一致性（glassmorphism、色彩、间距、字体）
  - 交互设计（键盘快捷键、焦点管理、反馈机制）
  - 空状态与加载状态
  - 响应式与可访问性（aria-label、角色、颜色对比）
  - 动画与过渡（Framer Motion 使用是否恰当）
  - 与竞品（Kimi Work、Trae、Claude Desktop）的 UX 差距
- **产出**: ux_review.md

### Agent 4: 安全与性能审查员 (Security_Performance_Reviewer)
- **类型**: explore（只读审查）
- **范围**: src/main/ipc/handlers.ts, src/main/providers/, src/main/tools/, src/preload/index.ts, 安全配置
- **重点**:
  - API Key 加密存储（safeStorage）
  - contextIsolation 与 sandbox 配置
  - 文件路径安全（isPathAllowed、路径遍历）
  - 桌面操作权限控制
  - 性能：渲染器 bundle 大小、消息列表虚拟化、防抖策略
  - Electron 安全最佳实践
- **产出**: security_performance_review.md

### Agent 5: 状态管理审查员 (State_Reviewer)
- **类型**: explore（只读审查）
- **范围**: src/renderer/src/store/ 全部 store（settings, workspace, chat, theme, skills, artifacts, toast）
- **重点**:
  - Zustand store 设计是否合理
  - 状态持久化策略
  - 数据一致性（workspace-thread-message 关系）
  - 竞态条件与并发问题
  - 错误处理与边界情况
  - 与 IPC 的同步机制
- **产出**: state_review.md

## Stage 2: 综合审查（由主 Agent 完成）
- 读取所有 Agent 产出
- 交叉验证，去重
- 按严重级别排序（Critical / Warning / Info）
- 生成最终审查报告：OpenDesk_Review_Report.md
- 包含：执行摘要、详细发现、改进建议、优先级排序

## 产出物
- `/Users/fangchen/Baidu/GitHub/OpenDesk/review/architecture_review.md`
- `/Users/fangchen/Baidu/GitHub/OpenDesk/review/feature_review.md`
- `/Users/fangchen/Baidu/GitHub/OpenDesk/review/ux_review.md`
- `/Users/fangchen/Baidu/GitHub/OpenDesk/review/security_performance_review.md`
- `/Users/fangchen/Baidu/GitHub/OpenDesk/review/state_review.md`
- `/Users/fangchen/Baidu/GitHub/OpenDesk/review/OpenDesk_Review_Report.md`（最终综合报告）
