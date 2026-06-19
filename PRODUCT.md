# OpenDesk — Product Overview

## Positioning

OpenDesk is a **sovereign, open-source AI desktop assistant** built on Electron. It targets developers, researchers, and power users who want full control over their AI workflows without vendor lock-in. Unlike SaaS chat apps, OpenDesk runs locally, keeps data on the user's machine, and supports any provider — from cloud APIs to local Ollama models.

## Core Differentiators

### 1. Persistent Memory System (对标 WorkBuddy 超越 Cursor)
OpenDesk implements a three-tier file-based memory:
- **USER.md** — User preferences, habits, expertise, frequently used libraries/frameworks
- **IDENTITY.md** — Current workspace AI role, project conventions, code standards
- **SOUL.md** — Cross-project general knowledge, lessons learned, best practices

Unlike Cursor/Claude Desktop which only keep session-level context, OpenDesk's memory:
- Survives across sessions
- Is user-editable via a built-in panel
- Is automatically extracted from conversations and injected into system prompts

### 2. Multi-Provider & Ensemble Mode
Connect any OpenAI-compatible API (OpenAI, Anthropic, DeepSeek, Groq, Ollama, etc.) and run **ensemble inference** — multiple models answering simultaneously with an arbitrator selecting the best response. No other desktop client offers this out of the box.

### 3. Workspace-Centric Design
Every project lives in a **workspace** (a folder on disk). Workspaces remember:
- Thread history
- Project-specific AI roles (coder, reviewer, researcher, writer)
- `AGENTS.md` rules injected automatically into prompts
- File tree for context-aware chat

### 4. Full Desktop Integration
- **Global shortcuts** (Cmd+Shift+Enter, etc.)
- **Desktop control** (screenshot, file access, shell execution via MCP)
- **System tray** with quick actions
- **macOS title bar** vibrancy and native feel

## Target Users

| Segment | Use Case |
|---------|----------|
| **Developers** | Code review, refactoring, multi-model comparison for correctness |
| **Researchers** | Literature synthesis, cross-model fact-checking, long-form writing |
| **Agencies** | Client-specific workspaces with persistent project memory |
| **Privacy-focused** | Local Ollama inference, data never leaves the machine |

## Competitive Landscape

| Product | Lock-in | Memory | Multi-Model | Open Source | Desktop Control |
|---------|---------|--------|-------------|-------------|-----------------|
| **OpenDesk** | None | File-based, persistent | Ensemble | ✅ | MCP + tools |
| WorkBuddy | Tencent | USER.md/IDENTITY.md | Single | ❌ | Limited |
| Claude Desktop | Anthropic | Ephemeral | Single | ❌ | Limited |
| Cursor | Cursor | `.cursorrules` only | Single | ❌ | Limited |
| Trae | ByteDance | None | Single | ❌ | Limited |
| Kimi Work | Moonshot | Memory slots | Single | ❌ | Limited |

## Roadmap

### v0.2 (Current)
- ✅ Persistent memory system (USER.md / IDENTITY.md / SOUL.md)
- ✅ Provider health monitoring
- ✅ Message forking
- ✅ Global keyboard shortcuts
- ✅ Tree-view file browser
- ✅ Attachment injection
- ✅ Toast hover-pause
- ✅ Export thread to Markdown

### v0.3 (Next)
- Vector search for memory retrieval (instead of keyword matching)
- Plugin / extension marketplace
- Git integration (commit messages, diff review)
- Mobile companion (PWA)
- Voice input / output

### v1.0
- Enterprise SSO and team workspaces
- Audit logs and compliance mode
- Self-hosted sync server
- Native Windows/Linux parity

## Architecture in One Sentence

Electron main process manages workspace, provider, and memory persistence; renderer process runs a React/Vite/Tailwind UI with Zustand stores; IPC bridge exposes file tools, MCP, and AI providers.

For full architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md).
