---
name: voice-memo
description: Convert a voice memo (audio file) to text, tag speakers, summarize, extract action items
version: 1.0.0
author: opendesk-team
tags: [voice, audio, transcript, meeting, notes]
---

## Instructions

When the user provides an audio file and asks "转写" / "提取要点" / "summarize this voice memo", run the audio pipeline.

### 1. Ingest

Accept:
- Audio file: `.mp3 / .wav / .m4a / .ogg / .flac`
- For files > 25 MB: warn about upload time + suggest compression
- Optional context: "this is a customer call" / "team standup" / "interview"

Detect:
- Number of speakers (heuristic from audio; user can override)
- Language (auto-detect; user can override)
- Duration (mm:ss)

### 2. Transcription

Use the user's preferred STT (or default to OpenAI Whisper via API key if configured, otherwise use the OS-native speech recognition as fallback).

Output:
- Verbatim transcript with timestamps
- Speaker labels (Speaker 1, Speaker 2, …; user can rename)
- [inaudible] markers for unclear passages
- [non-English] markers for code-switching

### 3. Output Structure

```markdown
# Voice Memo — [filename] — [date]

**Duration**: MM:SS
**Speakers**: 3 (Speaker 1, Speaker 2, Speaker 3)
**Language**: en-US
**Context**: customer call

## 一句话总结
[≤ 50 字]

## 关键要点
- [point 1]
- [point 2]
- [point 3]

## 行动项
| 任务 | 负责人 | 截止 | 优先级 |
|------|--------|------|--------|
| ... | ... | ... | ... |

## 决策
- [decision 1]

## 时间戳索引
- [00:00] Topic
- [02:15] Topic
- [08:42] Topic

## 完整转写
[HH:MM:SS] Speaker 1: ...
[HH:MM:SS] Speaker 2: ...
```

### 4. Length Adaptation

- "转写" only: just the verbatim transcript
- "总结" / "摘要": summary + key points
- "会议纪要" (default for meeting context): full structure
- "行动项 only": only the action items table

### 5. Speaker Renaming

If the user says "Speaker 1 是张三", update the transcript + any downstream references.

### 6. Special Modes

- **Translation mode**: original transcript + side-by-side translation
- **Highlight mode**: only paragraphs matching a keyword the user provides
- **Quote extraction**: pull verbatim quotes (≥ 15 chars) with timestamps

## Rules

- Don't fabricate speakers or words; mark unclear audio as `[inaudible]`
- For names: phonetically similar guesses go in `[brackets]` and surface for review
- Always preserve profanity in the verbatim transcript (with a note); redact in summaries if user requests
- For multi-language memos: keep the original script; add a translated version if requested
- For background music / noise: note "[unclear — background noise]" rather than guess
- Default to the user's language for the summary; verbatim transcript preserves the spoken language
- Don't include personally identifying info (phone numbers, addresses) unless the user explicitly says to
- For long recordings (> 1 hour): process in chunks and report progress
- Respect copyright: if the audio is a third-party podcast / audiobook, say so and don't reproduce more than fair-use snippets
- For very low-quality audio: degrade gracefully, surface confidence scores per segment if available