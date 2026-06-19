# OpenDesk Architecture

## Stack

| Layer | Technology |
|-------|------------|
| Runtime | Electron 28+ (main + renderer + preload) |
| Renderer | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS 3.4 + CSS variables for theming |
| State | Zustand (per-domain stores) |
| UI Primitives | Radix UI (Dialog, Tabs, Tooltip, ContextMenu, Switch) |
| Motion | Framer Motion |
| Markdown | React-Markdown + Remark-GFM + Rehype-Highlight |
| Charts | Mermaid + Cytoscape |
| Math | KaTeX |

## Electron Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Workspace  │  │   Providers  │  │    Memory    │  │
│  │   Service    │  │   (Health)   │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │     MCP      │  │    Skills    │  │  File Tools  │  │
│  │   Bridge     │  │   Registry   │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Ensemble    │  │   Doctor     │  │    Tray      │  │
│  │Orchestration │  │   (checks)   │  │   + Shortcuts│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                     IPC (contextBridge)
                           │
┌─────────────────────────────────────────────────────────┐
│                   Preload (contextBridge)                │
│   Exposes: window.api.workspace, window.api.settings,   │
│   window.api.chat, window.api.memory, window.api.tools,   │
│   window.api.mcp, window.api.skills, window.api.app     │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                   Renderer Process                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   AppShell   │  │  ChatPanel   │  │  Sidebar     │  │
│  │ (layout)     │  │ (messages)   │  │ (workspace) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  InputBar    │  │   Message    │  │  Settings    │  │
│  │ (composer)   │  │   (render)   │  │   Modal      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  FilePanel   │  │  MemoryPanel │  │   Stores     │  │
│  │ (tree view)  │  │  (editor)    │  │ (zustand)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Chat Send Flow

```
InputBar.send()
  → chat.ts store (addMessage, setStreaming)
  → ipcRenderer.invoke('chat:send', payload)
  → main/handlers.ts
    → build combinedSystemPrompt
      → AGENTS.md content (if present)
      → Memory content (USER.md / IDENTITY.md / SOUL.md, truncated)
      → Skill content (if active)
      → Base system prompt
    → Provider.sendStream() → SSE stream
    → chunk → ipcRenderer.send('chat:token', chunk)
    → chat.ts appendToken()
  → on 'chat:done'
    → memoryService.extractFromMessages(recentMessages)
    → memoryService.appendExtracted(entries)
    → debouncedSave(threadId, messages)
```

### Memory Flow

```
Conversation ends
  → memoryService.extractFromMessages(last 10 messages)
    → rule-based heuristics (preferences, tech stacks, lessons)
  → memoryService.appendExtracted(entries)
    → Append to USER.md / IDENTITY.md / SOUL.md (throttled: 5 min)
  → Next conversation
    → handlers.ts reads memory files
    → Injects into combinedSystemPrompt (truncated to ~2000 chars per category)
```

### Workspace Flow

```
User adds folder
  → window.api.workspace.add() → dialog.showOpenDialog
  → createWorkspace(folderPath) → generate .opendesk/ structure
  → scan for AGENTS.md → load rules
  → load threads from .opendesk/threads/
  → Sidebar re-renders with new workspace
```

### Provider Health Flow

```
App startup
  → startHealthChecks(settings, onResult)
  → Every 5 minutes: testProvider() for each enabled provider
  → onResult: update settings.providers[idx].lastTestResult
  → saveSettingsToDisk()
  → win.webContents.send('provider:healthChanged', ...)
  → SettingsModal re-renders with new health indicator
```

## Store Architecture (Zustand)

