// ─── Unique ID ───
export function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ─── Task Complexity ───
export function isComplexTask(content: string): boolean {
  if (content.includes('```')) return true
  if (content.includes('@file:')) return true
  if (content.length > 300) return true
  const complexKeywords = [
    'review',
    'refactor',
    'debug',
    'analyze',
    'analyse',
    'implement',
    'write',
    'create',
    'fix',
    'optimize',
    'compare',
    'explain in detail',
    'check for',
    'find bugs',
    'code review',
    '重构',
    '调试',
    '分析',
    '实现',
    '优化',
    '修复',
    '检查',
    '审查'
  ]
  const lower = content.toLowerCase()
  return complexKeywords.some((k) => lower.includes(k.toLowerCase()))
}

// ─── File Type Detection ───
export function determineFileType(file: File): 'text' | 'image' | 'code' | 'pdf' {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf') return 'pdf'
  const codeExts = [
    '.js',
    '.ts',
    '.tsx',
    '.jsx',
    '.py',
    '.css',
    '.html',
    '.xml',
    '.yaml',
    '.yml',
    '.json',
    '.java',
    '.cpp',
    '.c',
    '.h',
    '.go',
    '.rs',
    '.rb',
    '.php',
    '.swift',
    '.kt',
    '.scala',
    '.sh',
    '.bash',
    '.zsh',
    '.ps1',
    '.sql',
    '.dockerfile',
    '.dockerignore',
    '.gitignore',
    '.env',
    '.ini',
    '.cfg',
    '.conf',
    '.toml',
    '.lock',
    '.gradle',
    '.maven',
    '.sbt'
  ]
  if (codeExts.some((ext) => file.name.toLowerCase().endsWith(ext))) return 'code'
  return 'text'
}

// ─── Time Formatting ───
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Provider Color Theme ───
export function getProviderColor(providerType?: string): string {
  switch (providerType) {
    case 'openai':
      return 'bg-emerald-500/10 text-[var(--success)] border-emerald-200'
    case 'anthropic':
      return 'bg-orange-500/10 text-orange-600 border-orange-200'
    case 'ollama':
      return 'bg-violet-500/10 text-violet-600 border-violet-200'
    default:
      return 'bg-[var(--accent)] text-white border-transparent'
  }
}

// ─── Artifact Type Detection ───
export type ArtifactType = 'html' | 'mermaid' | 'svg' | 'react' | 'markdown' | 'code' | null

export function detectArtifactType(language: string): ArtifactType | null {
  switch (language.toLowerCase()) {
    case 'html':
      return 'html'
    case 'mermaid':
      return 'mermaid'
    case 'svg':
      return 'svg'
    case 'tsx':
    case 'jsx':
      return 'react'
    case 'md':
    case 'markdown':
      return 'markdown'
    default:
      return null
  }
}

export function artifactTitleFromLang(language: string): string {
  switch (language.toLowerCase()) {
    case 'html':
      return 'HTML Preview'
    case 'mermaid':
      return 'Diagram'
    case 'svg':
      return 'SVG Image'
    case 'tsx':
    case 'jsx':
      return 'React Component'
    case 'md':
    case 'markdown':
      return 'Markdown Doc'
    default:
      return 'Code Artifact'
  }
}

// ─── Quick Commands ───
export const QUICK_COMMANDS = [
  { id: 'clear', label: '/clear', desc: 'Clear current conversation', icon: '✨' },
  { id: 'model', label: '/model', desc: 'Switch model quickly', icon: '🤖' },
  { id: 'provider', label: '/provider', desc: 'Switch AI provider', icon: '🔌' },
  { id: 'workspace', label: '/workspace', desc: 'Switch workspace', icon: '📁' },
  { id: 'screenshot', label: '/screenshot', desc: 'Capture and send screenshot', icon: '📸' },
  { id: 'search', label: '/search', desc: 'Search the web', icon: '🔍' }
] as const

export type QuickCommand = (typeof QUICK_COMMANDS)[number]

// ─── Mention Popover Helpers ───
export function detectTrigger(val: string, cursorPos: number): 'mention' | 'thread' | 'command' | null {
  if (cursorPos === 0) return null
  const before = val.slice(0, cursorPos)
  const lastAt = before.lastIndexOf('@')
  const lastHash = before.lastIndexOf('#')
  const lastSlash = before.lastIndexOf('/')
  const lastSpace = Math.max(before.lastIndexOf(' '), before.lastIndexOf('\n'))

  if (lastAt > lastSpace && lastAt > lastHash && lastAt > lastSlash) {
    const afterAt = before.slice(lastAt + 1)
    if (!afterAt.includes(' ')) return 'mention'
  }
  if (lastHash > lastSpace && lastHash > lastAt && lastHash > lastSlash) {
    const afterHash = before.slice(lastHash + 1)
    if (!afterHash.includes(' ')) return 'thread'
  }
  if (lastSlash > lastSpace && lastSlash > lastAt && lastSlash > lastHash) {
    const afterSlash = before.slice(lastSlash + 1)
    if (!afterSlash.includes(' ')) return 'command'
  }
  return null
}

export function getTriggerQuery(val: string, cursorPos: number): string {
  const before = val.slice(0, cursorPos)
  const lastAt = before.lastIndexOf('@')
  const lastHash = before.lastIndexOf('#')
  const lastSlash = before.lastIndexOf('/')
  const lastSpace = Math.max(before.lastIndexOf(' '), before.lastIndexOf('\n'))
  const lastTrigger = Math.max(lastAt, lastHash, lastSlash)
  if (lastTrigger > lastSpace) {
    return before.slice(lastTrigger + 1)
  }
  return ''
}

// ─── Mention Prefix Helper ───
export function getMentionPrefix(type: string): string {
  if (type === 'workspace') return '@workspace:'
  if (type === 'file') return '@file:'
  if (type === 'thread') return '#thread:'
  return ''
}
