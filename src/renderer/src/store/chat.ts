import { create } from 'zustand'
import type { Message, FileAttachment, ChatSendPayload } from '@shared/types'
import { useSettingsStore } from './settings'

interface ChatState {
  messages: Message[]
  streaming: boolean
  error: string | null
  errorType: 'auth' | 'network' | 'model' | 'provider' | 'workspace' | 'ollama' | 'generic' | null
  threadId: string | null
  attachments: FileAttachment[]

  // Message actions
  addMessage: (msg: Message) => void
  appendToken: (token: string) => void
  addToolCall: (toolCall: { id: string; name: string; arguments: Record<string, unknown> }) => void
  addToolResult: (result: { toolCallId: string; content: string; isError?: boolean }) => void
  setStreaming: (v: boolean) => void
  setError: (e: string | null, type?: ChatState['errorType']) => void
  clearMessages: () => void

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

  addMessage: (msg) => {
    set(s => {
      const messages = [...s.messages, msg]
      if (s.threadId) debouncedSave(s.threadId, messages)
      return { messages }
    })
  },

  addToolCall: (toolCall) => {
    set(s => {
      const messages = [...s.messages, {
        id: genId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        kind: 'tool_call',
        metadata: { toolName: toolCall.name, params: toolCall.arguments }
      }]
      if (s.threadId) debouncedSave(s.threadId, messages)
      return { messages }
    })
  },

  addToolResult: (result) => {
    set(s => {
      const messages = [...s.messages, {
        id: genId(),
        role: 'tool',
        content: result.content,
        timestamp: Date.now(),
        kind: 'tool_result',
        toolCallId: result.toolCallId,
        metadata: { isError: result.isError }
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
      set({ threadId, messages: messages ?? [], error: null, errorType: null, streaming: false })
    } catch (e) {
      console.error('Failed to load thread messages:', e)
      set({ threadId, messages: [], error: null, errorType: null, streaming: false })
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
      set({ messages: [], threadId: null, error: null, errorType: null, streaming: false })
    }
  },

  newThread: () => {
    const currentThreadId = get().threadId
    if (currentThreadId) {
      get().saveThread().catch(console.error)
    }
    set({ messages: [], threadId: null, error: null, errorType: null, streaming: false, attachments: [] })
  },

  regenerateLast: () => {
    const { messages, threadId } = get()
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
    const { messages, threadId } = get()
    const index = messages.findIndex(m => m.id === messageId)
    if (index === -1) return

    const editedMessage: Message = {
      ...messages[index],
      content: newContent,
      timestamp: Date.now()
    }
    const newMessages = [...messages.slice(0, index), editedMessage]
    set({ messages: newMessages, streaming: true, error: null, errorType: null })

    if (threadId && window.api?.chat?.editMessage) {
      window.api.chat.editMessage(threadId, messageId, newContent)
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

  clearAttachments: () => set({ attachments: [] })
}))
