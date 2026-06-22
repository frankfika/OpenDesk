import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../store/chat'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
import {
  Terminal,
  FileText,
  FolderOpen,
  Wrench,
  CheckCircle,
  XCircle,
  Loader,
  Pencil,
  Search,
  Users,
  Scale
} from 'lucide-react'
import { getRoleName } from '@shared/agent-roles'
import type { AgentRole } from '@shared/types'

function toolIcon(name: string) {
  switch (name) {
    case 'file_read':
    case 'read_file':
      return <FileText size={11} className="text-[var(--info)]" />
    case 'file_write':
    case 'write_file':
    case 'apply_patch':
      return <Pencil size={11} className="text-[var(--warning)]" />
    case 'file_list':
    case 'list_directory':
      return <FolderOpen size={11} className="text-[var(--info)]" />
    case 'shell':
    case 'bash':
    case 'run_command':
      return <Terminal size={11} className="text-[var(--success)]" />
    case 'web_search':
      return <Search size={11} className="text-[var(--info)]" />
    default:
      return <Wrench size={11} className="text-[var(--text-muted)]" />
  }
}

function toolLabel(name: string, args?: Record<string, unknown>): string {
  const a = args || {}
  switch (name) {
    case 'file_read':
    case 'read_file': {
      const p = (a.path || a.file_path || '') as string
      return p.split('/').pop() || p || 'read file'
    }
    case 'file_write':
    case 'write_file': {
      const p = (a.path || a.file_path || '') as string
      return p.split('/').pop() || p || 'write file'
    }
    case 'apply_patch': {
      const p = (a.path || '') as string
      return p.split('/').pop() || p || 'patch file'
    }
    case 'file_list':
    case 'list_directory': {
      const p = (a.path || a.directory || '.') as string
      return p.split('/').pop() || p
    }
    case 'shell':
    case 'bash': {
      const cmd = (a.command || a.cmd || '') as string
      return cmd.slice(0, 50)
    }
    case 'web_search':
      return (a.query || '') as string
    default:
      return name.replace(/_/g, ' ')
  }
}

interface Step {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'running' | 'done' | 'error'
}

