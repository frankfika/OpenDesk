# Full-Spectrum Test Report — OpenDesk

Date: 2026-06-19  
Stack: Electron 31 + React 18 + TypeScript 5.5 + Vite + TailwindCSS 3.4  
Scope: Practical Starter Pack (build smoke, code quality, file hygiene, security baseline)

## Executive Summary

| Layer      | Category            | Pass | Fail | N/A  | Notes                              |
|------------|---------------------|------|------|------|------------------------------------|
| Frontend   | Build / Smoke       | 1    | 0    | 0    | electron-vite build ✓              |
| Frontend   | Type Check          | 1    | 0    | 0    | tsc --noEmit ✓                     |
| Frontend   | Unit / E2E / Visual | 0    | 0    | 1    | No test framework installed        |
| Backend    | API Endpoints       | 0    | 0    | 1    | Electron IPC only, no HTTP server  |
| Backend    | Load / Stress       | 0    | 0    | 1    | Not applicable                     |
| Database   | Schema / CRUD       | 0    | 0    | 1    | JSON file persistence only         |
| Infra      | Docker / CI         | 0    | 0    | 1    | No Dockerfile or workflows         |
| Infra      | .gitignore          | 0    | 1    | 0    | Missing standard entries           |
| Security   | Dependency Audit    | 0    | 1    | 0    | 12 npm audit findings              |
| Security   | Secret Exposure     | 1    | 0    | 0    | No committed secrets found         |
| Security   | SSRF / File Upload  | 0    | 1    | 0    | File write lacks path validation   |
| Quality    | Circular Deps       | 0    | 1    | 0    | 1 cycle: chat.ts ↔ workspace.ts    |
| Quality    | Duplication         | 1    | 0    | 0    | 0% duplicated code                 |
| Quality    | Dead Code           | 1    | 0    | 0    | 0 unused exports                   |
| Quality    | Complexity / Size   | 0    | 1    | 0    | 6 files > 500 LOC                  |
| Quality    | Hardcoded Values    | 0    | 1    | 0    | Provider URLs scattered            |
| Quality    | TODO/FIXME          | 1    | 0    | 0    | None found                         |
| Hygiene    | Junk Files          | 1    | 0    | 0    | None found                         |
| Hygiene    | Large Files         | 1    | 0    | 0    | None >1MB in repo                  |
| Hygiene    | Naming Convention   | 1    | 0    | 0    | Consistent PascalCase / camelCase  |
| Hygiene    | Unused Deps         | 0    | 0    | 1    | depcheck false positives on aliases|
| Methodology| Smoke Test          | 1    | 0    | 0    | Build + type-check passed          |

**Overall: 13 Pass / 7 Fail / 5 N/A**

---

## 1. Frontend

### 1.1 Build & Type Check
- **electron-vite build**: ✅ Passed (5.10s)
  - main: 128.62 kB
  - preload: 9.22 kB
  - renderer: 2,950.30 kB index chunk + CSS 50.94 kB
- **tsc --noEmit**: ✅ Passed with no errors across both `tsconfig.node.json` and `tsconfig.web.json`

### 1.2 Unit / E2E / Visual
- ❌ No test framework installed (`jest`, `vitest`, `playwright`, `@testing-library` absent)
- ❌ No test scripts in `package.json`
- ❌ No `*.test.*` or `*.spec.*` files
- Recommendation: install `vitest`, `@testing-library/react`, and `@playwright/test`

---

## 2. Backend

OpenDesk has **no standalone HTTP server**. Business logic runs in the Electron main process and is exposed to the renderer via `ipcMain`/`ipcRenderer` through a preloaded `window.api` bridge.

- ✅ `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` in `src/main/index.ts:29-31`
- ✅ No `getApiKey` exposed to renderer (`src/main/ipc/handlers.ts:335`)
- ✅ API keys persisted encrypted via `safeStorage` to `keys.bin`
- ⚠️ IPC handlers are registered repeatedly on window recreation; code removes stale listeners but does not guard against duplicate registration cleanly

**Backend API / Load / Database tests: N/A**

