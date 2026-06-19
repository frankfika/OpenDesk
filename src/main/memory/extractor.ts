import type { MemoryEntry } from '../../shared/types-memory'
import type { Message } from '../../shared/types'

// Lightweight rule-based extractor for key facts from conversation messages
export function extractFromMessages(messages: Message[]): MemoryEntry[] {
  const entries: MemoryEntry[] = []
  const now = Date.now()

  // Preference patterns
  const preferencePatterns = [
    /i\s+(?:prefer|like|love|enjoy|hate|dislike|always use|usually use|never use)\s+(.+?)(?:\.|$)/i,
    /my\s+(?:favorite|preferred|default|usual)\s+(?:\w+\s+)?is\s+(.+?)(?:\.|$)/i,
    /i\s+(?:always|usually|never|often|sometimes)\s+(.+?)(?:\.|$)/i,
  ]

  // Technical stack patterns
  const techPatterns = [
    /\b(using|use|with|in|built on|written in|migrated to|switched to)\s+([A-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)*(?:\s+[a-zA-Z0-9]+){0,3})\b/g,
    /\b(React|Vue|Angular|Svelte|Next\.js|Nuxt|Express|Fastify|Django|Flask|Spring|Rails|Laravel|\.NET|Node\.js|Python|TypeScript|JavaScript|Go|Rust|Java|Kotlin|Swift|C\+\+|C#|Ruby|PHP|PostgreSQL|MySQL|MongoDB|Redis|Docker|Kubernetes|AWS|GCP|Azure|Vercel|Netlify|Tailwind|Bootstrap|Material UI|Electron|Tauri|Vite|Webpack|esbuild|Rollup|pnpm|yarn|npm|bun|deno)\b/g,
  ]

  // Lesson / pattern patterns (assistant messages)
  const lessonPatterns = [
    /(?:remember|note|keep in mind|best practice|pattern|anti-pattern|lesson|tip|avoid)\s*:?\s*(.+?)(?:\.|$)/i,
    /(?:it's best to|you should|recommended to|consider|suggested|good idea to|better to)\s+(.+?)(?:\.|$)/i,
  ]

  for (const msg of messages) {
    if (!msg.content || msg.content.length < 5) continue

    const source = msg.role === 'user' ? 'user' : 'assistant'
    const content = msg.content

    // Preference extraction
    for (const pattern of preferencePatterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        const fact = match[1].trim()
        if (fact.length > 3 && fact.length < 200) {
          entries.push({
            content: `User preference: ${fact}`,
            timestamp: now,
            source
          })
        }
      }
    }

    // Tech stack extraction (for user messages mostly)
    if (msg.role === 'user') {
      for (const pattern of techPatterns) {
        const regex = new RegExp(pattern.source, pattern.flags)
        let m: RegExpExecArray | null
        while ((m = regex.exec(content)) !== null) {
          const tech = m[2] || m[1]
          if (tech && tech.length > 1 && tech.length < 60) {
            entries.push({
              content: `User mentioned tech stack: ${tech}`,
              timestamp: now,
              source
            })
          }
        }
      }
    }

    // Lesson / pattern extraction (for assistant messages)
    if (msg.role === 'assistant') {
      for (const pattern of lessonPatterns) {
        const match = content.match(pattern)
        if (match && match[1]) {
          const fact = match[1].trim()
          if (fact.length > 5 && fact.length < 200) {
            entries.push({
              content: `Lesson learned: ${fact}`,
              timestamp: now,
              source
            })
          }
        }
      }
    }
  }

  // Deduplicate by content (case-insensitive)
  const seen = new Set<string>()
  return entries.filter((e) => {
    const key = e.content.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
