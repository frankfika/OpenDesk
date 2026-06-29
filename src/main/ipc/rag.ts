import { ipcMain } from 'electron'
import { HybridSearcher, hybridSearch } from '../rag/v2/hybridSearch'
import { SQLiteFTS5Adapter } from '../rag/sqlite-fts5-adapter'
import type { SearchResult } from '../rag/types'

const channels = ['rag:hybridSearch', 'rag:indexAndSearch']

let cachedFts: SQLiteFTS5Adapter | null = null
let cachedSearcher: HybridSearcher | null = null

function getSearcher(): HybridSearcher {
  if (cachedSearcher && cachedFts) return cachedSearcher
  cachedFts = new SQLiteFTS5Adapter(':memory:')
  void cachedFts.connect()
  cachedSearcher = new HybridSearcher(cachedFts)
  return cachedSearcher
}

export function registerRAGHandlers(): void {
  for (const ch of channels) ipcMain.removeAllListeners(ch)

  ipcMain.handle(
    'rag:hybridSearch',
    async (
      _e,
      args: { query: string; limit?: number; ftsWeight?: number; vectorWeight?: number }
    ): Promise<SearchResult[]> => {
      const searcher = getSearcher()
      return searcher.search(args.query, {
        limit: args.limit,
        ftsWeight: args.ftsWeight,
        vectorWeight: args.vectorWeight
      })
    }
  )

  ipcMain.handle(
    'rag:indexAndSearch',
    async (
      _e,
      args: {
        query: string
        documents: Array<{ sourceId: string; text: string; workspaceId?: string }>
        limit?: number
      }
    ): Promise<SearchResult[]> => {
      return hybridSearch(args.query, args.documents, { limit: args.limit })
    }
  )
}