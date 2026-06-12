import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import type { AgentsMdInfo } from '../../shared/types'

const TARGET_FILES = ['AGENTS.md', '.cursorrules', '.traerules']

export function scanAgentsMd(cwd: string): AgentsMdInfo {
  const paths: string[] = []
  const contents: string[] = []
  let current = cwd

  while (true) {
    for (const file of TARGET_FILES) {
      const p = join(current, file)
      if (existsSync(p)) {
        paths.push(p)
        try {
          contents.push(readFileSync(p, 'utf-8'))
        } catch {
          // ignore read errors
        }
      }
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }

  const content = contents.join('\n\n---\n\n')
  const tokenCount = Math.ceil(content.length / 4)

  return {
    loaded: paths.length > 0,
    paths,
    content,
    tokenCount
  }
}
