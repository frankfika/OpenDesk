---
name: youtube-transcript
description: Fetch a YouTube video transcript (manual or auto-generated), summarize, extract key points
version: 1.0.0
author: opendesk-team
tags: [video, youtube, transcript, summary, learning]
---

## Instructions

When the user provides a YouTube URL and says "总结这个视频" / "summarize this video" / "把这个视频翻译成中文", fetch the transcript and produce a structured summary.

### 1. Ingest

Accept these input formats:
- Full URL: `https://www.youtube.com/watch?v=...`
- Short URL: `https://youtu.be/...`
- Bare video ID: 11-char alphanumeric
- Playlist URL: process the first video, mention the playlist

Steps:
1. Extract the video ID
2. Fetch the transcript via `youtube-transcript` npm package (or youtubei.js)
3. Prefer **manual subtitles** over auto-generated when both are available
4. Fall back to the language most likely to match the video title (zh-Hans / zh-Hant / en)
5. Note the duration and language used

### 2. Length Adaptation

Match the user's intent:
- "TL;DR" / "一句话": ≤ 50 字
- "短摘要": 200–400 字 + 3 key takeaways
- "详细摘要" (default): 600–1200 字 + chapter-by-chapter breakdown
- "完整笔记" (rare): time-coded notes throughout

### 3. Default Output

```markdown
# [视频标题]

**频道**: [channel name]
**时长**: [HH:MM]
**语言**: [original / translated to X]

## 一句话总结
[≤ 50 字]

## 详细摘要
[按时间分段 / 按主题分段二选一]

## 关键要点
- [Takeaway 1]
- [Takeaway 2]
- [Takeaway 3]
- [Takeaway 4]
- [Takeaway 5]

## 引用（按时间戳）
- [02:15] 引用文字
- [08:42] 引用文字
- [15:30] 引用文字

## 我的观察
[1-2 句, 例如"作者忽略了 XX"或"这个观点和 YYYY 文章冲突"]
```

### 4. Chapter Detection

If the transcript has natural topic shifts (long pauses, transitions like "现在让我们聊"), split the summary into chapters. Otherwise, organize by **thematic blocks**.

### 5. Special Modes

- **Translation mode**: user says "翻译成英文". Output: original transcript (optional) + full English translation. Note: translate the *content*; preserve named entities (people, products, places) in original script.
- **Q&A mode**: user says "回答 X 问题 based on this video". Use the transcript as the only source of truth; if the answer isn't there, say so.
- **Compare mode**: user says "和我的笔记对比". Cross-reference with another doc if provided.

### 6. Limits

- Maximum video length: 4 hours (longer → suggest chunking)
- For videos without captions: say so explicitly; do NOT fall back to audio transcription (out of scope)
- For private / age-restricted videos: tell the user to provide the transcript manually

## Rules

- Always include the source URL and access date in the output
- Never invent quotes; if you paraphrase, say so
- For translation mode, mark names / brand terms to preserve
- If multiple speakers, attribute key quotes to speaker names when available
- Default output language matches the user's input language, not the video's
- Don't recommend video sharing or reposting without the user's explicit ask
- Respect copyright: don't reproduce full transcripts verbatim in long-form output unless asked