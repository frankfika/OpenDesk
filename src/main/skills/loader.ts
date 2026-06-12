import { readFileSync } from 'fs'
import type { Skill, SkillLoadLevel, SkillLoadResult } from '../../shared/types'

function estimateTokens(content: string): number {
  // Simple heuristic: ~4 chars per token for English/Chinese mixed text
  return Math.ceil(content.length / 4)
}

export function loadSkill(skill: Skill, level: SkillLoadLevel): SkillLoadResult {
  switch (level) {
    case 1:
      return loadLevel1(skill)
    case 2:
      return loadLevel2(skill)
    case 3:
      return loadLevel3(skill)
    default:
      return loadLevel1(skill)
  }
}

function loadLevel1(skill: Skill): SkillLoadResult {
  // L1 — Meta info layer (~100 tokens)
  // Only name + description + tags for AI decision making
  const tagsStr = skill.tags ? skill.tags.join(', ') : ''
  const content = `Available Skill: ${skill.name}
Description: ${skill.description}${tagsStr ? `\nTags: ${tagsStr}` : ''}${skill.version ? `\nVersion: ${skill.version}` : ''}${skill.author ? `\nAuthor: ${skill.author}` : ''}`

  return {
    level: 1,
    tokens: estimateTokens(content),
    content
  }
}

function loadLevel2(skill: Skill): SkillLoadResult {
  // L2 — Instruction layer (< 5,000 tokens)
  // Full SKILL.md (frontmatter + markdown body)
  // Already stored in skill.content
  return {
    level: 2,
    tokens: estimateTokens(skill.content),
    content: skill.content
  }
}

function loadLevel3(skill: Skill): SkillLoadResult {
  // L3 — Complete layer (on-demand)
  // SKILL.md + all reference.md + relevant scripts content
  let fullContent = skill.content
  const scriptsLoaded: string[] = []

  // Load references
  if (skill.references && skill.references.length > 0) {
    for (const refPath of skill.references) {
      try {
        const refContent = readFileSync(refPath, 'utf-8')
        fullContent += `\n\n---\n\n## Reference: ${refPath.split('/').pop()}\n\n${refContent}`
      } catch {
        // Skip unreadable references
      }
    }
  }

  // Load scripts (as reference/documentation, not execution)
  if (skill.scripts && Object.keys(skill.scripts).length > 0) {
    for (const [name, path] of Object.entries(skill.scripts)) {
      try {
        const scriptContent = readFileSync(path, 'utf-8')
        fullContent += `\n\n---\n\n## Script: ${name}\n\n\`\`\`${path.split('.').pop()}\n${scriptContent}\n\`\`\``
        scriptsLoaded.push(name)
      } catch {
        // Skip unreadable scripts
      }
    }
  }

  return {
    level: 3,
    tokens: estimateTokens(fullContent),
    content: fullContent,
    scriptsLoaded
  }
}

export { estimateTokens }
