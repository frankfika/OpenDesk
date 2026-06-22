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

    const stream = await this.client.chat.completions.create({
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
    })

    const toolCallBuffers: Record<number, { id: string; name: string; args: string }> = {}

    for await (const chunk of stream) {
      if (signal.aborted) break

      const delta = chunk.choices[0]?.delta
      if (delta?.content) {
        yield delta.content
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          if (!toolCallBuffers[idx]) {
            toolCallBuffers[idx] = { id: tc.id ?? '', name: tc.function?.name ?? '', args: '' }
          }
          if (tc.id) toolCallBuffers[idx].id = tc.id
          if (tc.function?.name) toolCallBuffers[idx].name = tc.function.name
          if (tc.function?.arguments) {
            toolCallBuffers[idx].args += tc.function.arguments
          }
        }
      }

      const finishReason = chunk.choices[0]?.finish_reason
      if (finishReason === 'tool_calls') {
        for (const buf of Object.values(toolCallBuffers)) {
          try {
            const args = buf.args ? JSON.parse(buf.args) : {}
            yield { id: buf.id, name: buf.name, arguments: args }
          } catch {
            yield { id: buf.id, name: buf.name, arguments: {} }
          }
        }
        // Clear buffers after yielding
        for (const key of Object.keys(toolCallBuffers)) {
          delete toolCallBuffers[Number(key)]
        }
      }
    }

    // Yield any remaining tool calls if finish_reason wasn't detected
    for (const buf of Object.values(toolCallBuffers)) {
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
    await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 1
    })
    return true
  }
}
