# OpenDesk Feature Review Report

## Overview

This is a thorough review of the OpenDesk project (v0.1.0) against its product specification (`docs/PRODUCT.md`). The review examines P0–P4 feature implementation, extra features discovered beyond the spec, critical gaps, premature implementations, integration issues, and actionable recommendations.

**Review Date:** 2026-06-19  
**Product Spec Version:** v0.1.0-draft (2026-06-11)  
**Codebase Branch:** `main` (commit e8b67fa)

---

## 1. Feature Implementation Matrix (Spec vs. Actual)

### P0 — v1 Must-Have

| Feature ID | Description | Status | Evidence / Notes |
|---|---|---|---|
| **F-A-1** | "+ Open Folder" button | ✅ | `Sidebar.tsx:204`, `OnboardingModal.tsx:147` |
| **F-A-2** | Folder deduplication | ✅ | `handlers.ts:484` checks existing workspaces |
| **F-A-3** | Sidebar workspace grouping | ✅ | `Sidebar.tsx:222` — workspaces with expandable threads |
| **F-A-4** | Thread loading + history | ✅ | `ChatPanel.tsx:526` — messages grouped by date; `handlers.ts:560` loads messages |
| **F-A-5** | New Thread button | ✅ | `Sidebar.tsx:167` "New chat" button |
| **F-A-6** | Thread persistence to `{folder}/.opendesk/threads/` | ❌ | Messages stored in `userData/opendesk/messages/`, NOT per-workspace folder. No `rollout.jsonl`. |
| **F-A-7** | Restart recovery | 🟡 | Workspace/thread metadata restored. Messages persist. But NOT from workspace folders — from global `userData`. |
| **F-A-8** | Folder relink | 🟡 | `relinkWorkspace` exists (`handlers.ts:498`). UI supports it via context menu. |
| **F-A-9** | Missing folder status | 🟡 | Status field exists (`active`/`missing`/`archived`) but missing detection is manual/prompt-based. |
| **F-A-10** | Recent Workspaces | 🟡 | Shown in ChatPanel empty state (`ChatPanel.tsx:466`). Not a dedicated "Recent" list at startup. |
| **F-B-1** | Provider + Model dropdowns | ✅ | `InputBar.tsx:969` — model picker; `ChatPanel.tsx:279` shows active provider in title bar |
| **F-B-2** | Hot switch without restart | ✅ | `SettingsModal.tsx:176` `update({ activeProviderId: id })` |
| **F-B-3** | Full CRUD in Settings | ✅ | `SettingsModal.tsx:321` — Add, Edit, Test, Delete all present |
| **F-B-4** | Add Provider wizard | ✅ | 15 presets + custom form (`SettingsModal.tsx:81-96`) |
| **F-B-5** | Edit Token inline | ✅ | `SettingsModal.tsx:453` — inline password input |
| **F-B-6** | Test Connection per row | ✅ | `SettingsModal.tsx:495` — individual test button + `Test All` |
| **F-B-7** | Delete with confirmation | ✅ | `SettingsModal.tsx:443` — trash button |
| **F-B-8** | Export/Import config | ❌ | Not found in Settings UI or IPC handlers |
| **F-B-9** | Token 401/403 popup | 🟡 | Error detection in `InputBar.tsx:782` shows auth error with "设置 API Key" button. Not a modal popup. |
| **F-B-10** | Token quota depletion guidance | ❌ | Not implemented |
| **F-B-11** | API Key in OS keyring | 🟡 | Uses `safeStorage` (Electron built-in). Not macOS Keychain / Windows CredMgr / Linux Secret Service. |
| **F-C-1** | Screen capture | 🟡 | `captureScreenshot()` in `handlers.ts:253` — full screen only. No window/region selection. |
| **F-C-2** | Mouse input | ❌ | No mouse control implementation found |
| **F-C-3** | Keyboard input | ❌ | No keyboard input implementation found |
| **F-C-4** | Window management | 🟡 | `desktop:getWindows` lists windows (`handlers.ts:845`). No activate/close. |
| **F-C-5** | Safety whitelist/blacklist | ❌ | `desktopEnabled` toggle exists but no granular policy |
| **F-C-6** | Emergency stop | ✅ | Global shortcut `Cmd/Ctrl+.` (`shortcuts.ts:16`) + `desktop:emergencyStop` handler |
| **F-C-7** | Permission guidance | ❌ | No first-time permission flow |
| **F-C-8** | Native sandbox | ❌ | No Seatbelt/bubblewrap/AppContainer |
| **F-D-1** | Thread→Turn→Item state machine | 🟡 | Messages/Threads/Workspaces exist but flat — no formal Turn/Item hierarchy. No `rollout.jsonl`. |
| **F-D-2** | Basic tools (shell/file/web) | 🟡 | `file-tools.ts` has read/write/list/patch. `shell` tool exists via executor. No `web_search` actual API — just placeholder. |
| **F-D-3** | Streaming <2s P95 | 🟡 | Streaming exists via IPC (`chat:token`). No latency telemetry/optimization. |
| **F-D-4** | Stream interrupt/resume | 🟡 | Abort (`chat:abort`) works. No "resume" capability. |
| **F-D-5** | Approval policy | ❌ | `approvalMode` in settings but not enforced. No per-tool approval UI. |
| **F-D-6** | `rollout.jsonl` persistence | ❌ | Messages stored as JSON per thread, not JSONL per folder |
| **F-D-7** | SQLite index | ❌ | No SQLite. All data in JSON files. |
| **F-E-1** | Provider trait abstraction | 🟡 | `base.ts` has `Provider` interface; `OpenAIProvider` / `AnthropicProvider` |
| **F-E-2** | 7 built-in adapters | 🟡 | Only 3 core adapters: OpenAI, Anthropic, Ollama. 15 presets in UI but most map to OpenAI-compatible. |
| **F-E-3** | Health check + fallback | 🟡 | `health-checker.ts` exists. `lastTestResult` shown. No automatic fallback chain. |
| **F-E-4** | Runtime hot switch | ✅ | `SettingsModal.tsx:176` |
| **F-F-1** | CSGHub Lite embedded | ❌ | Only Ollama auto-detect. No CSGHub Lite integration. |
| **F-F-2** | Startup auto-spawn | 🟡 | Ollama auto-detect at startup (`index.ts:106`). No CSGHub Lite. |
| **F-F-3** | Offline fallback | ❌ | No automatic fallback when network disconnects |
| **F-F-4** | Independent process mode | 🟡 | Ollama can be configured as external; no explicit "independent mode" toggle |
| **F-G-1** | AGENTS.md upward scan | 🟡 | `scanWorkspaceAgentsMd` exists (`handlers.ts:504`) |
| **F-G-2** | System prompt merge | 🟡 | Loaded but not clearly merged into system prompt chain |
| **F-G-3** | UI show count | ✅ | `ChatPanel.tsx:273` shows "{N} rules" badge |
| **F-G-4** | `.cursorrules`/`.traerules` compat | ❌ | Not implemented |
| **F-G-5** | Token budget warning | ❌ | No token budget warning |

