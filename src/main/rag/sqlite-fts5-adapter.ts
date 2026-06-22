import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import type { VectorStoreAdapter, DocumentChunk, SearchResult } from './types'

/**
 * SQLite FTS5 RAG Adapter
 *
 * This skeleton uses better-sqlite3 if available, otherwise falls back to
 * an in-memory Map for testing. Install better-sqlite3 for production:
 *   npm install better-sqlite3
 *
 * Schema:
 *   - sources: metadata about indexed files
 *   - chunks: document chunks with FTS5 virtual table for full-text search
 */

let Database: typeof import('better-sqlite3') | null = null
try {
  Database = require('better-sqlite3')
} catch {
  // better-sqlite3 not installed — will use in-memory fallback
}

export class SQLiteFTS5Adapter implements VectorStoreAdapter {
  name = 'SQLite FTS5 (Local)'
  status: 'connected' | 'disconnected' | 'error' = 'disconnected'
  private db: InstanceType<typeof import('better-sqlite3')> | null = null
  private memoryStore: Map<string, DocumentChunk> = new Map()
  private dbPath: string
  private usingFallback = false

  constructor(dbPath: string) {
    this.dbPath = dbPath
  }

  async health(): Promise<boolean> {
    if (this.usingFallback) return true
    if (!this.db) return false
    try {
      this.db!.prepare('SELECT 1').run()
      return true
    } catch {
      return false
    }
  }

  async connect(): Promise<void> {
    if (!Database) {
      this.usingFallback = true
      this.status = 'connected'
      console.log('[RAG] Using in-memory fallback (install better-sqlite3 for production)')
      return
    }

    try {
      const dir = dirname(this.dbPath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

      this.db = new Database(this.dbPath)
      this.db.pragma('journal_mode = WAL')

      // Check if FTS5 is available
      const fts5Check = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chunks_fts'").get()

      if (!fts5Check) {
        // Create schema
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS sources (
            id TEXT PRIMARY KEY,
            workspaceId TEXT NOT NULL,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            status TEXT NOT NULL,
            chunks INTEGER DEFAULT 0,
            totalTokens INTEGER DEFAULT 0,
            lastIndexedAt INTEGER,
            error TEXT
          );

          CREATE TABLE IF NOT EXISTS chunks (
            id TEXT PRIMARY KEY,
            sourceId TEXT NOT NULL,
            workspaceId TEXT NOT NULL,
            content TEXT NOT NULL,
            metadata TEXT,
            tokenCount INTEGER DEFAULT 0,
            createdAt INTEGER
          );

          CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
            content,
            content='chunks',
            content_rowid='rowid'
          );

          CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(sourceId);
          CREATE INDEX IF NOT EXISTS idx_chunks_workspace ON chunks(workspaceId);
        `)

        // Create triggers to keep FTS index in sync
        this.db.exec(`
          CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
            INSERT INTO chunks_fts(rowid, content) VALUES (new.rowid, new.content);
          END;

          CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
            INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.rowid, old.content);
          END;

          CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
            INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.rowid, old.content);
            INSERT INTO chunks_fts(rowid, content) VALUES (new.rowid, new.content);
          END;
        `)
      }

      this.status = 'connected'
    } catch (e) {
      this.status = 'error'
      console.error('[RAG] Failed to connect to SQLite:', e)
      this.usingFallback = true
      this.status = 'connected'
    }
  }

  async upsert(chunks: DocumentChunk[]): Promise<void> {
    if (!this.db || this.usingFallback) {
      for (const chunk of chunks) {
        this.memoryStore.set(chunk.id, chunk)
      }
      return
    }

    const insertChunk = this.db.prepare(`
      INSERT OR REPLACE INTO chunks (id, sourceId, workspaceId, content, metadata, tokenCount, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const updateSource = this.db.prepare(`
      UPDATE sources SET chunks = ?, totalTokens = ?, lastIndexedAt = ? WHERE id = ?
    `)

    const tx = this.db.transaction((items: DocumentChunk[]) => {
      const sourceMap = new Map<string, { chunks: number; tokens: number }>()

      for (const chunk of items) {
        insertChunk.run(
          chunk.id,
          chunk.sourceId,
          chunk.workspaceId,
          chunk.content,
          JSON.stringify(chunk.metadata),
          chunk.tokenCount,
          chunk.createdAt
        )

        const existing = sourceMap.get(chunk.sourceId) || { chunks: 0, tokens: 0 }
        sourceMap.set(chunk.sourceId, {
          chunks: existing.chunks + 1,
          tokens: existing.tokens + chunk.tokenCount
        })
      }

      for (const [sourceId, stats] of sourceMap) {
        const firstChunk = items.find((c) => c.sourceId === sourceId)
        if (!firstChunk) continue
        updateSource.run(stats.chunks, stats.tokens, Date.now(), sourceId)
      }
    })

    tx(chunks)
  }

  async delete(sourceId: string): Promise<void> {
    if (!this.db || this.usingFallback) {
      for (const [id, chunk] of this.memoryStore) {
        if (chunk.sourceId === sourceId) {
          this.memoryStore.delete(id)
        }
      }
      return
    }

    this.db.prepare('DELETE FROM chunks WHERE sourceId = ?').run(sourceId)
    this.db.prepare('DELETE FROM sources WHERE id = ?').run(sourceId)
  }

  async clear(): Promise<void> {
    if (!this.db || this.usingFallback) {
      this.memoryStore.clear()
      return
    }

    this.db.exec('DELETE FROM chunks; DELETE FROM sources;')
  }

  async search(query: string, topK: number): Promise<SearchResult[]> {
    if (!this.db || this.usingFallback) {
      // In-memory fallback: simple substring matching with BM25-like scoring
      const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
      if (terms.length === 0) return []

      const scored: Array<{ chunk: DocumentChunk; score: number }> = []
      for (const chunk of this.memoryStore.values()) {
        const content = chunk.content.toLowerCase()
        let score = 0
        for (const term of terms) {
          const count = (content.match(new RegExp(term, 'g')) || []).length
          score += count
        }
        if (score > 0) {
          scored.push({ chunk, score })
        }
      }

      scored.sort((a, b) => b.score - a.score)
      return scored.slice(0, topK).map((s) => ({
        id: s.chunk.id,
        content: s.chunk.content,
        score: Math.min(s.score / 10, 1),
        metadata: { ...s.chunk.metadata, sourceId: s.chunk.sourceId }
      }))
    }

    // SQLite FTS5 search with BM25 ranking
    const stmt = this.db.prepare(`
      SELECT c.id, c.content, c.metadata, bm25(chunks_fts) as score
      FROM chunks_fts
      JOIN chunks c ON c.rowid = chunks_fts.rowid
      WHERE chunks_fts MATCH ?
      ORDER BY bm25(chunks_fts)
      LIMIT ?
    `)

    const rows = stmt.all(query, topK) as Array<{
      id: string
      content: string
      metadata: string
      score: number
    }>

    return rows.map((row) => {
      let metadata = { filePath: '', sourceId: '' }
      try {
        metadata = JSON.parse(row.metadata)
      } catch {
        // ignore parse errors
      }
      return {
        id: row.id,
        content: row.content,
        score: Math.max(0, Math.min(1, -row.score / 10)), // normalize BM25
        metadata
      }
    })
  }
}