| Store | Domain | Persistence |
|-------|--------|-------------|
| `useChatStore` | Messages, streaming state, attachments, ensemble runs | Thread-level (saveMessages) |
| `useWorkspaceStore` | Workspaces, threads, active selections | Settings + disk (.opendesk/) |
| `useSettingsStore` | Providers, MCP servers, theme, preferences | Electron safeStorage + JSON |
| `useSkillsStore` | Skills, installed skills, marketplace | Disk (skills/ folder) |
| `useArtifactsStore` | Generated artifacts, panel state | In-memory (non-persistent) |
| `useMemoryStore` | Memory content, edit state | IPC to memory service |
| `useThemeStore` | Dark/light/system | Settings sync |
| `useToastStore` | Toast queue, timers | In-memory |

## IPC Interface

```typescript
interface WindowAPI {
  workspace: { add, list, remove, update, relink, pickFolder, scanAgentsMd, setDefault, ... }
  thread: { create, list, getMessages, saveMessages, update, ... }
  settings: { get, set, setApiKey, getApiKey, testProvider, fetchModels, ... }
  chat: { send, abort, onToken, onDone, onToolCall, onToolResult, onError, onStart, onProgress }
  memory: { load, save, append, extract }
  tools: { readFile, writeFile, listDirectory, applyPatch }
  mcp: { listServers, addServer, removeServer, toggleServer, listTools, callTool }
  skills: { list, load, execute, import, export, delete, create }
  app: { onOpenSettings, onToggleSidebar, onToggleTheme, onFocusModel, onFocusInput, onEmergencyStop }
  desktop: { openPath, capture, getWindows, emergencyStop }
}
```

## Provider Abstraction

```typescript
// src/main/providers/base.ts
abstract class Provider {
  abstract test(): Promise<boolean>
  abstract sendStream(params: SendParams): AsyncGenerator<Chunk>
  abstract buildTools(tools: Tool[]): unknown
}

// Concrete implementations
class AnthropicProvider extends Provider { ... }
class OpenAIProvider extends Provider { ... }  // Also covers OpenAI-compatible (Ollama, DeepSeek, etc.)
```

## Ensemble / Multi-Agent Orchestration

```typescript
// src/main/orchestration/ensemble.ts
async function runEnsemble(params: EnsembleParams) {
  // 1. Spawn N parallel streams (one per provider)
  // 2. Each stream receives role-specific prompt (coder/reviewer/researcher/writer)
  // 3. Collect all answers
  // 4. Run arbitrator (another model) to select / merge / compare answers
  // 5. Emit arbitration result
}
```

## MCP Integration

- MCP Bridge (`src/main/mcp/mcp-bridge.ts`) wraps MCP servers as stdio processes
- Tools are exposed via `mcp:listTools` and `mcp:callTool` IPC
- MCP tools are merged with native file tools for the LLM

## Security Model

- **API keys**: Stored in `keys.bin` using Electron's `safeStorage` (AES-GCM with OS keychain)
- **Workspace data**: Plain JSON in `.opendesk/` folder (user-controlled)
- **Memory**: Markdown files in userData, no encryption (user can inspect/edit)
- **Desktop control**: Configurable approval modes (ask / auto-edits / auto-all / bypass)
- **MCP**: Sandboxed stdio processes, no network access by default

## Build & Distribution

```bash
npm run dev          # Vite dev server + Electron
npm run build        # Production renderer build
npm run electron-builder -- --mac dir  # Package for macOS
```

## Key Design Decisions

1. **Electron over Tauri**: Electron's ecosystem (native modules, preload, node integration) is richer for desktop AI tools. Tauri is lighter but harder to integrate with native AI SDKs.

2. **Zustand over Redux**: Zustand is simpler, has better TypeScript support, and doesn't require reducers/actions for a single-developer project.

3. **File-based memory over vector DB**: File-based memory is transparent, user-editable, and survives app reinstalls. Vector DB would be an optimization layer on top.

4. **Workspace folder over database**: Each workspace is a folder on disk. This makes backup, sync, and version control trivial (just git the folder).

5. **Markdown over JSON for memory**: Markdown is human-readable and editable in any text editor. The extraction layer produces structured entries from raw text.
