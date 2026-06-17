<div align="center">

<img src="resources/logo-1024.png" alt="OpenDesk" width="128" height="128">

# OpenDesk

> **An AI desktop assistant that can use any AI model**

Model-agnostic · Computer-Use capable · Folder-as-workspace · BYOK · Apache 2.0

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-31.0-47848F.svg)](https://www.electronjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://reactjs.org/)

</div>

## ✨ Features

### 🎯 Model Agnostic
- **7 Provider Types**: OpenAI, Anthropic, Ollama, OpenAI-Compatible, Google, Generic
- **Auto Model Discovery**: Fetch available models from `/v1/models` or `/api/tags`
- **BYOK**: Bring Your Own Key - no vendor lock-in
- **Encrypted Storage**: API keys stored securely with Electron safeStorage

### 📁 Folder as Workspace
- **Workspace Management**: Open any folder as a workspace
- **Thread Organization**: Multiple threads per workspace
- **Full Persistence**: All workspaces, threads, and messages saved to disk
- **AGENTS.md Scanning**: Auto-discover project instructions from `AGENTS.md`, `.cursorrules`, `.traerules`

### 🖥️ Computer Use
- **Screen Capture**: `desktop_capture` - capture full screen, window, or area
- **Mouse Control**: `desktop_click` - click, double-click, right-click at coordinates
- **Keyboard Input**: `desktop_type` and `desktop_key` - text input and hotkeys
- **Window Management**: List and activate windows
- **Safety First**: Requires explicit user permission in Settings

### 🎨 Artifacts Rendering
- **HTML/CSS/JS**: Live preview in sandboxed iframe
- **React Components**: JSX compiled and rendered in real-time
- **Mermaid Diagrams**: Flowcharts, sequence diagrams, etc.
- **SVG Graphics**: Vector graphics with zoom and download
- **Side Panel**: Resizable panel with tabbed interface

### 🔌 MCP Client
- **JSON-RPC 2.0**: Full Model Context Protocol implementation
- **Multi-Server**: Connect to multiple MCP servers simultaneously
- **Tool Aggregation**: All tools from all servers available to AI
- **5 Preset Servers**: Filesystem, SQLite, Fetch, Slack, GitHub (one-click add)

### 🛠️ Skills System
- **Cross-Platform**: Compatible with `.codex/skills` and `.claude/skills`
- **Markdown-Based**: Skills defined in `SKILL.md` format
- **Script Execution**: Shell scripts and custom tools
- **3 Built-in Skills**: Code Reviewer, Doc Writer, Git Helper

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/frankfika/opendesk.git
cd opendesk

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Package as app
npm run package
```

### First Launch

1. **Add a Provider**: Click Settings → Add Provider → Choose OpenAI/Anthropic/Ollama
2. **Create Workspace**: Click "Add Workspace" → Select a project folder
3. **Start Chatting**: Type your message and press Enter

## 📖 Documentation

- [Product Documentation](docs/PRODUCT.md) - Complete product specification
- [Architecture](docs/ARCHITECTURE.md) - Technical architecture and design decisions
- [Changelog](docs/CHANGELOG.md) - Version history and release notes

## 🏗️ Project Structure

```
opendesk/
├── src/
│   ├── main/              # Electron main process
│   │   ├── providers/     # AI provider implementations
│   │   ├── tools/         # Built-in tools (file, desktop)
│   │   ├── mcp/           # MCP client
│   │   ├── skills/        # Skills loader and executor
│   │   └── workspace.ts   # Workspace management
│   ├── preload/           # Electron preload (IPC bridge)
│   ├── renderer/          # React frontend
│   │   ├── components/    # UI components
│   │   ├── store/         # Zustand state management
│   │   └── styles/        # Global styles
│   └── shared/            # Shared types
├── docs/                  # Documentation
└── resources/             # App icons and assets
```

## 🔒 Security & Privacy

- **Local First**: All data stored locally on your machine
- **No Telemetry**: Zero data collection or analytics
- **Sandboxed Execution**: Artifacts rendered in isolated iframes
- **Permission Model**: Desktop actions require explicit user approval
- **Encrypted Secrets**: API keys encrypted with OS keychain

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development

```bash
# Run in development mode with hot reload
npm run dev

# Run type checking
npm run type-check

# Run linter
npm run lint

# Format code
npm run format
```

## 📜 License

Apache 2.0 - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) - Cross-platform desktop framework
- [React](https://reactjs.org/) - UI library
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [Radix UI](https://www.radix-ui.com/) - Accessible UI primitives
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Mermaid](https://mermaid.js.org/) - Diagram rendering

## 🌟 Inspiration

OpenDesk draws inspiration from:
- **Claude Desktop** - Artifacts rendering, MCP protocol, Skills system
- **Kimi Work** - Local file operations, WebBridge concept
- **Trae** - Multi-modal builder interface
- **Codex** - AGENTS.md discovery, project-aware AI

## 📬 Contact

- GitHub Issues: [Report bugs or request features](https://github.com/frankfika/opendesk/issues)
- Discussions: [Join the community](https://github.com/frankfika/opendesk/discussions)

---

<div align="center">
Made with ❤️ by the OpenDesk team
</div>
