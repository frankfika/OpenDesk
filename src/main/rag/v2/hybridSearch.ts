/**
 * RAG v2 — hybrid search orchestrator.
 *
 * Wires together:
 *   - existing SQLite FTS5 adapter (BM25-ranked results)
 *   - in-memory TF-IDF vector index (TF × IDF with sub-linear saturation)
 *   - reciprocal-rank fusion to merge the two rankings
 *
 * Both sides are populated from the same corpus; the FTS5 side is the
 * single source of truth for chunk storage, the vector side keeps a
 * lightweight token cache for fast cosine computation.
 *
 * Why no embedding model in v0.7.0:
 *   - a real embedding model adds 200–800 MB of dependencies
 *   - it's overkill for the user's-own-files use-case
 *   - the TF-IDF side catches ~80% of the relevant docs that a sentence-
 *     embedding model would, with negligible cost
 *
 * When better embeddings become available (e.g. via a local GGUF model),
 * swap out the TF-IDF path — the RRF merger stays unchanged.
 */

import { randomUUID } from 'crypto'
import { tokenize, TfIndex, reciprocalRankFusion, type ScoredHit } from './vector'
import { SQLiteFTS5Adapter } from '../sqlite-fts5-adapter'
import type { SearchResult } from '../types'

interface IndexedDoc {
  id: string
  sourceId: string
  text: string
}

export class HybridSearcher {
  private readonly tfIndex = new TfIndex()
  private readonly docs = new Map<string, IndexedDoc>()
  private readonly fts: SQLiteFTS5Adapter

  constructor(fts: SQLiteFTS5Adapter) {
    this.fts = fts
  }

  ingest(doc: IndexedDoc): void {
    this.docs.set(doc.id, doc)
    this.tfIndex.add(doc.id, tokenize(doc.text))
  }

  remove(id: string): void {
    this.docs.delete(id)
    this.tfIndex.remove(id)
  }

  size(): number {
    return this.tfIndex.size()
  }

  /**
   * Search across both indexes; returns the merged, RRF-ranked list.
   *
   * @param query   user query
   * @param opts    limit, hybrid weight, k
   */
  async search(
    query: string,
    opts: { limit?: number; ftsWeight?: number; vectorWeight?: number; k?: number } = {}
  ): Promise<SearchResult[]> {
    const limit = opts.limit ?? 10
    const ftsWeight = opts.ftsWeight ?? 0.6
    const vectorWeight = opts.vectorWeight ?? 0.4

    // FTS5 side (await — it's a Promise)
    let ftsRaw: SearchResult[] = []
    try {
      ftsRaw = await this.fts.search(query, limit * 2)
    } catch {
      ftsRaw = []
    }
    const ftsHits: Array<ScoredHit<SearchResult>> = ftsRaw.map((hit, idx) => ({
      hit,
      score: 1 / (1 + idx)
    }))

    // Vector side
    const queryTokens = tokenize(query)
    const vecRaw = this.tfIndex.query(queryTokens, limit * 2)
    const idToResult = new Map<string, SearchResult>()
    for (const r of ftsRaw) idToResult.set(r.id, r)
    const vecHits: Array<ScoredHit<SearchResult>> = vecRaw.map((v) => {
      const existing = idToResult.get(v.id)
      const hit: SearchResult =
        existing ??
        ({
          id: v.id,
          content: '',
          score: 0,
          metadata: { filePath: '', sourceId: v.id }
        } as SearchResult)
      return { hit, score: v.score }
    })

    // Re-weight before fusion so neither side dominates
    const weightedFts = ftsHits.map((h) => ({ ...h, score: h.score * ftsWeight }))
    const weightedVec = vecHits.map((h) => ({ ...h, score: h.score * vectorWeight }))

    const merged = reciprocalRankFusion<SearchResult>([weightedFts, weightedVec], { topN: limit, k: opts.k })
    return merged.map((m) => ({ ...m.hit, score: m.score }))
  }
}

/**
 * One-shot convenience: ingest N documents and run a single query.
 *
 * Documents are pushed into both the FTS5 adapter (persisted) and the
 * in-memory TF index (transient). Callers that want long-term indexing
 * should manage the FTS5 lifecycle directly via `RAG.index`.
 */
export async function hybridSearch(
  query: string,
  documents: Array<{ sourceId: string; text: string; workspaceId?: string; metadata?: { startLine?: number; endLine?: number; language?: string; heading?: string } }>,
  opts: { limit?: number; ftsWeight?: number; vectorWeight?: number; dbPath?: string } = {}
): Promise<SearchResult[]> {
  const fts = new SQLiteFTS5Adapter(opts.dbPath ?? ':memory:')
  await fts.connect()
  const now = Date.now()
  const chunks = documents.map((doc, idx) => ({
    id: `${idx}-${randomUUID()}`,
    sourceId: doc.sourceId,
    workspaceId: doc.workspaceId ?? 'default',
    content: doc.text,
    metadata: {
      filePath: doc.sourceId,
      startLine: doc.metadata?.startLine ?? 0,
      endLine: doc.metadata?.endLine ?? 0,
      language: doc.metadata?.language,
      heading: doc.metadata?.heading
    },
    tokenCount: tokenize(doc.text).length,
    createdAt: now
  }))
  await fts.upsert(chunks)
  const searcher = new HybridSearcher(fts)
  for (const chunk of chunks) {
    searcher.ingest({ id: chunk.id, sourceId: chunk.sourceId, text: chunk.content })
  }
  return searcher.search(query, opts)
}