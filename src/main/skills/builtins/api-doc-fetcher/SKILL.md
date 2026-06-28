---
name: api-doc-fetcher
description: Fetch an API doc page, summarise endpoints, and produce ready-to-use code snippets
version: 1.0.0
author: opendesk-team
tags: [api, dev, docs, code-gen, integration]
---

## Instructions

When the user asks "查 X API 文档" / "如何调用 X 接口" / "帮我写一个 X 的 client", fetch the official docs and produce a ready-to-use code snippet.

### 1. Ingest

Accept:
- API name (e.g. "Stripe", "Notion", "OpenAI", "GitHub")
- URL to the doc (optional; if absent, default to the API's main docs site)
- Target language: TypeScript / Python / Go / cURL (default: TypeScript)
- Specific endpoints of interest (optional; else summarise the top 10)

### 2. Fetch

Use `web_fetch` to grab:
- The "Getting Started" / "Quickstart" page
- The "Authentication" page
- The endpoint reference (paginated if needed)

For each endpoint, capture:
- HTTP method + path
- Required headers (auth, content-type)
- Path / query / body params
- Success response shape
- Common error codes

Hard limit: 6 fetches per run (avoid getting stuck on huge docs).

### 3. Summarise

Output a structured summary:

```markdown
# [API Name] — Integration Brief

**Base URL**: https://api.example.com/v1
**Auth**: Bearer token in Authorization header
**Rate limits**: 100 req/min (default), 1000 with Pro tier

## Authentication
[1-2 sentence + curl example]

## Core Endpoints

### `POST /v1/resources`
Create a new resource.

**Request**:
```json
{
  "name": "string (required)",
  "tags": ["string"]
}
```

**Response 201**:
```json
{
  "id": "res_123",
  "name": "...",
  "created_at": "2025-..."
}
```

**Errors**:
- 401: invalid token
- 422: validation failed (returns `{ "error": { "field": "msg" } }`)

## Minimal Client (TypeScript)
```typescript
// [ready-to-use code]
```

## Gotchas
- ...
```

### 4. Code Snippet

Always provide at least one runnable example in the user's preferred language. Prefer:
- `fetch` (no SDK dependency) for HTTP APIs
- Official SDK if the user asks
- `curl` if the user is debugging from the terminal

For each snippet, include:
- Auth setup
- Error handling (with the standard error shape)
- 1–2 example calls

### 5. Output Paths

Save to `<user-chosen>/api_<name>_brief.md`. Show a 1-page summary in chat.

## Rules

- Always cite the source URL and access date
- If the API requires paid tier for a feature, say so explicitly
- Don't expose real API keys the user pasted — mask them
- If the doc is slow / 404 / behind login, say so; offer alternatives
- For APIs with breaking changes between versions, default to the latest stable
- For deprecated endpoints, mark them `[DEPRECATED]` in the summary
- Don't recommend specific paid SaaS alternatives unless the user asks
- For multi-language support, write code in the user's preferred language; English comments
- Never run actual API calls on the user's behalf without explicit confirmation
- If the API requires OAuth, provide the full redirect-URL setup, not just "get a token"