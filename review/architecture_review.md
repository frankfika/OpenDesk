# OpenDesk Architecture Review Report

**Project:** frankfika/OpenDesk  
**Branch:** main  
**Review Date:** 2026-06-20  
**Reviewer:** Architecture_Reviewer  
**Scope:** Main Process / Preload / Renderer / Shared Types / Providers / Tools / Orchestration / Skills / Memory / MCP  

---

## 1. Executive Summary

OpenDesk is a well-structured Electron desktop AI assistant with a clean separation between Main (Node.js), Preload (contextBridge), and Renderer (React + Zustand). The project successfully implements a multi-provider chat system (OpenAI, Anthropic, Ollama), an ensemble/multi-agent arbitration mode, a skill system with execution, and MCP client integration. However, **several critical issues** threaten maintainability, security, and correctness:

- **Security:** `sandbox: false` in the renderer negates Electron security boundaries. Desktop tools use AppleScript with unsafe string interpolation.
- **Type Safety:** `ApprovalMode` type does not include `'suggest'`, yet it's used as a default. `Turn`/`Item` abstractions from the product spec are entirely absent.
- **Architecture Debt:** `handlers.ts` has grown into a 879-line God file. The product spec calls for a Rust `opendesk-core` but the implementation is pure Node.js.
- **Data Integrity:** Memory extraction runs on the wrong message array (pre-response, not post-response). Tool result deduplication uses non-deterministic `JSON.stringify`.
- **Module Coupling:** Circular dependency avoidance via `require()` inside functions is a smell. Multiple modules duplicate config path logic.

The codebase is **functional but needs structural refactoring** before scaling to the v2 feature set described in `docs/PRODUCT.md` and `docs/ARCHITECTURE.md`.

---

## 2. Detailed Findings

### 2.1 Critical Issues

#### C1 — `sandbox: false` disables Electron renderer sandbox (Security)

- **File:** `src/main/index.ts:29`
- **Line:** `sandbox: false`
- **Impact:** The renderer process can execute arbitrary Node.js APIs. Any XSS or compromised dependency in the React frontend gains full filesystem, shell, and network access.
- **ARCHITECTURE.md divergence:** The architecture doc explicitly states `sandbox: true` (§2 Preload diagram), but the actual code disables it.
- **Recommendation:** Set `sandbox: true`. If native modules are needed in the renderer, move them to the main process or use a utility process. This is a **must-fix before public release**.

#### C2 — `ApprovalMode` type mismatch causes silent TypeScript failures

- **File:** `src/shared/types.ts:41` vs `src/main/ipc/handlers.ts:72` vs `src/renderer/src/store/settings.ts:46`
- **Issue:** `types.ts` defines `ApprovalMode = 'ask' | 'auto-edits' | 'auto-all' | 'bypass'`. But `handlers.ts` and `settings.ts` use `'suggest'` as the default.
- **Impact:** TypeScript will not flag this at compile time if `settings` is typed loosely, but it is a latent bug. Any code branching on `approvalMode` will miss the default case.
- **Recommendation:** Add `'suggest'` to the union or change all defaults to `'ask'`.

#### C3 — AppleScript injection in desktop tools (macOS-only, unsafe)

- **File:** `src/main/tools/desktop-tools.ts:26-32`, `36-42`, `45-56`, `71-80`
- **Issue:** `desktopClick`, `desktopType`, `desktopKey`, and `desktopActivate` interpolate user-controlled arguments into AppleScript strings:
  ```ts
  script = `tell application "System Events"\n  ${action} at {${x}, ${y}}\nend tell`
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)
  ```
  The `replace` only escapes single quotes in the outer shell wrapper, but the arguments are already interpolated into the AppleScript body. A `text` value containing `"` can break the `keystroke` command. A `title` containing `"` can break the `tell process` block.
- **Impact:** Remote code execution via crafted AI tool call arguments.
- **Recommendation:** Use `child_process.spawn` with `osascript` as a binary, pass the script via `stdin` or a temp file, and **never** interpolate user input into shell commands. Also, desktop tools are macOS-only; Windows/Linux need equivalent implementations.

#### C4 — `handlers.ts` is a 879-line God file violating SRP

