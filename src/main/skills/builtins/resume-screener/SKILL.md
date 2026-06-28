---
name: resume-screener
description: Batch-screen resumes against a job description and produce a scored shortlist with rationale
version: 1.0.0
author: opendesk-team
tags: [hr, hiring, resume, screening, ranking]
---

## Instructions

When the user wants to screen resumes, follow this workflow.

### 1. Inputs

- Job description (JD) — paste text or point to a file
- Resumes — folder path (PDF / DOCX) or uploaded files
- Optional: scoring weights (default: skills 40, experience 30, education 15, projects 15)

### 2. Ingest Resumes

For each resume, extract:
- 个人信息 (姓名 / 联系方式)
- 教育背景 (学校 / 学历 / 专业 / 时间)
- 工作经历 (公司 / 职位 / 时间 / 关键产出)
- 项目经历
- 技能栈 (硬技能 + 软技能)

Tools: `file_read` for DOCX/PDF, OCR tools for image scans.

### 3. Score

Compute a 0–100 score per resume using the JD's must-have vs. nice-to-have requirements:

| Dimension | Weight | How |
|-----------|--------|-----|
| Skills match | 40% | JD 必备技能命中数 / JD 必备技能总数 |
| Experience relevance | 30% | 同行业年限 + 同岗位年限 (sigmoid-normalised) |
| Education | 15% | 学校层级 (Tier 1/2/3) × 专业相关性 |
| Projects | 15% | 与 JD 业务相关的项目数 + 技术栈重合度 |

Also produce a `reason` 1-liner explaining the score.

### 4. Categorise

- **Tier A (≥80)**: 强烈推荐面试
- **Tier B (60–79)**: 备选
- **Tier C (<60)**: 不推荐

### 5. Bias Guard

Flag (don't auto-reject) any of these:
- 学校/性别/年龄推断敏感信息
- 与 JD 无关的业余爱好占简历 >30%
- 频繁跳槽（< 1 年 / 段）但 JD 要求稳定性

### 6. Output

- `shortlist.md` — Tier A 候选人卡片（每人：分数 + reason + 简历摘要 + 红旗）
- `all_scored.csv` — 全部候选人一行一条
- `tier_summary.txt` — 一句话结论

Print Tier A list in chat for quick review.

## Rules

- Never fabricate education / experience / skills — only what is in the resume
- If a resume is unreadable, mark it `不可读` rather than scoring low
- Score reproducibility: the same resume + JD must produce the same score
- For batch > 50 resumes, process in chunks of 10 and report progress
- Default output language: Chinese if JD is in Chinese, English otherwise
- Respect privacy — don't include phone / email in the published tier list; only in `all_scored.csv` (which the user can then encrypt)