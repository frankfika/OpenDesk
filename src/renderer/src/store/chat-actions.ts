import type { ChatMode } from '@shared/types'

interface ChatStoreLike {
  getState: () => {
    switchThread: (threadId: string | null) => void
    setMode: (mode: ChatMode) => void
  }
}

let chatStore: ChatStoreLike | null = null

export function registerChatStore(store: ChatStoreLike): void {
  chatStore = store
}

function getChatActions() {
  return chatStore?.getState()
}

export function switchThread(threadId: string | null): void {
  getChatActions()?.switchThread(threadId)
}

export function setMode(mode: ChatMode): void {
  getChatActions()?.setMode(mode)
}
