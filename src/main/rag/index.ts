import { readFile } from 'fs/promises'
import { join } from 'path'
import type { RAGService, KnowledgeSource, SearchResult, VectorStoreAdapter } from './types'
import { chunkDocument } from './chunker'
import { SQLiteFTS5Adapter } from './sqlite-fts5-adapter'

export * from './types'
export { chunkDocument } from './chunker'
export { SQLiteFTS5Adapter } from './sqlite-fts5-adapter'

interface RAGServiceOptions {
  workspaceDataDir: string
}

class RAGServiceImpl implements RAGService {
  adapter: VectorStoreAdapter
  private sources: Map<string, KnowledgeSource> = new Map()
  private options: RAGServiceOptions

  constructor(options: RAGServiceOptions) {
    this.options = options
    this.adapter = new SQLiteFTS5Adapter(join(options.workspaceDataDir, 'knowledge.db'))
  }

  async init(): Promise<void> {
    if (this.adapter instanceof SQLiteFTS5Adapter) {
      await this.adapter.connect()
    }
  }

  async indexFile(workspaceId: string, filePath: string, _content?: string): Promise<KnowledgeSource> {
    const sourceId = `src-${workspaceId}-${filePath}`
    const source: KnowledgeSource = {
      id: sourceId,
      workspaceId,
      type: 'file',
      name: filePath.split('/').pop() || filePath,
      path: filePath,
      status: 'indexing',
      vectorStore: 'sqlite',
      chunks: 0,
      totalTokens: 0,
      lastIndexedAt: Date.now()
    }

    this.sources.set(sourceId, source)

    try {
      const content = _content ?? (await readFile(filePath, 'utf-8'))
      const rawChunks = chunkDocument(filePath, content)

      const chunks = rawChunks.map((c, i) => ({
        id: `chunk-${sourceId}-${i}`,
        sourceId,
        workspaceId,
        content: c.content,
        metadata: c.metadata,
        tokenCount: c.tokenCount,
        createdAt: Date.now()
      }))

      await this.adapter.upsert(chunks)

      source.chunks = chunks.length
      source.totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0)
      source.status = 'ready'
      source.lastIndexedAt = Date.now()
    } catch (e) {
      source.status = 'error'
      source.error = e instanceof Error ? e.message : String(e)
    }

    this.sources.set(sourceId, source)
    return source
  }

  async search(workspaceId: string, query: string, topK = 3): Promise<SearchResult[]> {
    // TODO: filter by workspaceId in the adapter (currently searches all)
    const results = await this.adapter.search(query, topK)
    return results.filter((r) => r.metadata.filePath.startsWith(workspaceId) || true)
  }

  async deleteSource(workspaceId: string, sourceId: string): Promise<void> {
    await this.adapter.delete(sourceId)
    this.sources.delete(sourceId)
  }

  async listSources(workspaceId: string): Promise<KnowledgeSource[]> {
    return Array.from(this.sources.values()).filter((s) => s.workspaceId === workspaceId)
  }
}

let serviceInstance: RAGServiceImpl | null = null

export function getRAGService(options?: RAGServiceOptions): RAGService {
  if (!serviceInstance && options) {
    serviceInstance = new RAGServiceImpl(options)
  }
  if (!serviceInstance) {
    throw new Error('RAG service not initialized. Call getRAGService with options first.')
  }
  return serviceInstance
}

export async function initRAGService(options: RAGServiceOptions): Promise<RAGService> {
  serviceInstance = new RAGServiceImpl(options)
  await serviceInstance.init()
  return serviceInstance
}
