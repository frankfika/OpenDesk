import { create } from 'zustand'
import type { Message, FileAttachment, ChatSendPayload, ArbitrationResult } from '@shared/types'
import { useSettingsStore } from './settings'

export interface AgentStream {
  agentId: string
  providerId: string
  model?: string
  status: 'running' | 'done' | 'error'
  messages: Message[]
  error?: string
  startedAt?: number
  finishedAt?: number
  latencyMs?: number
  inputTokens?: number
  outputTokens?: number
  estimatedCostUsd?: number
}

export interface EnsembleRunState {
  runId: string
  status: 'running' | 'arbitrating' | 'done' | 'error'
  agents: Record<string, AgentStream>
  arbitratorProviderId?: string
  arbitrationMessageId?: string
  error?: string
}

interface ChatState {
  messages: Message[]
  streaming: boolean
  error: string | null
  errorType: 'auth' | 'network' | 'model' | 'provider' | 'workspace' | 'ollama' | 'generic' | null
  threadId: string | null
  attachments: FileAttachment[]

  // Ensemble state
  ensembleMode: boolean
  ensembleRuns: Record<string, EnsembleRunState>
  activeRunId: string | null

  // Message actions
  addMessage: (msg: Message) => void
  appendToken: (token: string) => void
  addToolCall: (toolCall: { id: string; name: string; arguments: Record<string, unknown> }) => void
  addToolResult: (result: { toolCallId: string; content: string; isError?: boolean }) => void
  setStreaming: (v: boolean) => void
  setError: (e: string | null, type?: ChatState['errorType']) => void
  clearMessages: () => void

  // Ensemble actions
  setEnsembleMode: (v: boolean) => void
  startEnsembleRun: (runId: string, providerIds: string[], arbitratorProviderId?: string) => void
  appendAgentToken: (runId: string, agentId: string, providerId: string, token: string) => void
  setAgentRunStatus: (runId: string, agentId: string, status: AgentStream['status'], error?: string) => void
  setAgentMetrics: (runId: string, agentId: string, metrics: { latencyMs?: number; inputTokens?: number; outputTokens?: number; startedAt?: number; finishedAt?: number }) => void
  addAgentToolCall: (runId: string, agentId: string, toolCall: { id: string; name: string; arguments: Record<string, unknown> }) => void
  addAgentToolResult: (runId: string, agentId: string, toolResult: { toolCallId: string; name: string; content: string; isError?: boolean }) => void
  startArbitration: (runId: string) => void
  appendArbitrationToken: (runId: string, token: string) => void
  finalizeArbitration: (runId: string, result: ArbitrationResult) => void
  completeEnsembleRun: (runId: string) => void

  // Thread management
  loadThread: (threadId: string) => Promise<void>
  saveThread: () => Promise<void>
  switchThread: (threadId: string | null) => void
  newThread: () => void

  // Message operations
  regenerateLast: () => void
  editMessage: (messageId: string, newContent: string) => void
  deleteMessage: (messageId: string) => void

