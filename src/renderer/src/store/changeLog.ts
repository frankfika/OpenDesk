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
  /** Human-readable title shown in the panel */
  title: string
  /** Optional sub-line (path, command, target) */
  detail?: string
  /** Status of the action */
  status: 'pending' | 'success' | 'error'
  error?: string
}

interface ChangeLogState {
  entries: ChangeEntry[]
  record: (entry: Omit<ChangeEntry, 'id' | 'ts'>) => ChangeEntry
  update: (id: string, patch: Partial<ChangeEntry>) => void
  clear: () => void
  clearForThread: (threadId: string) => void
  forThread: (threadId: string | null) => ChangeEntry[]
}

const uuid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useChangeLog = create<ChangeLogState>((set, get) => ({
  entries: [],
  record: (entry) => {
    const e: ChangeEntry = { ...entry, id: uuid(), ts: Date.now() }
    set((state) => ({ entries: [...state.entries, e] }))
    return e
  },
  update: (id, patch) => {
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e))
    }))
  },
  clear: () => set({ entries: [] }),
  clearForThread: (threadId) => {
    set((state) => ({ entries: state.entries.filter((e) => e.threadId !== threadId) }))
  },
  forThread: (threadId) => get().entries.filter((e) => e.threadId === threadId || threadId === null)
}))