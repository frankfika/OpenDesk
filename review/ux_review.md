# OpenDesk UX Review Report

**Date:** 2025-06-19
**Reviewer:** UX Reviewer (Orchestrator sub-agent)
**Scope:** Full renderer component audit — visual design, interaction, accessibility, animation, layout, and competitive positioning
**Files reviewed:** 30+ components across `src/renderer/src/components/` and `src/renderer/src/styles/`

---

## Executive Summary

OpenDesk is a well-architected desktop AI assistant with a clean, minimal aesthetic and thoughtful interaction patterns. The codebase shows strong engineering discipline: CSS variable theming, Radix UI primitives for accessibility, Framer Motion for polish, and a sensible three-column layout (sidebar + chat + artifacts). However, there are **critical dark-mode inconsistencies**, **accessibility gaps**, **performance anti-patterns in message rendering**, and **several specific UX bugs** that should be addressed before the product can be considered production-polish. The app is currently ~70% of the way to matching the UX bar set by Kimi Work, Trae, and Claude Desktop.

---

## 1. Visual Design Assessment

### 1.1 Strengths

- **Clean, minimal palette:** The app uses a restrained color system via CSS variables (`--bg-sidebar`, `--bg-content`, `--text-primary`, `--accent`, `--border`). This creates a cohesive, professional look that avoids the "rainbow UI" trap common in AI chat apps.
- **Consistent border radius:** Components generally use `rounded-lg` (8px), `rounded-xl` (12px), or `rounded-2xl` (16px) consistently. The `radius` CSS variable is defined but underutilized — most components hardcode Tailwind radius classes.
- **Typography hierarchy:** Font sizing is well-structured: 10px for metadata, 11–13px for UI chrome, 15px for message body, with `font-semibold` used appropriately for section labels. The `-apple-system` font stack is correct for macOS.
- **Good whitespace:** Panels have adequate padding (`px-6 py-4` in headers, `px-6 py-2` in status bars). The input bar uses a generous `rounded-2xl` with internal padding that feels modern.
- **Status bar design:** The provider health / token count / network status bar in `ChatPanel` (line 323) is information-dense without feeling cluttered. The use of colored dot indicators is a standard, recognizable pattern.
- **Code block UI:** `CodeBlock.tsx` has a well-designed header bar with language label, copy/download/preview/run actions, and syntax highlighting via highlight.js. The `shadow-sm` and border treatment gives it depth without being heavy.

### 1.2 Weaknesses & Inconsistencies

- **Hardcoded light-mode colors breaking dark mode:**
  - `ChatPanel.tsx:268` — `bg-indigo-50 text-indigo-600 border-indigo-100` for active skill badge. These Tailwind colors are light-mode only and become invisible or jarring in dark mode.
  - `ChatPanel.tsx:273` — `bg-emerald-50 text-emerald-600 border-emerald-100` for AGENTS.md badge. Same issue.
  - `Message.tsx:411` — `getProviderColor()` returns hardcoded classes like `bg-emerald-500/10 text-emerald-600 border-emerald-200` for reasoning avatars. The `emerald-200` border is nearly invisible in dark mode.
  - `Message.tsx:466` — Error message uses `bg-red-50/60` without a matching dark token; the `dark:bg-red-950/20` class is present but **will not work** (see §3.1).
  - `SkillCard.tsx:13` — `SOURCE_COLORS` map uses `bg-blue-50`, `bg-emerald-50`, etc. All light-mode only.
  - `Toast.tsx` — `bg-green-50/80 dark:bg-green-950/30` uses the `dark:` prefix which is broken (see §3.1).
- **Color palette is too monochrome:** The accent color (`--accent`) is `#0F172A` (slate-900) in light mode and `#FAFAFA` in dark mode. This is essentially black/white — there is no "brand color" that gives OpenDesk a visual identity. Compare to Kimi Work's blue accent or Claude's purple. Consider adding a distinctive brand hue (e.g., a subtle teal or indigo) for interactive elements.
- **Inconsistent use of CSS variables vs. Tailwind:** Some components use `bg-[var(--bg-sidebar)]` (inline arbitrary values) while others use the mapped `bg-od-sidebar` (which is defined in `tailwind.config.ts` but never used in the codebase). The Tailwind config defines `colors: { 'od-sidebar': 'var(--bg-sidebar)' ... }` but no component references these utility classes. This is dead code.
- **Shadow inconsistency:** `shadow-sm`, `shadow-md`, `shadow-lg`, and `shadow-xl` are used somewhat arbitrarily. The custom `shadow-subtle` utility in `globals.css` is defined but never used.
- **TitleBar is too minimal:** `TitleBar.tsx` is just a centered "OpenDesk" text with traffic-light space. It provides no window controls, no drag feedback, and no useful information (e.g., current workspace, unsaved changes). The drag region styling is functional but the bar feels like wasted vertical space.

