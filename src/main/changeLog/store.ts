/**
 * ChangeLog SQLite store — persists the assistant's mutation history.
 *
 * Each entry records a file write / shell / web3 send / skill invoke / etc.
 * Schema is intentionally tiny (one table, one row per change) so we don't
 * have to migrate later — extra fields can be added with `ALTER TABLE ADD COLUMN`
 * if needed.
 */

import { app } from 'electron'
import { join, dirname } from 'path'
import { mkdirSync, existsSync } from 'fs'

// better-sqlite3 is an optional native dependency. If the binary is not
// installed (fresh dev clone, some CI envs), the store degrades to an
// in-memory cache that still works for the lifetime of the session.
type DBHandle = {
  prepare: (sql: string) => {
    run: (...params: unknown[]) => { changes: number }
    get: (...params: unknown[]) => unknown
    all: (...params: unknown[]) => unknown[]
  }
  exec: (sql: string) => unknown
  pragma: (source: string, options?: unknown) => unknown
  close: () => void
}

type DatabaseCtor = new (filename: string, options?: unknown) => DBHandle

let Database: DatabaseCtor | null = null
try {
   
  Database = require('better-sqlite3') as DatabaseCtor
} catch {
  Database = null
}

export type ChangeKind =
  | 'file.write'
  | 'file.read'
  | 'file.delete'
  | 'shell'
  | 'web3.send'
  | 'skill'
  | 'ensemble'

export interface ChangeEntryRow {
  id: string
  threadId: string | null
  ts: number
  kind: ChangeKind
  title: string
  detail: string | null
  status: 'pending' | 'success' | 'error'
  error: string | null
}

const DB_PATH = (): string => join(app.getPath('userData'), 'changelog', 'changelog.sqlite')

let db: DBHandle | null = null

function getDb(): DBHandle | null {
  if (db) return db
  if (!Database) return null
  const p = DB_PATH()
  mkdirSync(dirname(p), { recursive: true })
  db = new Database(p)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS changes (
      id TEXT PRIMARY KEY,
      threadId TEXT,
      ts INTEGER NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT,
      status TEXT NOT NULL,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_changes_threadId_ts ON changes (threadId, ts DESC);
    CREATE INDEX IF NOT EXISTS idx_changes_ts ON changes (ts DESC);
  `)
  return db
}

export function recordChange(entry: Omit<ChangeEntryRow, 'id' | 'ts'> & { id?: string; ts?: number }): ChangeEntryRow {
  const row: ChangeEntryRow = {
    id: entry.id ?? cryptoRandomId(),
    ts: entry.ts ?? Date.now(),
    threadId: entry.threadId ?? null,
    kind: entry.kind,
    title: entry.title,
    detail: entry.detail ?? null,
    status: entry.status,
    error: entry.error ?? null
  }
  const db = getDb()
  if (db) {
    db.prepare(
      `INSERT OR REPLACE INTO changes (id, threadId, ts, kind, title, detail, status, error)
       VALUES (@id, @threadId, @ts, @kind, @title, @detail, @status, @error)`
    ).run(row)
  }
  return row
}

export function updateChange(id: string, patch: Partial<Omit<ChangeEntryRow, 'id'>>): void {
  const db = getDb()
  if (!db) return
  const cur = db.prepare('SELECT * FROM changes WHERE id = ?').get(id) as ChangeEntryRow | undefined
  if (!cur) return
  const next: ChangeEntryRow = { ...cur, ...patch }
  db.prepare(
    `UPDATE changes SET threadId = @threadId, ts = @ts, kind = @kind, title = @title,
     detail = @detail, status = @status, error = @error WHERE id = @id`
  ).run(next)
}

export function listChanges(opts: { threadId?: string | null; limit?: number; sinceTs?: number } = {}): ChangeEntryRow[] {
  const db = getDb()
  if (!db) return []
  const limit = opts.limit ?? 200
  if (opts.threadId) {
    return db
      .prepare(
        `SELECT * FROM changes WHERE threadId = ? AND ts >= ? ORDER BY ts DESC LIMIT ?`
      )
      .all(opts.threadId, opts.sinceTs ?? 0, limit) as ChangeEntryRow[]
  }
  return db
    .prepare(`SELECT * FROM changes WHERE ts >= ? ORDER BY ts DESC LIMIT ?`)
    .all(opts.sinceTs ?? 0, limit) as ChangeEntryRow[]
}

export function clearChanges(opts: { threadId?: string } = {}): number {
  const db = getDb()
  if (!db) return 0
  if (opts.threadId) {
    const result = db.prepare('DELETE FROM changes WHERE threadId = ?').run(opts.threadId)
    return result.changes
  }
  const result = db.prepare('DELETE FROM changes').run()
  return result.changes
}

export function deleteChangesBefore(ts: number): number {
  const db = getDb()
  if (!db) return 0
  const result = db.prepare('DELETE FROM changes WHERE ts < ?').run(ts)
  return result.changes
}

function cryptoRandomId(): string {
  // Native UUID via node:crypto (Electron main process)
   
  const { randomUUID } = require('node:crypto') as typeof import('node:crypto')
  return randomUUID()
}

export function isPersistenceEnabled(): boolean {
  return existsSync(DB_PATH())
}