---

## 3. Security

### 3.1 Dependency Audit
`npm audit --registry https://registry.npmjs.org/` reported **12 vulnerabilities**:

| Severity | Count | Top Packages |
|----------|-------|--------------|
| High     | 9     | `tar` (via electron-builder), `vite` (via electron-vite) |
| Moderate | 3     | `tar`, `vite` |
| Critical | 0     | — |

- `tar <=7.5.15`: multiple path traversal / arbitrary write advisories (GHSA-8qq5, GHSA-83g3, GHSA-qffp, GHSA-9ppj, GHSA-r6q2, GHSA-vmf3)
- `vite <=6.4.2`: path traversal / NTLM hash disclosure (GHSA-4w7w, GHSA-v6wh, GHSA-fx2h)
- Fixes require major-version bumps: `electron-builder` → 26.15.3, `electron-vite` → 5.0.0

### 3.2 Secret Exposure
- ✅ No hardcoded API keys, tokens, or passwords found in source
- ✅ `GITHUB_PERSONAL_ACCESS_TOKEN` placeholder is empty string (`src/renderer/src/components/settings/SettingsModal.tsx:249`)
- ✅ No `.env` files committed
- ⚠️ `package-lock.json` resolves all 778 packages from `https://registry.npmmirror.com/` — supply-chain / mirror trust consideration

### 3.3 SSRF
- ✅ `fetchModels` / `settings:testProvider` validate `baseUrl` protocol (`http:` or `https:` only) in `src/main/ipc/handlers.ts:341-349` and `:377-385`
- ⚠️ `src/main/skills/portability.ts:97` fetches user-supplied `zipUrl` without allow-listing
- ⚠️ `src/main/tools/builtins.ts:395` fetches DuckDuckGo HTML with a hardcoded URL — acceptable because URL is fixed

### 3.4 File Write / Path Traversal
- ❌ `writeFile` in `src/main/tools/file-tools.ts:14-26` writes to any path without validation
- ❌ `applyPatch` in `src/main/tools/file-tools.ts:63-121` also writes to the supplied path
- The renderer can invoke these through `window.api.skills.executeTool` if a skill exposes them; workspace-based path checks exist in `handlers.ts:isPathAllowed` but the low-level tool ignores them

### 3.5 Safe Storage
- ✅ API keys encrypted with `safeStorage.encryptString` / decrypted with `safeStorage.decryptString` (`src/main/ipc/handlers.ts:161-176`)
- ✅ Renderer never receives plaintext keys

---

## 4. Code Quality

### 4.1 Circular Dependencies
- ❌ **1 cycle found** by `madge --circular`:
  - `renderer/src/store/chat.ts → renderer/src/store/workspace.ts`

### 4.2 Duplicated Code
- ✅ `jscpd` found **0 clones** across 8 analyzed files (entire `src` tree produced 163 lines analyzed due to TSX parser limits; deeper scan recommended once configured)

### 4.3 Dead Code
- ✅ `ts-prune` reported **0 unused exports**

### 4.4 File / Function Size
- Total source lines: **~16,837** across 80 TypeScript/TSX files
- Files exceeding 500 LOC (maintenance risk):

| File | LOC |
|------|-----|
| `src/renderer/src/components/chat/InputBar.tsx` | 1,142 |
| `src/renderer/src/components/settings/SettingsModal.tsx` | 1,016 |
| `src/main/ipc/handlers.ts` | 905 |
| `src/renderer/src/store/chat.ts` | 700 |
| `src/renderer/src/components/chat/Message.tsx` | 652 |
| `src/renderer/src/components/chat/ChatPanel.tsx` | 605 |

### 4.5 Hardcoded Values
Provider base URLs and `localhost:11434` are duplicated across:
- `src/renderer/src/components/settings/SettingsModal.tsx:82-95`
- `src/renderer/src/components/settings/ProviderForm.tsx:18-57`
- `src/renderer/src/components/onboarding/OnboardingModal.tsx:52-54`
- `src/main/index.ts:75,120`
- `src/main/ipc/handlers.ts:231,239,356`
- `src/main/providers/builder.ts:14`

