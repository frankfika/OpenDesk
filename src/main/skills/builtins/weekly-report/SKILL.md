---
name: weekly-report
description: Generate a structured weekly report from this week's chat threads and completed tasks
version: 1.0.0
author: opendesk-team
tags: [productivity, report, weekly, summary]
---

## Instructions

When the user says "写周报" / "weekly report" / "summary of this week", generate a structured weekly report.

### 1. Gather Inputs

Pull from these sources:
- Threads in the active workspace from the past 7 days (use the workspace store)
- Tool calls / file edits completed
- Linked workspace files (commits, PRs if user mentioned them)

If external data sources are needed (Jira, Linear, GitHub), ask the user once and remember.

### 2. Categorise

Sort each thread / task into one of:
- 🎯 **Done** — completed and shipped
- 🔄 **In progress** — partial work, < 80% done
- 🚧 **Blocked** — waiting on someone/something
- 📅 **Next** — planned but not started

### 3. Draft Sections

Default report template:

```markdown
# 周报 — [姓名] — [YYYY-MM-DD ~ YYYY-MM-DD]

## 本周完成
- ✅ [项 1] — 一句话结果 + 量化数据
- ✅ [项 2]

## 进行中
- 🔄 [项 3] — 当前进度（%） + 下周目标
- 🔄 [项 4]

## 阻塞 / 风险
- 🚧 [项 5] — 阻塞原因 + 需要谁的支持
- 🚧 [项 6]

## 数据指标（如适用）
| 指标 | 本周 | 上周 | Δ |
|------|------|------|---|
| ... | ... | ... | ... |

## 下周计划
1. [项 7]
2. [项 8]

## 反思 / 学到
- ...
```

Adapt the template to the user's role (engineer / PM / designer / sales).

### 4. Output

- Write to `~/Reports/weekly_YYYY-MM-DD.md` (or user-specified path)
- Show the markdown in chat
- Optionally generate a `.docx` export

## Rules

- Never invent metrics — if a number isn't in the data, omit the row
- Keep each bullet ≤ 25 words; link out for details
- For "In progress", always include the explicit % if known
- Use 量化 wherever possible ("优化 X 接口 p99 220ms → 95ms" beats "优化了性能")
- Respect user's company / manager template if mentioned; else use the default