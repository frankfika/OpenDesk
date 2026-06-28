---
name: interview-questions
description: Generate role-specific interview questions, rubric, and answer guide from a job description
version: 1.0.0
author: opendesk-team
tags: [hr, hiring, interview, prep, candidate]
---

## Instructions

When the user provides a job description (JD) and wants interview questions, produce a complete interview kit.

### 1. Ingest

Accept:
- JD text (paste / file)
- Role level: junior / mid / senior / staff / principal (default: senior)
- Interview type: phone screen / technical / system design / behavioral / case study / all
- Time budget per round: e.g. "60-min technical"
- Optional: existing rubrics or past questions to align with

If level and type are missing, default to senior + technical round.

### 2. Categorise Questions

For each round, mix the following:

- **Foundational (20–30%)** — must-pass questions; gate at this level
- **Depth (40–50%)** — real-world scenarios, trade-offs, debugging
- **Stretch (15–25%)** — open-ended, opinionated, edge cases
- **Behavioral (10–15%)** — STAR-format past-experience questions

Always include a 5-minute "candidate questions to ask the interviewer" list.

### 3. Format Per Question

```markdown
### Q<n>: <Title>

**Difficulty**: Junior / Mid / Senior / Staff
**Type**: Coding / System Design / Behavioral / Domain
**Time estimate**: 20 min
**Tags**: [react, performance, debugging]

**Question**:
[Verbatim, ≤ 200 words, no ambiguity]

**What we're looking for**:
- [Signal 1] — what to listen for
- [Signal 2]
- [Signal 3]

**Red flags**:
- [Anti-pattern 1]
- [Anti-pattern 2]

**Follow-ups**:
- [Follow-up question 1]
- [Follow-up question 2]

**Reference answer outline** (1-page):
[Key points the ideal candidate hits]
```

### 4. Rubric

For each round, also produce a scoring rubric:

| Signal | 1 — Failing | 3 — Proficient | 5 — Strong |
|--------|-----------|---------------|------------|
| [Signal 1] | ... | ... | ... |
| [Signal 2] | ... | ... | ... |

Total score range: 1–5 per signal; aggregate to a verdict (Strong Hire / Hire / Lean Hire / No Hire / Strong No Hire).

### 5. Pipeline

For a full loop:
1. Recruiter phone screen (15 min) — motivation, comp, location, basics
2. Hiring manager call (45 min) — past projects, deep dive, team fit
3. Technical round(s) — domain-specific, depth
4. System design / architecture (60 min) — only for senior+
5. Behavioural / culture (45 min) — STAR, values alignment
6. Bar raiser / cross-functional (45 min) — for senior+

Adjust per level.

### 6. Output

Two artefacts:
- `interview_kit.md` — questions + rubric
- `interview_evaluator.md` — a blank scorecard the interviewer fills during the call

## Rules

- Never invent company-specific facts (project names, internal tools) — keep questions generic
- For coding questions, prefer small but meaningful problems over algorithms trivia
- Behavioural questions must be open-ended ("tell me about a time...") not leading
- Don't include questions that screen on protected characteristics (age, family, nationality, religion)
- For senior+ roles, always include at least one ambiguous / trade-off question
- Adjust language difficulty to the role: senior candidates expect higher vocabulary
- Output language matches the JD's primary language
- For multi-language teams, provide the question + reference answer in English + the team's working language