**P0 Summary:** 15 ✅ | 14 🟡 | 15 ❌ (~38% fully implemented, ~36% partial, ~26% missing)

---

### P1 — v1 Built-in Light

| Feature ID | Description | Status | Evidence |
|---|---|---|---|
| **F-1-1** | Onboarding (3 steps) | ✅ | `OnboardingModal.tsx` — Welcome → Workspace → Provider |
| **F-1-2** | Recent Workspaces | 🟡 | Shown in empty state, not dedicated startup list |
| **F-1-3** | System tray | ✅ | `tray.ts` — New Chat, Show/Hide, Settings, Quit |
| **F-1-4** | macOS Dock / Windows JumpList | ❌ | Not implemented |
| **F-1-5** | Auto-update (electron-updater) | ❌ | `autoUpdate: false` in settings. No electron-updater integration. |
| **F-1-6** | `opendesk doctor` | ✅ | `doctor.ts` + `SettingsModal.tsx:941` "Run Diagnostics" |
| **F-1-7** | Provider config export/import | ❌ | Not implemented |
| **F-1-8** | Cross-workspace search | 🟡 | `GlobalSearch.tsx` / `CommandPalette.tsx` search across workspaces, threads, messages, skills |

**P1 Summary:** 3 ✅ | 2 🟡 | 3 ❌

