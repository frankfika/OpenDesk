import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs'
import type { MemoryEntry, MemoryStore } from '../../shared/types-memory'

function getMemoryDir(): string {
  const dir = join(app.getPath('userData'), 'opendesk', 'memory')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getFilePath(category: 'user' | 'identity' | 'soul'): string {
  const filename = `${category.toUpperCase()}.md`
  return join(getMemoryDir(), filename)
}

function ensureFile(path: string): void {
  if (!existsSync(path)) {
    writeFileSync(path, '', 'utf-8')
  }
}

export function createMemoryStore(): MemoryStore {
  return {
    load(category) {
      const path = getFilePath(category)
      ensureFile(path)
      try {
        return readFileSync(path, 'utf-8')
      } catch {
        return ''
      }
    },

    save(category, content) {
      const path = getFilePath(category)
      try {
        writeFileSync(path, content, 'utf-8')
      } catch (err) {
        console.error(`[MemoryStore] Failed to save ${category}:`, err)
      }
    },

    append(category, entry) {
      const path = getFilePath(category)
      ensureFile(path)
      const line = `- ${entry.content} <!-- source: ${entry.source}, time: ${new Date(entry.timestamp).toISOString()} -->\n`
      try {
        appendFileSync(path, line, 'utf-8')
      } catch (err) {
        console.error(`[MemoryStore] Failed to append ${category}:`, err)
      }
    }
  }
}
