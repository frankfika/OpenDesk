import { useState } from 'react'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { useChatStore } from '../../store/chat'
import type { Thread, ProviderConfig, AgentRole, AgentAnswerSnapshot } from '@shared/types'
import { getRoleName } from '@shared/agent-roles'

interface AgentAnswersPanelProps {
  runId?: string
  activeThread: Thread | null
  settings: { providers: ProviderConfig[] }
  mdComponents: Components
  agentAnswers?: AgentAnswerSnapshot[]
}

export default function AgentAnswersPanel({
  runId,
  activeThread,
  settings,
  mdComponents,
  agentAnswers: propAgentAnswers
}: AgentAnswersPanelProps) {
  const ensembleRuns = useChatStore((state) => state.ensembleRuns)
  const [expanded, setExpanded] = useState(false)

  const activeAgents = runId ? ensembleRuns[runId]?.agents : undefined
  const items: AgentAnswerSnapshot[] = propAgentAnswers
    ? propAgentAnswers
    : activeAgents
      ? Object.values(activeAgents)
          .filter((a) => a.messages.length > 0)
          .map((a) => ({
            agentId: a.agentId,
            providerId: a.providerId,
            model: a.model,
            content: a.messages[a.messages.length - 1].content,
            timestamp: a.messages[a.messages.length - 1]?.timestamp ?? a.finishedAt ?? a.startedAt ?? 0
          }))
      : (activeThread?.agentAnswers ?? [])

  if (items.length === 0) return null

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <Users size={13} />
        Show agent answers ({items.length})
      </button>
      {expanded && (
        <div className="mt-2 flex flex-col gap-2">
          {items.map((item) => {
            const provider = settings.providers.find((p) => p.id === item.providerId)
            const label = provider ? `${provider.name} · ${provider.model || item.model || 'unknown'}` : item.providerId
            return (
              <div
                key={item.agentId}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-sidebar)]/30 p-3"
              >
                <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  {item.agentId.replace('agent-', 'Agent ')} · {label}
                  {item.role && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-muted)] capitalize">
                      {getRoleName(item.role as AgentRole)}
                    </span>
                  )}
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