---

## 2. Interaction & Accessibility Issues

### 2.1 Critical Accessibility Gaps

- **`outline-none` without `focus-visible` replacement (P0):** Throughout the codebase, interactive elements use `outline-none` on focus:
  - `ProviderForm.tsx:152` — `input` classes include `outline-none` without `focus-visible:ring-`.
  - `InputBar.tsx:884` — `textarea` has `outline-none`.
  - `GlobalSearch.tsx:299` — Search input has `outline-none`.
  - `SettingsModal.tsx:311` — Tab triggers have `outline-none` (though they do use `data-[state=active]` styling).
  - **Impact:** Keyboard users cannot see which element is focused. This is a WCAG 2.1 violation (2.4.7 Focus Visible).
  - **Fix:** Replace `outline-none` with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]` on all interactive elements.
- **No `aria-live` regions for streaming content (P0):** The streaming assistant response (`Message.tsx:601`) has no `aria-live` announcement. Screen reader users will not know that new content is being appended. The `StreamCursor.tsx` has `aria-hidden="true"`, which is correct visually, but the parent message container needs `aria-live="polite"`.
- **`user-select: none` on body (P1):** `globals.css:63` sets `user-select: none` on `html, body, #root`. The `selectable` class is used to re-enable text selection in inputs and message content, but this is a fragile pattern. If a user misses adding `selectable` to a new element, text becomes unselectable. This is hostile to users who want to copy UI labels, error messages, or status text.
  - **Fix:** Remove `user-select: none` from the global reset. Only apply it to specific drag regions (title bar) and non-interactive chrome.
- **Missing focus trap in modals (P1):** While Radix Dialog primitives (`Dialog.Root`, `Dialog.Content`) are used in `CommandPalette`, `GlobalSearch`, `ShortcutHelp`, and `SettingsModal`, the custom slide-in panels (`SkillsPanel`, `FilePanel`, `MemoryPanel`) are implemented as `motion.div` with `fixed inset-0` and do **not** trap focus. Keyboard users can tab outside the panel while it's open.
  - **Fix:** Wrap slide-in panels in `Dialog.Root` or implement a custom focus trap using `react-focus-lock` or a similar utility.
- **Native `confirm()` dialogs (P1):** `Sidebar.tsx:99` and `Sidebar.tsx:133` use `window.confirm()` for destructive actions (delete thread, remove workspace). Native confirms are modal-blocking, unstyled, and inconsistent with the app's design language. They also have poor screen reader support on some platforms.
  - **Fix:** Replace with a custom `AlertDialog` using Radix UI's `AlertDialog` primitive.
