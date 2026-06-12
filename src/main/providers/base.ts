import type { Message } from '../../shared/types'

export interface Tool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface Provider {
  stream(messages: Message[], signal: AbortSignal, tools?: Tool[]): AsyncIterable<string | ToolCall>
  test(): Promise<boolean>
}
