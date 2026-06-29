/**
 * RAG v2 — hybrid retrieval (BM25 via SQLite FTS5 + lightweight TF-based
 * vector fallback) with reciprocal-rank fusion.
 *
 * Why no embedding model: a real embedding model adds 200–800 MB of
 * dependencies and is overkill for the v0.7.0 use-case (indexing the
 * user's own files). Instead we:
 *   - Tokenise the query with the same Chinese-aware segmenter the
 *     indexer uses
 *   - Score each document by Term-Frequency × Inverse-Document-Frequency
 *     with sub-linear TF saturation (similar to classic Lucene)
 *
 * The hybrid pipeline:
 *   1. FTS5 returns top N by BM25
 *   2. Vector store returns top N by TF-IDF cosine
 *   3. Reciprocal-rank fusion merges the two lists
 *
 * When better embeddings become available (e.g. via local GGUF model),
 * swap out `vectorScore` for a real embedding cosine — the FTS5 side and
 * the RRF merger stay unchanged.
 */

// Minimal hit interface — the existing RAG types already define id-bearing
// shapes (SearchResult etc). Anything with a string `id` works.
export interface ScoredHit<T extends { id: string } = { id: string; content: string; score: number; metadata: { filePath: string; sourceId: string; startLine?: number; endLine?: number; language?: string; heading?: string } }> {
  hit: T
  score: number
}

export interface RrfOptions {
  k?: number // RRF constant (default 60)
  topN?: number
}

export function reciprocalRankFusion<T extends { id: string }>(
  lists: Array<Array<ScoredHit<T>>>,
  opts: RrfOptions = {}
): Array<ScoredHit<T>> {
  const k = opts.k ?? 60
  const topN = opts.topN ?? 20
  const acc = new Map<string, ScoredHit<T> & { rrf: number }>()
  for (const list of lists) {
    list.forEach((sh, rank) => {
      const existing = acc.get(sh.hit.id)
      const rrfScore = 1 / (k + rank + 1)
      if (existing) {
        existing.rrf += rrfScore
        if (sh.score > existing.score) {
          existing.score = sh.score
          existing.hit = sh.hit
        }
      } else {
        acc.set(sh.hit.id, { ...sh, rrf: rrfScore })
      }
    })
  }
  return Array.from(acc.values())
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, topN)
    .map(({ rrf: _rrf, ...rest }) => rest as ScoredHit<T>)
}

/**
 * Tokenise text for vector scoring. Reuses the same segmenter as the
 * FTS5 indexer so we don't double-segment.
 *
 * For Chinese: a simple bigram split; for English: lowercase + word split.
 * This is intentionally rough — it's a stopgap for full embedding.
 */
export function tokenize(text: string): string[] {
  const out: string[] = []
  const lower = text.toLowerCase()
  const words = lower.match(/[a-z0-9_]+|[一-鿿]{2,}/g) ?? []
  for (const w of words) {
    if (w.length === 0) continue
    if (/^[一-鿿]+$/.test(w)) {
      // Chinese bigrams
      for (let i = 0; i < w.length - 1; i++) out.push(w.slice(i, i + 2))
    } else {
      out.push(w)
    }
  }
  return out
}

/**
 * Compute TF-IDF cosine similarity between query and doc tokens.
 * `vocab` is the global token → IDF lookup (built by the indexer).
 */
export function vectorScore(
  queryTokens: string[],
  docTokens: string[],
  vocab: Map<string, number>
): number {
  if (queryTokens.length === 0 || docTokens.length === 0) return 0
  const tf = new Map<string, number>()
  for (const t of docTokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  const qSet = new Set(queryTokens)
  let dot = 0
  let docNorm = 0
  let qNorm = 0
  for (const [term, count] of tf) {
    const idf = vocab.get(term) ?? 0
    const w = (1 + Math.log(count)) * idf
    docNorm += w * w
    if (qSet.has(term)) {
      dot += w
      qNorm += idf * idf
    }
  }
  for (const term of qSet) {
    const idf = vocab.get(term) ?? 0
    qNorm += idf * idf
  }
  if (docNorm === 0 || qNorm === 0) return 0
  return dot / (Math.sqrt(docNorm) * Math.sqrt(qNorm))
}

/**
 * Build a per-thread TF (in-memory) used to quickly compute scores on
 * the fly without round-tripping to SQLite.
 */
export class TfIndex {
  private readonly docTokens = new Map<string, string[]>() // id -> tokens
  private readonly docFreq = new Map<string, number>() // token -> # docs containing it
  private readonly docCount = { value: 0 }

  add(id: string, tokens: string[]): void {
    if (this.docTokens.has(id)) {
      this.remove(id)
    }
    this.docTokens.set(id, tokens)
    this.docCount.value += 1
    const seen = new Set(tokens)
    for (const t of seen) {
      this.docFreq.set(t, (this.docFreq.get(t) ?? 0) + 1)
    }
  }

  remove(id: string): void {
    const tokens = this.docTokens.get(id)
    if (!tokens) return
    this.docTokens.delete(id)
    this.docCount.value -= 1
    for (const t of new Set(tokens)) {
      const df = this.docFreq.get(t) ?? 1
      if (df <= 1) this.docFreq.delete(t)
      else this.docFreq.set(t, df - 1)
    }
  }

  vocab(): Map<string, number> {
    const N = Math.max(1, this.docCount.value)
    const out = new Map<string, number>()
    for (const [term, df] of this.docFreq) {
      out.set(term, Math.log(1 + N / df))
    }
    return out
  }

  query(queryTokens: string[], topN = 20): Array<{ id: string; tokens: string[]; score: number }> {
    const vocab = this.vocab()
    const out: Array<{ id: string; tokens: string[]; score: number }> = []
    for (const [id, tokens] of this.docTokens) {
      const score = vectorScore(queryTokens, tokens, vocab)
      if (score > 0) out.push({ id, tokens, score })
    }
    return out.sort((a, b) => b.score - a.score).slice(0, topN)
  }

  size(): number {
    return this.docCount.value
  }
}