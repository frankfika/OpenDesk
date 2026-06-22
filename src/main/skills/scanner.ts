import { join, resolve } from 'path'
import { homedir } from 'os'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { app } from 'electron'
import type { Skill, SkillSource, SkillToolDefinition } from '../../shared/types'

// YAML frontmatter regex: /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/

interface ScanSource {
  path: string
  source: SkillSource
  priority: number
}

function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>
  body: string
} {
  const match = content.match(FRONTMATTER_REGEX)
  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const yamlText = match[1]
  const body = match[2]
  const frontmatter: Record<string, unknown> = {}

  // Simple YAML line parser (no nested objects, just top-level keys)
  const lines = yamlText.split('\n')
  let currentKey: string | null = null
  let currentList: unknown[] = []
  let inList = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    // List item
    if (line.startsWith('- ')) {
      if (inList && currentKey) {
        currentList.push(parseYamlValue(line.slice(2)))
      }
      continue
    }

    // End of list
    if (inList && currentKey) {
      frontmatter[currentKey] = currentList
      currentList = []
      inList = false
    }

    // Key: value
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim()
      if (value === '') {
        // Could be a list start
        currentKey = key
        currentList = []
        inList = true
      } else {
        frontmatter[key] = parseYamlValue(value)
      }
    }
  }

  // Handle trailing list
  if (inList && currentKey) {
    frontmatter[currentKey] = currentList
  }

  return { frontmatter, body }
}

function parseYamlValue(value: string): unknown {
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  // Boolean
  if (value === 'true') return true
  if (value === 'false') return false
  // Number
  if (/^-?\d+$/.test(value)) return parseInt(value, 10)
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value)
  // Array inline [a, b, c]
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((s) => parseYamlValue(s.trim()))
  }
  return value
}

function parseToolsFromFrontmatter(fm: Record<string, unknown>): SkillToolDefinition[] | undefined {
  const toolsRaw = fm.tools
  if (!toolsRaw || !Array.isArray(toolsRaw)) return undefined

  const tools: SkillToolDefinition[] = []
  for (const t of toolsRaw) {
    if (typeof t !== 'object' || t === null) continue
    const tool = t as Record<string, unknown>
    if (typeof tool.name !== 'string' || typeof tool.description !== 'string') continue

    const def: SkillToolDefinition = {
      name: tool.name,
      description: tool.description
    }

    if (tool.parameters && typeof tool.parameters === 'object') {
      def.parameters = tool.parameters as SkillToolDefinition['parameters']
    }

    tools.push(def)
  }

  return tools.length > 0 ? tools : undefined
}

export function scanSkillDirectory(dirPath: string, source: SkillSource): Skill | null {
  const skillMdPath = join(dirPath, 'SKILL.md')
  if (!existsSync(skillMdPath)) return null

  try {
    const content = readFileSync(skillMdPath, 'utf-8')
    const { frontmatter } = parseFrontmatter(content)

    const dirName = dirPath.split('/').pop() || dirPath.split('\\').pop() || 'unknown'
    const id = `${source}:${dirName}`

    // Check for reference.md
    const referencePath = join(dirPath, 'reference.md')
    const hasReference = existsSync(referencePath)

    // Check for scripts/
    const scriptsDir = join(dirPath, 'scripts')
    const hasScripts = existsSync(scriptsDir) && statSync(scriptsDir).isDirectory()

    // Check for assets/
    const assetsDir = join(dirPath, 'assets')
    const hasAssets = existsSync(assetsDir) && statSync(assetsDir).isDirectory()

    // Collect scripts
    const scripts: Record<string, string> = {}
    if (hasScripts) {
      try {
        const scriptFiles = readdirSync(scriptsDir)
        for (const f of scriptFiles) {
          const ext = f.split('.').pop()?.toLowerCase()
          if (['js', 'py', 'sh', 'ts'].includes(ext || '')) {
            scripts[f.replace(/\.[^.]+$/, '')] = join(scriptsDir, f)
          }
        }
      } catch {
        // ignore
      }
    }

    // Collect references
    const references: string[] = []
    if (hasReference) {
      references.push(referencePath)
    }
    // Also check for additional .md files in references/ dir
    const referencesDir = join(dirPath, 'references')
    if (existsSync(referencesDir) && statSync(referencesDir).isDirectory()) {
      try {
        const refFiles = readdirSync(referencesDir)
        for (const f of refFiles) {
          if (f.endsWith('.md')) {
            references.push(join(referencesDir, f))
          }
        }
      } catch {
        // ignore
      }
    }

    const now = Date.now()

    return {
      id,
      name: (frontmatter.name as string) || dirName,
      description: (frontmatter.description as string) || 'No description available',
      content,
      path: dirPath,
      source,
      version: (frontmatter.version as string) || undefined,
      author: (frontmatter.author as string) || undefined,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : undefined,
      hasReference,
      hasScripts,
      hasAssets,
      scripts: Object.keys(scripts).length > 0 ? scripts : undefined,
      references: references.length > 0 ? references : undefined,
      tools: parseToolsFromFrontmatter(frontmatter),
      installedAt: now,
      updatedAt: now,
      usageCount: 0,
      isBuiltIn: source === 'builtin'
    }
  } catch {
    return null
  }
}

