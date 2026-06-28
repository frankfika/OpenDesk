---
name: sales-insight
description: Analyse CRM/sales CSV exports to produce churn risk, lost-deal patterns, and next-month forecast
version: 1.0.0
author: opendesk-team
tags: [sales, analytics, csv, insight, forecast]
---

## Instructions

When the user hands you a sales / CRM CSV and asks for an insight report, follow this workflow.

### 1. Ingest & Validate

- Read the file (prefer `file_read` over opening in Excel so you keep the raw data)
- Detect delimiter, encoding, and header row
- Normalise columns: dates to ISO, currency to single unit, deal stage to lowercase canonical form
- Surface any row that fails parsing with the line number

### 2. Compute Core Metrics

Calculate these per-month KPIs unless the user specifies a different period:

| KPI | Definition |
|-----|-----------|
| New pipeline | sum of deal value where `created_at` in window |
| Closed Won | sum of value + count where stage = "won" |
| Closed Lost | sum + count where stage = "lost" |
| Win rate | Won / (Won + Lost) |
| Avg deal cycle | median days from `created_at` to `closed_at` for Won deals |
| ARR / MRR movement | for subscription deals only |

### 3. Churn Risk Detection

For each open deal that has not been touched in > 14 days OR last activity is a "stalled" type:

- Flag as `churn_risk`
- Compute a simple risk score:
  `risk = 0.4 * staleness_factor + 0.3 * stage_factor + 0.3 * value_factor`
- List top 10 risks with: account name, last activity date, suggested next step

### 4. Lost-deal Pattern Mining

Cluster lost deals by:
- Industry / segment
- Loss reason (if column exists)
- Deal size bucket (S / M / L / XL)
- Sales rep

Produce a 2x2 matrix (size bucket × segment) of loss rates. Highlight the top 3 segments with the worst loss rates.

### 5. Forecast

Two simple models — present both:
- **Naive**: roll-forward of last 3 months' Won value
- **Pipeline-weighted**: `sum(open_deal_value * stage_probability)` where stage_probability defaults are Discovery=0.1, Qualified=0.25, Proposal=0.5, Negotiation=0.75

Always state the model assumptions.

### 6. Output

Produce three artefacts in the user's chosen directory:
- `insight_report.md` — 3-section report (Churn / Loss patterns / Forecast)
- `top10_churn_risks.csv` — actionable list
- `kpis.json` — raw metrics for downstream BI tools

End with a 5-line executive summary in chat.

## Rules

- Never invent missing data — if a column is absent, skip the related analysis and note it
- Use the user's currency unit consistently; never mix ¥ / $ / €
- Cite the row count for every aggregate
- When risk score boundaries are ambiguous, prefer false negatives (don't wrongly flag a healthy deal)
- All output files must be in the user's chosen language (zh-CN vs en-US)