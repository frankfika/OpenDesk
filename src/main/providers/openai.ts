import OpenAI from 'openai'
import type { Provider, Tool, ToolCall } from './base'
import type { Message } from '../../shared/types'

export class OpenAIProvider implements Provider {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model = 'gpt-4o', baseUrl?: string) {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl })
    this.model = model
  }

  private formatMessages(messages: Message[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          tool_call_id: m.toolCallId || (m.metadata?.toolCallId as string) || '',
          content: m.content
        }
      }
      if (m.role === 'assistant' && m.metadata?.toolCalls) {
        const toolCalls = m.metadata.toolCalls as unknown as ToolCall[]
        return {
          role: 'assistant' as const,
          content: m.content || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          })) as unknown as OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
        }
      }
      // Skip system messages — OpenAI uses top-level 'system' message; for now just pass through
      return {
        role: (m.role === 'system' ? 'system' : m.role === 'user' ? 'user' : 'assistant') as
          | 'system'
          | 'user'
          | 'assistant',
        content: m.content
      }
    })
  }

  async *stream(messages: Message[], signal: AbortSignal, tools?: Tool[]): AsyncIterable<string | ToolCall> {
    const formatted = this.formatMessages(messages)

    // Pass `signal` to the SDK so an in-flight request is actually
    // cancelled when the caller aborts. The for-await below would
    // otherwise just stop consuming tokens.
    const stream = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: formatted,
        tools:
          tools && tools.length > 0
            ? tools.map((t) => ({
                type: 'function' as const,
                function: {
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters
                }
              }))
            : undefined,
        stream: true
      },
      { signal }
    )

    const toolCallBuffers = new Map<number, { id: string; name: string; args: string }>()

    for await (const chunk of stream) {
      if (signal.aborted) break

      const delta = chunk.choices[0]?.delta
      if (delta?.content) {
        yield delta.content
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          if (!toolCallBuffers.has(idx)) {
            toolCallBuffers.set(idx, { id: tc.id ?? '', name: tc.function?.name ?? '', args: '' })
          }
          const buf = toolCallBuffers.get(idx)!
          if (tc.id) buf.id = tc.id
          if (tc.function?.name) buf.name = tc.function.name
          if (tc.function?.arguments) {
            buf.args += tc.function.arguments
          }
        }
      }

      const finishReason = chunk.choices[0]?.finish_reason
      if (finishReason === 'tool_calls') {
        for (const buf of toolCallBuffers.values()) {
          try {
            const args = buf.args ? JSON.parse(buf.args) : {}
            yield { id: buf.id, name: buf.name, arguments: args }
          } catch {
            yield { id: buf.id, name: buf.name, arguments: {} }
          }
        }
        toolCallBuffers.clear()
      }
    }

    // Yield any remaining tool calls if finish_reason wasn't detected
    for (const buf of toolCallBuffers.values()) {
      if (buf.id && buf.name) {
        try {
          const args = buf.args ? JSON.parse(buf.args) : {}
          yield { id: buf.id, name: buf.name, arguments: args }
        } catch {
          yield { id: buf.id, name: buf.name, arguments: {} }
        }
      }
    }
  }

  async test(): Promise<boolean> {
    // Health checks must not block forever — cap each ping with a 5 s
    // timeout so a wedged provider doesn't stop the interval rotation.
    await this.client.chat.completions.create(
      {
        model: this.model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1
      },
      { signal: AbortSignal.timeout(5_000) }
    )
    return true
  }
}
