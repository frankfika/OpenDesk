<div align="center">

<img src="resources/logo-1024.png" alt="OpenDesk" width="128" height="128">

# OpenDesk

> **AI 桌面助手，能跑任何模型、能用任何链、能接管你的桌面**

Model-agnostic · Web3 Workbench · Computer-Use capable · Folder-as-workspace · BYOK · Apache 2.0

![Version](https://img.shields.io/badge/Version-v0.5.0-1D8C80?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-31.0-47848F?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square)
![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)

[✨ 功能](#-核心功能) · [📸 截图](#-界面预览) · [🚀 快速开始](#-快速开始) · [📦 下载](#-下载) · [🔒 安全](#-安全与隐私)

__简体中文__ | [English](./README_EN.md)

---

![Home — Web3 Workbench 默认视图（v0.5.0）](./docs/assets/02-home.png)

</div>

## 📌 这是什么

OpenDesk 是一个**桌面端 AI 工作台**——把「跟 AI 对话」「管理加密钱包」「操控桌面」「写代码」这几件事装进同一个 Electron 应用里：

- 🧠 **多模型**：OpenAI / Anthropic / DeepSeek / Ollama / 任何 OpenAI 兼容端点，自带 BYOK 加密存储。
- ⛓️ **Web3 Workbench**：Reown AppKit + wagmi，扫码即连 300+ 钱包，原生支持 ENS、Etherscan 链上数据、Wallet Doctor 授权审计。
- 🖥️ **Computer Use**：`desktop_capture` / `desktop_click` / `desktop_type` —— 让 AI 真的能操作你的桌面。
- 🛠️ **Skills + MCP**：兼容 Claude Code / Codex 的 SKILL.md，可接入任意 MCP Server。
- 📁 **文件夹即工作区**：每个文件夹自动扫描 `AGENTS.md`，对话、文件、Skill 全部就位。

## ✨ 核心功能

### 1. 🧠 多 Provider 管理

- **7 种 Provider 类型**：OpenAI · Anthropic · DeepSeek · Ollama · OpenAI-Compatible · Google · Generic
- **模型自动发现**：从 `/v1/models` 或 `/api/tags` 拉取可用列表
- **BYOK**：API Key 用 Electron `safeStorage` 加密，永不明文落盘
- **连接测试**：一键 ping 远端，状态绿/黄/红实时显示

![Settings — Providers](./docs/assets/06-settings.png)

### 2. ⛓️ Web3 Workbench（v0.5.0 新增）

- **Reown AppKit + wagmi**：300+ 钱包、WalletConnect v2、EIP-1193 原生支持
- **12 条主网 + 测试网**：Ethereum、Base、Arbitrum、Optimism、Polygon、BSC，全套 Sepolia 测试网
- **ENS 解析**：输入 `vitalik.eth` 自动解析地址
- **实时链上数据**：原生余额、Token 列表、最近活动（来自 Etherscan/Basescan/Arbiscan …）
- **Wallet Doctor**：扫描 ERC-20 `approve` 授权，标记无限授权、可疑合约
- **三大场景 Skill**：
  - `Chain Intel`：链上情报 + 巨鲸追踪
  - `One-Liner Trade`：自然语言下单（先 ENS，再 quote，再发送）
  - `Wallet Doctor`：批量撤销高风险授权

| Chain Intel | One-Liner Trade | Wallet Doctor |
|-------------|-----------------|---------------|
| ![Intel](./docs/assets/03-intel.png) | ![Trade](./docs/assets/04-trade.png) | ![Doctor](./docs/assets/05-doctor.png) |

### 3. 🖥️ Computer Use（桌面真交互）

- **屏幕截图**：`desktop_capture` —— full / window / area
- **鼠标控制**：`desktop_click` —— 单击 / 双击 / 右键 / 指定坐标
- **键盘输入**：`desktop_type` 和 `desktop_key` —— 文本输入 + 组合键
- **窗口管理**：`desktop_windows` 列出，`desktop_activate` 切换
- **安全护栏**：Settings 里手动开启 `desktopEnabled`，未启用时一律拒绝

### 4. 🔌 MCP + Skills

- **完整 MCP 客户端**：JSON-RPC 2.0 over stdio，**不**依赖 `@anthropic-ai/mcp`
- **5 个预设 Server**：Filesystem、SQLite、Fetch、Slack、GitHub —— 一键添加
- **跨平台 Skills**：兼容 `.codex/skills` / `.claude/skills`，纯 Markdown 描述
- **6 个内置 Skill**：Code Reviewer · Doc Writer · Git Helper · Web3 Intel · Web3 Onboarder · Web3 Trader

### 5. 📁 文件夹即工作区

- **打开文件夹 = 创建 Workspace**：树形视图、Thread 分组、AGENTS.md 自动加载
- **持久化**：全部状态本地 SQLite 落盘，关闭重启不丢
- **附件**：拖文件到输入框，AI 自动读取并引用

## 📸 界面预览

| Onboarding（首次启动） | 主视图（Web3 Workbench） |
|------------------------|--------------------------|
| ![Onboarding](./docs/assets/01-onboarding.png) | ![Home](./docs/assets/02-home.png) |

| Chain Intel | One-Liner Trade |
|-------------|-----------------|
| ![Intel](./docs/assets/03-intel.png) | ![Trade](./docs/assets/04-trade.png) |

| Wallet Doctor | Settings — Providers |
|---------------|------------------------|
| ![Doctor](./docs/assets/05-doctor.png) | ![Settings](./docs/assets/06-settings.png) |

## 🚀 快速开始

### 前置条件

- Node.js 18+
- npm 或 pnpm
- macOS 11+ / Windows 10+ / Linux (x86_64 或 arm64)

### 安装与启动

```bash
git clone https://github.com/frankfika/OpenDesk.git
cd opendesk
npm install        # 自动 patch viem/ox tempo KeyAuthorization
npm run dev        # 启动开发模式（Electron + 热重载）
```

### 第一次使用

1. 启动后看到 **Onboarding** 弹窗 —— 选择 Workspace（任意文件夹）和 AI Provider
2. 想要 Web3？点右上角 **Connect Wallet** → 扫码 / 选钱包 → 进入 Web3 Workbench
3. 想要 Computer Use？Settings → General → 启用 `desktopEnabled`

### 构建生产包

```bash
npm run build           # 编译 main / preload / renderer
npm run package         # electron-builder 打包（产物在 dist/）
```

## 📦 下载

> GitHub Release 由 `electron-builder` 自动发布到 `frankfika/OpenDesk`。

| 平台 | 架构 | 安装包 |
|------|------|--------|
| macOS | Apple Silicon (M1/M2/M3/M4) | `OpenDesk-0.5.0-arm64.dmg` |
| macOS | Intel | `OpenDesk-0.5.0-x64.dmg` |
| Windows | x64 | `OpenDesk-0.5.0-x64.exe` |
| Windows | arm64 | `OpenDesk-0.5.0-arm64.zip` |
| Linux | x64 | `OpenDesk-0.5.0-x64.AppImage` / `.deb` |

前往 [Releases 页面](https://github.com/frankfika/OpenDesk/releases) 下载预编译包。

## 🏗️ 项目结构

```
opendesk/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── ipc/                 # IPC handlers（web3 / settings / workspace …）
│   │   ├── providers/           # AI provider 适配（OpenAI / Anthropic / Ollama …）
│   │   ├── tools/               # 内置工具（file / web3-tools / builtins）
│   │   ├── rag/                 # SQLite FTS5 + 类型化 adapter
│   │   └── persistence.ts       # better-sqlite3 持久化
│   ├── preload/                 # 暴露 window.api 的安全 IPC bridge
│   ├── renderer/                # React + Tailwind 前端
│   │   └── src/components/
│   │       ├── chat/            # ChatPanel / InputBar / Message / MentionPopover …
│   │       ├── settings/        # ProvidersPanel / EnsemblePanel / GeneralPanel …
│   │       ├── web3/            # Web3Workbench / PortfolioView / DoctorPanel …
│   │       └── layout/          # AppShell / LeftColumn / MiddleColumn
│   └── shared/                  # 跨进程类型
├── docs/                        # 产品文档 + 架构 + 截图
├── e2e/                         # Playwright + Electron e2e
├── scripts/
│   ├── capture-screenshots.mjs  # README 截图脚本（从真实运行应用捕获）
│   └── patch-ox-tempo.sh        # postinstall viem/ox 兼容补丁
└── resources/                   # 图标 / Logo
```

## 🧪 测试

```bash
npm test              # vitest 单元测试（95 用例）
npm run test:e2e      # Playwright + Electron 端到端（4 用例，含 3 个需要 DEEPSEEK_API_KEY 的）
npm run lint          # ESLint，0 warnings
```

三连验证（CI 必跑）：

```bash
npx tsc --noEmit -p tsconfig.node.json    # 主进程类型检查
npx tsc --noEmit -p tsconfig.web.json     # 渲染进程类型检查
npm run lint && npm test                  # lint + vitest
```

## 🔒 安全与隐私

- **Local First**：所有数据存本地（`userData` + SQLite），不联网同步
- **零遥测**：不收集任何使用统计
- **API Key 加密**：Electron `safeStorage`（macOS Keychain / Windows DPAPI / Linux libsecret）
- **Sandboxed Artifacts**：iframe `sandbox="allow-scripts"`，与主进程隔离
- **权限模型**：桌面操作需要用户在 Settings 里显式开启
- **Web3 谨慎发送**：所有链上交易都走 `TxConfirmCard` 二次确认，明示金额、Gas、目标合约

## 🛣️ 路线图

- **v0.6.0**：Agent Mode 多轮工具调用 + Computer Use 联动
- **v0.7.0**：RAG v2（混合检索 + rerank）
- **v0.8.0**：Web3 — 限价单 / DCA / 多签
- **v1.0.0**：稳定 API、插件市场、白标打包

## 🤝 贡献

欢迎 PR！请先读 `CONTRIBUTING.md`，开发流程：

```bash
npm run dev           # 开发模式
npm run lint:fix      # 自动修复可修的 lint 问题
npm run format        # Prettier
npm test              # 确保 95/95 通过
```

## 📬 社区

- GitHub Issues：[报告 Bug / 提需求](https://github.com/frankfika/OpenDesk/issues)
- GitHub Discussions：[技术讨论](https://github.com/frankfika/OpenDesk/discussions)

## 📜 License

Apache 2.0 —— 见 [LICENSE](./LICENSE)。

## 🙏 致谢

- [Electron](https://www.electronjs.org/) · [React](https://react.dev/) · [Zustand](https://github.com/pmndrs/zustand)
- [viem](https://viem.sh/) · [wagmi](https://wagmi.sh/) · [Reown AppKit](https://reown.com/appkit)
- [Tailwind CSS](https://tailwindcss.com/) · [Radix UI](https://www.radix-ui.com/) · [Framer Motion](https://www.framer.com/motion/)
- 灵感来源：[Claude Desktop](https://claude.ai/download) · [Codex](https://openai.com/index/openai-codex/) · [Kimi Work](https://kimi.moonshot.cn/) · [Trae](https://www.trae.ai/)

---

<div align="center">
Made with ❤️ by the OpenDesk team — since 2026
</div>
