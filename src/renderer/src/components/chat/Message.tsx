import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message, Thread, ProviderConfig } from '@shared/types'
import StreamCursor from './StreamCursor'
import MessageActions from './MessageActions'
import CodeBlock from './CodeBlock'
import {
  Bot, User, ChevronDown, ChevronRight, Wrench, AlertCircle, Brain,
  Copy, Pencil, Trash2, RotateCcw, FileText, FolderOpen, Terminal,
  CheckCircle, XCircle, Clock, Scale, Users
} from 'lucide-react'
import { useChatStore } from '../../store/chat'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
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

function getProviderColor(providerType?: string): string {
  switch (providerType) {
    case 'openai': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
    case 'anthropic': return 'bg-orange-500/10 text-orange-600 border-orange-200'
    case 'ollama': return 'bg-violet-500/10 text-violet-600 border-violet-200'
    default: return 'bg-[var(--accent)] text-white border-transparent'
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
    case 'tsx': case 'jsx': return 'React Component'
    case 'md': case 'markdown': return 'Markdown Doc'
    default: return 'Code Artifact'
  }
}

// ─── Context-aware tool call card ───────────────────────────────────────────

function ToolCallCard({ toolName, args, isResult, content, isError }: {
  toolName: string
  args?: Record<string, unknown>
  isResult?: boolean
  content?: string
  isError?: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  // Decode the tool into a readable summary
  const { icon, label, summary, detail, color } = useMemo(() => {
    const a = args || {}
    switch (toolName) {
      case 'file_read':
      case 'read_file': {
        const path = (a.path || a.file_path || '') as string
        const short = path.split('/').pop() || path
        return {
          icon: <FileText size={13} />,
          label: 'Read file',
          summary: short,
          detail: path,
          color: 'text-blue-600 bg-blue-500/8 border-blue-200/60'
        }
      }
      case 'file_write':
      case 'write_file': {
        const path = (a.path || a.file_path || '') as string
        const short = path.split('/').pop() || path
        return {
          icon: <Pencil size={13} />,
          label: 'Write file',
          summary: short,
          detail: path,
          color: 'text-amber-600 bg-amber-500/8 border-amber-200/60'
        }
      }
      case 'file_list':
      case 'list_directory': {
        const path = (a.path || a.directory || '') as string
        const short = path.split('/').pop() || path || '.'
        return {
          icon: <FolderOpen size={13} />,
          label: 'List directory',
          summary: short,
          detail: path,
          color: 'text-indigo-600 bg-indigo-500/8 border-indigo-200/60'
        }
      }
      case 'shell':
      case 'bash':
      case 'run_command': {
        const cmd = (a.command || a.cmd || '') as string
        const short = cmd.slice(0, 60) + (cmd.length > 60 ? '…' : '')
        return {
          icon: <Terminal size={13} />,
          label: 'Shell',
          summary: short,
          detail: cmd,
          color: 'text-green-700 bg-green-500/8 border-green-200/60'
        }
      }
      case 'apply_patch': {
        const path = (a.path || '') as string
        const short = path.split('/').pop() || path
        return {
          icon: <CheckCircle size={13} />,
          label: 'Apply patch',
          summary: short,
          detail: path,
          color: 'text-teal-600 bg-teal-500/8 border-teal-200/60'
        }
      }
      default: {
        const argStr = Object.keys(a).map(k => `${k}=${JSON.stringify(a[k])?.slice(0, 40)}`).join(', ')
        return {
          icon: <Wrench size={13} />,
          label: toolName.replace(/_/g, ' '),
          summary: argStr || '…',
          detail: JSON.stringify(a, null, 2),
          color: 'text-[var(--text-secondary)] bg-[var(--bg-sidebar)] border-[var(--border)]'
        }
      }
    }
  }, [toolName, args])

  if (isResult) {
    const isDiff = content?.startsWith('---') || content?.startsWith('@@') || content?.startsWith('diff ')
    const isFileWrite = toolName === 'file_write' || toolName === 'write_file' || toolName === 'apply_patch'

    return (
      <div className={`my-1 rounded-lg border text-[12px] overflow-hidden ${isError ? 'bg-red-500/5 border-red-200/60' : 'bg-[var(--bg-sidebar)]/40 border-[var(--border)]'}`}>
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--border)]/30 transition-colors"
        >
          {isError
            ? <XCircle size={12} className="text-red-500 shrink-0" />
            : <CheckCircle size={12} className="text-green-500 shrink-0" />}
          <span className={`text-[11px] font-medium ${isError ? 'text-red-600' : 'text-[var(--text-muted)]'}`}>
            {isError ? 'Error' : isFileWrite ? 'Written' : 'Result'} · {toolName.replace(/_/g, ' ')}
          </span>
          {content && !expanded && (
            <span className="flex-1 min-w-0 truncate text-[var(--text-muted)] font-mono ml-1">
              {content.slice(0, 80)}
            </span>
          )}
          {content && (
            <ChevronRight size={12} className={`shrink-0 text-[var(--text-muted)] transition-transform ml-auto ${expanded ? 'rotate-90' : ''}`} />
          )}
        </button>
        {expanded && content && (
          isDiff ? (
            <div className="px-1 pb-2 max-h-[400px] overflow-y-auto">
              {content.split('\n').map((line, i) => {
                const cls = line.startsWith('+') && !line.startsWith('+++')
                  ? 'bg-green-500/10 text-green-800 dark:text-green-300'
                  : line.startsWith('-') && !line.startsWith('---')
                  ? 'bg-red-500/10 text-red-800 dark:text-red-300'
                  : line.startsWith('@@')
                  ? 'text-blue-600 font-semibold'
                  : 'text-[var(--text-muted)]'
                return (
                  <div key={i} className={`px-3 py-px font-mono text-[11px] leading-5 ${cls}`}>
                    {line || ' '}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className={`px-3 pb-3 font-mono text-[12px] whitespace-pre-wrap max-h-[300px] overflow-y-auto leading-relaxed ${isError ? 'text-red-700' : 'text-[var(--text-secondary)]'}`}>
              {content}
            </div>
          )
        )}
      </div>
    )
  }

  return (
    <div className={`my-1.5 rounded-lg border text-[12px] overflow-hidden ${color}`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:brightness-95 transition-all"
      >
        <Clock size={11} className="shrink-0 animate-pulse opacity-60" />
        <span className="shrink-0">{icon}</span>
        <span className="font-medium shrink-0">{label}</span>
        <span className="flex-1 min-w-0 truncate font-mono opacity-80">{summary}</span>
        {detail !== summary && (
          <ChevronRight size={12} className={`shrink-0 opacity-60 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        )}
      </button>
      {expanded && detail !== summary && (
        <div className="px-3 pb-3 font-mono text-[12px] opacity-80 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
          {detail}
        </div>
      )}
    </div>
  )
}

// ─── Inline user message editor ─────────────────────────────────────────────

function InlineEditor({ content, onSave, onCancel }: {
  content: string
  onSave: (v: string) => void
  onCancel: () => void
}) {
  const [val, setVal] = useState(content)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.setSelectionRange(val.length, val.length)
  }, [])

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = ref.current.scrollHeight + 'px'
  }, [val])

  return (
    <div className="flex-1 min-w-0">
      <textarea
        ref={ref}
        className="w-full resize-none bg-[var(--bg-sidebar)] border border-[var(--accent)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none leading-relaxed"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (val.trim()) onSave(val.trim()) }
          if (e.key === 'Escape') onCancel()
        }}
        rows={1}
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => { if (val.trim()) onSave(val.trim()) }}
          className="px-3 py-1 rounded-lg text-[12px] font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 rounded-lg text-[12px] font-medium bg-[var(--bg-sidebar)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
        >
          Cancel
        </button>
        <span className="text-[11px] text-[var(--text-muted)] self-center">⏎ save · Esc cancel</span>
      </div>
    </div>
  )
}

function AgentAnswersPanel({ runId, activeThread, settings, mdComponents }: {
  runId?: string
  activeThread: Thread | null
  settings: { providers: ProviderConfig[] }
  mdComponents: any
}) {
  const { ensembleRuns } = useChatStore()
  const [expanded, setExpanded] = useState(false)

  const activeAgents = runId ? ensembleRuns[runId]?.agents : undefined
  const items = activeAgents
    ? Object.values(activeAgents)
        .filter(a => a.messages.length > 0)
        .map(a => ({
          id: a.agentId,
          providerId: a.providerId,
          model: a.model,
          content: a.messages[a.messages.length - 1].content
        }))
    : (activeThread?.agentAnswers ?? []).map(a => ({
        id: a.agentId,
        providerId: a.providerId,
        model: a.model,
        content: a.content
      }))

  if (items.length === 0) return null

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <Users size={13} />
        Show agent answers ({items.length})
      </button>
      {expanded && (
        <div className="mt-2 flex flex-col gap-2">
          {items.map((item) => {
            const provider = settings.providers.find(p => p.id === item.providerId)
            const label = provider ? `${provider.name} · ${provider.model}` : item.providerId
            return (
              <div
                key={item.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-sidebar)]/30 p-3"
              >
                <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  {item.id.replace('agent-', 'Agent ')} · {label}
                </div>
                <div className="prose-od text-[13px] text-[var(--text-primary)]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {item.content}
                  </ReactMarkdown>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main MessageRow ─────────────────────────────────────────────────────────

export default function MessageRow({ message, isStreaming, showDateDivider, dateLabel, hideTimestamp }: MessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const [expanded, setExpanded] = useState(true)
  const [showTimeTooltip, setShowTimeTooltip] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const { editMessage, deleteMessage, regenerateLast } = useChatStore()
  const { activeProvider, settings } = useSettingsStore()
  const { activeThread: getActiveThread } = useWorkspaceStore()
  const activeThread = getActiveThread()
  const { addArtifact } = useArtifactsStore()
  const provider = message.sourceProviderId
    ? settings.providers.find(p => p.id === message.sourceProviderId)
    : activeProvider()

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).catch(console.error)
  }, [message.content])

  const handleEdit = useCallback(() => setIsEditing(true), [])

  const handleSaveEdit = useCallback((newContent: string) => {
    editMessage(message.id, newContent)
    setIsEditing(false)
  }, [message.id, editMessage])

  const handleDelete = useCallback(() => deleteMessage(message.id), [message.id, deleteMessage])
  const handleRegenerate = useCallback(() => regenerateLast(), [regenerateLast])

  const handleReplyTo = useCallback(() => {
    const quote = message.content.split('\n').slice(0, 3).map(l => '> ' + l).join('\n')
    window.dispatchEvent(new CustomEvent('opendesk:fill-input', {
      detail: { text: quote + '\n\n' }
    }))
  }, [message.content])

  const handleAddToFavorites = useCallback(() => {
    // Store in localStorage keyed list for now
    const favs = JSON.parse(localStorage.getItem('od:favorites') || '[]')
    if (!favs.find((f: any) => f.id === message.id)) {
      favs.push({ id: message.id, content: message.content, ts: Date.now() })
      localStorage.setItem('od:favorites', JSON.stringify(favs))
    }
  }, [message])

  // ── Reasoning ──
  if (message.kind === 'reasoning') {
    return (
      <div className="flex gap-5 py-2 w-full group">
        <div className={`flex items-center justify-center shrink-0 rounded-lg text-xs font-semibold w-8 h-8 border ${getProviderColor(provider?.type)}`}>
          <Brain size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors mb-1"
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span className="italic">Thinking…</span>
          </button>
          {expanded && (
            <div className="bg-[var(--bg-sidebar)]/50 border border-[var(--border)] rounded-lg px-3 py-2.5 font-mono text-[12px] text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {message.content}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Tool call ──
  if (message.kind === 'tool_call') {
    const toolName = (message.metadata?.toolName as string) || 'tool'
    const params = (message.metadata?.params as Record<string, unknown>) || {}
    return (
      <div className="pl-13 w-full">
        <ToolCallCard toolName={toolName} args={params} />
      </div>
    )
  }

  // ── Tool result ──
  if (message.kind === 'tool_result') {
    const toolName = (message.metadata?.toolName as string) || 'tool'
    const isError = !!(message.metadata?.isError)
    return (
      <div className="pl-13 w-full">
        <ToolCallCard toolName={toolName} isResult content={message.content} isError={isError} />
      </div>
    )
  }

  // ── Error ──
  if (message.kind === 'error') {
    return (
      <div className="flex gap-5 py-3 w-full">
        <div className="flex items-center justify-center shrink-0 rounded-lg w-8 h-8 bg-red-500/10 text-red-600 border border-red-200">
          <AlertCircle size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-red-600 mb-1">Error</div>
          <div className="bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2.5 text-[13px] text-red-700 dark:text-red-400 leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  // ── Normal user / assistant ──
  const avatarClass = isUser
    ? 'bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)]'
    : `border ${getProviderColor(provider?.type)}`

  const mdComponents = useMemo(() => ({
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const lang = match ? match[1] : ''
      const codeStr = String(children).replace(/\n$/, '')
      const artType = detectArtifactType(lang)
      if (!inline) {
        return (
          <CodeBlock
            code={codeStr}
            language={lang}
            onPreview={artType ? () => addArtifact({ type: artType, title: artifactTitleFromLang(lang), content: codeStr }) : undefined}
          />
        )
      }
      return <code className="px-1 py-0.5 rounded bg-[var(--bg-sidebar)] font-mono text-[13px] text-[var(--text-secondary)] border border-[var(--border)]" {...props}>{children}</code>
    },
    pre({ children }: any) { return <>{children}</> }
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
          <div className="flex gap-4 py-4 w-full group relative">
            <div className={`flex items-center justify-center shrink-0 rounded-xl text-xs font-semibold w-8 h-8 ${avatarClass}`}>
              {isUser ? <User size={15} /> : getProviderIcon(provider?.type)}
            </div>

            <div className="flex-1 min-w-0 mt-0.5">
              {/* Header row */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {isUser ? 'You' : message.isArbitration ? 'Arbitrator' : provider?.name || 'Assistant'}
                  </span>
                  {!isUser && provider && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-muted)]">
                      {provider.model}
                    </span>
                  )}
                  {!hideTimestamp && (
                    <span
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-[var(--text-muted)]"
                      onMouseEnter={() => setShowTimeTooltip(true)}
                      onMouseLeave={() => setShowTimeTooltip(false)}
                    >
                      {formatTime(message.timestamp)}
                    </span>
                  )}
                  {showTimeTooltip && (
                    <div className="absolute z-50 px-2 py-1 rounded-md bg-[var(--bg-content)] border border-[var(--border)] shadow-lg text-[11px] text-[var(--text-muted)] top-0 left-12">
                      {new Date(message.timestamp).toLocaleString()}
                    </div>
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
                    onCopy={handleCopy}
                    onCopyMarkdown={handleCopy}
                    onRegenerate={isAssistant ? handleRegenerate : undefined}
                    onEdit={isUser ? handleEdit : undefined}
                    onDelete={handleDelete}
                    onReplyTo={handleReplyTo}
                    onAddToFavorites={handleAddToFavorites}
                  />
                )}
              </div>

              {/* Content */}
              {isEditing && isUser ? (
                <InlineEditor
                  content={message.content}
                  onSave={handleSaveEdit}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <div className="prose-od text-[15px] leading-relaxed text-[var(--text-primary)]">
                  {message.isArbitration && (
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                        <Scale size={11} />
                        Arbitrated
                      </span>
                      {message.arbitrationConfidence !== undefined && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-500/10 text-green-600 border border-green-200/60">
                          Confidence {Math.round(message.arbitrationConfidence * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {message.content}
                  </ReactMarkdown>
                  {message.isArbitration && message.arbitrationReason && (
                    <div className="mt-3 p-3 rounded-lg bg-[var(--bg-sidebar)]/50 border border-[var(--border)] text-[12px] text-[var(--text-muted)] leading-relaxed">
                      <span className="font-medium text-[var(--text-secondary)]">Arbitration reason:</span>{' '}
                      {message.arbitrationReason}
                    </div>
                  )}
                  {message.isArbitration && (
                    <AgentAnswersPanel
                      runId={message.runId}
                      activeThread={activeThread}
                      settings={settings}
                      mdComponents={mdComponents}
                    />
                  )}
                  {isStreaming && <StreamCursor />}
                </div>
              )}
            </div>
          </div>
        </ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content className="min-w-[170px] rounded-xl bg-[var(--bg-content)] border border-[var(--border)] shadow-xl z-50 py-1">
            <ContextMenu.Item
              onSelect={handleCopy}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] outline-none cursor-pointer"
            >
              <Copy size={13} className="text-[var(--text-muted)]" />Copy
            </ContextMenu.Item>
            {isUser && (
              <ContextMenu.Item
                onSelect={handleEdit}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] outline-none cursor-pointer"
              >
                <Pencil size={13} className="text-[var(--text-muted)]" />Edit
              </ContextMenu.Item>
            )}
            <ContextMenu.Item
              onSelect={handleReplyTo}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] outline-none cursor-pointer"
            >
              <ChevronRight size={13} className="text-[var(--text-muted)]" />Reply
            </ContextMenu.Item>
            {isAssistant && (
              <ContextMenu.Item
                onSelect={handleRegenerate}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] outline-none cursor-pointer"
              >
                <RotateCcw size={13} className="text-[var(--text-muted)]" />Regenerate
              </ContextMenu.Item>
            )}
            <ContextMenu.Separator className="h-px bg-[var(--border)] my-1" />
            <ContextMenu.Item
              onSelect={handleDelete}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 outline-none cursor-pointer"
            >
              <Trash2 size={13} />Delete
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </>
  )
}