---

### P2 — v1 Explicitly NOT to Implement

| Feature | Spec Says | Actually Implemented | Risk |
|---|---|---|---|
| Manager/Worker multi-agent | ❌ No | 🟡 Partial (ensemble mode is similar) | Low — single-user focus maintained |
| Feishu/Matrix/WeChat | ❌ No | ✅ No | — |
| Team room / approval flow | ❌ No | ✅ No | — |
| Enterprise/SSO/SCIM | ❌ No | ✅ No | — |
| Cloud task queue | ❌ No | ✅ No | — |
| VS Code fork | ❌ No | ✅ No | — |
| Marketplace paid plugins | ❌ No | ✅ No | — |

P2 boundaries are **respected** — no enterprise/team features found.

---

### P3 — v2 Features (Should NOT be in v1)

| Feature ID | Description | Spec Says | Actually Implemented | Status |
|---|---|---|---|---|
| **F-3-1** | MCP client + Marketplace | ⏳ v2 | ✅ **FULLY IMPLEMENTED** | **PREMATURE** |
| **F-3-2** | Skills system (SKILL.md) | ⏳ v2 | ✅ **FULLY IMPLEMENTED** | **PREMATURE** |
| **F-3-3** | Artifacts rendering | ⏳ v2 | ✅ **FULLY IMPLEMENTED** | **PREMATURE** |
| **F-3-4** | Plan Mode | ⏳ v2 | ❌ Not found | — |
| **F-3-5** | Worktree isolation | ⏳ v2 | ❌ Not found | — |
| **F-3-6** | Memories / Chronicle | ⏳ v2 | 🟡 Partial (memory service exists) | **PREMATURE** |
| **F-3-7** | Embedded RAG | ⏳ v2 | ❌ Not found | — |
| **F-3-8** | Subagent (Codex style) | ⏳ v2 | 🟡 Partial (ensemble mode) | **PREMATURE** |
| **F-3-9** | CLI entry | ⏳ v2 | ❌ Not found | — |
| **F-3-10** | VS Code extension | ⏳ v2 | ❌ Not found | — |
| **F-3-11** | Web端 | ⏳ v2 | ❌ Not found | — |
| **F-3-12** | Cross-device sync | ⏳ v2 | ❌ Not found | — |

**Critical Finding:** 3 P3 features are **fully implemented** (MCP, Skills, Artifacts), and 2 more are partially implemented (Memory, Subagent). These are explicitly labeled "v2" in the spec.

---

## 2. Extra Features Discovery (Not in PRODUCT.md)

The following features were implemented **without any mention in the product spec**:

