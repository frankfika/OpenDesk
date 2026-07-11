# OpenDesk 20轮全量测试计划

> 目标：以白猫黑猫的实用主义标准，逐轮测试功能、可用性、UI/UX、跨平台兼容性，对比 Codex/Cursor/Claude Desktop/Kimi Work 补全功能差距
> 日期：2026-06-20
> 版本：v0.4.1

---

## Round 1: 依赖安全审计
- `npm audit` 扫描
- 检查是否有新的高危漏洞
- 验证 electron-builder 26.15.3 和 electron-vite 5.0.0 的升级是否生效

## Round 2: 文件大小与代码复杂度审计
- 统计所有 >300 LOC 的文件
- 检查函数复杂度（cyclomatic complexity）
- 确认已拆分的 InputBar/Message 是否仍满足目标

## Round 3: 循环依赖检测
- `madge --circular` 全量扫描
- 验证 chat.ts ↔ workspace.ts 循环是否真正消除

## Round 4: 类型完整性检查
- `tsc --noEmit` 全量严格模式检查
- 检查 any/unknown 泛滥区域
- 检查 IPC 接口类型覆盖率

## Round 5: 死代码与重复代码检测
- `ts-prune` 未使用导出
- `jscpd` 重复代码检测
- 检查 console.log 残留

## Round 6: Store 单元测试扩展（chat store）
- 测试 ensemble 完整流程
- 测试 message fork
- 测试 thread 切换
- 测试 error recovery

## Round 7: Store 单元测试扩展（workspace/settings/theme）
- workspace CRUD 测试
- settings provider 管理测试
- theme 切换测试
- toast 队列测试

## Round 8: 组件测试（UI基础组件）
- EmptyState, Skeleton, Toast, Switch 测试
- 使用 @testing-library/react + jsdom

## Round 9: 工具函数测试扩展
- file-tools 测试扩展
- chat-utils 测试扩展（edge cases）
- utils.test.ts 扩展

## Round 10: IPC 接口契约测试
- 验证所有 IPC handler 都有对应 preload 暴露
- 验证 IPC 类型定义完整
- 测试错误处理路径

## Round 11: 可访问性审计（A11y）
- 检查所有 button 是否有 aria-label
- 检查 Dialog 是否有 aria-describedby
- 检查键盘导航（tabindex, focus trap）
- 检查颜色对比度

## Round 12: 暗色模式与主题一致性
- 验证所有 CSS variables 在 dark/light 模式下完整覆盖
- 检查 hardcoded 颜色值
- 验证系统主题切换响应

## Round 13: 响应式与布局测试
- 检查 sidebar 折叠状态
- 检查面板宽度（480px/640px）在小型屏幕下的适配
- 检查 textarea 最小/最大高度

## Round 14: 错误处理与边界测试
- 验证 ErrorBoundary 覆盖所有主要组件
- 验证网络错误/超时处理
- 验证文件读写错误处理
- 测试空状态（empty workspace, empty thread, empty provider）

## Round 15: 输入与交互可用性测试
- 测试 @mention / #thread / /command 触发器
- 测试拖拽文件上传
- 测试粘贴图片
- 测试截图功能（desktop API 可用性检查）
- 测试多行输入与 Shift+Enter

## Round 16: 竞品功能矩阵对比（Codex/Cursor/Claude/Kimi/WorkBuddy）
| 功能 | OpenDesk | Codex | Cursor | Claude Desktop | Kimi Work | WorkBuddy |
|------|----------|-------|--------|----------------|-----------|----------|
| 多模型支持 | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| 持久记忆 | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| 文件系统访问 | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| 代码解释器 | ❌ | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| 画布/白板 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 语音输入 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 插件系统 | ⚠️ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 团队/workspace | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| 多模态（图像生成） | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| 移动端配套 | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

## Round 17: RAG 与知识系统差距分析
- 当前：文件化记忆（USER.md/IDENTITY.md/SOUL.md）
- 缺失：向量检索、语义搜索、PDF 解析、知识图谱
- 优先级：SQLite FTS5 MVP（v0.2.1）

## Round 18: Ensemble 多模型对比体验测试
- 测试 ensemble 模式在 2+ provider 下的体验
- 测试 arbitrator 选择逻辑
- 测试 manual compare 模式
- 对比 Codex Agent 的并行执行能力

## Round 19: 性能与内存测试
- 检查大文件附件的内存占用
- 检查长对话（1000+ messages）的渲染性能
- 检查 streaming 时的 CPU 占用
- 检查启动时间

## Round 20: 跨平台兼容性模拟
- Windows 构建产物检查（icon, nsis, zip）
- Linux 构建产物检查（AppImage, deb）
- 检查平台特有代码（vibrancy, trafficLightPosition）
- 验证 safeStorage 在各平台的差异

---

## 测试通过标准
- 每轮必须产出具体的问题列表
- 每轮必须有明确通过/不通过判定
- 不通过的项必须标注优先级（P0/P1/P2）和修复建议
- 所有 P0 项必须在最终验证前修复

## 交付物
1. `TEST_PLAN_20ROUNDS.md` — 本计划
2. `TEST_RESULTS_ROUNDS_1-20.md` — 逐轮结果
3. `FIXES_IMPLEMENTED.md` — 修复实施清单
4. `GAP_ANALYSIS_CODEX.md` — Codex 竞品差距分析
5. 代码修改：新增测试文件 + 功能补全实现
