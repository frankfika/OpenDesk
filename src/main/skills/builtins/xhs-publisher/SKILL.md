---
name: xhs-publisher
description: Draft viral Xiaohongshu (小红书) posts — title, body, hashtags, cover-image prompt — given a topic
version: 1.0.0
author: opendesk-team
tags: [social-media, xiaohongshu, content, copywriting, growth]
---

## Instructions

When the user asks for a 小红书 post, produce a complete, publish-ready package.

### 1. Brief

Ask the user (only if not already provided):
- Topic / theme
- Target audience (年龄、性别、兴趣)
- Tone: 种草 / 干货 / 测评 / 探店 / 日常 / 避雷
- Length target (300 字 / 600 字 / 1000 字)
- Whether to include emojis and how heavily

### 2. Title Craft (5 options)

Produce 5 title candidates following these patterns:
- 悬念式: "我居然……" / "原来……"
- 数字式: "5个……" / "30天……"
- 对比式: "从X到Y，我只用了……"
- 提问式: "为什么……？" / "你知道……吗？"
- 痛点式: "别再……了！"

Constraints: 6–20 字, include 1–3 个 emoji, avoid 标题党 clickbait that doesn't match content.

### 3. Body

Structure:
- Hook (1–2 sentences that earn the scroll-stop)
- Story / steps (most posts follow 1-3-1: 一句开场 + 三段要点 + 一句总结)
- CTA (评论 / 收藏 / 关注 / 私信)
- Hashtags (5–10 个, mix of热门 + 精准 + 长尾)

Style:
- Sentence length ≤ 20 字 mostly; line-break aggressively
- Use emoji as bullet points (✅ / ❌ / 💡 / 📌)
- Avoid 违禁词 (极限词: 第一/最佳/唯一; 医疗/金融/医美; 诱导词: 转发就送)
- Always offer concrete numbers, timeframes, before/after — no vague claims

### 4. Cover Image Prompt

Output a detailed image generation prompt (English) covering:
- Subject + composition
- Color palette (warm / cool / pastel / monochrome)
- Typography (if any) — note that title text is added by the platform, not by the image generator
- Aspect ratio 3:4 (1080x1440)
- Style references (flat illustration / photography / minimal UI / collage)

### 5. Hashtag Strategy

Three tiers:
- 热门 (5K–50K posts): 3 个 for reach
- 中频 (1K–5K posts): 3 个 for ranking
- 精准 (<1K posts): 2–4 个 for niche dominance

### 6. Output

```markdown
## 标题候选 (5 个)
1. ...
2. ...
3. ...
4. ...
5. ...

## 正文
...

## 封面图 Prompt
> English prompt: ...

## Hashtags
#热门1 #热门2 #热门3 #中频1 #中频2 #中频3 #精准1 #精准2

## 发布时间建议
[基于目标人群活跃时间给出 2–3 个候选时段]
```

## Rules

- Never invent fake data, fake reviews, or fake brand endorsements
- Respect platform community rules (no 违禁词, no 黑医美, no 灰产)
- If the topic is sensitive (减肥 / 医疗 / 投资 / 母婴), add a 免责声明 in the post body
- Don't promise specific results ("7天瘦10斤" 等) — rephrase as experience share
- Keep total output < 1200 字 unless user explicitly asks for long-form