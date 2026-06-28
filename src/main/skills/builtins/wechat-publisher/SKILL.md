---
name: wechat-publisher
description: Draft a WeChat 公众号 article with proper formatting, headings, hero image prompt, and SEO-ready summary
version: 1.0.0
author: opendesk-team
tags: [wechat, content, publishing, article, chinese]
---

## Instructions

When the user says "写公众号文章" / "公众号排版" / "WeChat article", produce a publication-ready Markdown with all the formatting a WeChat editor needs.

### 1. Brief

Ask (only if not provided):
- Topic / theme / 选题
- Account positioning: 科技 / 财经 / 生活方式 / 行业洞察 / 个人成长
- Target audience: 年龄 / 角色 / 痛点
- Length target: 1000 / 2000 / 3000 / 5000 字
- Tone: 深度 / 通俗 / 故事化 / 数据驱动
- Has call-to-action: yes / no / subscribe

### 2. Article Structure

```
标题（≤ 22 字，最好前 12 字包含核心信息）
副标题（可选，1 行）
作者 / 公众号名（可选）
摘要（≤ 54 字，显示在列表）
封面图 Prompt（英文）
---

## 一、开场（150–300 字）
- Hook：1–2 句抓人
- 痛点共鸣：为什么读者要继续看
- 本文承诺：读完能得到什么

## 二、主体（按结构模板）
[下面 § 3 给出 5 种常用模板]

## 三、收尾（150–300 字）
- 总结要点（3 条）
- CTA：评论 / 关注 / 转发 / 加群 / 链接

## 附录
- 参考资料（带超链接）
- 互动话题：评论区见
```

### 3. Five Body Templates

#### A. 深度分析
- 现象 / 数据
- 表层原因
- 深层原因
- 影响预测
- 行动建议

#### B. 故事化叙事
- 时间线 / 场景
- 转折点
- 反思 / 教训
- 普遍性意义

#### C. 干货清单
- 引入问题
- 5–10 条要点（每条配 1 个例子）
- 反常识提醒
- 行动清单

#### D. 对比评测
- 横评对象
- 维度（功能 / 价格 / 适用场景）
- 数据表格
- 结论与选择建议

#### E. 行业观察
- 背景 / 时间窗口
- 关键事件
- 数据 / 趋势
- 玩家动作
- 未来 6–12 个月预测

### 4. Formatting Rules

- 段落 ≤ 4 行（手机屏幕友好）
- 重点句前置，结论先行
- 标题层级：H2 / H3（不要 H4+）
- 强调用 **bold**，避免全文 italic
- 列表：3–5 条最佳
- 引用：> 框住，每段独立
- 配图：每 300–500 字一张
- 代码块：保留 3 backticks（WeChat 编辑器会保留）
- emoji：每段 1–3 个，不堆叠

### 5. Hero Image Prompt

English prompt for image generation:
- 16:9 比例（1200×675 for WeChat cover）
- 主体 + 风格 + 配色 + 字体（标题）
- 不要包含具体文字（会被审核替换或模糊）
- 风格参考：扁平 / 拟物 / 极简 / 渐变 / 国潮

Example:
```
A modern flat illustration of a laptop surrounded by floating chat bubbles in teal and orange. Minimal composition, geometric shapes, suitable for a tech newsletter. Aspect 16:9.
```

### 6. SEO Checklist (WeChat Search)

- 标题含核心关键词 1–2 次
- 摘要含 1 个长尾词
- 正文关键词密度 1–3%
- 标签：3–5 个（账号侧自定义）
- 原创声明（如果首发）

### 7. Output

```markdown
---
# [标题]

**副标题**: [subtitle]
**作者**: [author]
**摘要**: [54 字]
**封面图 Prompt**: [English]
**标签**: #标签1 #标签2 #标签3

---

## 一、开场

[150-300 字]

## 二、[H2 主章节]

### [H3 子章节]

[content]

## 三、收尾

[150-300 字 + CTA]

---

## 参考资料

1. [title](url)
2. ...

## 互动话题

[open question for comments]
```

## Rules

- Never invent data, quotes, or company claims — flag as `[TODO: 核实]` if unsure
- Respect copyright: don't reproduce > 30 chars from any single source without permission
- For 财经 / 医疗 / 法律 / 教育 topics: add a disclaimer in the footer
- For political topics: stay neutral, cite multiple sides, never endorse a candidate
- Don't recommend gambling / pyramid / medical-cure schemes even if asked
- Length caps: never exceed the user's stated length by > 20%
- Output language: Chinese by default; English only if user explicitly asks
- For technical articles: include a TL;DR at the top (3–5 bullets) for skim readers
- For viral-chasing content: respect platform rules, no clickbait that doesn't deliver
- Save the draft to user-chosen path; don't auto-publish anywhere