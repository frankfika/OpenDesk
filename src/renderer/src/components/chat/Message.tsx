import { useState, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '@shared/types'
import StreamCursor from './StreamCursor'
import MessageActions from './MessageActions'
import CodeBlock from './CodeBlock'
import { Bot, User, ChevronDown, ChevronRight, Wrench, AlertCircle, Brain, Copy, Pencil, Trash2, RotateCcw, Reply, Star } from 'lucide-react'
import { useChatStore } from '../../store/chat'
import { useSettingsStore } from '../../store/settings'
import { useArtifactsStore, type ArtifactType } from '../../store/artifacts'
import * as ContextMenu from '@radix-ui/react-context-menu'

interface MessageProps {
  message: Message
  isStreaming?: boolean
  showDateDivider?: boolean
  dateLabel?: string
  hideTimestamp?: boolean
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return 'Today'
  if (isYesterday) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

function getProviderColor(providerType?: string): string {
  switch (providerType) {
    case 'openai': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
    case 'anthropic': return 'bg-orange-500/10 text-orange-600 border-orange-200'
    case 'ollama': return 'bg-violet-500/10 text-violet-600 border-violet-200'
    default: return 'bg-[var(--accent)] text-white'
  }
}

function getProviderIcon(providerType?: string) {
  switch (providerType) {
    case 'openai': return <Bot size={16} className="text-emerald-600" />
    case 'anthropic': return <Bot size={16} className="text-orange-600" />
    case 'ollama': return <Bot size={16} className="text-violet-600" />
    default: return <Bot size={16} />
  }
}

/** Map code-block language to artifact type */
function detectArtifactType(language: string): ArtifactType | null {
  switch (language.toLowerCase()) {
    case 'html': return 'html'
    case 'mermaid': return 'mermaid'
    case 'svg': return 'svg'
    case 'tsx':
    case 'jsx': return 'react'
    case 'md':
    case 'markdown': return 'markdown'
    default: return null
  }
}

function artifactTitleFromLang(language: string): string {
  switch (language.toLowerCase()) {
    case 'html': return 'HTML Preview'
    case 'mermaid': return 'Diagram'
    case 'svg': return 'SVG Image'
    case 'tsx': return 'React Component'
    case 'jsx': return 'React Component'
    case 'md': return 'Markdown Doc'
    case 'markdown': return 'Markdown Doc'
    default: return 'Code Artifact'
  }
}

export default function MessageRow({ message, isStreaming, showDateDivider, dateLabel, hideTimestamp }: MessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const [expanded, setExpanded] = useState(true)
  const [showTimeTooltip, setShowTimeTooltip] = useState(false)
  const { editMessage, deleteMessage, regenerateLast } = useChatStore()
  const { activeProvider } = useSettingsStore()
  const { addArtifact } = useArtifactsStore()
  const provider = activeProvider()

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).catch(console.error)
  }, [message.content])

  const handleCopyMarkdown = useCallback(() => {
    navigator.clipboard.writeText(message.content).catch(console.error)
  }, [message.content])

  const handleEdit = useCallback(() => {
    const newContent = prompt('Edit message:', message.content)
    if (newContent !== null && newContent.trim()) {
      editMessage(message.id, newContent.trim())
    }
  }, [message.content, message.id, editMessage])

  const handleDelete = useCallback(() => {
    deleteMessage(message.id)
  }, [message.id, deleteMessage])

  const handleRegenerate = useCallback(() => {
    regenerateLast()
  }, [regenerateLast])

  const handleReplyTo = useCallback(() => {
    // Create a sub-thread or quote this message
    // In a real app, this would create a new thread referencing this message
    console.log('Reply to message:', message.id)
  }, [message.id])

  const handleAddToFavorites = useCallback(() => {
    // In a real app, would add to favorites store
    console.log('Add to favorites:', message.id)
  }, [message.id])

  // Reasoning / Thinking message
  if (message.kind === 'reasoning') {
    return (
      <div className="flex gap-5 py-3 w-full group">
        <div className={`flex items-center justify-center shrink-0 rounded-lg text-xs font-semibold w-8 h-8 ${getProviderColor(provider?.type)}`}>
          <Brain size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-1"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Thinking…
          </button>
          {expanded && (
            <div className="bg-[var(--bg-sidebar)]/60 border border-[var(--border)] rounded-lg p-3 font-mono text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Tool call message
  if (message.kind === 'tool_call') {
    const toolName = message.metadata?.toolName as string || 'tool'
    const params = message.metadata?.params as Record<string, unknown> || {}
    return (
      <div className="flex gap-5 py-3 w-full group">
        <div className="flex items-center justify-center shrink-0 rounded-lg text-xs font-semibold w-8 h-8 bg-blue-500/10 text-blue-600 border border-blue-200">
          <Wrench size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-1"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Tool call: {toolName}
          </button>
          {expanded && (
            <div className="bg-[var(--bg-sidebar)]/60 border border-[var(--border)] rounded-lg p-3 font-mono text-[12px] text-[var(--text-secondary)] leading-relaxed overflow-x-auto">
              <pre className="!bg-transparent !border-0 !p-0 !m-0"><code>{JSON.stringify(params, null, 2)}</code></pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Tool result message
  if (message.kind === 'tool_result') {
    return (
      <div className="flex gap-5 py-2 w-full group">
        <div className="flex items-center justify-center shrink-0 rounded-lg text-xs font-semibold w-8 h-8 bg-green-500/10 text-green-600 border border-green-200">
          <Wrench size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-[var(--text-secondary)] mb-1">Tool result</div>
          <div className="bg-[var(--bg-sidebar)]/40 border border-[var(--border)] rounded-lg p-3 text-[13px] text-[var(--text-secondary)] leading-relaxed">
            {message.content.length > 200 ? message.content.slice(0, 200) + '…' : message.content}
          </div>
        </div>
      </div>
    )
  }

  // Error message
  if (message.kind === 'error') {
    return (
      <div className="flex gap-5 py-3 w-full group">
        <div className="flex items-center justify-center shrink-0 rounded-lg text-xs font-semibold w-8 h-8 bg-red-500/10 text-red-600 border border-red-200">
          <AlertCircle size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-red-600 mb-1">Error</div>
          <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-[13px] text-red-700 dark:text-red-400 leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  // Normal user / assistant message
  const avatarClass = isUser
    ? "bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] shadow-sm"
    : getProviderColor(provider?.type)

  const components = useMemo(() => ({
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''
      const codeString = String(children).replace(/\n$/, '')
      const artType = detectArtifactType(language)

      if (!inline) {
        return (
          <CodeBlock
            code={codeString}
            language={language}
            onPreview={artType ? () => {
              addArtifact({
                type: artType,
                title: artifactTitleFromLang(language),
                content: codeString
              })
            } : undefined}
          />
        )
      }
      return <code className={className} {...props}>{children}</code>
    },
    pre({ children }: any) {
      return <>{children}</>
    }
  }), [addArtifact])

  return (
    <>
      {showDateDivider && dateLabel && (
        <div className="flex items-center gap-3 py-4">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-[11px] text-[var(--text-muted)] font-medium">{dateLabel}</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>
      )}
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div className="flex gap-5 py-5 w-full group relative">
            <div className={`flex items-center justify-center shrink-0 rounded-lg text-xs font-semibold w-8 h-8 ${avatarClass}`}>
              {isUser ? <User size={16} /> : getProviderIcon(provider?.type)}
            </div>

            <div className="flex-1 min-w-0 selectable text-[var(--text-primary)] mt-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {isUser ? 'You' : provider?.name || 'OpenDesk'}
                  </span>
                  <span
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[var(--text-muted)] cursor-help"
                    onMouseEnter={() => setShowTimeTooltip(true)}
                    onMouseLeave={() => setShowTimeTooltip(false)}
                  >
                    {formatTime(message.timestamp)}
                  </span>
                  {showTimeTooltip && (
                    <div className="absolute z-50 px-2 py-1 rounded-md bg-[var(--bg-sidebar)] border border-[var(--border)] shadow-lg text-[10px] text-[var(--text-muted)] -mt-8 ml-16">
                      {new Date(message.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
                <MessageActions
                  message={message}
                  onCopy={handleCopy}
                  onCopyMarkdown={handleCopyMarkdown}
                  onRegenerate={isAssistant ? handleRegenerate : undefined}
                  onEdit={isUser ? handleEdit : undefined}
                  onDelete={handleDelete}
                  onReplyTo={handleReplyTo}
                  onAddToFavorites={handleAddToFavorites}
                />
              </div>

              <div className="prose-od text-[15px] leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                  {message.content}
                </ReactMarkdown>
                {isStreaming && <StreamCursor />}
              </div>
            </div>
          </div>
        </ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content
            className="min-w-[180px] rounded-xl bg-[var(--bg-content)] border border-[var(--border)] shadow-xl z-50 py-1"
           
           
          >
            <ContextMenu.Item
              onSelect={handleCopy}
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] outline-none cursor-pointer transition-colors"
            >
              <Copy size={14} className="text-[var(--text-muted)]" />
              Copy
            </ContextMenu.Item>
            {isUser && (
              <ContextMenu.Item
                onSelect={handleEdit}
                className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] outline-none cursor-pointer transition-colors"
              >
                <Pencil size={14} className="text-[var(--text-muted)]" />
                Edit
              </ContextMenu.Item>
            )}
            {isAssistant && (
              <ContextMenu.Item
                onSelect={handleRegenerate}
                className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] outline-none cursor-pointer transition-colors"
              >
                <RotateCcw size={14} className="text-[var(--text-muted)]" />
                Regenerate
              </ContextMenu.Item>
            )}
            <ContextMenu.Separator className="h-px bg-[var(--border)] my-1" />
            <ContextMenu.Item
              onSelect={handleDelete}
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 outline-none cursor-pointer transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </>
  )
}
