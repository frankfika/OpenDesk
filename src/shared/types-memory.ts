export interface MemoryEntry {
  content: string
  timestamp: number
  source: string
}

export interface MemoryStore {
  load(category: 'user' | 'identity' | 'soul'): string
  save(category: 'user' | 'identity' | 'soul', content: string): void
  append(category: 'user' | 'identity' | 'soul', entry: MemoryEntry): void
}
