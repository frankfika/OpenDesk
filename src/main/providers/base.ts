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

export interface ToolResult {
  toolCallId: string
  content: string
  isError?: boolean
}

export interface Provider {
  stream(messages: Message[], signal: AbortSignal, tools?: Tool[]): AsyncIterable<string | ToolCall>
  test(): Promise<boolean>
}

// Re-export ProviderConfig from shared types so downstream modules can import it from one place
export type { ProviderConfig } from '../../shared/types'
