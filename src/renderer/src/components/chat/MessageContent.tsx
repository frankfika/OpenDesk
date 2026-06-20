import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components, CodeProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '@shared/types'
import CodeBlock from './CodeBlock'
import InlineEditor from './InlineEditor'
import StreamCursor from './StreamCursor'
import AgentAnswersPanel from './AgentAnswersPanel'
import { Scale } from 'lucide-react'
import { useArtifactsStore } from '../../store/artifacts'
import { detectArtifactType, artifactTitleFromLang } from '../../lib/chat-utils'
import type { ArtifactType } from '../../lib/chat-utils'

interface MessageContentProps {
  message: Message
  isStreaming: boolean
  isEditing: boolean
  isUser: boolean
  onSaveEdit: (newContent: string) => void
  onCancelEdit: () => void
  mdComponents?: Components
  activeThread?: { agentAnswers?: Array<{ agentId: string; content: string }> } | null
  settings?: { providers?: Array<{ id: string; name: string }> }
}

function buildMdComponents(
  addArtifact: (a: { type: ArtifactType; title: string; content: string }) => void
): Components {
  return {
    code({ inline, className, children, ...props }: CodeProps) {
      const match = /language-(\w+)/.exec(className || '')
      const lang = match ? match[1] : ''
      const codeStr = String(children).replace(/\n$/, '')
      const artType = detectArtifactType(lang)
      if (!inline) {
        return (
          <CodeBlock
            code={codeStr}
            language={lang}
            onPreview={
              artType
                ? () => addArtifact({ type: artType, title: artifactTitleFromLang(lang), content: codeStr })
                : undefined
            }
          />
        )
      }
      return (
        <code
          className="px-1 py-0.5 rounded bg-[var(--bg-sidebar)] font-mono text-[13px] text-[var(--text-secondary)] border border-[var(--border)]"
          {...props}
        >
          {children}
        </code>
      )
    },
    pre({ children }: React.ComponentPropsWithoutRef<'pre'>) {
      return <>{children}</>
    }
  }
}

function MessageContent({
  message,
  isStreaming,
  isEditing,
  isUser,
  onSaveEdit,
  onCancelEdit,
  mdComponents,
  activeThread,
  settings
}: MessageContentProps) {
  const addArtifact = useArtifactsStore((state) => state.addArtifact)
  const components = mdComponents ?? buildMdComponents(addArtifact)

  if (isEditing && isUser) {
    return <InlineEditor content={message.content} onSave={onSaveEdit} onCancel={onCancelEdit} />
  }

  return (
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

      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
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
          mdComponents={components}
        />
      )}

      {isStreaming && <StreamCursor />}
    </div>
  )
}

export default memo(MessageContent)
