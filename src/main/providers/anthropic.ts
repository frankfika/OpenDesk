import Anthropic from '@anthropic-ai/sdk'
import type { Provider, Tool, ToolCall } from './base'
import type { Message } from '../../shared/types'

// In SDK 0.30 the message-content union is exposed as `BetaContentBlockParam`
// (re-exported under the `Beta.Messages` namespace). Earlier SDK versions
// exported the same shape as `Messages.ContentBlockParam`, which was removed
// when the messages API moved to its current location. The `Beta` prefix is
// the SDK's marker for "shape may evolve" — for our use case the shape has
// been stable for many minor versions, so importing it via Beta is safe.
type ContentBlockParam =
  | Anthropic.Beta.Messages.BetaTextBlockParam
  | Anthropic.Beta.Messages.BetaImageBlockParam
  | Anthropic.Beta.Messages.BetaToolUseBlockParam
  | Anthropic.Beta.Messages.BetaToolResultBlockParam

export class AnthropicProvider implements Provider {
  private client: Anthropic
  private model: string

  constructor(apiKey: string, model = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey })
    this.model = model
  }

  private formatMessages(
    messages: Message[]
  ): Array<{ role: 'user' | 'assistant'; content: string | ContentBlockParam[] }> {
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
            ] as ContentBlockParam[]
          }
        }
        if (m.role === 'assistant' && m.metadata?.toolCalls) {
          const toolCalls = m.metadata.toolCalls as unknown as ToolCall[]
          const content: ContentBlockParam[] = []
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

  async *stream(messages: Message[], signal: AbortSignal, tools?: Tool[]): AsyncIterable<string | ToolCall> {
    const formatted = this.formatMessages(messages)
    const systemMsg = messages.find((m) => m.role === 'system')

    // Pass `signal` to the SDK so an in-flight HTTP request is actually
    // cancelled when the caller aborts — without this, the for-await
    // below just stops consuming tokens and the upstream call keeps
    // running (and burning cost) in the background.
    const response = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: 8096,
        system: systemMsg?.content,
        messages: formatted,
        tools:
          tools && tools.length > 0
            ? tools.map((t) => ({
                name: t.name,
                description: t.description,
                input_schema: t.parameters as unknown as Anthropic.Messages.Tool['input_schema']
              }))
            : undefined,
        stream: true
      },
      { signal }
    )

    let currentToolCall: ToolCall | null = null
    let currentToolArgs = ''

    for await (const event of response) {
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
    // Health checks must not block forever — cap each ping with a 5 s
    // timeout so a wedged provider doesn't stop the interval rotation.
    await this.client.messages.create(
      {
        model: this.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }]
      },
      { signal: AbortSignal.timeout(5_000) }
    )
    return true
  }
}