| Feature | Location | Assessment |
|---|---|---|
| **Ensemble Mode** | `ensemble.ts`, `EnsembleModelPicker.tsx`, `AgentActivityBar.tsx` | Multi-agent parallel execution with arbitrator. Complex, well-built. NOT in spec. |
| **Compare Mode** | `InputBar.tsx` (mode switching) | Side-by-side model comparison. NOT in spec. |
| **Agent Mode** | `InputBar.tsx` | Single-agent tool loop. Partial overlap with P0-D. |
| **Toast Notification System** | `Toast.tsx`, `toast.ts` | Rich toast with actions, pause/resume. Good UX addition. |
| **File Panel** | `FilePanel.tsx` | Full file tree browser + editor with save. NOT in spec. |
| **Command Palette** | `CommandPalette.tsx` | `Cmd+Shift+P` searchable command palette. Good UX addition. |
| **Global Search** | `GlobalSearch.tsx` | `Cmd+K` fuzzy search across workspaces/threads/messages/skills. Good UX addition. |
| **Theme System** | `theme.ts`, `globals.css` | Light/Dark/System with CSS variables. Spec had this as P1 General, but no explicit feature ID. |
| **Draft Auto-Save** | `InputBar.tsx:152` | Auto-saves input draft every 5 seconds. Good UX addition. |
| **@file / @workspace / #thread mentions** | `InputBar.tsx:299` | Rich mention syntax with popover. Good UX addition. |
| **Skill Picker / Assignment** | `InputBar.tsx:379`, `Sidebar.tsx` | `/` command to assign skills to threads. NOT in spec. |
| **Memory Service (3 categories)** | `memory-service.ts`, `handlers.ts:304` | User/Identity/Soul memory extraction. NOT in spec. |
| **Agent Activity Bar** | `AgentActivityBar.tsx` | Real-time tool execution progress. Good UX addition. |
| **Emoji Icon Picker** | `Sidebar.tsx:457` | Workspace icon customization. Minor but nice. |
| **Arbitrator Confidence Display** | `Message.tsx:571` | Shows confidence % on arbitrated messages. NOT in spec. |
| **Token Estimate in UI** | `ChatPanel.tsx:365` | Shows ~{N} tokens in status bar. Good UX addition. |
| **Network Status Indicator** | `ChatPanel.tsx:373` | Online/Offline dot indicator. Minor. |
| **Message Context Menu** | `Message.tsx:508` | Right-click for copy/edit/reply/delete. Good UX addition. |
| **Screenshot Attachment** | `InputBar.tsx:713` | Camera button captures screen as image attachment. Good UX addition. |
| **Drag & Drop File Attachments** | `InputBar.tsx:659` | Drop files into input bar. Good UX addition. |
| **Paste Image** | `InputBar.tsx:691` | Paste images from clipboard. Good UX addition. |

---

## 3. Critical Gaps (P0 Still Missing)

### 🔴 High Priority (Blocking v1 Completion)

1. **No per-workspace folder persistence** (F-A-6, F-A-7)
   - The product's **#1 differentiator** is "folder = workspace" with data stored IN the folder (`{folder}/.opendesk/`). Currently all data lives in `userData/opendesk/` (global Electron app data). This breaks the portable workspace promise.
   - **Fix:** Move thread messages to `{folder}/.opendesk/threads/<id>/messages.json` and workspace metadata to `{folder}/.opendesk/workspace.json`.

2. **No Computer Use beyond screenshots** (F-C-2, F-C-3, F-C-4, F-C-5, F-C-7, F-C-8)
   - Desktop interaction is the **#3 user hard metric**. Only screenshots are implemented. No mouse/keyboard/window control. No safety whitelist.
   - **Fix:** Implement `desktop_click`, `desktop_type`, `desktop_key`, `desktop_scroll` via `robotjs` or `@nut-tree-fork/nut.js`. Add permission flow + whitelist.

3. **No approval policy** (F-D-5)
   - Write/shell operations execute without user confirmation. Risky for a "desktop AI" that can touch files.
   - **Fix:** Add pre-execution modal for write/shell/desktop tool calls. Store preference per workspace.

4. **No CSGHub Lite integration** (F-F-1, F-F-2, F-F-3)
   - "Local model fallback" is a core promise. Only Ollama is supported. CSGHub Lite (the stated local engine) is completely absent.
   - **Fix:** Add CSGHub Lite spawn/download integration, similar to Ollama auto-detect.

5. **No rollout.jsonl / SQLite** (F-D-6, F-D-7)
   - Spec explicitly calls for Codex-style JSONL persistence + SQLite index. Current JSON-per-thread is simple but doesn't scale and loses event ordering.
   - **Fix:** Implement JSONL append + `better-sqlite3` for indexing.

