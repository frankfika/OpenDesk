import { memo } from 'react'
import type { Message } from '@shared/types'
import MessageActions from './MessageActions'
import { formatTime } from '../../lib/chat-utils'

interface MessageHeaderProps {
  message: Message
  isUser: boolean
  isAssistant: boolean
  isStreaming: boolean
  isEditing: boolean
  hideTimestamp?: boolean
  providerName?: string
  providerModel?: string
  onCopy: () => void
  onEdit?: () => void
  onDelete: () => void
  onRegenerate?: () => void
  onReplyTo: () => void
  onAddToFavorites: () => void
  onFork: () => void
}

function MessageHeader({
  message,
  isUser,
  isAssistant,
  isStreaming,
  isEditing,
  hideTimestamp,
  providerName,
  providerModel,
  onCopy,
  onEdit,
  onDelete,
  onRegenerate,
  onReplyTo,
  onAddToFavorites,
  onFork
}: MessageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
          {isUser ? 'You' : message.isArbitration ? 'Arbitrator' : providerName || 'Assistant'}
        </span>
        {!isUser && providerModel && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-muted)]">
            {providerModel}
          </span>
        )}
        {!hideTimestamp && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-[var(--text-muted)]">
            {formatTime(message.timestamp)}
          </span>
        )}
        {isAssistant && message.content.length > 0 && !isStreaming && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[var(--text-muted)] font-mono">
            ~{Math.ceil(message.content.length / 4).toLocaleString()} tokens
          </span>
        )}
      </div>
      {!isEditing && (
        <MessageActions
          message={message}
          onCopy={onCopy}
          onCopyMarkdown={onCopy}
          onRegenerate={isAssistant ? onRegenerate : undefined}
          onEdit={isUser ? onEdit : undefined}
          onDelete={onDelete}
          onReplyTo={onReplyTo}
          onAddToFavorites={onAddToFavorites}
          onFork={onFork}
        />
      )}
    </div>
  )
}

export default memo(MessageHeader)
