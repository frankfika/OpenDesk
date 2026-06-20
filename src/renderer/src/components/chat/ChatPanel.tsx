import { AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../store/chat'
import { useToast } from '../../store/toast'
import ChatHeader from './ChatHeader'
import ChatStatusBar from './ChatStatusBar'
import EmptyChatState from './EmptyChatState'
import MessageList from './MessageList'
import InputBar from './InputBar'
import AgentActivityBar from './AgentActivityBar'
import ArtifactPanel from '../artifacts/ArtifactPanel'

interface ChatPanelProps {
  onOpenSettings: () => void
  onOpenFiles?: () => void
}

export default function ChatPanel({ onOpenSettings, onOpenFiles }: ChatPanelProps) {
  const messages = useChatStore((state) => state.messages)
  const streaming = useChatStore((state) => state.streaming)
  const clearMessages = useChatStore((state) => state.clearMessages)
  const toast = useToast()

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      <ChatHeader onOpenSettings={onOpenSettings} onOpenFiles={onOpenFiles} />
      <ChatStatusBar onOpenSettings={onOpenSettings} />

      {/* Main content: Chat + Artifacts */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Message list */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {messages.length === 0 ? (
            <EmptyChatState onOpenSettings={onOpenSettings} />
          ) : (
            <MessageList messages={messages} streaming={streaming} />
          )}

          <AnimatePresence>
            <AgentActivityBar />
          </AnimatePresence>

          <InputBar
            onOpenSettings={onOpenSettings}
            onClearChat={clearMessages}
            onWebSearch={(query) => {
              toast.info(`Web search: ${query}`)
            }}
          />
        </div>

        {/* Artifacts panel */}
        <ArtifactPanel />
      </div>
    </div>
  )
}