- **Missing `aria-label` on icon-only buttons (P2):** Many toolbar buttons rely solely on the `title` attribute:
  - `ChatPanel.tsx:307` — theme toggle button has `title` but no `aria-label`.
  - `ChatPanel.tsx:313` — settings button same.
  - `InputBar.tsx:960` — screenshot button has `title` but no `aria-label`.
  - `MessageActions.tsx:37` — the dropdown trigger has `title`.
  - **Note:** `title` is not sufficient for screen readers (some don't read it) and doesn't work on touch devices. Use `aria-label` consistently.

### 2.2 Keyboard Shortcuts — Documentation vs. Implementation Gap

`ShortcutHelp.tsx` documents several shortcuts that are **not implemented** in `AppShell.tsx`:

| Shortcut | Documented Action | Actually Implemented? |
|----------|-------------------|----------------------|
| `⌘1-9` | Switch workspace | ❌ No handler in `AppShell.tsx` |
| `⌘[ / ⌘]` | Previous / next thread | ❌ No handler |
| `⌘⇧↑ / ⌘⇧↓` | Focus previous / next message | ❌ No handler |
| `⌘⇧N` | New workspace | ❌ No handler |
| `⌘⇧D` | Duplicate thread | ❌ No handler |
| `⌘⇧E` | Export thread | ❌ No handler (CommandPalette has it) |
| `⌘⇧A` | Archive thread | ❌ No handler |
| `⌘⇧Delete` | Delete thread | ❌ No handler |
| `⌘⇧T` | Toggle theme | ❌ No handler (only in `window.api.app.onToggleTheme`) |
| `⌘⇧M` | Switch model | ❌ No handler |
| `⌘⇧.` | Toggle sidebar | ❌ No handler (only `window.api.app.onToggleSidebar`) |
| `↑` | Edit last message | ❌ No handler |

**Impact:** The shortcut help modal sets user expectations that are not met. This erodes trust.
**Fix:** Either implement the shortcuts or remove them from the help modal. For `⌘⇧T`, `⌘⇧.`, and `⌘⇧M`, these should be wired into `AppShell.tsx`'s `handleKeyDown`.

### 2.3 Interaction Strengths

- **Excellent mention / command system:** `InputBar.tsx` has a sophisticated trigger system for `@` (workspace/file mentions), `#` (thread references), and `/` (commands/skills). The popover is positioned correctly above the input, has keyboard navigation (ArrowUp/ArrowDown/Enter/Escape), and filters in real time. This is a standout feature.
- **Drag-and-drop file attachments:** `InputBar.tsx` handles dragover, dragleave, and drop with visual feedback (border highlight + overlay). The `paste` handler also captures images from clipboard. Very polished.
- **Screenshot integration:** The screenshot button with permission-denied guidance (`alert` with instructions) is a thoughtful touch, though the `alert()` should be replaced with a toast.
- **Context menus:** Radix `ContextMenu` is used well in `Sidebar.tsx` (workspace actions) and `Message.tsx` (message actions). The menu styling is consistent with the app theme.
- **Model picker in input bar:** The inline model/provider switcher is convenient and well-designed.
- **Approval mode switcher:** The `APPROVAL_MODES` dropdown in `InputBar.tsx` is a nice safety feature that is surfaced at the right level of prominence.

---

## 3. Animation & Performance Notes

### 3.1 Animation Quality

- **Framer Motion usage is generally good:** `AnimatePresence` is used for panels, toasts, and message transitions. The easing curve `[0.25, 0.1, 0.25, 1.0]` is used consistently and feels smooth.
- **Panel slide-ins feel right:** `SkillsPanel`, `FilePanel`, and `MemoryPanel` use `x: '100%'` → `x: 0` with `duration: 0.35`. This is appropriate for a desktop app.
- **Toast animations are polished:** `Toast.tsx` uses `layout` prop for smooth reordering, `initial={{ opacity: 0, x: 60 }}` for entry, and `exit` for removal. The `max-w-[400px]` constraint prevents overflow.
- **Suggestion cards animate nicely:** `SuggestionCard.tsx` uses staggered `delay: index * 0.08` with `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}`. These micro-interactions add personality.
- **Message list animation concerns:** `ChatPanel.tsx:506` uses `AnimatePresence mode="popLayout"` for the entire message list. With `mode="popLayout"`, Framer Motion will animate layout changes when messages are added/removed. For long conversations (100+ messages), this can cause frame drops because every message re-calculates layout on each addition. **Recommendation:** Use `mode="popLayout"` only if you need to animate reordering; for simple append-only lists, `layout={false}` or virtualization is better.
- **AgentActivityBar animation is heavy:** `AgentActivityBar.tsx` uses `motion.div` with `initial={{ opacity: 0, x: -8 }}` for every agent row. If there are 5+ agents in ensemble mode, this creates many simultaneous motion calculations. The `AnimatePresence` wrapper around `AgentActivityBar` in `ChatPanel.tsx:581` also causes the entire bar to animate in/out on every streaming state change.
- **Skeleton shimmer is performant:** The CSS-based `shimmer` animation in `globals.css` uses `background-position` animation, which is GPU-accelerated and lightweight.
- **CodeBlock highlight.js is synchronous:** `CodeBlock.tsx` runs `hljs.highlight()` in a `useEffect` on every render. For large code blocks (>500 lines), this blocks the main thread. **Recommendation:** Consider using a web worker or `requestIdleCallback` for syntax highlighting, or at least memoizing the highlight result.

### 3.2 Performance Issues

- **O(n²) message index lookup in `ChatPanel` (P0):** `ChatPanel.tsx:519` computes `globalIdx` inside the render loop using `messages.findIndex(m => m.id === msg.id)`. For a message list of size *n*, this is O(n) per message, making the total render O(n²). With 100 messages, this is 10,000 operations per render. During streaming, this re-runs on every token.
  - **Fix:** Precompute a `Map<string, number>` from message ID to index before rendering, or derive the index from the `group.messages` array index + running offset.
- **Workspace file tree loading is blocking:** `FilePanel.tsx` loads the entire directory tree recursively (`buildTreeRecursively`) up to depth 3 and 200 files. This is done in the main render path with `await`. For large repositories, the panel will be unresponsive during loading. **Fix:** Add a loading skeleton and load directories lazily on expand.
- **ReactMarkdown re-parses on every render:** `Message.tsx:584` creates `mdComponents` inside `useMemo`, but the `ReactMarkdown` component itself re-parses the full message content on every render. For long messages, this is expensive. **Fix:** Memoize the entire rendered markdown output, or use a lighter markdown parser for streaming content.
- **InputBar `useEffect` listener closure issue:** `InputBar.tsx:124` has a `useEffect` that depends on `[text]` for the `opendesk:reference-file` event listener. This means the listener is re-attached on every keystroke. The dependency should be removed and the text update should use a functional state update.

---

## 4. Layout & Responsive Analysis

### 4.1 Layout Structure

- **Three-column concept:** Sidebar (260px) + Chat (flex-1) + Artifacts (resizable, 480px default). This is a strong, standard layout for AI desktop assistants.
- **Sidebar collapse:** `AppShell.tsx` supports `sidebarCollapsed` state, toggled via `window.api.app.onToggleSidebar`. When collapsed, the chat area expands to fill the space. This works correctly.
- **Artifacts panel resize:** `ArtifactPanel.tsx` has a manual resize handle with `min: 280px, max: 800px`. The `cursor-col-resize` and `GripVertical` icon provide good affordance. However, the resize handle is only 1px wide (`w-1`) and can be hard to grab. **Recommendation:** Make the handle at least 4px wide with a transparent hit area.
- **Chat panel title bar:** `ChatPanel.tsx:186` has a custom title bar area with `drag-region` class. This is correct for frameless Electron windows. The left/center/right division (workspace picker / thread title / tags) is well-balanced.
- **Input bar max-width:** `InputBar.tsx:779` uses `max-w-3xl` which limits the input width to ~768px even on wide screens. This is acceptable for readability but could feel cramped on ultra-wide monitors. Consider making it `max-w-4xl` or `max-w-full` with a generous padding.
- **Status bar crowding:** The status bar (`ChatPanel.tsx:323`) has provider health, AGENTS.md status, skill status, token count, and network status. On narrow windows (min-width 900px), these items can wrap or overlap. The token count is pushed to the right with `ml-auto`, which works, but the overall bar could benefit from a minimum height or overflow behavior.
- **Scroll-to-bottom button positioning:** `ChatPanel.tsx:565` uses `fixed bottom-28 left-1/2 -translate-x-1/2`. Since it's `fixed`, it is positioned relative to the viewport, not the chat container. `bottom-28` (=112px) is a magic number that assumes the input bar height. If the input bar grows (e.g., with attachments), the button can overlap the input bar. **Fix:** Position it relative to the chat container using `absolute` with `bottom-4`, or compute the offset dynamically.
- **Empty states are well-designed:** `EmptyState.tsx` is a reusable component with `sm`, `md`, `lg` sizes, animated icon, title, description, and action buttons. It's used consistently in `ChatPanel` (no provider, no messages with provider), `SkillsPanel`, and `ArtifactPanel`.
- **No responsive breakpoints for smaller windows:** The app enforces `min-size 900x650` in Electron, but within that window, the layout does not adapt. For example, the `SuggestionCard` grid uses `flex-wrap` but cards are fixed at `w-[180px]`. On a 900px window, the sidebar (260px) leaves 640px for chat, which is fine, but the artifacts panel (if open at 480px) would leave only 160px for chat — unusable. **Fix:** Auto-collapse or hide the artifacts panel when the window width is below a threshold (e.g., 1200px).

### 4.2 Panel Management

- **Slide-in panels without overlay:** `SkillsPanel`, `FilePanel`, and `MemoryPanel` slide in as full-screen overlays (`fixed inset-0`) but do not have a semi-transparent backdrop overlay. This means the user can still see the chat underneath, which is fine, but there's no visual indication that the chat is "behind" a modal layer. More importantly, clicking outside the panel does not close it (unlike `SettingsModal` which uses Radix Dialog). **Fix:** Add a backdrop overlay that closes the panel on click, or at least add an `Escape` key handler to close these panels.
- **FilePanel lacks empty state polish:** When no workspace is open, `FilePanel.tsx:249` shows a plain text message: "Open a workspace to browse files". This should use the `EmptyState` component with an icon and action button.
- **MemoryPanel was not reviewed in depth** (not in the file list), but its presence as a `fixed inset-0` slide-in panel suggests it follows the same pattern as `SkillsPanel` and `FilePanel`.

---

## 5. Competitive UX Comparison

### 5.1 vs. Kimi Work (3-panel desktop)

| Feature | Kimi Work | OpenDesk | Gap |
|---------|-----------|----------|-----|
| 3-panel layout | ✅ Yes | ✅ Yes | Parity |
| Sidebar file tree | ✅ Rich tree with inline previews | ✅ Good but limited to 200 files / depth 3 | Minor gap |
| New chat landing | ✅ Rich suggestions with dynamic icons | ✅ Similar with SuggestionCards + QuickActions | Parity |
| Message search | ✅ Search within current thread | ❌ Not implemented | **Missing** |
| Inline file preview | ✅ File cards in chat with syntax highlight | ❌ Only `@file:` text references | **Missing** |
| Thinking animation | ✅ Animated "thinking" dots / reasoning expand | ✅ Reasoning expand but no animation | Minor gap |
| Theme switching | ✅ Smooth transition, consistent dark mode | ⚠️ Broken due to `darkMode: 'class'` vs `data-theme` | **Critical** |
| Keyboard shortcuts | ✅ All documented shortcuts work | ⚠️ Many documented but not implemented | **Gap** |

### 5.2 vs. Trae (builder mode)

| Feature | Trae | OpenDesk | Gap |
|---------|------|----------|-----|
| Builder mode | ✅ Full IDE integration with file tree | ✅ FilePanel has tree + editor | Parity in concept |
| Code diff view | ✅ Inline diff with accept/reject | ✅ ToolCallCard has diff coloring | Parity |
| Terminal integration | ✅ Built-in terminal panel | ⚠️ Shell tool results shown in chat | Minor gap |
| Auto-run approval | ✅ Visual approval bar with diff | ✅ Approval mode switcher | Parity |
| File preview in chat | ✅ File tabs inline | ❌ Not implemented | **Missing** |

### 5.3 vs. Claude Desktop (artifacts, projects)

| Feature | Claude Desktop | OpenDesk | Gap |
|---------|----------------|----------|-----|
| Artifacts panel | ✅ Right panel with tabs, resize, preview | ✅ Similar with ArtifactPanel | Parity |
| Artifact types | ✅ Code, HTML, SVG, Mermaid, React | ✅ Same set | Parity |
| Artifact tab UX | ✅ Draggable tabs, persistent state | ⚠️ Basic tabs, no drag | Minor gap |
| Project memory | ✅ Projects with long-term context | ✅ Workspaces + AGENTS.md | Parity |
| Message branching | ✅ Branch/fork visual tree | ⚠️ Fork exists but no visual tree | **Missing** |
| Continue generating | ✅ "Continue" button when truncated | ❌ Not implemented | **Missing** |
| Message actions | ✅ Copy, retry, edit, delete, thumbs up/down | ✅ Copy, edit, regenerate, delete, fork, reply | Parity (no feedback) |

### 5.4 Key Missing Features (Prioritized)

1. **Message search within thread** — Essential for long conversations. Currently `GlobalSearch` searches across all messages but not within the active thread context.
2. **Continue generating button** — When model output hits a token limit, users need a way to ask the model to continue. This is a basic expectation in 2025.
3. **Message branching visualization** — The `forkThread` function exists but there is no UI to show or navigate branches. Claude's branching tree is a major UX differentiator.
4. **Inline file preview cards** — When referencing `@file:`, the chat should show a collapsible card with the file content preview, not just a text mention.
5. **Better reasoning/thinking UI** — The reasoning block is a simple expandable monospace box. Compare to Claude's animated "Thinking..." with a progress feel, or Kimi's elegant reasoning toggle.
6. **Message feedback (thumbs up/down)** — No way to rate responses, which means no data for RLHF or quality improvement.
7. **Persistent thread sidebar** — When in a workspace, the thread list is in the sidebar. But there's no way to see a full thread history with search/filter.

---

## 6. Specific UX Bugs (with file references)

### P0 — Critical (breaks functionality or accessibility)

| # | Bug | File | Line | Details |
|---|-----|------|------|---------|
| 1 | **Dark mode completely broken for Tailwind `dark:` classes** | `tailwind.config.ts` | 3 | `darkMode: 'class'` requires `class="dark"` on an ancestor. `globals.css` uses `[data-theme="dark"]`. Tailwind `dark:` prefixes never match. This breaks `Toast.tsx`, `InputBar.tsx`, `Message.tsx`, and any other component using `dark:bg-*`, `dark:text-*`, `dark:border-*`. |
| 2 | **O(n²) message index lookup** | `ChatPanel.tsx` | 519 | `messages.findIndex(m => m.id === msg.id)` inside the `messageGroups.map` loop. For 100 messages, this is 10,000 comparisons per render. During streaming, re-runs on every token. |
| 3 | **No `aria-live` for streaming content** | `Message.tsx` | 601 | Screen reader users are not notified of new assistant content during streaming. The `StreamCursor` is `aria-hidden`. |
| 4 | **All interactive elements lack focus indicators** | Multiple | — | `outline-none` is used on every input, button, and textarea without `focus-visible:ring` replacement. Keyboard navigation is invisible. |
| 5 | **InputBar listener re-attaches on every keystroke** | `InputBar.tsx` | 124 | `useEffect` for `opendesk:reference-file` has `[text]` dependency. The listener is removed and re-added on every keystroke. |

### P1 — High (significant UX degradation)

| # | Bug | File | Line | Details |
|---|-----|------|------|---------|
| 6 | **Hardcoded light-mode colors in dark mode** | `ChatPanel.tsx` | 268, 273 | `bg-indigo-50`, `bg-emerald-50`, etc. These are invisible or jarring in dark mode. |
| 7 | **Hardcoded light-mode colors in reasoning/error** | `Message.tsx` | 411, 466 | `getProviderColor()` returns `border-emerald-200` (light only). Error message uses `bg-red-50/60` with broken `dark:` prefix. |
| 8 | **Skill card source colors are light-only** | `SkillCard.tsx` | 13 | `SOURCE_COLORS` map uses `bg-blue-50`, `bg-emerald-50`, etc. No dark variants. |
| 9 | **Native `confirm()` dialogs** | `Sidebar.tsx` | 99, 133 | `window.confirm()` for delete/remove actions. Breaks visual consistency and accessibility. |
| 10 | **No focus trap in slide-in panels** | `AppShell.tsx` | 175–200 | `SkillsPanel`, `FilePanel`, `MemoryPanel` are custom `motion.div` overlays. Focus can escape to the chat underneath. |
| 11 | **Onboarding modal nested structure** | `OnboardingModal.tsx` | 82 | `Dialog.Content` is nested inside `Dialog.Overlay`. Radix Dialog expects them as siblings. This can cause focus and event bubbling issues. |
| 12 | **Scroll-to-bottom button overlaps input** | `ChatPanel.tsx` | 565 | `fixed bottom-28` is a magic number. If input bar grows (attachments, multi-line text), the button overlaps. |
| 13 | **TitleBar is non-functional** | `TitleBar.tsx` | 1 | The component is exported but never imported or rendered in `AppShell.tsx`. The drag region is handled in `ChatPanel.tsx` and `Sidebar.tsx` instead. This dead code should be removed or integrated. |
| 14 | **Workspace picker closes on mouse leave only** | `ChatPanel.tsx` | 205 | `onMouseLeave={() => setShowWorkspacePicker(false)}` means the picker closes if the user moves the mouse slightly outside the bounds. It should close on click-outside or Escape. |
| 15 | **FilePanel tree has no loading skeleton** | `FilePanel.tsx` | 307 | Shows plain text "Loading…" instead of a `SkeletonWorkspaceItem` or similar. |
| 16 | **Error boundary button has hardcoded color** | `AppShell.tsx` | 45 | `bg-[var(--accent)] text-white` works in light mode (dark accent = white text is fine) but in dark mode `var(--accent)` = `#FAFAFA`, so the button is near-white with white text = invisible. |

### P2 — Medium (polish / minor issues)

| # | Bug | File | Line | Details |
|---|-----|------|------|---------|
| 17 | **Missing `aria-label` on icon buttons** | Multiple | — | `ChatPanel.tsx:307`, `InputBar.tsx:960`, `MessageActions.tsx:37` use `title` but not `aria-label`. |
| 18 | **Shortcut help shows unimplemented shortcuts** | `ShortcutHelp.tsx` | 11–60 | See §2.2 for full list. |
| 19 | **Settings modal width is fixed** | `SettingsModal.tsx` | 291 | `style={{ width: 640 }}` has no responsive handling for 900px windows. |
| 20 | **CodeBlock highlight.js blocks main thread** | `CodeBlock.tsx` | 71 | `hljs.highlight()` runs synchronously in `useEffect`. Large blocks cause jank. |
| 21 | **Artifact iframe no `allow-same-origin`** | `ArtifactRenderer.tsx` | 99 | `sandbox="allow-scripts"` without `allow-same-origin` means the iframe cannot access localStorage or cookies. Intentional for security, but may limit some HTML artifacts. |
| 22 | **AgentActivityBar `AnimatePresence` in ChatPanel** | `ChatPanel.tsx` | 581 | `<AnimatePresence><AgentActivityBar /></AnimatePresence>` causes the bar to animate out/in on every streaming toggle, even when the bar content hasn't changed. |
| 23 | **Emoji picker modal has no Escape handler** | `Sidebar.tsx` | 458 | The icon picker modal has no keyboard close handler. |
| 24 | **SuggestionCard hover scale conflicts with layout** | `SuggestionCard.tsx` | 39 | `whileHover={{ scale: 1.02 }}` with `hover:-translate-y-0.5` in className creates conflicting transforms. Framer Motion's `whileHover` overrides the CSS `translate-y`. |
| 25 | **GlobalSearch `CornerDownLeft` icon shown on selected item** | `GlobalSearch.tsx` | 370 | The `↵` icon is shown for every selected item, but there's no label explaining what it means. First-time users won't understand. |
| 26 | **EnsembleModelPicker "Arb" button label is ambiguous** | `EnsembleModelPicker.tsx` | 117 | Both states show "Arb" text. The button should change label to "Arbitrator" when active to be clearer. |
| 27 | **Toast container `z-[100]` may conflict** | `Toast.tsx` | 87 | `z-[100]` is very high. If any other element uses `z-[90]` or `z-[50]`, it could cause layering issues. The toast container should probably use `z-[9999]`. |
| 28 | **Missing `key` stability in message list** | `ChatPanel.tsx` | 509 | `key={group.dateLabel + groupIdx}` is not stable if groups are inserted. Use `key={group.dateLabel}` or a stable group ID. |
| 29 | **CommandPalette shortcut collision** | `CommandPalette.tsx` | 228 | `⌘K` toggles the palette, but `AppShell.tsx:143` also uses `⌘K` for `GlobalSearch`. Both fire simultaneously. `e.stopPropagation()` is not used. |
| 30 | **ChatPanel `bottomRef` scrolls on every content change** | `ChatPanel.tsx` | 118 | `lastContent` effect scrolls instantly on every content change. If the user is reading earlier messages, this force-scrolls them to the bottom. Should only scroll if the user is already near the bottom. |

---

## 7. Recommendations (Prioritized)

### 🔴 P0 — Do Before Release

1. **Fix dark mode system inconsistency** (§6 Bug #1)
   - Change `tailwind.config.ts` from `darkMode: 'class'` to `darkMode: ['class', '[data-theme="dark"]']` OR add `class="dark"` to the `<html>` element when `data-theme="dark"` is set.
   - Audit every `dark:bg-*`, `dark:text-*`, `dark:border-*` usage to ensure they actually work after the fix.
   - Replace all hardcoded `bg-*-50` / `text-*-600` / `border-*-100` classes with CSS variable-based colors that adapt to theme.

2. **Add focus-visible indicators to all interactive elements** (§6 Bug #4)
   - Create a reusable `FocusRing` utility or extend the Tailwind config with a custom `focus-ring` plugin.
   - Replace `outline-none` with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]` globally.
   - Ensure Radix components (Dialog, Tabs, DropdownMenu, ContextMenu) preserve their built-in focus styles.

3. **Fix O(n²) message rendering** (§6 Bug #2)
   - Precompute a `messageIndexMap` in `ChatPanel.tsx` before the `messageGroups.map` render.
   - Memoize `messageGroups` more aggressively; only recompute when `messages` array reference changes (already done with `useMemo`, but the internal loop is still O(n²)).
   - Consider virtualizing the message list with `react-window` or `react-virtuoso` for conversations > 100 messages.

4. **Add `aria-live` for streaming assistant responses** (§6 Bug #3)
   - Add `aria-live="polite"` and `aria-atomic="false"` to the assistant message container in `Message.tsx`.
   - Ensure the `StreamCursor` does not create unnecessary live region announcements (it is already `aria-hidden`).

5. **Fix InputBar listener re-attachment** (§6 Bug #5)
   - Change the `useEffect` in `InputBar.tsx` to use a functional state update for `setText`, removing the `[text]` dependency.

### 🟠 P1 — High Priority

6. **Replace native `confirm()` dialogs with custom AlertDialog** (§6 Bug #9)
   - Use Radix UI `AlertDialog` for delete thread, remove workspace, and any other destructive actions.
   - Style the dialog to match the app theme (rounded-2xl, border, shadow).

7. **Implement focus trap for slide-in panels** (§6 Bug #10)
   - Wrap `SkillsPanel`, `FilePanel`, and `MemoryPanel` in `Dialog.Root` or add a `react-focus-lock` wrapper.
   - Add `Escape` key handlers to close these panels.
   - Add a semi-transparent backdrop overlay that closes the panel on click.

8. **Fix hardcoded color classes for dark mode** (§6 Bugs #6, #7, #8)
   - Create a `Badge` component that uses CSS variables for color theming (e.g., `bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20`).
   - Update `getProviderColor()` to return variable-based classes instead of hardcoded Tailwind colors.
   - Update `SOURCE_COLORS` in `SkillCard.tsx` similarly.

9. **Implement documented keyboard shortcuts** (§2.2)
   - Add handlers for `⌘1-9`, `⌘[`, `⌘]`, `⌘⇧N`, `⌘⇧D`, `⌘⇧E`, `⌘⇧A`, `⌘⇧Delete`, `⌘⇧T`, `⌚⇧M`, `⌘⇧.` to `AppShell.tsx`.
   - Remove shortcuts from `ShortcutHelp.tsx` that are not planned for implementation.

10. **Fix scroll-to-bottom button positioning** (§6 Bug #12)
    - Use `absolute` positioning inside the scroll container instead of `fixed`.
    - Compute the offset from the input bar height dynamically, or use `bottom: 1rem` relative to the scroll area.

11. **Fix Onboarding modal structure** (§6 Bug #11)
    - Make `Dialog.Content` a sibling of `Dialog.Overlay`, not a child.
    - Ensure `Dialog.Title` is properly associated with the content for screen readers.

12. **Add loading skeleton to FilePanel** (§6 Bug #15)
    - Use `SkeletonWorkspaceItem` or create a tree-specific skeleton for the file tree.
    - Show the skeleton while `buildTreeRecursively` is running.

13. **Fix error boundary button colors** (§6 Bug #16)
    - Use a color that has sufficient contrast in both light and dark modes. `bg-red-600 text-white` is a safe choice for error states.

### 🟡 P2 — Medium Priority

14. **Add `aria-label` to all icon-only buttons** (§6 Bug #17)
    - Audit all buttons that contain only an icon (no text). Add `aria-label` to every one.
    - Remove redundant `title` attributes where `aria-label` is present, or keep both.

15. **Optimize CodeBlock syntax highlighting** (§6 Bug #20)
    - Memoize the `hljs.highlight()` result with `useMemo` based on `code` and `language`.
    - For very large blocks (>500 lines), consider highlighting asynchronously or only the visible portion.

16. **Add message search within thread** (§5.4)
    - Add a `⌘F` handler in `ChatPanel` that opens a search bar within the message list.
    - Highlight matches and scroll to the first result.

17. **Add "Continue generating" button** (§5.4)
    - When an assistant message ends with a truncation indicator (e.g., `...` or the model signals truncation), show a "Continue" button next to the message actions.

18. **Add message feedback (thumbs up/down)** (§5.4)
    - Add thumbs up/down buttons to `MessageActions.tsx` for assistant messages.
    - Store feedback in localStorage or send to telemetry backend.

19. **Improve the reasoning/thinking UI** (§5.4)
    - Add a subtle pulsing animation or a progress indicator to the reasoning toggle.
    - Consider showing reasoning duration or token count.

20. **Make artifacts panel more robust** (§5.3)
    - Add draggable tab reordering.
    - Persist artifact panel width to localStorage.
    - Add a "Close all" button in the artifact header.

21. **Polish the onboarding flow** (§5.3)
    - The 3-step onboarding is functional but sparse. Add a final "You're all set!" step with a celebratory animation.
    - Consider adding a "Demo workspace" option with sample files for first-time users.

22. **Add a backdrop to slide-in panels** (§4.2)
    - A `bg-black/20` backdrop behind `SkillsPanel` / `FilePanel` would improve the visual hierarchy and provide a click-outside-to-close affordance.

23. **Remove or integrate TitleBar** (§6 Bug #13)
    - Either import `TitleBar` into `AppShell.tsx` and use it consistently, or remove the component if the drag region is handled elsewhere.

24. **Add `min-w` to the settings modal** (§6 Bug #19)
    - Use `width: min(640px, 90vw)` or a responsive Tailwind class like `w-full max-w-xl`.

25. **Fix CommandPalette shortcut collision** (§6 Bug #29)
    - Use `e.stopPropagation()` in the `AppShell.tsx` handler, or check if the palette is already open before opening search.

26. **Prevent forced scroll when user is reading earlier messages** (§6 Bug #30)
    - Track whether the user has scrolled up manually. Only auto-scroll if they are within ~100px of the bottom.

---

## Appendix: Component Reusability Notes

### Patterns That Should Be Extracted

1. **Badge / Tag component:** Used in `ChatPanel` (skill badge, AGENTS.md badge, provider badge), `SkillCard` (source badge), `AgentActivityBar` (role badge). Each is hand-rolled with inconsistent sizing and color handling.
2. **IconButton component:** Used everywhere — toolbar buttons, message actions, sidebar buttons. A reusable `IconButton` with `size`, `variant`, `aria-label`, and `tooltip` props would reduce duplication and improve accessibility consistency.
3. **SlideInPanel component:** `SkillsPanel`, `FilePanel`, `MemoryPanel` all share the same `motion.div` with `fixed inset-0`, `x: '100%'`, and close button pattern. Extract a `SlideInPanel` with `title`, `onClose`, `children`, and optional `backdrop` props.
4. **FormField component:** `ProviderForm.tsx`, `SettingsModal.tsx`, and `SkillsPanel.tsx` all have repeated label + input + error patterns. Extract a `FormField` with `label`, `hint`, `error`, and `children`.
5. **LoadingState / EmptyState:** `EmptyState.tsx` exists and is good. But `FilePanel` doesn't use it. Also, many async operations show plain text "Loading…" instead of `Skeleton` components.

### Duplicate Patterns

- **Dropdown menu styling:** `MessageActions.tsx`, `Sidebar.tsx` (thread actions), and `ContextMenu` in `Message.tsx` all define nearly identical `min-w-[180px] rounded-lg overflow-hidden bg-[var(--bg-content)] border border-[var(--border)] shadow-xl py-1` classes. Extract a `MenuContent` wrapper.
- **Modal/card styling:** `SettingsModal.tsx`, `OnboardingModal.tsx`, `CommandPalette.tsx`, `GlobalSearch.tsx`, and `ShortcutHelp.tsx` all use similar `rounded-2xl bg-[var(--bg-content)] border border-[var(--border)] shadow-2xl` patterns. Extract a `Card` or `ModalCard` component.
- **Button variants:** Primary (`bg-[var(--accent)] text-white`), secondary (`bg-[var(--bg-sidebar)] border border-[var(--border)]`), ghost (`hover:bg-[var(--border)]`) are repeated across dozens of files. A `Button` component with `variant` prop would ensure consistency and reduce className duplication.

---

*End of report.*
