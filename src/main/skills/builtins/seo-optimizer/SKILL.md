---
name: seo-optimizer
description: Audit and improve SEO for an article — title, meta description, headings, keywords, structure, internal links
version: 1.0.0
author: opendesk-team
tags: [seo, content, marketing, optimization]
---

## Instructions

When the user says "优化 SEO" / "audit this article for SEO" / "rewrite for search intent", produce a concrete optimization report.

### 1. Ingest

Accept:
- Markdown / HTML article
- Optional target keyword (1–3 words / phrase)
- Optional URL or competitor URLs to model after
- Optional: target locale / search engine (default: Google, en-US)

### 2. Score (0–100)

Output a single score per category, weighted:

| Category | Weight |
|----------|--------|
| Title tag | 15% |
| Meta description | 10% |
| H1 / structure | 10% |
| Keyword usage | 20% |
| Content depth | 15% |
| Internal / external links | 10% |
| Readability | 10% |
| Technical (canonical, og, schema) | 10% |

### 3. Title Tag

- 50–60 characters (Google truncates at ~580 px, varies)
- Include the target keyword, ideally near the start
- Avoid: all caps, clickbait ("You won't believe…"), emoji spam
- Suggest 3 variants:
  - Benefit-led: "X: How to do Y in Z steps"
  - Question: "What is X? A complete guide"
  - Listicle: "7 X tools for Y (2026)"

### 4. Meta Description

- 140–160 characters (155 is the safe target)
- Include the target keyword + a value prop + a soft CTA
- One per page; never duplicate

### 5. Heading Structure

Verify:
- One H1 per page
- H2 for major sections; H3 for sub-sections
- No skipping levels (H1 → H3 jump = bad)
- Headings reflect search intent

### 6. Keyword Strategy

For the target keyword(s):
- **Title**: 1 occurrence (front-loaded)
- **H1**: 1 occurrence
- **First 100 words**: 1 occurrence (early signals)
- **Body**: density 0.5–2.0% (Google ignores beyond)
- **Meta description**: 1 occurrence
- **URL slug**: 1 occurrence (hyphenated, ≤ 60 chars)
- **Image alt text**: where natural

If keyword stuffing is detected, mark it and suggest replacements.

### 7. Content Depth

- Check word count vs. typical top-ranking competitor (rough estimate)
- Surface gaps: questions competitors answer that this article doesn't
- Suggest 3–5 sections to add (each with a 1-line outline)

### 8. Links

- **Internal**: ≥ 2 to related content (use the site's own taxonomy)
- **External**: ≥ 1 to authoritative source (.edu, .gov, official docs)
- Avoid broken-link risk (suggest Wayback Machine for old references)
- All external links should have `rel="noopener"` for `target="_blank"`

### 9. Technical

Check for:
- Missing / wrong `canonical`
- Missing OG tags (title, description, image)
- Missing Twitter card
- Missing / wrong schema.org JSON-LD (Article, Product, FAQ, etc.)
- Slow LCP risks (large images without width/height)

### 10. Readability

- Flesch reading ease target: 60–70 (plain English / 普及型中文)
- Avg sentence length < 20 words
- Avg paragraph length ≤ 4 sentences
- Use bullet lists for parallel content
- Bold key phrases for scanning

### 11. Output

```markdown
# SEO Audit — [Article Title]

**Overall score**: X/100
**Target keyword**: [keyword]
**Locale**: en-US

## Score breakdown
[table per category]

## Critical issues
1. [issue] — [fix in 1 line]

## Recommended title tags (3 variants)
1. ...
2. ...
3. ...

## Recommended meta description
"[140–160 chars]"

## Heading restructure
[Before / after]

## Suggested content additions
- Section: [title] — covers [user question]
- Section: ...

## Schema.org JSON-LD template
```json
[code]
```

## Final checklist
- [ ] Title set
- [ ] Meta description set
- [ ] Canonical + OG tags
- [ ] Internal / external links
- [ ] Image alt text
- [ ] Readability pass
```

## Rules

- Don't claim Google ranking factors that aren't documented (e.g. exact keyword density cutoffs)
- Never recommend black-hat SEO (cloaking, link farms, hidden text)
- For YMYL topics (health, finance, legal): flag for E-E-A-T review (expertise, experience, authority, trust)
- Output language matches the article's language
- Don't auto-add schema.org types that don't apply (don't add Product schema to a blog post)
- For e-commerce / affiliate content: respect disclosure requirements in target locale
- Don't suggest keyword stuffing even if competitors do it