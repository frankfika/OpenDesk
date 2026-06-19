import { randomUUID } from 'crypto'
import type {
  Message,
  AgentRun,
  ArbitrationResult,
  ChatSendPayload,
  ProviderConfig,
  AgentRole
} from '../../shared/types'
import type { ToolCall } from '../providers/base'
import { buildProvider } from '../providers/builder'
import { executeTool, buildTools } from '../tools/executor'
import { runAgentIteration, createToolResultMessages } from './agent-run'
import { executeSharedTools } from './tool-coordinator'
import { arbitrate } from './arbitrator'
import { registerRun, registerAgent, completeRun, isRunAborted } from './run-tracker'

export interface EnsembleCallbacks {
  onAgentToken?: (payload: { runId: string; agentId: string; providerId: string; token: string }) => void
  onAgentToolCall?: (payload: { runId: string; agentId: string; providerId: string; toolCall: ToolCall }) => void
  onAgentToolResult?: (payload: {
    runId: string
    agentId: string
    providerId: string
    toolResult: { toolCallId: string; name: string; content: string; isError?: boolean }
  }) => void
  onAgentDone?: (payload: {
    runId: string
    agentId: string
    providerId: string
    latencyMs?: number
    inputTokens?: number
    outputTokens?: number
  }) => void
  onAgentError?: (payload: { runId: string; agentId: string; providerId: string; error: string }) => void
  onArbitrationToken?: (payload: { runId: string; token: string }) => void
  onArbitrationDone?: (payload: { runId: string; result: ArbitrationResult }) => void
  onEnsembleDone?: (payload: { runId: string; threadId?: string; workspaceId?: string }) => void
  onError?: (payload: { runId: string; error: string }) => void
}

export interface EnsembleContext {
  runId: string
  payload: ChatSendPayload
  providers: ProviderConfig[]
  apiKeys: Record<string, string>
  callbacks: EnsembleCallbacks
  desktopEnabled?: boolean
  approvalMode?: string
  agentRoleAssignments?: Record<string, AgentRole>
  rolePrompts?: Record<AgentRole, string>
}

interface AgentContext {
  agentId: string
  providerId: string
  provider: ReturnType<typeof buildProvider>
  model?: string
  role?: AgentRole
  messages: Message[]
  status: 'running' | 'done' | 'error'
  content: string
  toolCalls: ToolCall[]
  error?: string
  startedAt: number
  finishedAt?: number
  latencyMs?: number
}

