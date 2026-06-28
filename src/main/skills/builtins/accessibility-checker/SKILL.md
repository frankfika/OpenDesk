---
name: accessibility-checker
description: Audit a webpage or component for WCAG 2.1 AA / AAA issues — keyboard, color contrast, ARIA, semantics
version: 1.0.0
author: opendesk-team
tags: [accessibility, a11y, wcag, audit, web]
---

## Instructions

When the user says "无障碍检查" / "accessibility audit" / "WCAG check" / "a11y review", produce a structured report.

### 1. Ingest

Accept:
- URL (use `web_fetch` to retrieve HTML)
- Or pasted HTML
- Or a component (e.g. a React file's JSX)
- Target conformance level: AA (default) / AAA
- Target disability categories: visual / motor / cognitive / auditory (default: all)

### 2. Audit Categories (WCAG 2.1)

#### Perceivable
- Images have meaningful alt text (or alt="" if decorative)
- Color is not the sole conveyor of information
- Text / background contrast ≥ 4.5:1 (AA) or 7:1 (AAA)
- Large text contrast ≥ 3:1 (AA) or 4.5:1 (AAA)
- Captions / transcripts for audio / video
- Resize up to 200% without loss

#### Operable
- All functionality via keyboard
- No keyboard traps
- Focus visible (custom :focus-visible styles not removed)
- Skip-to-content link
- Headings / labels describe topic / purpose
- Touch targets ≥ 44×44 px (WCAG 2.5.5 AAA, common AA ask)
- Drag alternatives (or undo)
- No flashing > 3× per second

#### Understandable
- Language declared (`<html lang="...">`)
- Page title describes topic
- Focus order matches visual order
- Form errors: identified in text + suggested fix
- Labels associated with controls (or aria-labelledby)
- Consistent navigation across pages

#### Robust
- HTML validates (no duplicate IDs, valid ARIA, no unclosed tags)
- Status messages use ARIA live regions (polite / assertive)
- Custom widgets have proper roles + states

### 3. Severity Tagging

- 🔴 **Critical**: blocks access entirely (e.g. missing form labels, keyboard trap)
- 🟠 **Major**: workaround exists but painful (e.g. contrast 4.3:1)
- 🟡 **Minor**: best practice violation (e.g. missing skip link on a 5-section page)
- 🔵 **Nit**: arguable / stylistic

### 4. Output

```markdown
# Accessibility Audit — [URL / Component]

**Conformance target**: WCAG 2.1 AA
**Pages audited**: N
**Issues found**: X critical, Y major, Z minor

## Summary table
| WCAG SC | Issue | Severity | Locations |
|---------|-------|----------|-----------|
| 1.1.1   | Missing alt | 🔴 | img.hero, img.product-1 |
| 1.4.3   | Contrast 3.8:1 | 🟠 | .btn-secondary |
| 2.4.7   | No :focus-visible | 🟠 | All interactive |

## Critical issues (must fix)

### 🔴 WCAG 1.1.1 — Non-text Content
**Issue**: Hero image `<img src="/hero.jpg">` has no alt attribute
**Fix**: Add `alt="..."` describing the image purpose
**Files**: index.html:42

[repeat per issue]

## Major issues

[...]

## Suggested fixes

### Code
```html
<!-- before -->
<img src="/hero.jpg">

<!-- after -->
<img src="/hero.jpg" alt="Customer using Acme on a laptop in a café">
```

## Testing plan

- [ ] Run Lighthouse accessibility audit (target: 100)
- [ ] axe DevTools scan (target: 0 violations)
- [ ] Manual keyboard walkthrough (tab order matches reading order)
- [ ] Screen reader test (NVDA / VoiceOver)
- [ ] Color contrast on real devices in different lighting
```

### 5. Programmatic Checks

Flag any of:
- `<img>` without alt
- `<a>` without href (or without accessible name)
- `<button>` without text / aria-label
- `<input>` without label
- `<table>` without `<th>` or `scope`
- `onclick` on a non-interactive element (use `<button>` instead)
- `tabindex` > 0 (creates anti-pattern focus order)
- Missing `lang` attribute on `<html>`
- Missing `<title>`

### 6. Tool-assisted Cross-checks

Recommend the user also run:
- Lighthouse (`npx lighthouse <url> --view`)
- axe DevTools (browser extension)
- Pa11y CI (`pa11y-ci`)
- WAVE (`wave.webaim.org`)

## Rules

- Be specific: cite line numbers, not "the page"
- For SPA / React code: check JSX directly; flag missing aria attributes
- For contrast issues: provide the actual hex ratio, not just "low contrast"
- For dynamic content: verify aria-live is present and used correctly
- Don't recommend AAA fixes if the target is AA (and vice versa) without flagging
- For mobile: include touch target checks
- Don't replace human review — assistive-tech testing is still required
- Output language matches the project's locale
- For multi-page audits, organise issues by page then by severity
- Don't recommend library / framework changes unless the project isn't already using one