### 🟡 Medium Priority

6. **No config export/import** (F-B-8, F-1-7) — Sharing provider configs without API keys is a P0/P1 feature.
7. **No auto-update** (F-1-5) — `electron-updater` is listed as the chosen tool in ARCHITECTURE but not implemented.
8. **No Dock/JumpList** (F-1-4) — Minor but expected for desktop apps.
9. **API keys not in OS keyring** (F-B-11) — `safeStorage` is good but not the spec's requested OS keyring.
10. **No `.cursorrules`/`.traerules` compat** (F-G-4) — Backward compatibility promise unfulfilled.
11. **No token budget warning** (F-G-5) — AGENTS.md can exceed context window silently.

---

## 4. Premature Implementations (v2 Features in v1)

### 🟥 **MCP Client** (F-3-1) — Should be v2

**What's there:**
- Full MCP bridge (`mcp-bridge.ts`) with client management, tool discovery, tool execution
- Settings UI with 5 presets (filesystem, GitHub, SQLite, fetch, puppeteer)
- Add/Remove/Toggle servers with connection status
- Tool listing per server (`SettingsModal.tsx:799`)
- IPC handlers for `mcp:listServers`, `mcp:addServer`, `mcp:removeServer`, `mcp:toggleServer`, `mcp:listTools`, `mcp:callTool`

**Why it's premature:**
- P0/P1 core features (workspace persistence, computer use, approval) are missing
- MCP adds significant complexity (external processes, stdio protocol, error handling)
- The spec says: "MCP 客户端 + Marketplace → v2 引入"
- Users can't even fully use MCP without stable tool execution (approval policy missing)

**Recommendation:** Keep the code but disable in UI by default. Add a feature flag `enableMCP: false` until P0 is solid.

---

### 🟥 **Skills System** (F-3-2) — Should be v2

**What's there:**
- Full skill scanner (`scanner.ts`) — scans `.codex/skills/`, `.claude/skills/`, global skills
- Skill loader with L1/L2/L3 levels (`loader.ts`)
- Skill export/import from folder/GitHub (`portability.ts`)
- Built-in skills directory (`builtins/`)
- Skill execution framework (`executor.ts`)
- UI integration: sidebar "Skills" nav, skill picker in input bar, skill assignment to threads
- IPC handlers: `skills:scan`, `skills:load`, `skills:executeTool`, `skills:export`, `skills:importFromFolder`, `skills:importFromGitHub`, `skills:delete`, `skills:create`

**Why it's premature:**
- Spec explicitly says: "Skills 系统（SKILL.md 格式，跨平台可移植）→ v2 完整实现"
- The current "v2 完整实现" level is already done — before P0 basics
- Skills compete with AGENTS.md for system prompt real estate; unclear precedence
- No user has asked for skills when they can't even persist workspace data properly

**Recommendation:** Feature-flag skills UI. Keep backend for v2 readiness.

---

### 🟥 **Artifacts Rendering** (F-3-3) — Should be v2

**What's there:**
- Full `ArtifactPanel` with resize handle, tab bar, artifact management
- `ArtifactRenderer` supports HTML, React (JSX + Babel standalone), Mermaid, SVG, Code, Markdown
- CodeBlock preview button auto-detects artifact types
- `useArtifactsStore` with Zustand persistence
- IPC not needed — fully renderer-side

**Why it's premature:**
- Spec says: "Artifacts 渲染（HTML/React/Mermaid/SVG/Code）→ v2 引入"
- Very well-built, but v1 should focus on stable chat + file tools first
- Artifacts depend on the AI generating correct code blocks — if the chat loop is unreliable, artifacts are underutilized
- Takes significant UI real estate that could be used for file browser or tool approval

**Recommendation:** Keep it — it's non-intrusive (panel can be closed). But don't advertise as a v1 feature.

---

### 🟨 **Memory Service** (F-3-6) — Partially premature