export async function runEnsemble(context: EnsembleContext): Promise<ArbitrationResult | null> {
  const {
    runId,
    payload,
    providers,
    apiKeys,
    callbacks,
    desktopEnabled,
    approvalMode,
    agentRoleAssignments,
    rolePrompts
  } = context
  const { messages, providerIds = [], arbitratorProviderId, systemPrompt, workspaceId, threadId } = payload

  const controller = new AbortController()
  registerRun(runId, controller)

  const enabledProviderIds = providerIds.filter((id) => providers.some((p) => p.id === id && p.enabled))

  if (enabledProviderIds.length === 0) {
    callbacks.onError?.({ runId, error: 'No enabled providers selected for ensemble mode.' })
    completeRun(runId)
    return null
  }

  const availableTools = buildTools(workspaceId)

  // Build per-agent contexts with role-specific system prompts
  const agentContexts: AgentContext[] = []
  for (let i = 0; i < enabledProviderIds.length; i++) {
    const providerId = enabledProviderIds[i]
    const config = providers.find((p) => p.id === providerId)
    if (!config) continue

    const apiKey = apiKeys[providerId] ?? ''
    const provider = buildProvider(config, apiKey)
    if (!provider) continue

    const agentId = `agent-${i}`
    const agentController = new AbortController()
    registerAgent(runId, agentId, agentController)

    // Build role-specific system prompt
    let combinedSystemPrompt = systemPrompt || ''
    if (workspaceId) {
      combinedSystemPrompt += (combinedSystemPrompt ? '\n\n' : '') + `You are working inside workspace ${workspaceId}.`
    }
    const role: AgentRole = agentRoleAssignments?.[providerId] ?? 'generalist'
    const rolePrompt = rolePrompts?.[role]
    if (rolePrompt) {
      combinedSystemPrompt += (combinedSystemPrompt ? '\n\n' : '') + rolePrompt
    }

    const agentMessages: Message[] = combinedSystemPrompt
      ? [{ id: `system-${agentId}`, role: 'system', content: combinedSystemPrompt, timestamp: Date.now() }, ...messages]
      : [...messages]

    agentContexts.push({
      agentId,
      providerId,
      provider,
      model: config.model,
      role,
      messages: agentMessages,
      status: 'running',
      content: '',
      toolCalls: [],
      startedAt: Date.now()
    })
  }

  if (agentContexts.length === 0) {
    callbacks.onError?.({ runId, error: 'No agents could be initialized for ensemble mode.' })
    completeRun(runId)
    return null
  }

  // Run agents in rounds, sharing tool results across all agents
  const maxIterations = 5
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    if (isRunAborted(runId)) break

    // Run one iteration for each agent in parallel
    const stepPromises = agentContexts
      .filter((ctx) => ctx.status === 'running')
      .map((ctx) =>
        runAgentIteration({
          runId,
          agentId: ctx.agentId,
          providerId: ctx.providerId,
          model: ctx.model,
          provider: ctx.provider!,
          messages: ctx.messages,
          availableTools,
          signal: controller.signal,
          callbacks: {
            onToken: (token) => {
              callbacks.onAgentToken?.({ runId, agentId: ctx.agentId, providerId: ctx.providerId, token })
            },
            onToolCall: (toolCall) => {
              callbacks.onAgentToolCall?.({ runId, agentId: ctx.agentId, providerId: ctx.providerId, toolCall })
            },
            onError: (error) => {
              callbacks.onAgentError?.({ runId, agentId: ctx.agentId, providerId: ctx.providerId, error })
            }
          }
        }).then((result) => ({ ctx, result }))
      )

    const stepResults = await Promise.allSettled(stepPromises)

    // Collect all tool calls from agents that requested tools this round
    const allToolCalls: ToolCall[] = []
    for (const settled of stepResults) {
      if (settled.status !== 'fulfilled') continue
      const { ctx, result } = settled.value
      ctx.messages.push(result.assistantMessage)

      if (result.status === 'error') {
        ctx.status = 'error'
        ctx.error = result.error
      } else if (result.status === 'done') {
        ctx.status = 'done'
        ctx.content = result.content
        ctx.finishedAt = Date.now()
        ctx.latencyMs = ctx.finishedAt - ctx.startedAt
      } else if (result.status === 'tool_calls' && result.toolCalls) {
        ctx.toolCalls.push(...result.toolCalls)
        allToolCalls.push(...result.toolCalls)
      }
    }

    if (allToolCalls.length === 0) {
      // No tool calls requested by any agent this round
      const stillRunning = agentContexts.some((ctx) => ctx.status === 'running')
      if (!stillRunning) break
      continue
    }

    // Execute shared tools once and broadcast results to all agents
    const sharedResults = await executeSharedTools(allToolCalls, (tc) =>
      executeTool(tc, workspaceId, { desktopEnabled, approvalMode })
    )

    // Convert shared results to tool result messages for each agent
    for (const ctx of agentContexts) {
      // Each agent gets its own message objects (unique IDs) but same content
      const agentToolCalls = allToolCalls.filter((tc) =>
        sharedResults.some((sr) => sr.name === tc.name && JSON.stringify(sr.arguments) === JSON.stringify(tc.arguments))
      )
      const agentResults = sharedResults
        .filter((sr) =>
          agentToolCalls.some(
            (tc) => sr.name === tc.name && JSON.stringify(sr.arguments) === JSON.stringify(tc.arguments)
          )
        )
        .map((sr) => ({
          toolCallId: agentToolCalls.find(
            (tc) => sr.name === tc.name && JSON.stringify(sr.arguments) === JSON.stringify(tc.arguments)
          )!.id,
          content: sr.content,
          isError: sr.isError
        }))

      const toolResultMessages = createToolResultMessages(agentToolCalls, agentResults, runId, ctx.agentId)
      ctx.messages.push(...toolResultMessages)

      // Notify frontend
      for (const toolResult of toolResultMessages) {
        callbacks.onAgentToolResult?.({
          runId,
          agentId: ctx.agentId,
          providerId: ctx.providerId,
          toolResult: {
            toolCallId: toolResult.toolCallId!,
            name: (toolResult.metadata?.toolName as string) || 'tool',
            content: toolResult.content,
            isError: !!toolResult.metadata?.isError
          }
        })
      }
    }
  }

  // Notify agent done for those that finished successfully
  for (const ctx of agentContexts) {
    if (ctx.status === 'done') {
      // Rough token estimate from content length (placeholder; providers can supply exact counts later)
      const outputTokens = Math.ceil((ctx.content?.length ?? 0) / 4)
      const inputTokens = Math.ceil(ctx.messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0) / 4)
      callbacks.onAgentDone?.({
        runId,
        agentId: ctx.agentId,
        providerId: ctx.providerId,
        latencyMs: ctx.latencyMs,
        inputTokens,
        outputTokens
      })
    }
  }

  if (isRunAborted(runId)) {
    completeRun(runId)
    return null
  }

  // Build AgentRun objects for arbitration
  const agentRuns: AgentRun[] = agentContexts.map((ctx) => ({
    runId,
    agentId: ctx.agentId,
    providerId: ctx.providerId,
    model: ctx.model,
    role: ctx.role,
    status: ctx.status,
    messages: ctx.messages,
    content: ctx.content,
    toolCalls: ctx.toolCalls,
    error: ctx.error,
    startedAt: Date.now(),
    finishedAt: Date.now()
  }))

  // Determine arbitrator provider
  let arbProviderId = arbitratorProviderId
  if (!arbProviderId || !providers.some((p) => p.id === arbProviderId && p.enabled)) {
    const fallback =
      providers.find((p) => p.enabled && !enabledProviderIds.includes(p.id)) ??
      providers.find((p) => p.id === enabledProviderIds[0])
    arbProviderId = fallback?.id
  }

  const arbConfig = providers.find((p) => p.id === arbProviderId)
  const arbApiKey = arbProviderId ? (apiKeys[arbProviderId] ?? '') : ''
  const arbProvider = arbConfig ? buildProvider(arbConfig, arbApiKey) : null

  // Get the last user message as the question for the judge
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
  const userQuestion = lastUserMessage?.content || 'No question provided.'

  let arbitrationResult: ArbitrationResult

  if (!arbProvider) {
    const fallback = agentRuns.find((r) => r.status === 'done' && r.content.trim().length > 0)
    arbitrationResult = {
      finalContent: fallback?.content || 'No valid answers were produced.',
      reason: fallback
        ? 'Arbitration provider unavailable; falling back to the first successful agent answer.'
        : 'No valid answers and no arbitration provider available.',
      confidence: fallback ? 0.5 : 0,
      sourceRuns: agentRuns,
      startedAt: Date.now(),
      finishedAt: Date.now()
    }
    callbacks.onArbitrationDone?.({ runId, result: arbitrationResult })
  } else {
    arbitrationResult = await arbitrate(agentRuns, userQuestion, arbProvider, controller.signal, {
      onToken: (token) => {
        callbacks.onArbitrationToken?.({ runId, token })
      },
      onDone: (result) => {
        callbacks.onArbitrationDone?.({ runId, result })
      },
      onError: (error) => {
        callbacks.onError?.({ runId, error })
      }
    })
  }

  completeRun(runId)
  callbacks.onEnsembleDone?.({ runId, threadId, workspaceId })
  return arbitrationResult
}

export function createRunId(): string {
  return `ens-${randomUUID()}`
}
