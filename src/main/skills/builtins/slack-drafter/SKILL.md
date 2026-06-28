---
name: slack-drafter
description: Draft Slack / Discord / Teams messages with the right tone — quick ping, status update, escalation, thread reply
version: 1.0.0
author: opendesk-team
tags: [slack, discord, teams, chat, communication]
---

## Instructions

When the user says "写个 Slack" / "发个消息给团队" / "回复那个 PR", produce a channel-appropriate message.

### 1. Brief

Ask (only if not provided):
- Channel: #general / private channel / DM / thread reply
- Tone: casual / professional / direct / friendly
- Length: one-liner / short paragraph / full update
- Mentions: who to @-tag (with role, not name — let user confirm)
- Attachments: link to PR / doc / ticket

### 2. Slack Formatting Reference

- `<@USERID>` — @-mention
- `<#CHANNELID>` — channel reference
- `<URL|text>` — hyperlink with custom text
- `*bold*` — bold (single asterisk, not double — Slack dialect)
- `_italic_` — italic
- `~strike~` — strikethrough
- `` `code` `` — inline code
- ``` ``` ``` ``` — code block
- `:emoji:` — shortcode emoji
- `>` — blockquote (for replies)
- `:wave:` etc. — emoji by name
- `&gt;` — literal `>` (escape if needed)

### 3. Tone Templates

**Quick ping** (≤ 30 words):
```
hey <@user>, mind checking <PR URL|the PR>? shipping it before EOD would unblock <@user2> on the demo
```

**Status update** (≤ 80 words):
```
*Status — YYYY-MM-DD*

✅ Done: [item 1]
🔄 In progress: [item 2]
🚧 Blocked: [item 3] — need <@user>'s input by EOD

Will share the next milestone update <date>.
```

**Escalation** (≤ 100 words):
```
🚨 Need help: <URL|prod incident X>

Impact: [user-facing / revenue / compliance]
Started: [time]
Current state: [what we've tried]
Asking: <@user> or <@user2> to <specific action> by [time]
```

**Thread reply** (≤ 60 words):
```
> <Original message snippet>

[Reply that picks up the thread, references prior context, advances the conversation]
```

### 4. Style Rules

- One message = one idea; link out for details
- Use bullet lists for parallel content
- For sensitive feedback: DM, never public
- For decisions: use `✅ Decision:` / `🚨 Decision:` prefix
- For asks: include a deadline and an owner
- For status updates: lead with what's shipping, then blocked, then backlog
- Avoid emoji spam (≤ 3 per message)

### 5. Thread Etiquette

- Reply in thread by default (don't pollute the channel)
- For "thread starters" in public channels: lead with the ask, follow with context
- Use `@here` / `@channel` only when truly urgent and channel-wide
- Respect Do Not Disturb schedules when possible

### 6. Output

```markdown
## 短版
[Single-line message]

## 详细版
[Paragraph / bulleted update]

## English 版
[Translation if original is Chinese, or vice versa]

## Thread reply
[Reply that references prior context]
```

Always show the message wrapped in triple backticks so the user can copy verbatim — formatting (asterisks, backticks) breaks in plain markdown renders.

## Rules

- Never invent names or @-mentions; the user pastes the IDs after generation
- For decisions: include the date so the record is findable later
- For sensitive topics (HR, legal, mental health): suggest DM by default; warn if asked to send publicly
- For mass channels (#general, #announcements): keep ≤ 200 chars; reserve for high-signal
- For 1:1 DM: more casual, OK to drop formatting
- Don't recommend Slack for: long-form feedback, code review (use GitHub), contracts (use DocuSign)
- Always include a clear CTA or "no action needed" tag
- For multi-language teams: provide both versions
- Don't include emojis that don't exist (`:party-parrot:` is fine; `:my-custom-emoji:` is not)