function formatLatency(ms?: number): string {
  if (!ms && ms !== 0) return ''
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${m}m${s}s`
}

function formatCost(usd?: number): string {
  if (usd === undefined || usd === null) return ''
  if (usd < 0.01) return `$${(usd * 100).toFixed(2)}¢`
  return `$${usd.toFixed(3)}`
}

function formatTokens(n?: number): string {
  if (n === undefined || n === null) return ''
  if (n < 1000) return `${n}`
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

function AgentProgressRow({
  agent,
  provider,
  role
}: {
  agent: {
    agentId: string
    providerId: string
    model?: string
    status: string
    error?: string
    latencyMs?: number
    inputTokens?: number
    outputTokens?: number
    estimatedCostUsd?: number
  }
  provider?: { name: string; model: string }
  role?: string
}) {
  const label = provider ? `${provider.name} · ${provider.model}` : agent.providerId
  const showMetrics = agent.status === 'done'
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5">
      {agent.status === 'running' ? (
        <Loader size={11} className="text-[var(--accent)] animate-spin shrink-0" />
      ) : agent.status === 'done' ? (
        <CheckCircle size={11} className="text-[var(--success)] shrink-0" />
      ) : (
        <XCircle size={11} className="text-[var(--error)] shrink-0" />
      )}
      <span className="text-[11px] font-medium text-[var(--text-secondary)] shrink-0">
        {agent.agentId.replace('agent-', 'Agent ')}
      </span>
      {role && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-muted)] capitalize">
          {getRoleName(role as AgentRole)}
        </span>
      )}
      <span className="text-[11px] text-[var(--text-muted)] truncate">{label}</span>
      {showMetrics && (
        <span className="text-[10px] text-[var(--text-muted)] ml-auto flex items-center gap-2 shrink-0">
          {agent.latencyMs !== undefined && <span title="Latency">{formatLatency(agent.latencyMs)}</span>}
          {(agent.inputTokens !== undefined || agent.outputTokens !== undefined) && (
            <span title={`Tokens: ${agent.inputTokens ?? 0} in / ${agent.outputTokens ?? 0} out`}>
              {formatTokens((agent.inputTokens ?? 0) + (agent.outputTokens ?? 0))}tok
            </span>
          )}
          {agent.estimatedCostUsd !== undefined && (
            <span title="Estimated cost" className="text-[var(--text-secondary)]">
              {formatCost(agent.estimatedCostUsd)}
            </span>
          )}
        </span>
      )}
      {agent.error && <span className="text-[10px] text-[var(--error)] truncate ml-auto">{agent.error}</span>}
    </div>
  )
}

export default function AgentActivityBar() {
  const messages = useChatStore((state) => state.messages)
  const streaming = useChatStore((state) => state.streaming)
  const mode = useChatStore((state) => state.mode)
  const activeRunId = useChatStore((state) => state.activeRunId)
  const ensembleRuns = useChatStore((state) => state.ensembleRuns)
  const { settings } = useSettingsStore()
  const { activeThread: getActiveThread } = useWorkspaceStore()
  const activeThread = getActiveThread()

  const roleAssignments = activeThread?.agentRoleAssignments ?? settings.agentRoleAssignments ?? {}

  const steps = useMemo((): Step[] => {
    const result: Step[] = []
    for (const msg of messages) {
      if (msg.kind === 'tool_call') {
        result.push({
          id: msg.id,
          name: (msg.metadata?.toolName as string) || 'tool',
          args: (msg.metadata?.params as Record<string, unknown>) || {},
          status: 'running'
        })
      } else if (msg.kind === 'tool_result') {
        // Mark the last running step as done/error
        const last = [...result].reverse().find((s) => s.status === 'running')
        if (last) {
          last.status = msg.metadata?.isError ? 'error' : 'done'
        }
      }
    }
    return result
  }, [messages])

  const activeRun = activeRunId ? ensembleRuns[activeRunId] : null
  const agents = useMemo(() => (activeRun ? Object.values(activeRun.agents) : []), [activeRun])

  // Aggregate metrics for the ensemble header
  const totals = useMemo(() => {
    let totalIn = 0,
      totalOut = 0,
      totalCost = 0,
      maxLatency = 0
    for (const a of agents) {
      totalIn += a.inputTokens ?? 0
      totalOut += a.outputTokens ?? 0
      totalCost += a.estimatedCostUsd ?? 0
      if (a.latencyMs && a.latencyMs > maxLatency) maxLatency = a.latencyMs
    }
    return { totalIn, totalOut, totalCost, maxLatency }
  }, [agents])

  const ensembleSteps = useMemo((): Step[] => {
    const result: Step[] = []
    const seen = new Set<string>()
    for (const agent of agents) {
      for (const msg of agent.messages) {
        if (msg.kind === 'tool_call') {
          const key = `${msg.metadata?.toolName}-${JSON.stringify(msg.metadata?.params)}`
          if (seen.has(key)) continue
          seen.add(key)
          result.push({
            id: msg.id,
            name: (msg.metadata?.toolName as string) || 'tool',
            args: (msg.metadata?.params as Record<string, unknown>) || {},
            status: 'running'
          })
        } else if (msg.kind === 'tool_result') {
          const name = (msg.metadata?.toolName as string) || 'tool'
          const last = [...result].reverse().find((s) => s.status === 'running' && s.name === name)
          if (last) {
            last.status = msg.metadata?.isError ? 'error' : 'done'
          }
        }
      }
    }
    return result
  }, [agents])

  // Show ensemble progress when in ensemble mode and actively streaming
  if ((mode === 'ensemble' || mode === 'agent') && streaming && activeRun) {
    const completedCount = agents.filter((a) => a.status === 'done' || a.status === 'error').length
    const totalCount = agents.length
    const isArbitrating = activeRun.status === 'arbitrating'
    const isComplete = completedCount === totalCount && totalCount > 0
    const showSharedTools = ensembleSteps.length > 0

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mx-auto max-w-3xl w-full px-6 mb-2"
      >
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-sidebar)]/60 overflow-hidden">
          <div className="px-3 py-2 flex items-center gap-2 border-b border-[var(--border)]/60">
            <Users size={11} className="text-[var(--accent)]" />
            <span className="text-[11px] font-medium text-[var(--text-muted)]">
              Ensemble · {completedCount}/{totalCount} agents · {isArbitrating ? 'arbitrating' : isComplete ? 'done' : 'running'}
            </span>
            {isComplete && totalCount > 0 && (
              <span className="ml-auto text-[10px] text-[var(--text-muted)] flex items-center gap-2">
                {totals.maxLatency > 0 && <span>⏱ {formatLatency(totals.maxLatency)}</span>}
                {totals.totalIn + totals.totalOut > 0 && (
                  <span>∑ {formatTokens(totals.totalIn + totals.totalOut)}tok</span>
                )}
                {totals.totalCost > 0 && (
                  <span className="text-[var(--text-secondary)]">{formatCost(totals.totalCost)}</span>
                )}
              </span>
            )}
          </div>
          <div className="flex flex-col divide-y divide-[var(--border)]/40">
            <AnimatePresence initial={false}>
              {agents.map((agent) => {
                const roleName = roleAssignments[agent.providerId]
                const provider = settings.providers.find((p) => p.id === agent.providerId)
                return (
                  <motion.div
                    key={agent.agentId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <AgentProgressRow agent={agent} provider={provider} role={roleName} />
                  </motion.div>
                )
              })}
              {showSharedTools && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-3 py-1.5 bg-[var(--bg-sidebar)]/40"
                >
                  <div className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Shared tools
                  </div>
                  <div className="flex flex-col gap-1">
                    {ensembleSteps.map((step) => (
                      <div key={step.id} className="flex items-center gap-2">
                        {step.status === 'running' ? (
                          <Loader size={11} className="text-[var(--accent)] animate-spin shrink-0" />
                        ) : step.status === 'done' ? (
                          <CheckCircle size={11} className="text-[var(--success)] shrink-0" />
                        ) : (
                          <XCircle size={11} className="text-[var(--error)] shrink-0" />
                        )}
                        <span className="shrink-0">{toolIcon(step.name)}</span>
                        <span className="text-[11px] font-medium text-[var(--text-secondary)] shrink-0">
                          {step.name.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] truncate font-mono">
                          {toolLabel(step.name, step.args)}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              {isArbitrating && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2.5 px-3 py-1.5"
                >
                  <Loader size={11} className="text-[var(--accent)] animate-spin shrink-0" />
                  <Scale size={11} className="text-[var(--text-muted)] shrink-0" />
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">Arbitrator</span>
                  <span className="text-[11px] text-[var(--text-muted)]">synthesizing final answer…</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    )
  }

  // Only show when streaming with at least one tool step
  if (!streaming || steps.length === 0) return null

  const recentSteps = steps.slice(-5)

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mx-auto max-w-3xl w-full px-6 mb-2"
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-sidebar)]/60 overflow-hidden">
        <div className="px-3 py-2 flex items-center gap-2 border-b border-[var(--border)]/60">
          <Loader size={11} className="text-[var(--accent)] animate-spin" />
          <span className="text-[11px] font-medium text-[var(--text-muted)]">
            Agent · {steps.filter((s) => s.status === 'done').length}/{steps.length} steps
          </span>
        </div>
        <div className="flex flex-col divide-y divide-[var(--border)]/40">
          <AnimatePresence initial={false}>
            {recentSteps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: i * 0.03 }}
                className="flex items-center gap-2.5 px-3 py-1.5"
              >
                {step.status === 'running' ? (
                  <Loader size={11} className="text-[var(--accent)] animate-spin shrink-0" />
                ) : step.status === 'done' ? (
                  <CheckCircle size={11} className="text-[var(--success)] shrink-0" />
                ) : (
                  <XCircle size={11} className="text-[var(--error)] shrink-0" />
                )}
                <span className="shrink-0">{toolIcon(step.name)}</span>
                <span className="text-[11px] font-medium text-[var(--text-secondary)] shrink-0">
                  {step.name.replace(/_/g, ' ')}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] truncate font-mono">
                  {toolLabel(step.name, step.args)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
