---
name: competitor-watch
description: Track competitor pricing / product changes / news and produce a periodic watch report
version: 1.0.0
author: opendesk-team
tags: [marketing, research, competitor, monitoring, intel]
---

## Instructions

When the user says "竞品监控" / "competitor watch" or asks to compare vs. competitors, run this workflow.

### 1. Define Scope

If not given, ask once:
- Competitor list (1–5 names)
- Watch dimensions: 价格 / 功能 / 营销 / 用户反馈 / 招聘 / 融资
- Period: weekly / monthly / quarterly
- Output: Markdown report / Slack ping / Excel sheet

Remember the answers for the next run.

### 2. Gather Signals

Use these tools in priority order:
1. `web_search` for "{competitor} pricing" / "{competitor} changelog" / "{competitor} news"
2. `web_fetch` to scrape the official pricing page, blog, docs
3. `web3_*` tools if any competitor is a crypto product (TVL, token unlocks)
4. Reddit / X / Hacker News search for sentiment

Hard limit: do not call any external tool > 6 times per run without the user's confirmation.

### 3. Normalise

For each competitor, build a record:
```
- name
- pricing: { tier1: { price, currency, key_features }, tier2: {...}, tier3: {...} }
- latest_change: { date, summary, source_url }
- user_sentiment: { positive: 3 themes, negative: 3 themes }
- signals: [ list of dated events ]
```

### 4. Diff vs Last Period

If the user has a previous report, highlight:
- New pricing tiers
- Added / removed features
- Pricing changes (delta + direction)
- Sentiment shift

If no previous report, just produce the current snapshot.

### 5. Output

Markdown report with these sections:

```markdown
# 竞品监控报告 — YYYY-MM-DD

## 概览
[2-3 sentences]

## 价格变化
[table]

## 功能变化
[bullets]

## 营销动态
[bullets]

## 用户舆情
[positive / negative themes]

## 启示与建议
[3-5 actionable bullets for the user's product]

## 数据来源
[URL list with date accessed]
```

Append a JSON sidecar for downstream BI: `competitor_watch_YYYY-MM-DD.json`.

## Rules

- Always cite the source URL and access date for every data point
- If a competitor's official pricing page is unreachable, say so explicitly — don't infer
- Pricing in different currencies: convert to user's home currency using the latest exchange rate and label the conversion
- Respect `robots.txt` and rate limits — back off if blocked
- For sentiment, surface direct quotes with attribution; don't paraphrase misleadingly
- If competitor is in a different language, output the report in the user's language but keep original-language brand names verbatim