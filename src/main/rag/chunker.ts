import type { DocumentChunk } from './types'

interface ChunkingStrategy {
  name: string
  canHandle: (filePath: string, content: string) => boolean
  chunk: (filePath: string, content: string) => Omit<DocumentChunk, 'id' | 'sourceId' | 'workspaceId' | 'createdAt'>[]
}

const MAX_CHUNK_TOKENS = 500

function createChunks(
  filePath: string,
  lines: string[],
  startLine: number,
  endLine: number
): Omit<DocumentChunk, 'id' | 'sourceId' | 'workspaceId' | 'createdAt'>[] {
  const content = lines.slice(startLine, endLine + 1).join('\n')
  return [
    {
      content,
      metadata: {
        filePath,
        startLine: startLine + 1,
        endLine: endLine + 1
      },
      tokenCount: Math.ceil(content.length / 4)
    }
  ]
}

const markdownStrategy: ChunkingStrategy = {
  name: 'markdown',
  canHandle: (filePath) => filePath.endsWith('.md') || filePath.endsWith('.markdown'),
  chunk: (filePath, content) => {
    const lines = content.split('\n')
    const chunks: Omit<DocumentChunk, 'id' | 'sourceId' | 'workspaceId' | 'createdAt'>[] = []
    let heading = ''
    let currentStart = 0
    let currentLines: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const headingMatch = line.match(/^#{1,6}\s+(.+)/)
      if (headingMatch) {
        if (currentLines.length > 0) {
          chunks.push(
            ...createChunks(filePath, lines, currentStart, i - 1).map((c) => ({ ...c, metadata: { ...c.metadata, heading } }))
          )
        }
        heading = headingMatch[1]
        currentStart = i + 1
        currentLines = []
      } else {
        currentLines.push(line)
      }
    }

    if (currentLines.length > 0) {
      chunks.push(
        ...createChunks(filePath, lines, currentStart, lines.length - 1).map((c) => ({ ...c, metadata: { ...c.metadata, heading } }))
      )
    }

    return chunks
  }
}

const codeStrategy: ChunkingStrategy = {
  name: 'code',
  canHandle: (filePath) => {
    const codeExts = [
      '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.cpp', '.c', '.h',
      '.swift', '.kt', '.rb', '.php', '.cs', '.scala', '.r', '.m', '.mm', '.sh', '.bash',
      '.zsh', '.fish', '.sql', '.yaml', '.yml', '.json', '.toml', '.xml', '.html', '.css',
      '.scss', '.sass', '.less', '.vue', '.svelte', '.astro', '.sol', '.lua', '.pl', '.pm'
    ]
    return codeExts.some((ext) => filePath.endsWith(ext))
  },
  chunk: (filePath, content) => {
    const lines = content.split('\n')
    const chunks: Omit<DocumentChunk, 'id' | 'sourceId' | 'workspaceId' | 'createdAt'>[] = []
    let currentStart = 0
    let currentTokens = 0
    const language = filePath.split('.').pop() || 'text'

    for (let i = 0; i < lines.length; i++) {
      const lineTokens = estimateTokens(lines[i])
      if (currentTokens + lineTokens > MAX_CHUNK_TOKENS && i > currentStart) {
        chunks.push(
          ...createChunks(filePath, lines, currentStart, i - 1).map((c) => ({
            ...c,
            metadata: { ...c.metadata, language }
          }))
        )
        currentStart = i
        currentTokens = lineTokens
      } else {
        currentTokens += lineTokens
      }
    }

    if (currentStart < lines.length) {
      chunks.push(
        ...createChunks(filePath, lines, currentStart, lines.length - 1).map((c) => ({
          ...c,
          metadata: { ...c.metadata, language }
        }))
      )
    }

    return chunks
  }
}

const genericStrategy: ChunkingStrategy = {
  name: 'generic',
  canHandle: () => true,
  chunk: (filePath, content) => {
    const lines = content.split('\n')
    const chunks: Omit<DocumentChunk, 'id' | 'sourceId' | 'workspaceId' | 'createdAt'>[] = []
    let currentStart = 0
    let currentTokens = 0

    for (let i = 0; i < lines.length; i++) {
      const lineTokens = estimateTokens(lines[i])
      if (currentTokens + lineTokens > MAX_CHUNK_TOKENS && i > currentStart) {
        chunks.push(...createChunks(filePath, lines, currentStart, i - 1))
        currentStart = i
        currentTokens = lineTokens
      } else {
        currentTokens += lineTokens
      }
    }

    if (currentStart < lines.length) {
      chunks.push(...createChunks(filePath, lines, currentStart, lines.length - 1))
    }

    return chunks
  }
}

const STRATEGIES: ChunkingStrategy[] = [markdownStrategy, codeStrategy, genericStrategy]

export function chunkDocument(filePath: string, content: string): Omit<DocumentChunk, 'id' | 'sourceId' | 'workspaceId' | 'createdAt'>[] {
  const strategy = STRATEGIES.find((s) => s.canHandle(filePath, content))
  if (!strategy) return []
  return strategy.chunk(filePath, content)
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
