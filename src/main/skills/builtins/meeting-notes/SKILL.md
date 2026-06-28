---
name: meeting-notes
description: Turn a meeting transcript or recording transcript into structured meeting notes with action items
version: 1.0.0
author: opendesk-team
tags: [productivity, meeting, transcript, notes, action-items]
---

## Instructions

When the user drops a meeting transcript (text or srt/vtt file), turn it into structured notes.

### 1. Ingest

- If file is audio/video: ask the user to provide the transcript (do not call external STT services without explicit consent)
- If file is .txt / .md / .srt / .vtt: read it directly
- If the input is a pasted string, use that

### 2. Identify

Extract:
- Meeting title (from first few lines, or infer)
- Date / time (from filename or content; if missing, leave blank)
- Attendees (from "X 说" / "X:" / explicit mentions)
- Duration (from timestamps)

### 3. Summarise

Produce a 1-paragraph executive summary (≤ 80 字) capturing the meeting's purpose and outcome.

### 4. Key Points

Distill 3–8 bullet points. Each bullet should be:
- A complete sentence
- Tagged with the speaker's name when relevant
- Ordered by importance, not chronology

### 5. Decisions

List every decision made. Format: `决定：[decision]. 决策人：[person(s)]. 背景：[1-line rationale].`

If no clear decision was made, write `本次会议未形成明确决定。`

### 6. Action Items

For every action item, capture:
- 任务
- 负责人
- 截止日期
- 优先级 (P0 / P1 / P2)
- 状态（默认 `todo`）

Output as a markdown table.

### 7. Open Questions

List anything that was raised but not resolved. Each as a one-liner with the speaker who raised it.

### 8. Output

Save to `~/Notes/meetings/YYYY-MM-DD_<title>.md` (or user-specified path). Structure:

```markdown
# [会议标题]

**日期**: YYYY-MM-DD HH:MM
**时长**: XX 分钟
**参会**: A、B、C、D
**记录**: AI 自动整理

## 摘要
[1 paragraph]

## 关键讨论
- ...
- ...

## 决定
- ...

## Action Items
| 任务 | 负责人 | 截止 | 优先级 |
|------|--------|------|--------|
| ... | ... | ... | ... |

## 待澄清
- ...
```

Show the markdown in chat too for quick review.

## Rules

- Never invent attendees — if you can't tell, list as `未知`
- Action items must have a clear owner; if unclear, mark as `待指派` rather than guessing
- Preserve direct quotes when the user might need them later — append a `## 原文摘录` section
- Don't editorialize or judge — keep tone neutral
- If transcript is in Chinese, output in Chinese; English stays in English