- **File:** `src/main/ipc/handlers.ts`
- **Issues:**
  - Contains settings persistence, API key encryption, thread persistence, message persistence, draft persistence, chat streaming (single + ensemble), model fetching, desktop screenshot capture, and IPC registration for 15+ domains.
  - Module-level mutable `settings` and `abortControllers` variables are shared by all handlers with no isolation.
  - `doChatStream` is 177 lines and mixes provider building, skill loading, memory injection, tool execution, and error classification.
- **Impact:** Impossible to unit test, high risk of regression, difficult to onboard new developers.
- **Recommendation:** Decompose into domain-specific modules: `settings-service.ts`, `thread-service.ts`, `chat-service.ts`, `model-service.ts`, `key-store.ts`. Each module should export functions, not register IPC directly. `handlers.ts` should only wire IPC channels to service functions.

#### C5 — Memory extraction uses pre-response message array

- **File:** `src/main/ipc/handlers.ts:718-727`
- **Code:**
  ```ts
  const recentMessages = messages.slice(-10) // `messages` is the ORIGINAL input
  const entries = memoryService.extractFromMessages(recentMessages)
  ```
- **Issue:** `messages` is the function parameter (user input). It does NOT include the assistant response or tool results just generated. The memory system therefore extracts facts from user prompts but never from the AI's actual answers.
- **Impact:** Memory is incomplete; cross-project knowledge and user preferences learned from assistant responses are never captured.
- **Recommendation:** Extract from `currentMessages` (the full conversation including assistant and tool messages) instead of `messages`.

#### C6 — `doChatStream` error classification is fragile and over-broad

