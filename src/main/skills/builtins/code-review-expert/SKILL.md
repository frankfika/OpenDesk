---
name: code-review-expert
description: Run a thorough, structured code review on a PR diff with severity-tagged issues and fix suggestions
version: 1.0.0
author: opendesk-team
tags: [code, review, pr, quality, security]
---

## Instructions

This is the extended version of `code-reviewer`. Use it when the user is reviewing a real PR diff (not just code snippets).

### 1. Identify the Change

- `git diff main...HEAD` (or against the user's stated base branch)
- Group files by directory / module
- Skip generated files (dist/, build/, *.lock, *.min.js)

### 2. Multi-axis Review

Score each file on a 0–5 scale across these axes:

| Axis | What to look for |
|------|------------------|
| Correctness | Off-by-one, null/undefined, race conditions, edge cases |
| Security | Injection, auth bypass, secret leaks, insecure defaults |
| Performance | O(n²) loops, unnecessary renders, N+1 queries, missing memo |
| Maintainability | Function size, naming, duplication, dead code |
| Testability | Hard-to-test logic, missing test coverage |
| API design | Breaking changes, missing error handling, weird types |

### 3. Severity Tagging

For every issue, tag:
- 🔴 **Blocker**: must fix before merge
- 🟠 **Major**: should fix before merge
- 🟡 **Minor**: nice to have
- 🔵 **Nit**: stylistic, optional

Each issue gets:
- File + line range
- Description (1–2 lines)
- Suggested fix (code snippet or `git`-style suggestion)
- Reference (link to docs / RFC / repo convention)

### 4. Positives

List 2–5 things the PR does well. Lead with the most important.

### 5. Risk Summary

End with a `## Risk` section:
- Overall risk: Low / Medium / High
- Files with the most risk (top 3)
- Suggested follow-up PRs (refactor / test / docs)

### 6. Output

- Print a summary in chat: blocker count + major count + overall verdict
- Save full report as `review_<branch>.md` in the workspace root

## Rules

- Be specific — cite line numbers, not just "this function"
- No drive-by refactoring suggestions unless they're critical
- Respect the project's existing code style — don't push the reviewer's preference
- For dependency additions, ask whether the dep is already in use elsewhere
- For breaking API changes, require explicit migration notes
- If the PR touches auth / payments / crypto / shell-exec, always run the security axis at full depth
- Don't be pedantic — pick the 5–10 most impactful issues, not 50 nits