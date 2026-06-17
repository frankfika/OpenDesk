import type { ToolCall, ToolResult } from '../providers/base'

export interface SharedToolExecution {
  toolCallId: string
  name: string
  arguments: Record<string, unknown>
  content: string
  isError?: boolean
}

function toolCallKey(tc: ToolCall): string {
  return `${tc.name}::${JSON.stringify(tc.arguments)}`
}

export function deduplicateToolCalls(toolCalls: ToolCall[]): ToolCall[] {
  const seen = new Map<string, ToolCall>()
  for (const tc of toolCalls) {
    const key = toolCallKey(tc)
    if (!seen.has(key)) {
      seen.set(key, tc)
    }
  }
  return Array.from(seen.values())
}

export async function executeSharedTools(
  toolCalls: ToolCall[],
  executeOne: (toolCall: ToolCall) => Promise<ToolResult>
): Promise<SharedToolExecution[]> {
  const unique = deduplicateToolCalls(toolCalls)
  const executed = new Map<string, SharedToolExecution>()

  for (const tc of unique) {
    const key = toolCallKey(tc)
    const result = await executeOne(tc)
    executed.set(key, {
      toolCallId: tc.id,
      name: tc.name,
      arguments: tc.arguments,
      content: result.content,
      isError: result.isError
    })
  }

  // Map back to every original tool call id
  const output: SharedToolExecution[] = []
  for (const tc of toolCalls) {
    const key = toolCallKey(tc)
    const shared = executed.get(key)
    if (shared) {
      output.push({
        ...shared,
        toolCallId: tc.id // preserve the original caller's id
      })
    }
  }

  return output
}