function scanSourceDirectory(basePath: string, source: SkillSource): Skill[] {
  const skills: Skill[] = []
  if (!existsSync(basePath)) return skills

  try {
    const entries = readdirSync(basePath)
    for (const entry of entries) {
      const fullPath = join(basePath, entry)
      try {
        if (!statSync(fullPath).isDirectory()) continue
        const skill = scanSkillDirectory(fullPath, source)
        if (skill) skills.push(skill)
      } catch {
        // Ignore broken symlinks or permission errors
      }
    }
  } catch {
    // Directory not readable
  }

  return skills
}

export function getBuiltinSkillsPath(): string {
  // In production, builtins are bundled with the app
  // In dev, they are in src/main/skills/builtins/
  const candidates: string[] = []

  // Dev layout: src/main/skills/builtins (relative to compiled main in out/main)
  candidates.push(resolve(__dirname, '../../src/main/skills/builtins'))
  // Build layout: out/skills/builtins
  candidates.push(resolve(__dirname, '../skills/builtins'))

  // Packaged app layouts
  try {
    const appPath = app.getAppPath()
    candidates.push(resolve(appPath, 'out/skills/builtins'))
    candidates.push(resolve(appPath, 'skills/builtins'))
    candidates.push(resolve(appPath, '../skills/builtins'))
  } catch {
    // app module may not be ready in unit tests
  }

  for (const p of candidates) {
    if (existsSync(p)) return p
  }

  // Fallback to dev path so callers can report a clear ENOENT
  return candidates[0] || resolve(__dirname, '../../src/main/skills/builtins')
}

export function getGlobalSkillsPath(): string {
  return join(homedir(), '.opendesk', 'skills')
}

export function scanAllSkills(workspacePath?: string): Skill[] {
  const sources: ScanSource[] = [
    { path: getGlobalSkillsPath(), source: 'global', priority: 100 },
    { path: getBuiltinSkillsPath(), source: 'builtin', priority: 90 }
  ]

  if (workspacePath) {
    sources.push({ path: join(workspacePath, '.opendesk', 'skills'), source: 'workspace', priority: 95 })
  }

  // Codex / Claude compatibility
  sources.push(
    { path: join(homedir(), '.codex', 'skills'), source: 'codex', priority: 50 },
    { path: join(homedir(), '.claude', 'skills'), source: 'claude', priority: 40 }
  )

  // Sort by priority descending
  sources.sort((a, b) => b.priority - a.priority)

  const allSkills = new Map<string, Skill>()

  for (const src of sources) {
    const skills = scanSourceDirectory(src.path, src.source)
    for (const skill of skills) {
      // Higher priority overwrites lower priority (same id)
      // But we also allow same-name skills from different sources to coexist
      // by using source-prefixed id
      const baseId = skill.id.replace(/^[^:]+:/, '')
      const existing = allSkills.get(baseId)
      if (!existing || src.priority > (sources.find((s) => s.source === existing.source)?.priority ?? 0)) {
        allSkills.set(baseId, skill)
      }
    }
  }

  return Array.from(allSkills.values())
}

export { parseFrontmatter }
