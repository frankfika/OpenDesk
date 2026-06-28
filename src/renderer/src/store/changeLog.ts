/**
 * ChangeLog — per-thread record of every file mutation / tool call / shell
 * command / desktop action the assistant took. Backed by a Zustand store;
 * not persisted yet (v0.6.1 will write to SQLite).
 */

import { create } from 'zustand'

export type ChangeKind =
  | 'file.write'
  | 'file.read'
  | 'file.delete'
  | 'shell'
  | 'web3.send'
  | 'skill'
  | 'ensemble'

export interface ChangeEntry {
  id: string
  threadId: string | null
  ts: number
  kind: ChangeKind
  title: string
  detail?: string
  status: 'pending' | 'success' | 'error'
  error?: string
}

interface ChangeLogState {
  entries: ChangeEntry[]
  loaded: boolean
  hydrate: () => Promise<void>
  record: (entry: Omit<ChangeEntry, 'id' | 'ts'>) => Promise<ChangeEntry>
  update: (id: string, patch: Partial<ChangeEntry>) => Promise<void>
  clear: () => Promise<void>
  clearForThread: (threadId: string) => Promise<void>
  forThread: (threadId: string | null) => ChangeEntry[]
}

const uuid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useChangeLog = create<ChangeLogState>((set, get) => ({
  entries: [],
  loaded: false,

  hydrate: async () => {
    if (get().loaded) return
    const rows = await window.api.app.changelog.list({ limit: 500 })
    set({ entries: rows.map(toEntry), loaded: true })
  },

  record: async (entry) => {
    const persisted = await window.api.app.changelog.record({
      threadId: entry.threadId ?? null,
      kind: entry.kind,
      title: entry.title,
      detail: entry.detail ?? undefined,
      status: entry.status,
      error: entry.error ?? undefined
    })
    const e: ChangeEntry = {
      ...entry,
      id: persisted.id,
      ts: Date.now()
    }
    set((state) => ({ entries: [...state.entries, e] }))
    return e
  },

  update: async (id, patch) => {
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e))
    }))
    await window.api.app.changelog.update(id, {
      status: patch.status,
      error: patch.error ?? undefined
    })
  },

  clear: async () => {
    await window.api.app.changelog.clear()
    set({ entries: [] })
  },

  clearForThread: async (threadId) => {
    await window.api.app.changelog.clear({ threadId })
    set((state) => ({ entries: state.entries.filter((e) => e.threadId !== threadId) }))
  },

  forThread: (threadId) =>
    get().entries.filter((e) => e.threadId === threadId || threadId === null)
}))

function toEntry(row: {
  id: string
  threadId: string | null
  ts: number
  kind: ChangeKind
  title: string
  detail: string | null
  status: 'pending' | 'success' | 'error'
  error: string | null
}): ChangeEntry {
  return {
    id: row.id,
    threadId: row.threadId,
    ts: row.ts,
    kind: row.kind,
    title: row.title,
    detail: row.detail ?? undefined,
    status: row.status,
    error: row.error ?? undefined
  }
}

const _unusedUuid = uuid
void _unusedUuid