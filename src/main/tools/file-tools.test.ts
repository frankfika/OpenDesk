import { describe, it, expect } from 'vitest'
import { writeFile, applyPatch } from './file-tools'

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
})
