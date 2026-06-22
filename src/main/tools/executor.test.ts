import { describe, it, expect } from 'vitest'
import { executeTool } from './executor'

describe('executeTool approval mode', () => {
  it('blocks shell tool when approvalMode is ask', async () => {
    const result = await executeTool(
      { id: 'tc-1', name: 'shell', arguments: { command: 'ls' } },
      undefined,
      { approvalMode: 'ask' }
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain("approvalMode is 'ask'")
  })

  it('allows shell tool to proceed when approvalMode is auto-edits', async () => {
    // Use a command whose first word is not whitelisted so we can verify
    // the approval gate was passed and the tool logic ran.
    const result = await executeTool(
      { id: 'tc-2', name: 'shell', arguments: { command: 'notwhitelisted' } },
      undefined,
      { approvalMode: 'auto-edits' }
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain('whitelist')
  })

  it('allows shell tool to proceed when approvalMode is bypass', async () => {
    const result = await executeTool(
      { id: 'tc-3', name: 'shell', arguments: { command: 'notwhitelisted' } },
      undefined,
      { approvalMode: 'bypass' }
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain('whitelist')
  })

  it('defaults to auto-edits when approvalMode is omitted', async () => {
    const result = await executeTool(
      { id: 'tc-4', name: 'shell', arguments: { command: 'notwhitelisted' } },
      undefined,
      {}
    )
    expect(result.isError).toBe(true)
    expect(result.content).toContain('whitelist')
  })
})
