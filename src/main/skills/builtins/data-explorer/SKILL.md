---
name: data-explorer
description: Quickly profile a CSV/Excel/JSON dataset — schema, missing values, distributions, outliers
version: 1.0.0
author: opendesk-team
tags: [data, csv, excel, json, exploration, profiling]
---

## Instructions

When the user drops a data file (CSV / TSV / XLSX / JSON / NDJSON), produce a structured **dataset profile** before doing any analysis.

### 1. Ingest

- Detect delimiter, encoding, header row
- For Excel: pick the first non-empty sheet
- For JSON: handle both arrays and objects
- Skip obvious non-data rows (totals, footers)

Report the row count and column count before continuing.

### 2. Schema

Build a column-level table:

| Column | Inferred Type | # Distinct | # Null | % Null | Sample Values | Notes |
|--------|--------------|-----------|--------|--------|---------------|-------|
| name | string | 1,234 | 12 | 1.0% | ['Alice', ...] | look like real names |
| age | int | 80 | 50 | 5.0% | [25, 30, ...] | range 18–80 |
| signup_date | date | 365 | 0 | 0% | ['2025-01-01', ...] | ISO format |

Type detection rules:
- `int` / `float`: all non-null values parse as numbers
- `bool`: only true/false/yes/no/0/1
- `date` / `datetime`: parses with at least one date parser; report the format
- `string`: everything else
- `id`: string but > 95% unique and consistent format (e.g. UUID)

### 3. Missing Values

For each column with nulls:
- Total count and percentage
- Whether the nulls are concentrated in specific rows or spread evenly

### 4. Distributions

For each numeric column:
- Min, max, mean, median, std-dev
- 5-number summary (min / 25% / 50% / 75% / max)
- Histogram sketch (10 buckets)
- Outliers: any value > 1.5×IQR outside [Q1, Q3]

For each string column with low cardinality (≤ 20 distinct):
- Top 5 values + counts

For dates:
- Min date, max date, range

### 5. Relationships (if time allows)

- Pairwise correlation matrix for numeric columns
- Pairs of columns with |corr| > 0.7

### 6. Anomalies / Red Flags

Surface anything that looks wrong:
- Constant columns (zero variance)
- Columns with > 50% nulls
- Columns where the type is unclear (mixed strings + numbers)
- PII hints (email, phone, id_card, address) — flag for the user to redact
- Duplicate rows (count)
- Outliers that look like data-entry errors (e.g. age 200)

### 7. Output

Save `profile.md` next to the source file (or user-chosen path), containing:
- Executive summary (5-10 lines)
- Schema table
- Numeric distributions
- Categorical top values
- Anomalies / red flags

In chat, print the executive summary + the top 3 anomalies.

## Rules

- Don't compute on rows where the analysis column is null — say so
- For huge files (>1M rows): sample 10K random rows; say so
- Never modify the source file — read-only
- Output language matches the user's input language
- For non-ASCII data, preserve original encoding
- If a column has mixed types, propose a coercion plan (e.g. "treat as string, coerce to date for analysis")