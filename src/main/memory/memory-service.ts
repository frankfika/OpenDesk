import type { MemoryEntry, MemoryStore } from '../../shared/types-memory'
import type { Message } from '../../shared/types'
import { createMemoryStore } from './store'
import { extractFromMessages as doExtract } from './extractor'

export interface MemoryService {
  getMemory(): { user: string; identity: string; soul: string }
  updateMemory(category: 'user' | 'identity' | 'soul', content: string): void
  extractFromMessages(messages: Message[]): MemoryEntry[]
  appendExtracted(entries: MemoryEntry[]): void
}

const EXTRACTION_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

export function createMemoryService(store?: MemoryStore): MemoryService {
  const memoryStore = store || createMemoryStore()
  let lastExtractionTime = 0

  return {
    getMemory() {
      return {
        user: memoryStore.load('user'),
        identity: memoryStore.load('identity'),
        soul: memoryStore.load('soul')
      }
    },

    updateMemory(category, content) {
      memoryStore.save(category, content)
    },

    extractFromMessages(messages) {
      const now = Date.now()
      // Throttle: only extract if last extraction was > 5 minutes ago
      if (now - lastExtractionTime < EXTRACTION_COOLDOWN_MS) {
        return []
      }
      // Also require at least one user message and one assistant message
      const hasUser = messages.some((m) => m.role === 'user')
      const hasAssistant = messages.some((m) => m.role === 'assistant')
      if (!hasUser || !hasAssistant) {
        return []
      }
      lastExtractionTime = now
      return doExtract(messages)
    },

    appendExtracted(entries) {
      if (entries.length === 0) return
      // Categorize entries heuristically
      for (const entry of entries) {
        const lower = entry.content.toLowerCase()
        if (lower.includes('user preference') || lower.includes('user mentioned')) {
          memoryStore.append('user', entry)
        } else if (lower.includes('lesson learned') || lower.includes('best practice') || lower.includes('pattern')) {
          memoryStore.append('soul', entry)
        } else {
          // Default to soul for general knowledge
          memoryStore.append('soul', entry)
        }
      }
    }
  }
}
