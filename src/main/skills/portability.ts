import { join, basename } from 'path'
import { homedir } from 'os'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, readFileSync, writeFileSync } from 'fs'
import type { Skill, SkillImportResult } from '../../shared/types'
import { scanSkillDirectory, parseFrontmatter } from './scanner'

function getGlobalSkillsPath(): string {
  return join(homedir(), '.opendesk', 'skills')
}

export async function exportSkill(skillPath: string, outputDir: string): Promise<string> {
  if (!existsSync(skillPath)) {
    throw new Error(`Skill path does not exist: ${skillPath}`)
  }

  const skillName = basename(skillPath)
  const destPath = join(outputDir, skillName)

  // Remove existing if present
  if (existsSync(destPath)) {
    rmSync(destPath, { recursive: true, force: true })
  }

  // Copy entire directory
  cpSync(skillPath, destPath, { recursive: true, force: true })

  return destPath
}

export async function importSkillFromFolder(sourcePath: string, targetDir?: string): Promise<SkillImportResult> {
  if (!existsSync(sourcePath)) {
    return { success: false, error: `Source path does not exist: ${sourcePath}` }
  }

  const skillMdPath = join(sourcePath, 'SKILL.md')
  if (!existsSync(skillMdPath)) {
    return { success: false, error: `No SKILL.md found in ${sourcePath}` }
  }

  const destDir = targetDir || getGlobalSkillsPath()
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }

  const skillName = basename(sourcePath)
  const destPath = join(destDir, skillName)

  // Remove existing if present
  if (existsSync(destPath)) {
    rmSync(destPath, { recursive: true, force: true })
  }

  try {
    cpSync(sourcePath, destPath, { recursive: true, force: true })
  } catch (err) {
    return { success: false, error: `Failed to copy: ${err instanceof Error ? err.message : String(err)}` }
  }

  const skill = scanSkillDirectory(destPath, 'global')
  if (!skill) {
    return { success: false, error: 'Failed to parse imported skill' }
  }

  return { success: true, skill }
}

