---
name: pdf-summarizer
description: Summarize a PDF (academic paper, contract, report) with section-aware structure and key takeaways
version: 1.0.0
author: opendesk-team
tags: [pdf, summary, paper, contract, reading]
---

## Instructions

When the user drops a PDF, run a section-aware summary tuned to the document type.

### 1. Identify Type

Detect:
- 学术论文 (has Abstract, Introduction, References)
- 商业报告 (has Executive Summary, charts, KPI tables)
- 合同 / 法律文件 (numbered clauses, parties, definitions)
- 用户手册 / 技术文档 (table of contents, procedures)
- 一般文章 / 博客 (free-flowing text)

If unsure, default to "general article" but mention it.

### 2. Ingest

- Use `file_read` (PDF text extraction)
- If the PDF is scanned (no text layer), say so and ask if the user wants OCR
- Note page count and any embedded images / charts

### 3. Length

Match the user's request:
- 一句话 (≤ 50 字): elevator pitch
- 三句话: overview
- 一段 (≤ 200 字): concise summary
- 详细摘要 (default, ≤ 1000 字): full breakdown
- 全文笔记 (only if asked): page-by-page notes

If not specified, default to 详细摘要.

### 4. Structure by Type

**学术论文**:
- 题目 / 作者 / 期刊
- 一句话研究问题
- 方法（实验设计、模型、数据集）
- 主要结果（含具体数字）
- 局限性
- 我的 takeaway

**商业报告**:
- 报告主题 + 出版方
- 关键发现 (3-5 bullet)
- 数据指标 (表格)
- 战略建议
- 我的 takeaway

**合同**:
- 合同类型 / 当事方
- 关键日期（生效 / 终止 / 续约）
- 主要义务
- 付款 / 报酬条款
- 终止条款
- 风险点（对用户方不利的条款）

**技术文档**:
- 用途
- 快速上手 (3-5 步)
- 主要 API / 配置
- 常见问题

### 5. Output

Default to Markdown with these sections:
```markdown
# [文档标题]

**类型**: [academic / report / contract / doc / article]
**页数**: X
**阅读时间估计**: Y 分钟

## 一句话总结
[≤ 50 字]

## 详细摘要
[Structured per type above]

## 关键要点
- [point 1]
- [point 2]
- [point 3]

## 数字与数据
| 指标 | 数值 |
|------|------|
| ... | ... |

## 我 (assistant) 的观察
[1-2 sentences, e.g. "这个方法在小数据集上可能不稳健"]
```

If the user wants notes saved to disk, write to `<source>.summary.md` next to the original.

## Rules

- Never fabricate page numbers or specific claims — if unsure, mark `[unclear]`
- For contracts: highlight anything that looks unusual (e.g. unilateral termination rights, liability caps)
- For academic papers: distinguish claims from the authors vs. method limitations
- If the document is in Chinese, output in Chinese; otherwise match the document's language
- For multi-language docs, lead with the user's preference (default: document language)
- Don't expose private information found in contracts; redact party names if requested
- For PDFs with charts/tables, summarize the data; don't try to describe images