**What's there:**
- 3-category memory: User, Identity, Soul
- Memory extraction from messages via `memoryService.extractFromMessages()`
- Memory injection into system prompt (`handlers.ts:618`)
- IPC: `memory:load`, `memory:save`, `memory:append`, `memory:extract`

**Why it's partially premature:**
- "Memories / Chronicle 长期记忆 → v2"
- The implementation is lightweight and helpful, but memory UI is missing — users can't see/edit their memory

**Recommendation:** Fine to keep but add a memory management UI before calling it complete.

---

### 🟨 **Ensemble / Subagent Mode** (F-3-8) — Partially premature

**What's there:**
- Full ensemble orchestration (`ensemble.ts`) with multi-agent parallel execution
- Arbitrator pattern with role assignments (generalist, coder, reviewer, researcher, writer)
- Compare mode (manual comparison without arbitrator)
- Agent activity bar with real-time progress
- Full UI: model picker, settings tab, arbitrator selection

**Why it's partially premature:**
- "Subagent（Codex 模式，单 Agent + 短命 Subagent）→ v2"
- Ensemble is a v3-level feature in most products. It's here and works.
- However, it adds massive complexity to the chat pipeline before basic P0 is solid

**Recommendation:** Keep as an "experimental" feature. Add a flag to hide it by default.

---

## 5. Integration Issues

### Issue 1: Data Model Mismatch
**Problem:** The spec defines `Thread → Turn → Item` hierarchy with `rollout.jsonl`. The code uses flat `Message[]` with `kind` field. No Turns, no Items, no JSONL.
**Impact:** Cannot implement proper fork/branching, turn-level approval, or Codex-style persistence.
**Severity:** High

### Issue 2: Workspace Data Not Portable
**Problem:** All data lives in `~/Library/Application Support/opendesk/` (macOS). If user moves a project folder, the workspace association breaks because messages aren't in the folder.
**Impact:** Core "folder-as-workspace" promise is broken.
**Severity:** Critical

### Issue 3: Memory Inflation in System Prompt
**Problem:** Memory (up to 2000 chars per category = 6000 chars) + AGENTS.md + skill content + workspace context all get concatenated into the system prompt. No token budget management.
**Impact:** Can easily exceed context window for models with 8K-32K limits.
**Severity:** Medium

### Issue 4: Ensemble + Normal Mode Divergence
**Problem:** `doChatStream` and `doEnsembleChat` are completely separate code paths. Ensemble uses its own tool execution, message handling, and persistence. Normal mode doesn't use the ensemble infrastructure.
**Impact:** Bug fixes need to be applied in two places. Feature parity gaps (e.g., memory injection differs).
**Severity:** Medium

### Issue 5: MCP Tools Not Integrated with Chat Loop
**Problem:** MCP tools are discovered and stored, but the chat loop (`doChatStream`) doesn't include them in `availableTools`. Only `buildTools()` (file tools + shell) is passed.
**Impact:** MCP servers are useless for chat — they can be listed but never called by the AI.
**Severity:** High

### Issue 6: Skills vs. AGENTS.md Precedence Unclear
**Problem:** Both skills and AGENTS.md inject content into the system prompt. There's no documented or enforced precedence order. A skill could override AGENTS.md or vice versa.
**Impact:** Unpredictable AI behavior.
**Severity:** Medium

### Issue 7: File Panel and File Tools Overlap
**Problem:** The File Panel (`FilePanel.tsx`) allows browsing and editing files. The AI also has file tools. But the file panel's editor saves directly, and the AI's file tools can overwrite without awareness.
**Impact:** Race conditions, lost edits.
**Severity:** Medium

### Issue 8: No Error Recovery for Streaming
**Problem:** If a stream errors mid-response, the partial message is already in the store. There's no "retry from last checkpoint" or "resume" mechanism.
**Impact:** User loses partial response. Must regenerate from scratch.
**Severity:** Medium

---