  // Attachments
  addAttachment: (file: FileAttachment) => void
  removeAttachment: (id: string) => void
  clearAttachments: () => void
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Debounced save helper
let saveTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSave(threadId: string, messages: Message[]) {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    if (window.api?.thread?.saveMessages) {
      window.api.thread.saveMessages(threadId, messages).catch(console.error)
    }
  }, 600)
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  streaming: false,
  error: null,
  errorType: null,
  threadId: null,
  attachments: [],

  // Ensemble initial state
  ensembleMode: false,
  ensembleRuns: {},
  activeRunId: null,

  addMessage: (msg) => {
    set(s => {
      const messages = [...s.messages, msg]
      if (s.threadId) debouncedSave(s.threadId, messages)
      return { messages }
    })
  },

  addToolCall: (toolCall) => {
    set(s => {
      const messages: Message[] = [...s.messages, {
        id: genId(),
        role: 'assistant' as const,
        content: '',
        timestamp: Date.now(),
        kind: 'tool_call' as const,
        metadata: { toolName: toolCall.name, params: toolCall.arguments }
      }]
      if (s.threadId) debouncedSave(s.threadId, messages)
      return { messages }
    })
  },

  addToolResult: (result) => {
    set(s => {
      // Find the matching tool_call to get the toolName
      const matchingCall = [...s.messages].reverse().find(
        m => m.kind === 'tool_call' && (m.metadata?.toolCallId === result.toolCallId || !result.toolCallId)
      )
      const toolName = (matchingCall?.metadata?.toolName as string) || (result as any).toolName || 'tool'
      const messages: Message[] = [...s.messages, {
        id: genId(),
        role: 'tool' as const,
        content: result.content,
        timestamp: Date.now(),
        kind: 'tool_result' as const,
        toolCallId: result.toolCallId,
        metadata: { isError: result.isError, toolName }
      }]
      if (s.threadId) debouncedSave(s.threadId, messages)
      return { messages }
    })
  },

  appendToken: (token) => {
    set(s => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + token }
      } else {
        msgs.push({
          id: genId(),
          role: 'assistant',
          content: token,
          timestamp: Date.now(),
          kind: 'assistant_message'
        })
      }
      if (s.threadId) debouncedSave(s.threadId, msgs)
      return { messages: msgs }
    })
  },

  setStreaming: (streaming) => set({ streaming }),
  setError: (error, errorType) => set({ error, errorType: errorType ?? null }),

  clearMessages: () => set({ messages: [] }),

  loadThread: async (threadId) => {
    try {
      if (!window.api?.thread?.loadMessages) {
        set({ threadId, messages: [] })
        return
      }
      const messages = await window.api.thread.loadMessages(threadId)
      set({
        threadId,
        messages: messages ?? [],
        error: null,
        errorType: null,
        streaming: false,
        ensembleRuns: {},
        activeRunId: null,
        ensembleMode: false
      })
    } catch (e) {
      console.error('Failed to load thread messages:', e)
      set({ threadId, messages: [], error: null, errorType: null, streaming: false, ensembleRuns: {}, activeRunId: null, ensembleMode: false })
    }
  },

  saveThread: async () => {
    const { threadId, messages } = get()
    if (!threadId) return
    try {
      if (!window.api?.thread?.saveMessages) return
      await window.api.thread.saveMessages(threadId, messages)
    } catch (e) {
      console.error('Failed to save thread messages:', e)
    }
  },

  switchThread: async (threadId) => {
    const currentThreadId = get().threadId
    // Save current thread before switching
    if (currentThreadId && currentThreadId !== threadId) {
      await get().saveThread()
    }
    if (threadId) {
      await get().loadThread(threadId)
    } else {
      set({ messages: [], threadId: null, error: null, errorType: null, streaming: false, ensembleRuns: {}, activeRunId: null })
    }
  },

  newThread: () => {
    const currentThreadId = get().threadId
    if (currentThreadId) {
      get().saveThread().catch(console.error)
    }
    set({
      messages: [],
      threadId: null,
      error: null,
      errorType: null,
      streaming: false,
      attachments: [],
      ensembleRuns: {},
      activeRunId: null
    })
  },

  regenerateLast: () => {
    const { messages, threadId, ensembleMode } = get()
    // Find last assistant message
    let lastAssistantIndex = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        lastAssistantIndex = i
        break
      }
    }
    if (lastAssistantIndex === -1) return

    const newMessages = messages.slice(0, lastAssistantIndex)
    set({ messages: newMessages, streaming: true, error: null, errorType: null })

    if (threadId && window.api?.chat?.regenerate) {
      const settings = useSettingsStore.getState()
      if (ensembleMode) {
        const providerIds = settings.ensembleProviders().map(p => p.id)
        const arbitrator = settings.arbitratorProvider()
        if (providerIds.length > 0) {
          window.api.chat.regenerate({
            messages: newMessages,
            providerIds,
            arbitratorProviderId: arbitrator?.id,
            mode: 'ensemble',
            threadId
          })
          return
        }
      }
      const provider = settings.activeProvider()
      if (!provider) return
      const payload: ChatSendPayload = {
        messages: newMessages,
        providerId: provider.id,
        threadId
      }
      window.api.chat.regenerate(payload)
    }
  },

  editMessage: (messageId, newContent) => {
    const { messages, threadId, ensembleMode } = get()
    const index = messages.findIndex(m => m.id === messageId)
    if (index === -1) return

    const editedMessage: Message = {
      ...messages[index],
      content: newContent,
      timestamp: Date.now()
    }
    const newMessages = [...messages.slice(0, index), editedMessage]
    set({ messages: newMessages, streaming: true, error: null, errorType: null })

    if (threadId && window.api?.chat?.send) {
      // Re-send from the edit point — use send with the truncated messages
      const settings = useSettingsStore.getState()
      if (ensembleMode) {
        const providerIds = settings.ensembleProviders().map(p => p.id)
        const arbitrator = settings.arbitratorProvider()
        if (providerIds.length > 0) {
          window.api.chat.send({
            messages: newMessages,
            providerIds,
            arbitratorProviderId: arbitrator?.id,
            mode: 'ensemble',
            threadId
          })
          return
        }
      }
      const provider = settings.activeProvider()
      if (provider) {
        window.api.chat.send({ messages: newMessages, providerId: provider.id, threadId })
      }
    }
  },

  deleteMessage: (messageId) => {
    set(s => {
      const messages = s.messages.filter(m => m.id !== messageId)
      if (s.threadId) debouncedSave(s.threadId, messages)
      return { messages }
    })
  },

  addAttachment: (file) =>
    set(s => ({ attachments: [...s.attachments, file] })),

  removeAttachment: (id) =>
    set(s => ({ attachments: s.attachments.filter(a => a.id !== id) })),

  clearAttachments: () => set({ attachments: [] }),

  // Ensemble actions
  setEnsembleMode: (v) => set({ ensembleMode: v }),

  startEnsembleRun: (runId, providerIds, arbitratorProviderId) => {
    const agents: Record<string, AgentStream> = {}
    for (let i = 0; i < providerIds.length; i++) {
      const providerId = providerIds[i]
      const agentId = `agent-${i}`
      agents[agentId] = {
        agentId,
        providerId,
        status: 'running',
        messages: []
      }
    }
    set(s => ({
      streaming: true,
      error: null,
      errorType: null,
      activeRunId: runId,
      ensembleRuns: {
        ...s.ensembleRuns,
        [runId]: {
          runId,
          status: 'running',
          agents,
          arbitratorProviderId
        }
      }
    }))
  },

  appendAgentToken: (runId, agentId, providerId, token) => {
    set(s => {
      const run = s.ensembleRuns[runId]
      if (!run) return s
      const agent = run.agents[agentId]
      if (!agent) return s

      const msgs = [...agent.messages]
      const last = msgs[msgs.length - 1]
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + token }
      } else {
        msgs.push({
          id: genId(),
          role: 'assistant',
          content: token,
          timestamp: Date.now(),
          kind: 'assistant_message',
          sourceProviderId: providerId,
          agentId,
          runId
        })
      }

      return {
        ensembleRuns: {
          ...s.ensembleRuns,
          [runId]: {
            ...run,
            agents: {
              ...run.agents,
              [agentId]: { ...agent, messages: msgs }
            }
          }
        }
      }
    })
  },

  setAgentRunStatus: (runId, agentId, status, error) => {
    set(s => {
      const run = s.ensembleRuns[runId]
      if (!run) return s
      const agent = run.agents[agentId]
      if (!agent) return s
      return {
        ensembleRuns: {
          ...s.ensembleRuns,
          [runId]: {
            ...run,
            agents: {
              ...run.agents,
              [agentId]: { ...agent, status, error }
            }
          }
        }
      }
    })
  },

  setAgentMetrics: (runId, agentId, metrics) => {
    set(s => {
      const run = s.ensembleRuns[runId]
      if (!run) return s
      const agent = run.agents[agentId]
      if (!agent) return s
      const inputTokens = metrics.inputTokens ?? agent.inputTokens ?? 0
      const outputTokens = metrics.outputTokens ?? agent.outputTokens ?? 0
      // Rough cost estimate: $3 per 1M input tokens, $15 per 1M output tokens (blended)
      const estimatedCostUsd = (inputTokens * 3 + outputTokens * 15) / 1_000_000
      return {
        ensembleRuns: {
          ...s.ensembleRuns,
          [runId]: {
            ...run,
            agents: {
              ...run.agents,
              [agentId]: {
                ...agent,
                startedAt: metrics.startedAt ?? agent.startedAt,
                finishedAt: metrics.finishedAt ?? (metrics.latencyMs && agent.startedAt ? agent.startedAt + metrics.latencyMs : agent.finishedAt),
                latencyMs: metrics.latencyMs ?? agent.latencyMs,
                inputTokens,
                outputTokens,
                estimatedCostUsd
              }
            }
          }
        }
      }
    })
  },

  addAgentToolCall: (runId, agentId, toolCall) => {
    set(s => {
      const run = s.ensembleRuns[runId]
      if (!run) return s
      const agent = run.agents[agentId]
      if (!agent) return s
      const msgs: Message[] = [...agent.messages, {
        id: genId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        kind: 'tool_call',
        agentId,
        runId,
        metadata: { toolName: toolCall.name, params: toolCall.arguments, toolCallId: toolCall.id }
      }]
      return {
        ensembleRuns: {
          ...s.ensembleRuns,
          [runId]: {
            ...run,
            agents: { ...run.agents, [agentId]: { ...agent, messages: msgs } }
          }
        }
      }
    })
  },

  addAgentToolResult: (runId, agentId, toolResult) => {
    set(s => {
      const run = s.ensembleRuns[runId]
      if (!run) return s
      const agent = run.agents[agentId]
      if (!agent) return s
      const msgs: Message[] = [...agent.messages, {
        id: genId(),
        role: 'tool',
        content: toolResult.content,
        timestamp: Date.now(),
        kind: 'tool_result',
        toolCallId: toolResult.toolCallId,
        agentId,
        runId,
        metadata: { toolName: toolResult.name, isError: toolResult.isError }
      }]
      return {
        ensembleRuns: {
          ...s.ensembleRuns,
          [runId]: {
            ...run,
            agents: { ...run.agents, [agentId]: { ...agent, messages: msgs } }
          }
        }
      }
    })
  },

  startArbitration: (runId) => {
    set(s => {
      const run = s.ensembleRuns[runId]
      if (!run) return s

      const arbitrationMessage: Message = {
        id: genId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        kind: 'assistant_message',
        sourceProviderId: run.arbitratorProviderId,
        agentId: 'arbiter',
        runId,
        isArbitration: true
      }

      const messages = [...s.messages, arbitrationMessage]
      if (s.threadId) debouncedSave(s.threadId, messages)

      return {
        messages,
        ensembleRuns: {
          ...s.ensembleRuns,
          [runId]: { ...run, status: 'arbitrating', arbitrationMessageId: arbitrationMessage.id }
        }
      }
    })
  },

  appendArbitrationToken: (runId, token) => {
    set(s => {
      const run = s.ensembleRuns[runId]
      if (!run || !run.arbitrationMessageId) return s
      const idx = s.messages.findIndex(m => m.id === run.arbitrationMessageId)
      if (idx === -1) return s

      const messages = [...s.messages]
      messages[idx] = { ...messages[idx], content: messages[idx].content + token }
      if (s.threadId) debouncedSave(s.threadId, messages)
      return { messages }
    })
  },

  finalizeArbitration: (runId, result) => {
    set(s => {
      const run = s.ensembleRuns[runId]
      if (!run || !run.arbitrationMessageId) return s
      const idx = s.messages.findIndex(m => m.id === run.arbitrationMessageId)
      if (idx === -1) return s

      const messages = [...s.messages]
      messages[idx] = {
        ...messages[idx],
        content: result.finalContent || messages[idx].content,
        isArbitration: true,
        arbitrationReason: result.reason,
        arbitrationConfidence: result.confidence
      }
      if (s.threadId) debouncedSave(s.threadId, messages)

      return {
        messages,
        ensembleRuns: {
          ...s.ensembleRuns,
          [runId]: { ...run, status: 'done' }
        }
      }
    })
  },

  completeEnsembleRun: (runId) => {
    set(s => {
      const run = s.ensembleRuns[runId]
      if (!run) return s
      return {
        streaming: false,
        activeRunId: null,
        ensembleRuns: {
          ...s.ensembleRuns,
          [runId]: { ...run, status: run.status === 'arbitrating' ? 'done' : run.status }
        }
      }
    })
  }
}))
