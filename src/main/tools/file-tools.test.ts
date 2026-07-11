import { describe, it, expect } from 'vitest'
import { writeFile, readFile, listDirectory, applyPatch } from './file-tools'

describe('file-tools security', () => {
  it('rejects relative paths by default', () => {
    const result = writeFile('relative/path.txt', 'content')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Relative paths are not allowed')
  })

  it('rejects paths with null bytes', () => {
    const result = writeFile('/tmp/evil\0.txt', 'content')
    expect(result.success).toBe(false)
    expect(result.error).toContain('null bytes')
  })

  it('rejects paths outside allowed base', () => {
    const result = writeFile('/etc/passwd', 'content', '/tmp/workspace')
    expect(result.success).toBe(false)
    expect(result.error).toContain('outside allowed base')
  })

  it('allows paths inside allowed base', () => {
    const result = writeFile('/tmp/workspace/file.txt', 'content', '/tmp/workspace')
    expect(result.success).toBe(true)
  })

  it('applyPatch rejects relative paths', () => {
    const result = applyPatch('relative/path.txt', '@@ -1,1 +1,1 @@')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Relative paths are not allowed')
  })

  it('readFile rejects relative paths by default', () => {
    const result = readFile('relative/path.txt')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Relative paths are not allowed')
  })

  it('readFile rejects paths outside allowed base', () => {
    const result = readFile('/etc/passwd', undefined, '/tmp/workspace')
    expect(result.success).toBe(false)
    expect(result.error).toContain('outside allowed base')
  })

  it('readFile rejects paths with null bytes', () => {
    const result = readFile('/tmp/evil\0.txt')
    expect(result.success).toBe(false)
    expect(result.error).toContain('null bytes')
  })

  it('listDirectory rejects relative paths by default', () => {
    const result = listDirectory('relative/dir')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Relative paths are not allowed')
  })

  it('listDirectory rejects paths outside allowed base', () => {
    const result = listDirectory('/etc', '/tmp/workspace')
    expect(result.success).toBe(false)
    expect(result.error).toContain('outside allowed base')
  })
})