## 6. Recommendations

### Immediate (Next 2 Weeks)

1. **Fix workspace persistence** — Move all workspace-scoped data (threads, messages, attachments) into `{folder}/.opendesk/`. This is the product's core promise.
2. **Implement approval policy** — Add a pre-execution dialog for `write_file`, `shell`, and `desktop_*` tool calls. Default to "ask" for write/shell, "auto" for read.
3. **Integrate MCP tools into chat loop** — Pass `mcpBridge.toOpenAITools()` into `buildTools()` so MCP tools are actually usable.
4. **Feature-flag v2 features** — Add `enableEnsemble`, `enableMCP`, `enableSkills`, `enableArtifacts` to settings. Default to `false` for v1 release.

### Short-term (Next Month)

5. **Implement Computer Use basics** — Add `robotjs` or `@nut-tree-fork/nut.js` for mouse/keyboard control. Add permission flow + whitelist UI.
6. **Add CSGHub Lite integration** — Auto-detect, spawn, and fallback. Match the Ollama pattern.
7. **Implement config export/import** — JSON export with API keys stripped. Simple but required for P0.
8. **Add auto-updater** — Integrate `electron-updater` with GitHub releases.
9. **Fix data model** — Move from flat `Message[]` to `Thread → Turn → Item` hierarchy. Use JSONL for append-only persistence.
10. **Token budget management** — Count system prompt tokens before sending. Warn if >80% of model context window.

### Long-term (v1.1 / v2)

11. **Add SQLite index** — Replace JSON file scanning for threads/messages with `better-sqlite3`.
12. **Implement RAG** — Use CSGHub Lite BGE embeddings for workspace file search.
13. **Plan Mode** — Add "think first, then execute" mode with visible plan before tool calls.
14. **Cross-workspace search** — The GlobalSearch is good but should be powered by SQLite FTS.
15. **Web端** — Share Rust core (when ready) for web access to workspaces.

### Architecture Recommendations

16. **Unify chat paths** — Merge `doChatStream` and `doEnsembleChat` into a single pipeline with mode selection. Extract tool execution, message persistence, and memory injection into shared middleware.
17. **Add telemetry hooks** — Stream latency, token counts, error rates. Even if not sent to a server, log locally for debugging.
18. **Implement graceful degradation** — If a provider fails, auto-fallback to next enabled provider. If all fail, fallback to Ollama (if available) with a clear message.

---

## Summary

| Category | Count | Assessment |
|---|---|---|
| P0 Fully Implemented | 15 / 44 | 34% |
| P0 Partially Implemented | 14 / 44 | 32% |
| P0 Missing | 15 / 44 | 34% |
| P1 Fully Implemented | 3 / 8 | 38% |
| P1 Partially Implemented | 2 / 8 | 25% |
| P1 Missing | 3 / 8 | 38% |
| P3 Implemented (Premature) | 3 full + 2 partial | **Major scope creep** |
| Extra Features (Not in Spec) | 21 | Mostly good UX additions |
| Critical Gaps | 5 | Workspace persistence, Computer Use, Approval, CSGHub, JSONL |
| Integration Issues | 8 | Data model, portability, prompt inflation, code divergence |

### Overall Assessment

**OpenDesk is a visually polished, feature-rich application that has over-implemented on v2 features while under-delivering on v1 fundamentals.**

The UI/UX is excellent — the design system, animations, glassmorphism, and component architecture are production-quality. The ensemble mode, artifacts, MCP, and skills show impressive engineering depth. However, the **core differentiator** (folder-as-workspace with portable data) is **not implemented** as specified. Computer Use (the #3 hard metric) is limited to screenshots. Approval policies are missing despite the AI having file/shell tools.

**The project has "feature bloat" in v2 areas and "feature debt" in v0 areas.** The recommended path is to **feature-flag v2 features** and **focus all effort on P0 completeness** before any further v2 work.

---

*Report generated by Feature Reviewer sub-agent.*
