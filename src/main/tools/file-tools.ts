import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs'
import { dirname, isAbsolute, resolve, sep } from 'path'

function isSafePath(filePath: string, allowedBase?: string): { safe: boolean; error?: string } {
  if (!filePath || typeof filePath !== 'string') {
    return { safe: false, error: 'Invalid path' }
  }
  if (filePath.includes('\0')) {
    return { safe: false, error: 'Path contains null bytes' }
  }
  const resolved = resolve(filePath)
  if (allowedBase) {
    const base = resolve(allowedBase)
    if (resolved !== base && !resolved.startsWith(base + sep)) {
      return { safe: false, error: `Path is outside allowed base (${allowedBase})` }
    }
    return { safe: true }
  }
  if (!isAbsolute(filePath)) {
    return { safe: false, error: 'Relative paths are not allowed' }
  }
  return { safe: true }
}

export function readFile(path: string): { success: boolean; content?: string; error?: string } {
  try {
    if (!existsSync(path)) return { success: false, error: 'File not found' }
    const content = readFileSync(path, 'utf-8')
    return { success: true, content }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function writeFile(path: string, content: string, allowedBase?: string): { success: boolean; error?: string } {
  const check = isSafePath(path, allowedBase)
  if (!check.safe) return { success: false, error: check.error }
  try {
    const dir = dirname(path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(path, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  mtime: number
}

export function listDirectory(path: string): { success: boolean; entries?: DirEntry[]; error?: string } {
  try {
    if (!existsSync(path)) return { success: false, error: 'Directory not found' }
    const stats = statSync(path)
    if (!stats.isDirectory()) return { success: false, error: 'Path is not a directory' }
    const items = readdirSync(path)
    const entries: DirEntry[] = items.map((name) => {
      const itemPath = `${path}/${name}`
      try {
        const s = statSync(itemPath)
        return {
          name,
          path: itemPath,
          isDirectory: s.isDirectory(),
          size: s.size,
          mtime: s.mtime.getTime()
        }
      } catch {
        return { name, path: itemPath, isDirectory: false, size: 0, mtime: 0 }
      }
    })
    return { success: true, entries }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function applyPatch(path: string, patch: string, allowedBase?: string): { success: boolean; error?: string } {
  const check = isSafePath(path, allowedBase)
  if (!check.safe) return { success: false, error: check.error }
  try {
    if (!existsSync(path)) return { success: false, error: 'File not found' }
    const original = readFileSync(path, 'utf-8')

    // Simple unified-diff style patch application
    // Supports @@ -start,count +start,count @@ hunks
    const lines = original.split('\n')
    const patchLines = patch.split('\n')
    let result = [...lines]
    let i = 0

    while (i < patchLines.length) {
      const line = patchLines[i]
      if (line.startsWith('@@')) {
        // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
        const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
        if (!match) {
          i++
          continue
        }
        const oldStart = parseInt(match[1], 10)
        const oldCount = parseInt(match[2] || '1', 10)
        i++

        const hunkOld: string[] = []
        const hunkNew: string[] = []
        while (i < patchLines.length && !patchLines[i].startsWith('@@') && !patchLines[i].startsWith('---')) {
          const pl = patchLines[i]
          if (pl.startsWith('+')) {
            hunkNew.push(pl.slice(1))
          } else if (pl.startsWith('-')) {
            hunkOld.push(pl.slice(1))
          } else if (pl.startsWith(' ')) {
            hunkOld.push(pl.slice(1))
            hunkNew.push(pl.slice(1))
          } else if (pl === '\\ No newline at end of file') {
            // ignore
          }
          i++
        }

        // Replace old lines with new lines at oldStart (1-based)
        const startIdx = oldStart - 1
        result.splice(startIdx, oldCount, ...hunkNew)
      } else {
        i++
      }
    }

    writeFileSync(path, result.join('\n'), 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
