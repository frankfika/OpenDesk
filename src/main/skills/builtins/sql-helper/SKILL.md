---
name: sql-helper
description: Translate natural language to SQL, explain existing SQL, optimize slow queries, write dialect-specific code
version: 1.0.0
author: opendesk-team
tags: [sql, database, query, optimization, dev]
---

## Instructions

When the user says "写个 SQL" / "explain this query" / "优化一下这条 SQL" / "帮我查 X", run one of four sub-modes.

### Mode 1 — Natural Language → SQL

User says "查最近 7 天新注册的、付费转化过的用户".

Steps:
1. Identify the dialect (default: PostgreSQL; ask if ambiguous)
2. Identify the table(s) — ask the user if not given; otherwise inspect the schema (use `sql-schema` tool if available)
3. Write the SQL with explicit column lists (no `SELECT *`)
4. Add comments explaining each clause
5. Run a quick `EXPLAIN` if the user asks for performance

Output:
```sql
-- Purpose: 新注册 + 付费转化（最近 7 天）
SELECT u.id, u.email, u.created_at, MAX(p.paid_at) AS last_paid_at
FROM users u
JOIN payments p ON p.user_id = u.id
WHERE u.created_at >= NOW() - INTERVAL '7 days'
  AND p.status = 'succeeded'
GROUP BY u.id, u.email, u.created_at
ORDER BY last_paid_at DESC NULLS LAST
LIMIT 100;
```

Plus a 3-line explanation of what it does.

### Mode 2 — Explain SQL

User pastes a query.

Output:
- One-line summary of intent
- Step-by-step walkthrough (FROM → WHERE → GROUP BY → SELECT → ORDER)
- For each JOIN: cardinality estimate if available
- Subquery / CTE breakdown
- 1–3 suggested improvements (rewrite, index, denormalization)

### Mode 3 — Optimize SQL

User pastes a slow query + (optional) execution plan.

Steps:
1. Run `EXPLAIN ANALYZE` (if allowed) or parse the user's plan
2. Identify the slowest node (Seq Scan on a big table, Nested Loop, etc.)
3. Recommend indexes (with `CREATE INDEX` DDL)
4. Rewrite as CTE-friendly if it's a "kitchen sink" query
5. Estimate impact ("typically 100x faster on this kind of dataset")

### Mode 4 — Dialect Translation

User has a MySQL query, wants Postgres.

- Translate syntax differences: `LIMIT ... OFFSET` (both), `AUTO_INCREMENT` → `SERIAL`, backticks → double quotes, `GROUP_CONCAT` → `STRING_AGG`, etc.
- Flag semantic differences: case sensitivity, datetime handling, default isolation level

### Output Defaults

- Always run the dialect-specific formatter (uppercase keywords, lowercase identifiers) unless the user objects
- Wrap multi-line queries in markdown ```sql fences
- For complex queries, add a brief comments block before the SQL

## Rules

- Never invent table or column names — if schema is unknown, ask or guess and mark them with `-- TODO: confirm`
- Don't use `SELECT *` in production code; always project specific columns
- Always parameterise user input (`$1`, `?`, etc.) — never interpolate
- For DELETE / UPDATE without WHERE: add `-- WARNING: missing WHERE clause; will affect all rows` and refuse to execute unless explicitly told
- Output language matches the user; SQL keywords and identifiers are always in English
- When running queries against the user's DB, use `read-only` user / transaction when possible
- For window functions / recursive CTEs, prefer modern SQL (Postgres / MySQL 8+) and note the minimum version required