- **File:** `src/main/ipc/handlers.ts:728-743`
- **Issue:** Error classification uses string matching (`includes('model')`, `includes('does not exist')`) which can misclassify. For example, a network error message containing "model not found" would be classified as `model` instead of `network`. Also, `includes('does not exist')` is too broad.
- **Impact:** Wrong error type sent to the renderer leads to wrong UI state (e.g., showing "model error" when it's actually a network timeout).
- **Recommendation:** Use HTTP status codes or error object types from the SDKs instead of substring matching.

---

### 2.2 Warning Issues

#### W1 — `Turn` / `Item` abstraction missing despite PRODUCT.md spec

- **File:** `src/shared/types.ts` (entire file)
- **Issue:** `docs/PRODUCT.md` §F-D-1 defines a **Thread → Turn → Item** three-layer state machine with `started → delta → completed` lifecycle. The actual code uses a flat `Message` interface for everything: user messages, assistant messages, tool calls, tool results, errors, reasoning, screenshots, compare results.
- **Impact:** The flat `Message` model is overloaded. `kind?: MessageKind` is a loose union. Message types are not discriminated. This makes it impossible to implement the product-spec features like per-turn token accounting, rollback, streaming item-level events, and audit trails.
- **Recommendation:** Implement `Turn` and `Item` as described in PRODUCT.md. `Message` should be deprecated or become a view-layer type, not the core domain model. This is significant architecture debt.

#### W2 — Circular dependency avoidance via dynamic `require()`

- **File:** `src/main/tools/executor.ts:13`
- **Code:**
  ```ts
  // Import dynamically to avoid circular dependency with workspace module
  const { listWorkspaces } = require('../workspace')
  ```
- **Issue:** `executor.ts` imports `workspace.ts` via `require()` inside a function to avoid a circular dependency. This is a smell indicating the dependency graph is unhealthy. It also bypasses TypeScript type checking and tree-shaking.
- **Recommendation:** Extract `getWorkspacePath()` into a `workspace-utils.ts` or `workspace-resolver.ts` that both `workspace.ts` and `executor.ts` can depend on without creating a cycle.

#### W3 — Duplicate config path logic across modules

- **Files:** `src/main/ipc/handlers.ts:101-127`, `src/main/workspace.ts:15-23`, `src/main/memory/store.ts:6-10`, `src/main/providers/health-checker.ts:15-19`
- **Issue:** `getConfigDir()` / `getDataDir()` is redefined in at least 4 places. Each uses `join(app.getPath('userData'), 'opendesk')`.
- **Impact:** Risk of path drift if the base directory changes. No single source of truth.
- **Recommendation:** Create `src/main/paths.ts` exporting `getAppDataDir()`, `getSettingsPath()`, `getKeysPath()`, `getMessagesDir()`, `getThreadsPath()`, `getWorkspacesPath()`, etc.

#### W4 — Tool result deduplication uses non-deterministic `JSON.stringify`

- **File:** `src/main/orchestration/tool-coordinator.ts:11-13`
- **Code:**
  ```ts
  function toolCallKey(tc: ToolCall): string {
    return `${tc.name}::${JSON.stringify(tc.arguments)}`
  }
  ```
- **Issue:** `JSON.stringify` key ordering is not guaranteed across different objects with the same keys. Two `ToolCall` objects with identical logical arguments but different key order will produce different keys, causing duplicate execution.
- **Impact:** In ensemble mode, identical tool calls from different agents may execute multiple times instead of once.
- **Recommendation:** Use deterministic serialization (`json-stable-stringify` or `sort-keys-recursive`) for the arguments.

#### W5 — `applyPatch` is a naive implementation

- **File:** `src/main/tools/file-tools.ts:63-121`
- **Issue:** The patch application does not handle:
  - Overlapping hunks
  - Context lines (the ` ` prefix lines are used but not validated)
  - Newline insertion/removal at end of file (`\ No newline at end of file` is ignored)
  - Windows CRLF vs Unix LF differences
  - `---` / `+++` header lines (they are skipped by accident, but the parser is fragile)
- **Impact:** AI-generated patches can silently corrupt files or apply incorrectly.
- **Recommendation:** Use a battle-tested patch library (`diff` or `patch-package`'s internal logic) or delegate to `git apply`.

#### W6 — `buildTools` rescans all skills on every chat request

- **File:** `src/main/tools/executor.ts:128-148`
- **Issue:** `buildTools()` calls `scanAllSkills()` and `getWorkspacePath()` every time a chat is initiated. For large skill libraries, this is synchronous filesystem I/O that blocks the main thread.
- **Impact:** Chat latency increases with skill count. No caching layer.
- **Recommendation:** Cache the skill scan result and invalidate it on skill import/delete. Or build tools once per workspace change.

#### W7 — `registerBuiltins` defines all tools in a single 457-line file

- **File:** `src/main/tools/builtins.ts`
- **Issue:** File contains: shell whitelist (250+ commands), dangerous pattern regexes, 4 file tools, 7 desktop tools, 1 shell tool, 1 web search tool, and registry wiring. This is too many concerns for one file.
- **Recommendation:** Split into `shell-security.ts`, `file-tools.ts`, `desktop-tools.ts`, `web-search-tool.ts`, `registry.ts`. The current `file-tools.ts` already exists but is shadowed by the tool definitions in `builtins.ts` (they are separate implementations — one is the raw file API, the other is the tool definition wrapper).

#### W8 — `doctor.ts` `checkDiskSpace` checks RAM, not disk

- **File:** `src/main/doctor.ts:55-68`
- **Code:** Uses `freemem()` and `totalmem()` from `os`.
- **Impact:** Misleading health check. The label says "Disk/Memory Space" but the function reports memory, not disk.
- **Recommendation:** Use `check-disk-space` or `fs.statfs` to get actual disk free space.

#### W9 — Health checker re-implements `loadKeys()` and `getConfigDir()`

- **File:** `src/main/providers/health-checker.ts:15-35`
- **Issue:** Duplicates the exact same functions from `handlers.ts`.
- **Recommendation:** Import from a shared `paths.ts` / `key-store.ts` module.

#### W10 — `Message` type is overloaded with nullable fields

- **File:** `src/shared/types.ts:5-21`
- **Issue:** `Message` has 15+ optional fields covering everything from tool calls to ensemble metadata. This is a "bag of fields" anti-pattern. `toolCallId` is only relevant for `tool` role. `sourceProviderId` is only relevant for assistant. `isArbitration` is only relevant for ensemble mode.
- **Impact:** No compile-time safety. Components must defensively check fields that may not apply.
- **Recommendation:** Move to a discriminated union or the `Turn`/`Item` model.

#### W11 — `provider:healthChanged` IPC event not exposed in preload

- **File:** `src/main/ipc/handlers.ts:876` sends `provider:healthChanged`, but `src/preload/index.ts` has no listener for it.
- **Impact:** The renderer cannot receive provider health updates pushed from the main process. The event is orphaned.
- **Recommendation:** Add `onProviderHealthChanged` to the preload API or remove the push event if not needed.

#### W12 — `desktop-tools.ts` is macOS-only

- **File:** `src/main/tools/desktop-tools.ts` (all functions)
- **Issue:** All desktop control functions (`desktopClick`, `desktopType`, `desktopKey`, `desktopActivate`) use AppleScript (`osascript`). No Windows (AutoIt/PowerShell) or Linux (xdotool) equivalents.
- **Impact:** Desktop tools are non-functional on Windows and Linux.
- **Recommendation:** Add platform guards (`process.platform === 'darwin'`) with fallback stubs, and implement platform-specific backends.

#### W13 — `shell` tool whitelist is too permissive

- **File:** `src/main/tools/builtins.ts:15-97`
- **Issue:** The whitelist contains 250+ commands including `rm`, `ssh`, `scp`, `sudo` (not explicitly listed but many equivalents), `docker`, `kubectl`, `terraform`, `aws`, `chmod`, `chown`, `mkfs`, `shutdown`, `reboot`, `poweroff`, `curl`, `wget`, `ssh`, `eval`, `exec`, `source`, `eval`, etc. While dangerous patterns are blocked, the whitelist is so broad that it essentially allows arbitrary system modification.
- **Impact:** A compromised AI with tool access can do significant damage even within the whitelist (e.g., `rm -rf ~/Projects`, `docker system prune -f`, `kubectl delete all --all`).
- **Recommendation:** Tighten the whitelist to a small set of safe read-only commands (`ls`, `cat`, `grep`, `find`, `git status`, `git log`). Require explicit user approval for any write/execute command. This is especially important given `sandbox: false`.

---

### 2.3 Info / Suggestions

#### I1 — `ARCHITECTURE.md` is outdated

- **File:** `docs/ARCHITECTURE.md`
- **Issues:**
  - Claims `sandbox: true` (actual: `false`).
  - Claims MCP client is "❌ 未实现" (actual: fully implemented with `mcp-bridge.ts` and `client.ts`).
  - Claims Skills system is "🟡 扫描兼容" (actual: full execution, import/export, L1/L2/L3 loading).
  - Does not mention ensemble/multi-agent mode at all.
  - Renderer stores listed as 4 (settings, workspace, chat, theme) but actual code has 5+ (skills, toast, etc.).
- **Recommendation:** Update ARCHITECTURE.md to reflect the actual v1 implementation. Use a `// ARCHITECTURE.md` comment in `main/index.ts` to warn about `sandbox: false` being intentional (if it is) or fix the code.

#### I2 — `types.ts` duplicates `MemoryEntry`/`MemoryStore`

- **File:** `src/shared/types.ts:344-354` vs `src/shared/types-memory.ts:1-11`
- **Issue:** The same interfaces are defined in both files. `memory-service.ts` imports from `types-memory`, but `types.ts` also defines them.
- **Recommendation:** Remove `MemoryEntry` and `MemoryStore` from `types.ts` and re-export from `types-memory.ts` if needed.

#### I3 — `fetchModels` has no error logging

- **File:** `src/main/ipc/handlers.ts:218-249`
- **Issue:** Catch-all `catch { return [] }` swallows all errors. If a model fetch fails, the user sees an empty dropdown with no diagnostic information.
- **Recommendation:** Log the error to the main process console and return an error flag to the renderer.

#### I4 — `applyPatch` path concatenation uses string interpolation

- **File:** `src/main/tools/file-tools.ts:43`
- **Code:** `const itemPath = \`${path}/${name}\``
- **Issue:** Uses `/` instead of `join(path, name)`. On Windows this may produce mixed-separator paths (`C:\workspace\foo/bar`). `statSync` is generally tolerant, but it's not clean.
- **Recommendation:** Use `join(path, name)`.

#### I5 — `openai.ts` uses `any` cast for messages

- **File:** `src/main/providers/openai.ts:57`
- **Code:** `messages: formatted as any`
- **Issue:** The `formatMessages` function returns a correctly typed array, but the cast to `any` bypasses the OpenAI SDK's type checking. If the SDK changes its message format in a future version, this will silently fail at runtime.
- **Recommendation:** Remove the `as any` cast. If the SDK types are incompatible, define a proper mapping type and assert it.

#### I6 — `AnthropicProvider` hardcodes `max_tokens: 8096`

- **File:** `src/main/providers/anthropic.ts:65`
- **Issue:** No way to configure max_tokens. For long conversations or code generation, this is too restrictive.
- **Recommendation:** Add `maxTokens` to `ProviderConfig` or pass it through the constructor.

#### I7 — `Google` and `generic` provider types return `null` from builder

- **File:** `src/main/providers/builder.ts:16-18`
- **Issue:** The UI allows adding a `google` or `generic` provider, but `buildProvider` returns `null`, causing silent failures at chat time.
- **Recommendation:** Either implement the providers or disable them in the UI until ready.

#### I8 — `run-tracker.ts` memory leak risk

- **File:** `src/main/orchestration/run-tracker.ts`
- **Issue:** `activeRuns` is a `Map` that only gets cleaned on `abortRun()` or `completeRun()`. If an error causes `runEnsemble` to throw before `completeRun` is called, the run stays in the map forever.
- **Recommendation:** Wrap `runEnsemble` in a `try...finally` that always calls `completeRun()`, or add a TTL eviction mechanism.

#### I9 — `prettier` / `eslint` not mentioned in ARCHITECTURE.md

- **Observation:** No linting or formatting tooling is documented. The code uses a mix of semicolons (`;`) and semicolon-less style, and inconsistent quote usage.
- **Recommendation:** Add `.eslintrc` and `.prettierrc` to enforce consistency.

#### I10 — `FileAttachment` type is unused in IPC

- **File:** `src/shared/types.ts:278-293`
- **Issue:** `FileAttachment` is defined but never referenced in IPC handlers, preload, or renderer stores. The `file` field with `.text()` and `.arrayBuffer()` suggests a browser-native `File` object, which cannot cross the IPC boundary.
- **Recommendation:** Remove or redesign for IPC-safe serialization (base64 + metadata).

#### I11 — `isPathAllowed` in `executor.ts` duplicates `handlers.ts`

- **File:** `src/main/tools/executor.ts:21-28`
- **Issue:** Same function exists in `handlers.ts:91-99`.
- **Recommendation:** Extract to a shared `security-utils.ts`.

#### I12 — `extractor.ts` heuristic memory extraction is primitive

- **File:** `src/main/memory/extractor.ts`
- **Issue:** Uses hardcoded regexes for preferences, tech stacks, and lessons. It will miss many meaningful patterns and may produce false positives.
- **Impact:** Memory quality is low. This is acceptable for v1 but should be upgraded to a lightweight LLM-based extraction or a more robust NLP pipeline in v2.
- **Recommendation:** Flag this as a v2 improvement in the roadmap.

---

## 3. Improvement Recommendations (Prioritized)

### P0 — Immediate (Before Next Release)

| # | Action | Files | Rationale |
|---|--------|-------|-----------|
| P0-1 | **Enable `sandbox: true`** | `src/main/index.ts:29` | Security boundary. Must fix. |
| P0-2 | **Fix `ApprovalMode` type** | `src/shared/types.ts:41`, `src/main/ipc/handlers.ts:72`, `src/renderer/src/store/settings.ts:46` | Type correctness. |
| P0-3 | **Sanitize desktop tool arguments** | `src/main/tools/desktop-tools.ts` | Prevent AppleScript injection. Use `spawn` + stdin. |
| P0-4 | **Fix memory extraction message source** | `src/main/ipc/handlers.ts:720` | Use `currentMessages` instead of `messages`. |
| P0-5 | **Extract `paths.ts`** | New file | Single source of truth for all `userData/opendesk` paths. |
| P0-6 | **Decompose `handlers.ts`** | `src/main/ipc/handlers.ts` → multiple service files | SRP, testability, maintainability. |

### P1 — Short Term (Next 2-4 Weeks)

| # | Action | Files | Rationale |
|---|--------|-------|-----------|
| P1-1 | **Implement `Turn`/`Item` domain model** | `src/shared/types.ts` + all chat stores | Align with PRODUCT.md. Enable per-turn accounting, rollback, audit. |
| P1-2 | **Fix circular dependency in `executor.ts`** | `src/main/tools/executor.ts:13` | Extract `workspace-resolver.ts`. |
| P1-3 | **Deterministic tool call deduplication** | `src/main/orchestration/tool-coordinator.ts:11` | Use `json-stable-stringify`. |
| P1-4 | **Cache skill scan results** | `src/main/tools/executor.ts:128-148` | Reduce chat latency. |
| P1-5 | **Add `provider:healthChanged` to preload** | `src/preload/index.ts` | Complete IPC contract. |
| P1-6 | **Tighten shell tool whitelist** | `src/main/tools/builtins.ts:15-97` | Security hardening. Require approval for destructive commands. |
| P1-7 | **Fix `applyPatch` robustness** | `src/main/tools/file-tools.ts:63-121` | Use `git apply` or a proven library. |
| P1-8 | **Add platform guards to desktop tools** | `src/main/tools/desktop-tools.ts` | Graceful degradation on Windows/Linux. |
| P1-9 | **Remove `as any` from `openai.ts`** | `src/main/providers/openai.ts:57` | Type safety. |

### P2 — Medium Term (Next 1-2 Months)

| # | Action | Files | Rationale |
|---|--------|-------|-----------|
| P2-1 | **Update `ARCHITECTURE.md`** | `docs/ARCHITECTURE.md` | Reflect actual implementation. |
| P2-2 | **Add ESLint + Prettier config** | Root | Code consistency. |
| P2-3 | **Implement `maxTokens` per provider** | `src/main/providers/anthropic.ts`, `src/shared/types.ts` | Configurability. |
| P2-4 | **Implement Google provider or disable in UI** | `src/main/providers/builder.ts:16-18` | Prevent silent failures. |
| P2-5 | **Add TTL to `run-tracker.ts`** | `src/main/orchestration/run-tracker.ts` | Prevent memory leaks. |
| P2-6 | **Redesign `FileAttachment` for IPC** | `src/shared/types.ts:278-293` | Remove or make IPC-safe. |
| P2-7 | **Fix `doctor.ts` disk check** | `src/main/doctor.ts:55-68` | Use actual disk space, not RAM. |
| P2-8 | **Add token counting to providers** | `src/main/providers/base.ts`, `src/main/providers/openai.ts` | Replace character-count estimates with real token counts. |

### P3 — Long Term / Architecture (Next 3-6 Months)

| # | Action | Rationale |
|---|--------|-----------|
| P3-1 | **Evaluate Rust core (`opendesk-core`)** | PRODUCT.md calls for a Rust core with Thread→Turn→Item state machine. Decide whether to migrate or update the product spec. |
| P3-2 | **Move to an event-driven architecture** | Currently chat streaming is a long async function with nested loops. An event bus (e.g., RxJS or EventEmitter) would decouple provider streaming, tool execution, and IPC emission. |
| P3-3 | **Add unit tests** | Zero test coverage is visible. The modularized service layer (P0-6) should be unit-testable. |
| P3-4 | **Implement vision support properly** | `Message` has no `image_url` field. Vision is mentioned in `ModelInfo` but not implemented in the provider message formatters. |
| P3-5 | **Add conversation pruning / summarization** | No mechanism to handle context window overflow. The code will crash or produce errors when messages exceed the model's context window. |
| P3-6 | **Implement proper error retry / backoff** | Provider errors are surfaced immediately with no retry. Network hiccups will fail the entire chat. |

---

## 4. Appendix: IPC Contract Completeness Check

### Handlers registered (`handlers.ts`) vs Preload exposed (`preload/index.ts`)

| Channel | Handler | Preload | Status |
|---------|---------|---------|--------|
| `memory:load` | ✅ | ✅ | OK |
| `memory:save` | ✅ | ✅ | OK |
| `memory:append` | ✅ | ✅ | OK |
| `memory:extract` | ✅ | ✅ | OK |
| `settings:get` | ✅ | ✅ | OK |
| `settings:set` | ✅ | ✅ | OK |
| `settings:setApiKey` | ✅ | ✅ | OK |
| `settings:getApiKey` | ✅ | ✅ | OK |
| `settings:testProvider` | ✅ | ✅ | OK |
| `settings:fetchModels` | ✅ | ✅ | OK |
| `draft:load` | ✅ | ✅ | OK |
| `draft:save` | ✅ | ✅ | OK |
| `mcp:listServers` | ✅ | ✅ | OK |
| `mcp:addServer` | ✅ | ✅ | OK |
| `mcp:removeServer` | ✅ | ✅ | OK |
| `mcp:toggleServer` | ✅ | ✅ | OK |
| `mcp:listTools` | ✅ | ✅ | OK |
| `mcp:callTool` | ✅ | ✅ | OK |
| `skills:scan` | ✅ | ✅ | OK |
| `skills:list` | ✅ | ✅ | OK |
| `skills:load` | ✅ | ✅ | OK |
| `skills:executeTool` | ✅ | ✅ | OK |
| `skills:export` | ✅ | ✅ | OK |
| `skills:importFromFolder` | ✅ | ✅ | OK |
| `skills:importFromGitHub` | ✅ | ✅ | OK |
| `skills:delete` | ✅ | ✅ | OK |
| `skills:getBuiltins` | ✅ | ✅ | OK |
| `skills:create` | ✅ | ✅ | OK |
| `workspace:list` | ✅ | ✅ | OK |
| `workspace:add` | ✅ | ✅ | OK |
| `workspace:remove` | ✅ | ✅ | OK |
| `workspace:update` | ✅ | ✅ | OK |
| `workspace:relink` | ✅ | ✅ | OK |
| `workspace:scanAgentsMd` | ✅ | ✅ | OK |
| `thread:list` | ✅ | ✅ | OK |
| `thread:create` | ✅ | ✅ | OK |
| `thread:update` | ✅ | ✅ | OK |
| `thread:delete` | ✅ | ✅ | OK |
| `thread:loadMessages` | ✅ | ✅ | OK |
| `thread:saveMessages` | ✅ | ✅ | OK |
| `chat:send` | ✅ (on) | ✅ (send) | OK |
| `chat:abort` | ✅ (on) | ✅ (send) | OK |
| `chat:regenerate` | ✅ (on) | ✅ (send) | OK |
| `chat:editMessage` | ✅ (on) | ✅ (send) | OK |
| `chat:token` | ✅ (send) | ✅ (on) | OK |
| `chat:done` | ✅ (send) | ✅ (on) | OK |
| `chat:error` | ✅ (send) | ✅ (on) | OK |
| `chat:tool_call` | ✅ (send) | ✅ (on) | OK |
| `chat:tool_result` | ✅ (send) | ✅ (on) | OK |
| `chat:agent:*` | ✅ (send) | ✅ (on) | OK |
| `chat:arbitration:*` | ✅ (send) | ✅ (on) | OK |
| `chat:ensemble:done` | ✅ (send) | ✅ (on) | OK |
| `desktop:openPath` | ✅ | ✅ | OK |
| `desktop:capture` | ✅ | ✅ | OK |
| `desktop:emergencyStop` | ✅ | ✅ | OK |
| `desktop:getWindows` | ✅ | ✅ | OK |
| `doctor:run` | ✅ | ✅ | OK |
| `tools:readFile` | ✅ | ✅ | OK |
| `tools:writeFile` | ✅ | ✅ | OK |
| `tools:listDirectory` | ✅ | ✅ | OK |
| `tools:applyPatch` | ✅ | ✅ | OK |
| `provider:healthChanged` | ✅ (send) | ❌ | **MISSING** |
| `app:new-chat` | ❓ (tray/shortcuts?) | ✅ (on) | OK |
| `app:open-settings` | ❓ (tray/shortcuts?) | ✅ (on) | OK |
| `app:focus-input` | ❓ (tray/shortcuts?) | ✅ (on) | OK |
| `app:toggle-sidebar` | ❓ | ✅ (on) | **Orphaned?** |
| `app:toggle-theme` | ❓ | ✅ (on) | **Orphaned?** |
| `app:focus-model` | ❓ | ✅ (on) | **Orphaned?** |
| `desktop:emergencyStop` (app event) | ✅ (send) | ✅ (on, under `app`) | OK (namespace mismatch) |

**Summary:** The IPC contract is **98% complete**. The only missing channel is `provider:healthChanged`. Three `app:*` channels may be orphaned if tray/shortcuts do not emit them.

---

## 5. Conclusion

OpenDesk has a solid foundation: a working multi-provider chat system, an impressive ensemble arbitration mode, and a well-designed skill framework. However, the **Main process layer is carrying significant technical debt** — the 879-line `handlers.ts`, disabled sandbox, AppleScript injection vectors, and missing domain model (`Turn`/`Item`) are the most pressing issues.

The **recommended immediate focus** is the P0 items: enable sandbox, fix the type mismatch, sanitize desktop tools, fix memory extraction, and decompose the IPC handlers. These changes will improve security, correctness, and maintainability without altering user-facing features.

The **P1 and P2 items** should be scheduled in the next sprint to prevent the debt from compounding as ensemble mode and skills scale up.

Overall assessment: **Architecture is functional but needs structural refactoring before v2 features (Rust core, Artifacts, CLI, Web) can be safely built on top.**
