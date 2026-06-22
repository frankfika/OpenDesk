import { AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../store/chat'
import { useToast } from '../../store/toast'
import ChatHeader from './ChatHeader'
import EmptyChatState from './EmptyChatState'
import MessageList from './MessageList'
import InputBar from './InputBar'
import AgentActivityBar from './AgentActivityBar'
import ArtifactPanel from '../artifacts/ArtifactPanel'
import FileEditorPanel from '../files/FileEditorPanel'

interface ChatPanelProps {
  onOpenSettings: () => void
  onOpenMemory?: () => void
  onOpenSkills?: () => void
}

export default function ChatPanel({
  onOpenSettings,
  onOpenMemory,
  onOpenSkills
}: ChatPanelProps) {
  const messages = useChatStore((state) => state.messages)
  const streaming = useChatStore((state) => state.streaming)
  const clearMessages = useChatStore((state) => state.clearMessages)
  const toast = useToast()

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      <ChatHeader
        onOpenSettings={onOpenSettings}
        onOpenMemory={onOpenMemory}
        onOpenSkills={onOpenSkills}
      />

      {/* Main content: Chat + Artifacts + FileEditor */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
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

        {/* File editor */}
        <FileEditorPanel />

        {/* Artifacts panel */}
        <ArtifactPanel />
      </div>
    </div>
  )
}
