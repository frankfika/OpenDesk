import Anthropic from '@anthropic-ai/sdk'
import type { Provider, Tool, ToolCall } from './base'
import type { Message } from '../../shared/types'

export class AnthropicProvider implements Provider {
  private client: Anthropic
  private model: string

  constructor(apiKey: string, model = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey })
    this.model = model
  }

  private formatMessages(
    messages: Message[]
  ): Array<{ role: 'user' | 'assistant'; content: any }> {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'user' as const,
            content: [
              {
                type: 'tool_result',
                tool_use_id: m.toolCallId || (m.metadata?.toolCallId as string) || '',
                content: m.content
              }
            ]
          }
        }
        if (m.role === 'assistant' && m.metadata?.toolCalls) {
          const toolCalls = m.metadata.toolCalls as ToolCall[]
          const content: any[] = []
          if (m.content) {
            content.push({ type: 'text', text: m.content })
          }
          for (const tc of toolCalls) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.arguments
            })
          }
          return { role: 'assistant' as const, content }
        }
        return {
          role: m.role as 'user' | 'assistant',
          content: m.content
        }
      })
  }

  async *stream(
    messages: Message[],
    signal: AbortSignal,
    tools?: Tool[]
  ): AsyncIterable<string | ToolCall> {
    const formatted = this.formatMessages(messages)
    const systemMsg = messages.find((m) => m.role === 'system')

    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: 8096,
      system: systemMsg?.content,
      messages: formatted,
      tools:
        tools && tools.length > 0
          ? tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.parameters as Anthropic.Messages.Tool['input_schema']
            }))
          : undefined
    })

    let currentToolCall: ToolCall | null = null
    let currentToolArgs = ''

    for await (const event of stream) {
      if (signal.aborted) break

      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }

      if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
        currentToolCall = {
          id: event.content_block.id,
          name: event.content_block.name,
          arguments: {}
        }
        currentToolArgs = ''
        if (event.content_block.input && typeof event.content_block.input === 'object') {
          currentToolArgs = JSON.stringify(event.content_block.input)
        }
      }

      if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta') {
        currentToolArgs += event.delta.partial_json
      }

      if (event.type === 'content_block_stop' && currentToolCall) {
        try {
          const args = currentToolArgs ? JSON.parse(currentToolArgs) : {}
          currentToolCall.arguments = args
        } catch {
          currentToolCall.arguments = {}
        }
        yield currentToolCall
        currentToolCall = null
        currentToolArgs = ''
      }
    }
  }

  async test(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }]
      })
      return true
    } catch {
      return false
    }
  }
}
