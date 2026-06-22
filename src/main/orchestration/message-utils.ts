import type { Message } from '../../shared/types'

/**
 * Normalize frontend message history so OpenAI-compatible providers receive valid
 * conversation arrays. Legacy frontend messages stored tool calls as standalone
 * `kind: 'tool_call'` assistant messages without `metadata.toolCalls`. Providers
 * require a single assistant message with `tool_calls` followed by `tool` role
 * messages for each result.
 */
export function normalizeToolMessages(msgs: Message[]): Message[] {
  const result: Message[] = []
  let i = 0
  while (i < msgs.length) {
    const m = msgs[i]
    if (m.role === 'assistant' && m.kind === 'tool_call') {
      const toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = []
      const pendingIds: string[] = []
      let j = i
      while (j < msgs.length && msgs[j].role === 'assistant' && msgs[j].kind === 'tool_call') {
        const metadata = msgs[j].metadata || {}
        const tcid = (metadata.toolCallId as string) || `legacy-${j}`
        pendingIds.push(tcid)
        toolCalls.push({
          id: tcid,
          name: (metadata.toolName as string) || 'tool',
          arguments: (metadata.params as Record<string, unknown>) || {}
        })
        j++
      }
      const toolResults: Message[] = []
      while (j < msgs.length && msgs[j].role === 'tool') {
        const tcid = msgs[j].toolCallId || pendingIds.shift() || `legacy-${j}`
        toolResults.push({ ...msgs[j], toolCallId: tcid })
        const idx = toolCalls.findIndex((tc) => tc.id === tcid || tc.id.startsWith('legacy-'))
        if (idx !== -1 && tcid && !tcid.startsWith('legacy-')) {
          toolCalls[idx].id = tcid
        }
        j++
      }
      result.push({
        id: m.id,
        role: 'assistant',
        content: '',
        timestamp: m.timestamp,
        metadata: { toolCalls }
      })
      result.push(...toolResults)
      i = j
    } else {
      result.push(m)
      i++
    }
  }
  return result
}
