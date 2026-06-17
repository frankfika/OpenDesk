import { randomUUID } from 'crypto'
import type { Message, AgentRun } from '../../shared/types'
import type { Provider, Tool, ToolCall } from '../providers/base'

export interface AgentRunCallbacks {
  onToken?: (token: string) => void
  onToolCall?: (toolCall: ToolCall) => void
  onDone?: () => void
  onError?: (error: string) => void
}

export interface AgentStepResult {
  status: 'done' | 'tool_calls' | 'error'
  content: string
  assistantMessage: Message
  toolCalls?: ToolCall[]
  error?: string
}

export interface AgentIterationInput {
  runId: string
  agentId: string
  providerId: string
  model?: string
  provider: Provider
  messages: Message[]
  availableTools?: Tool[]
  signal: AbortSignal
  callbacks?: AgentRunCallbacks
}

export async function runAgentIteration(input: AgentIterationInput): Promise<AgentStepResult> {
  const { runId, agentId, providerId, model, provider, messages, availableTools, signal, callbacks } = input

  try {
    const stream = provider.stream(
      messages,
      signal,
      availableTools && availableTools.length > 0 ? availableTools : undefined
    )
    let assistantContent = ''
    const pendingToolCalls: ToolCall[] = []

    for await (const chunk of stream) {
      if (signal.aborted) break

      if (typeof chunk === 'string') {
        assistantContent += chunk
        callbacks?.onToken?.(chunk)
      } else {
        pendingToolCalls.push(chunk)
        callbacks?.onToolCall?.(chunk)
      }
    }

    const assistantMessage: Message = {
      id: randomUUID(),
      role: 'assistant',
      content: assistantContent,
      timestamp: Date.now(),
      kind: pendingToolCalls.length > 0 ? 'tool_call' : 'assistant_message',
      sourceProviderId: providerId,
      sourceModel: model,
      agentId,
      runId,
      metadata: pendingToolCalls.length > 0 ? { toolCalls: pendingToolCalls } : undefined
    }

    if (signal.aborted) {
      return {
        status: 'error',
        content: assistantContent,
        assistantMessage,
        error: 'Aborted'
      }
    }

    if (pendingToolCalls.length > 0) {
      return {
        status: 'tool_calls',
        content: assistantContent,
        assistantMessage,
        toolCalls: pendingToolCalls
      }
    }

    callbacks?.onDone?.()
    return {
      status: 'done',
      content: assistantContent,
      assistantMessage
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    const assistantMessage: Message = {
      id: randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      kind: 'error',
      sourceProviderId: providerId,
      sourceModel: model,
      agentId,
      runId
    }
    callbacks?.onError?.(error)
    return {
      status: 'error',
      content: '',
      assistantMessage,
      error
    }
  }
}

export function createToolResultMessages(
  toolCalls: ToolCall[],
  results: { toolCallId: string; content: string; isError?: boolean }[],
  runId: string,
  agentId: string
): Message[] {
  return results.map((r) => {
    const tc = toolCalls.find((t) => t.id === r.toolCallId)
    return {
      id: randomUUID(),
      role: 'tool',
      content: r.content,
      timestamp: Date.now(),
      kind: 'tool_result',
      toolCallId: r.toolCallId,
      agentId,
      runId,
      metadata: { toolName: tc?.name, isError: r.isError }
    }
  })
}

export interface RunAgentToCompletionOptions {
  runId: string
  agentId: string
  providerId: string
  model?: string
  provider: Provider
  messages: Message[]
  availableTools?: Tool[]
  signal: AbortSignal
  maxIterations?: number
  executeTools: (toolCalls: ToolCall[]) => Promise<{ toolCallId: string; content: string; isError?: boolean }[]>
  callbacks?: AgentRunCallbacks
}

export async function runAgentToCompletion(
  options: RunAgentToCompletionOptions
): Promise<AgentRun> {
  const { runId, agentId, providerId, model, provider, messages, availableTools, signal, maxIterations = 5, executeTools, callbacks } = options

  const run: AgentRun = {
    runId,
    agentId,
    providerId,
    model,
    status: 'running',
    messages: [...messages],
    content: '',
    toolCalls: [],
    startedAt: Date.now()
  }

  try {
    let currentMessages = [...messages]

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      if (signal.aborted) break

      const result = await runAgentIteration({
        runId,
        agentId,
        providerId,
        model,
        provider,
        messages: currentMessages,
        availableTools,
        signal,
        callbacks
      })

      run.messages.push(result.assistantMessage)

      if (result.status === 'error') {
        run.status = 'error'
        run.error = result.error
        run.finishedAt = Date.now()
        return run
      }

      if (result.status === 'done') {
        run.content = result.content
        run.status = 'done'
        run.finishedAt = Date.now()
        return run
      }

      if (result.status === 'tool_calls' && result.toolCalls) {
        run.toolCalls.push(...result.toolCalls)
        const results = await executeTools(result.toolCalls)
        const toolResultMessages = createToolResultMessages(result.toolCalls, results, runId, agentId)
        currentMessages = [...currentMessages, result.assistantMessage, ...toolResultMessages]
        run.messages.push(...toolResultMessages)
      }
    }

    // Max iterations reached
    run.status = 'done'
    run.finishedAt = Date.now()
    return run
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    run.status = 'error'
    run.error = error
    run.finishedAt = Date.now()
    callbacks?.onError?.(error)
    return run
  }
}
