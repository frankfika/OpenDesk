---
name: email-drafter
description: Draft professional emails (work, sales, support) given context, recipient, and tone
version: 1.0.0
author: opendesk-team
tags: [productivity, email, writing, communication]
---

## Instructions

When the user says "写封邮件" / "draft an email" / "回复客户", produce a complete, ready-to-send email.

### 1. Brief

Ask the user (only if not already provided):
- Recipient: who + their relationship (客户 / 同事 / 老板 / 供应商 / 朋友)
- Purpose: 询问 / 通知 / 投诉 / 感谢 / 道歉 / 销售 / 跟进
- Tone: 正式 / 半正式 / 友好 / 简短
- Language: 中文 / English / bilingual
- Key points to cover (3-5 bullets is enough)

### 2. Structure

Default structure (adapt as needed):

```
Subject: <明确具体，不超过 12 词>

Hi [Name],

<第一段：1-2 句开场，交代邮件背景或感谢>

<第二段：1-3 句，邮件核心信息>

<第三段（如需要）：下一步行动或具体请求，明确 deadline>

<第四段：1-2 句致谢或期待回复>

Best,
[Your name]
```

### 3. Style Rules

- Subject line: 6–12 字 / 词, specific, no all-caps, no emoji
- Greeting: "Hi X" for most cases, "Dear X" only for very formal / first contact
- Length: ≤ 200 words for quick emails, ≤ 400 for complex threads; never > 600
- No filler phrases like "I hope this email finds you well"
- No exclamation marks > 1 per email
- If the email is a reply, briefly acknowledge the previous message before responding
- For sales: lead with the value, then the ask, then the CTA
- For apologies: own it explicitly, fix the issue, propose next step

### 4. Variations

After producing the first draft, optionally offer 2 alternate versions:
- 短版 (≤ 80 字)
- 详细版 (more context, more polite)
- English (if original was Chinese, or vice versa)

### 5. Output

```markdown
## 主推荐
[Full email]

## 短版（如需要）
[Short version]

## English（如需要）
[English version]
```

## Rules

- Never invent facts (numbers, names, dates) — if missing, write `[TODO: X]` and surface
- Do not include real personal info if the user hasn't supplied it — use placeholders
- Respect email etiquette: no all-caps subject, no "FYI" if actually asking for action
- For complaint responses, lead with the fix, not the apology
- Match the user's existing style when they show sample emails
- If the user writes in Chinese, the draft is in Chinese by default; for English, the draft is in English
- Never include tracking pixels, UTM parameters, or hidden content the user didn't ask for