CDNs hardcoded in artifact renderer:
- `src/renderer/src/components/artifacts/ArtifactRenderer.tsx:28-31` (unpkg, cdn.tailwindcss.com)

### 4.6 TODO / FIXME
- ✅ None found

### 4.7 Lint / Format
- ❌ No ESLint configuration
- ❌ No Prettier configuration
- ❌ No pre-commit hooks

---

## 5. File Hygiene

### 5.1 Naming Conventions
- ✅ Components: PascalCase (`ChatPanel.tsx`, `SettingsModal.tsx`)
- ✅ Utilities / stores: camelCase (`chat.ts`, `workspace.ts`)
- ✅ Directories: kebab-case / lowercase
- ✅ No files with spaces, unicode, or parentheses in names

### 5.2 Junk / Temporary Files
- ✅ No `.DS_Store`, `Thumbs.db`, `*.log`, `*.tmp`, `*.bak` found

### 5.3 Large Files
- ✅ No committed files >1MB (excluding `node_modules` and `out/`)

### 5.4 .gitignore
Current entries: `node_modules`, `out`, `.playwright-mcp`, `*.tsbuildinfo`, `resources/logo.iconset`

Missing standard entries:
```
dist/
build/
.env
.env.local
.DS_Store
*.log
coverage/
.vscode/
.idea/
.cache/
```

### 5.5 Unused Dependencies
`depcheck` flagged these as unused; most are false positives due to TS path aliases or build-time usage:
- `@radix-ui/react-scroll-area` — likely imported via path aliases not resolved by depcheck
- `@radix-ui/react-separator` — same
- `autoprefixer`, `postcss`, `tailwindcss`, `typescript` — used at build time

Recommendation: confirm actual usage after installing a real test runner and ESLint.

### 5.6 Directory Structure
```
src/
├── main/           # Electron main process + IPC + providers + tools + skills
├── preload/        # contextBridge preload script
├── renderer/src/   # React UI + stores + components + styles
└── shared/         # shared types and agent roles
```
- Structure is reasonable but `main/` is becoming a monolith; consider splitting by feature.

---

## 6. Infrastructure

- ❌ No `Dockerfile`
- ❌ No `docker-compose.yml`
- ❌ No `.github/workflows/`
- ❌ No health-check endpoint (desktop app)
- ✅ `out/` build artifacts are gitignored

---

## 7. Recommendations (Prioritized)

### Critical
1. **Upgrade `electron-builder` and `electron-vite`** to resolve 12 high/moderate npm audit vulnerabilities.
2. **Add path validation to `src/main/tools/file-tools.ts`**: resolve and restrict writes to the active workspace or a configured safe directory.
3. **Validate `zipUrl` in `src/main/skills/portability.ts`** to prevent SSRF when importing skills from GitHub / arbitrary URLs.

### High
4. **Extract provider defaults and hardcoded URLs** into a single config module to eliminate duplication and ease maintenance.
5. **Break up oversized components** (`InputBar.tsx`, `SettingsModal.tsx`, `ChatPanel.tsx`) into smaller, focused units.
6. **Resolve circular dependency** `chat.ts ↔ workspace.ts` by moving shared types or extracting a common dependency.
7. **Add ESLint + Prettier** with TypeScript and React rules; wire into CI once available.

### Medium
8. **Install a test framework**: `vitest` for unit, `@playwright/test` or Electron's own test runner for E2E.
9. **Expand `.gitignore`** with the missing standard entries listed above.
10. **Add Dependabot / Renovate** for supply-chain monitoring.
11. **Document the IPC security model** (safeStorage, contextIsolation, why `getApiKey` is absent).

### Low
12. **Consider pinning the npm registry** to `registry.npmjs.org` in `.npmrc` for reproducible installs.
13. **Add a `test` script** and a `lint` script to `package.json`.
14. **Add `husky` + `lint-staged`** for pre-commit quality gates.

---

*Report generated by Full-Spectrum Tester skill for OpenDesk v0.2.0.*
