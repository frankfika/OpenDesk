export interface KnowledgeSource {
  id: string
  workspaceId: string
  type: 'file' | 'folder' | 'url' | 'note'
  name: string
  path: string
  status: 'pending' | 'indexing' | 'ready' | 'error'
  vectorStore: 'sqlite' | 'supabase' | 'pinecone' | 'ollama'
  chunks: number
  totalTokens: number
  lastIndexedAt: number
  error?: string
}

export interface DocumentChunk {
  id: string
  sourceId: string
  workspaceId: string
  content: string
  embedding?: number[]
  metadata: {
    filePath: string
    startLine: number
    endLine: number
    language?: string
    heading?: string
  }
  tokenCount: number
  createdAt: number
}

export interface SearchResult {
  id: string
  content: string
  score: number
  metadata: {
    filePath: string
    sourceId: string
    startLine?: number
    endLine?: number
    language?: string
    heading?: string
  }
}

export interface VectorStoreAdapter {
  name: string
  status: 'connected' | 'disconnected' | 'error'

  // Indexing
  upsert(chunks: DocumentChunk[]): Promise<void>
  delete(sourceId: string): Promise<void>
  clear(): Promise<void>

  // Query
  search(query: string, topK: number): Promise<SearchResult[]>

  // Health check
  health(): Promise<boolean>
}

export interface RAGService {
  adapter: VectorStoreAdapter
  indexFile(workspaceId: string, filePath: string, content: string): Promise<KnowledgeSource>
  search(workspaceId: string, query: string, topK?: number): Promise<SearchResult[]>
  deleteSource(workspaceId: string, sourceId: string): Promise<void>
  listSources(workspaceId: string): Promise<KnowledgeSource[]>
}
