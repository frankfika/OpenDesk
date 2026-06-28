---
name: podcast-transcript
description: Fetch a podcast episode by RSS / Apple / Spotify URL, transcribe, summarize, extract key quotes and topics
version: 1.0.0
author: opendesk-team
tags: [podcast, audio, transcript, summary, learning]
---

## Instructions

When the user provides a podcast URL or RSS feed, fetch the episode, transcribe, and produce a structured summary.

### 1. Ingest

Accept:
- Spotify / Apple Podcasts / Overcast / Pocket Casts / RSS feed URL
- Specific episode URL or RSS with "the latest one"
- Show name (search by name if no URL)
- Optional: target episode date or title keyword

Steps:
1. Resolve to RSS feed
2. Find the target episode
3. Download the audio (`.mp3` preferred)
4. Transcribe using `voice-memo` Skill (or Whisper API)

### 2. Output Structure

```markdown
# [Episode Title]

**Show**: [podcast name]
**Host(s)**: ...
**Guest(s)**: ...
**Date published**: YYYY-MM-DD
**Duration**: HH:MM
**Listen at**: [original URL]

## 一句话总结
[≤ 50 字]

## 关键要点
- [Takeaway 1]
- [Takeaway 2]
- [Takeaway 3]
- [Takeaway 4]
- [Takeaway 5]

## 章节索引（按时间）
- [00:00] 开场介绍
- [02:30] [topic A]
- [15:42] [topic B]
- ...

## 关键引用
- [08:30] "[verbatim quote]" — Guest
- [25:14] "[verbatim quote]" — Host

## 提到的资源 / 链接
- [resource 1]
- [resource 2]

## 我的观察
[1-2 sentences, e.g. "观点 X 与 YYYY 文章矛盾" or "嘉宾忽略了 ZZ 维度"]
```

### 3. Length Adaptation

- "TL;DR" / "一句话": ≤ 50 字
- "短摘要": 200–400 字 + 3 takeaways
- "详细摘要" (default): 800–1500 字 + chapter breakdown
- "完整笔记": time-coded full transcript

### 4. Multi-Episode Mode

If the user provides an RSS URL without an episode:
- List the latest 5 episodes
- Optionally: auto-summarize the most recent one (ask first)

If the user provides a season URL: summarize episode-by-episode + a season-level synthesis.

### 5. Show-Level Context

For recurring shows, optionally maintain a running brief:
- Host / guest preferences
- Recurring topics
- Series arcs ("in the previous 3 episodes, the show focused on X; this one pivots to Y")

### 6. Output

Default:
- Markdown file next to the user's working directory
- Summary in chat with the key takeaways + 3 quotes

For series: a multi-episode report saved as `podcast_<show>_ep<n>_brief.md`.

## Rules

- Always cite the original URL and access date
- For transcripts: keep verbatim quotes ≤ 90 chars; paraphrase longer passages
- Don't republish the full transcript (copyright); the user listens via the original source
- For private / subscriber-only episodes: say so explicitly; don't try to bypass paywalls
- For shows with ads: skip them; note the ad reads in the chapter index if obvious
- Speaker identification: name them when known; otherwise "Host 1", "Guest 2"
- Multi-language: transcribe in the show's spoken language; summarise in the user's language
- If the download fails (region lock, removed episode): say so explicitly; offer to work from a transcript the user provides
- Respect the podcast creator's licensing: never offer to redistribute the audio file