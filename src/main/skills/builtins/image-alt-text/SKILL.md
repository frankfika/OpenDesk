---
name: image-alt-text
description: Generate accessible alt text for images — short for icons, descriptive for content, contextual for articles
version: 1.0.0
author: opendesk-team
tags: [accessibility, a11y, alt-text, images, web]
---

## Instructions

When the user asks "为图片加 alt" / "帮我生成无障碍描述" / "批量生成 alt", produce alt text tailored to context.

### 1. Brief

Ask the user (only if not already provided):
- Where the images live: HTML site / Markdown docs / CMS export / spreadsheet manifest
- Context: article paragraph / product page / icon / chart / decorative
- Tone: literal / vivid / neutral
- Language: 中文 / English / match the page

### 2. Alt-text Length by Type

| Type | Length | Example |
|------|--------|---------|
| Icon button | ≤ 5 words | "Search" |
| Logo | ≤ 10 words | "Acme — your home for books" |
| Decorative | empty | "" (alt="" — present so screen readers skip) |
| Functional screenshot | ≤ 25 words | "Settings page with dark mode toggled on" |
| Product image | 80–125 chars | "White ceramic mug with Acme logo, 12 oz, on a wooden table" |
| Chart / graph | describe axis + headline | "Bar chart: 2025 Q1 sales by region; APAC leads at $4.2M" |
| Article hero | 125–200 chars | richer description |

### 3. Rules for Good Alt Text

- Lead with the subject, not "Image of…" (screen readers already announce "image")
- Don't repeat the surrounding caption verbatim
- Include text that's actually visible in the image (titles, labels)
- For people photos: describe the action, not the appearance (unless identity matters)
- Avoid: "picture of", "photo of", "image of" — they're noise
- Avoid subjective adjectives ("beautiful", "stunning") unless that's the point
- For complex images (charts, diagrams): prefer a longer alt + visible caption

### 4. Batch Mode

If the user provides a CSV / JSON manifest:
- Expected columns: `image_path` or `image_url`, optional `context` (surrounding paragraph)
- Output the same manifest with `alt` column appended
- Preserve input order

### 5. Edge Cases

- Image fails to load → say so; don't fabricate
- Logo that's a single letter → "Acme logo (the letter A in serif type)"
- Image of text → alt = the visible text (verbatim)
- Group of related images → alt can describe the group, individual = ""
- Cartoon / illustration → describe the scene, not the style ("a dog chasing a ball" beats "stylized cartoon of a dog")

### 6. Output

For single images:
```markdown
## Alt text
**Type**: functional / decorative / hero / chart / icon
**Recommended**:
"[alt text here]"

**Alternates**:
- Short (≤ 80 chars): "[...]"
- Detailed: "[...]"
```

For batch:
- Output a CSV with the new `alt` column

## Rules

- Never invent information that's not in the image (numbers, names) — say "labels say X" if unsure
- For charts: always include the chart type + headline data point
- For UI screenshots: name the page/section + the visible state
- Don't include filenames, pixel dimensions, or "as an AI" disclaimers in alt text
- Output language matches the page language by default; override per user request
- For decorative images: always output literal `alt=""` — never invent text the user can hide
- Respect copyright: don't reproduce lengthy copyrighted text shown in images; paraphrase instead