export async function importSkillFromGitHub(repoUrl: string, targetDir?: string): Promise<SkillImportResult> {
  // Normalize URL: support owner/repo shorthand
  let normalizedUrl = repoUrl.trim()
  if (!normalizedUrl.startsWith('http')) {
    // Assume github.com/owner/repo or owner/repo
    if (normalizedUrl.includes('/') && !normalizedUrl.startsWith('github.com')) {
      normalizedUrl = `https://github.com/${normalizedUrl}`
    } else if (normalizedUrl.startsWith('github.com/')) {
      normalizedUrl = `https://${normalizedUrl}`
    } else {
      return { success: false, error: `Invalid GitHub URL or shorthand: ${repoUrl}` }
    }
  }

  // Convert to zip download URL
  const zipUrl = normalizedUrl.replace(/\.git$/, '') + '/archive/refs/heads/main.zip'
  const zipUrlMaster = normalizedUrl.replace(/\.git$/, '') + '/archive/refs/heads/master.zip'

  const destDir = targetDir || getGlobalSkillsPath()
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }

  // Download to temp
  const tmpDir = join(destDir, '.tmp-import-' + Date.now())
  mkdirSync(tmpDir, { recursive: true })
  const zipPath = join(tmpDir, 'download.zip')

  try {
    // Try main first, then master
    let response = await fetch(zipUrl)
    if (!response.ok) {
      response = await fetch(zipUrlMaster)
    }
    if (!response.ok) {
      return { success: false, error: `Failed to download repository: ${response.status} ${response.statusText}` }
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    writeFileSync(zipPath, buffer)

    // Unzip using system unzip command
    const { spawn } = await import('child_process')
    await new Promise<void>((resolve, reject) => {
      const child = spawn('unzip', ['-q', '-o', zipPath, '-d', tmpDir])
      child.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`unzip exited with code ${code}`))
      })
      child.on('error', reject)
    })

    // Find extracted directory (should be repo-name-branch/)
    const extracted = readdirSync(tmpDir).find((d) => d !== 'download.zip' && statSync(join(tmpDir, d)).isDirectory())
    if (!extracted) {
      return { success: false, error: 'Could not find extracted repository contents' }
    }

    const extractedPath = join(tmpDir, extracted)

    // Check if this is a single-skill repo (has SKILL.md at root) or multi-skill repo
    const rootSkillMd = join(extractedPath, 'SKILL.md')
    if (existsSync(rootSkillMd)) {
      // Single skill repo
      const skillName = basename(normalizedUrl.replace(/\.git$/, ''))
      const finalPath = join(destDir, skillName)
      if (existsSync(finalPath)) rmSync(finalPath, { recursive: true, force: true })
      cpSync(extractedPath, finalPath, { recursive: true, force: true })
      rmSync(tmpDir, { recursive: true, force: true })

      const skill = scanSkillDirectory(finalPath, 'github')
      if (!skill) return { success: false, error: 'Failed to parse imported skill' }
      return { success: true, skill }
    }

    // Multi-skill repo: look for subdirectories with SKILL.md
    const entries = readdirSync(extractedPath)
    const importedSkills: Skill[] = []
    for (const entry of entries) {
      const entryPath = join(extractedPath, entry)
      if (!statSync(entryPath).isDirectory()) continue
      if (existsSync(join(entryPath, 'SKILL.md'))) {
        const finalPath = join(destDir, entry)
        if (existsSync(finalPath)) rmSync(finalPath, { recursive: true, force: true })
        cpSync(entryPath, finalPath, { recursive: true, force: true })
        const skill = scanSkillDirectory(finalPath, 'github')
        if (skill) importedSkills.push(skill)
      }
    }

    rmSync(tmpDir, { recursive: true, force: true })

    if (importedSkills.length === 0) {
      return { success: false, error: 'No valid skills found in repository' }
    }

    // Return the first one as primary result
    return { success: true, skill: importedSkills[0] }
  } catch (err) {
    // Cleanup
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
    return { success: false, error: `Import failed: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function deleteGlobalSkill(skillId: string): Promise<boolean> {
  const globalPath = getGlobalSkillsPath()
  // skillId format is "global:name" or just "name"
  const name = skillId.replace(/^global:/, '')
  const skillPath = join(globalPath, name)

  if (!existsSync(skillPath)) {
    return false
  }

  try {
    rmSync(skillPath, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

export function createSkillTemplate(name: string, description: string, tags: string[]): string {
  const tagsYaml = tags.length > 0 ? `\ntags: [${tags.map((t) => `"${t}"`).join(', ')}]` : ''

  return `---
name: ${name}
description: ${description}${tagsYaml}
version: 1.0.0
author: opendesk-user
---

## Instructions

When the user asks about ${name}, follow these guidelines:

1. Understand the user's request clearly
2. Apply the appropriate techniques and best practices
3. Provide clear, actionable output

## Capabilities

- Add your capabilities here

## Examples

### Example 1
User: ...
Assistant: ...

## Notes

- Add any important notes or constraints here
`
}

export async function saveNewSkill(name: string, description: string, tags: string[]): Promise<SkillImportResult> {
  const globalPath = getGlobalSkillsPath()
  const skillDir = join(globalPath, name.toLowerCase().replace(/\s+/g, '-'))

  if (!existsSync(globalPath)) {
    mkdirSync(globalPath, { recursive: true })
  }

  if (existsSync(skillDir)) {
    return { success: false, error: `Skill '${name}' already exists` }
  }

  mkdirSync(skillDir, { recursive: true })

  const template = createSkillTemplate(name, description, tags)
  writeFileSync(join(skillDir, 'SKILL.md'), template, 'utf-8')

  const skill = scanSkillDirectory(skillDir, 'global')
  if (!skill) {
    return { success: false, error: 'Failed to create skill' }
  }

  return { success: true, skill }
}
