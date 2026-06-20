import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader,
  ChevronDown,
  ChevronRight,
  Wrench,
  MessageSquare,
  Brain
} from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Message } from '@shared/types'

interface AgentStep {
  id: string
  type: 'thought' | 'tool_call' | 'tool_result' | 'response' | 'error'
  content: string
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolResult?: string
  status: 'pending' | 'running' | 'success' | 'error'
  timestamp: number
}

interface AgentRun {
  id: string
  goal: string
  status: 'idle' | 'running' | 'paused' | 'success' | 'error'
  steps: AgentStep[]
  currentIteration: number
  maxIterations: number
  startedAt?: number
  finishedAt?: number
  // IPC listeners cleanup
  cleanup?: () => void
}

const MAX_ITERATIONS_DEFAULT = 10

export default function AgentExecutor() {
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [goal, setGoal] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const runsRef = useRef<AgentRun[]>([])

  // Keep runsRef in sync with runs state
  useEffect(() => {
    runsRef.current = runs
  }, [runs])

  const createRun = useCallback((goalText: string) => {
    const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const run: AgentRun = {
      id,
      goal: goalText,
      status: 'idle',
      steps: [],
      currentIteration: 0,
      maxIterations: MAX_ITERATIONS_DEFAULT
    }
    setRuns((prev) => [run, ...prev])
    setActiveRunId(id)
    return run
  }, [])

  const updateRun = useCallback((id: string, updates: Partial<AgentRun>) => {
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }, [])

  const addStep = useCallback((runId: string, step: AgentStep) => {
    setRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, steps: [...r.steps, step] } : r)))
  }, [])

  const updateStep = useCallback((runId: string, stepId: string, updates: Partial<AgentStep>) => {
    setRuns((prev) =>
      prev.map((r) =>
        r.id === runId ? { ...r, steps: r.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)) } : r
      )
    )
  }, [])

  const toggleStep = useCallback((stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) next.delete(stepId)
      else next.add(stepId)
      return next
    })
  }, [])

  const stopRun = useCallback(
    (runId: string) => {
      const run = runs.find((r) => r.id === runId)
      if (run?.cleanup) {
        run.cleanup()
      }
      // Abort the IPC session if available
      if (window.api?.chat?.abort) {
        window.api.chat.abort(runId)
      }
      updateRun(runId, { status: 'paused' })
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    },
    [updateRun, runs]
  )

  // Browser mock fallback when IPC is unavailable
  const runMockLoop = useCallback(
    async (run: AgentRun) => {
      updateRun(run.id, { status: 'running', startedAt: Date.now() })

      try {
        for (let i = 0; i < run.maxIterations; i++) {
          const runState = runs.find((r) => r.id === run.id)
          if (runState?.status === 'paused') break

          updateRun(run.id, { currentIteration: i + 1 })

          const thoughtId = `thought-${i}`
          addStep(run.id, {
            id: thoughtId,
            type: 'thought',
            content: `Analyzing request and planning next action... (iteration ${i + 1})`,
            status: 'running',
            timestamp: Date.now()
          })

          await new Promise((r) => setTimeout(r, 800))
          updateStep(run.id, thoughtId, {
            status: 'success',
            content: `Thought: I need to ${i === 0 ? 'understand the goal and break it down' : 'continue executing the plan'}.`
          })

          if (i < 3) {
            const toolId = `tool-${i}`
            addStep(run.id, {
              id: toolId,
              type: 'tool_call',
              content: `Calling tool...`,
              toolName: 'web_search',
              toolArgs: { query: run.goal },
              status: 'running',
              timestamp: Date.now()
            })

            await new Promise((r) => setTimeout(r, 600))
            updateStep(run.id, toolId, {
              status: 'success',
              content: `Tool call: web_search("${run.goal}")`,
              toolResult: 'Search results: ... (mock data)'
            })
          }

          if (i === run.maxIterations - 1 || i === 2) {
            const responseId = `response-${i}`
            addStep(run.id, {
              id: responseId,
              type: 'response',
              content: `Task completed. Here's the result for: "${run.goal}"`,
              status: 'success',
              timestamp: Date.now()
            })
            updateRun(run.id, { status: 'success', finishedAt: Date.now() })
            break
          }
        }
      } catch (e) {
        const errorId = `error-${Date.now()}`
        addStep(run.id, {
          id: errorId,
          type: 'error',
          content: `Error: ${e instanceof Error ? e.message : String(e)}`,
          status: 'error',
          timestamp: Date.now()
        })
        updateRun(run.id, { status: 'error', finishedAt: Date.now() })
      }
    },
    [addStep, updateRun, updateStep, runs]
  )

  const startRun = useCallback(
    async (run: AgentRun) => {
      if (!window.api?.chat?.send) {
        // Fallback to browser mock mode
        await runMockLoop(run)
        return
      }

      updateRun(run.id, { status: 'running', startedAt: Date.now() })

      // Register IPC listeners for this run
      const unsubToken = window.api.chat.onToken((token: string) => {
        // Token received - append to current thought/response step
        const currentRun = runs.find((r) => r.id === run.id)
        if (!currentRun || currentRun.status === 'paused') return

        const lastStep = currentRun.steps[currentRun.steps.length - 1]
        if (lastStep && (lastStep.type === 'thought' || lastStep.type === 'response')) {
          updateStep(run.id, lastStep.id, {
            content: lastStep.content + token,
            status: 'running'
          })
        } else {
          // Create a new thought step for the stream
          const stepId = `thought-${Date.now()}`
          addStep(run.id, {
            id: stepId,
            type: 'thought',
            content: token,
            status: 'running',
            timestamp: Date.now()
          })
        }
      })

      const unsubToolCall = window.api.chat.onToolCall((toolCall) => {
        const currentRun = runs.find((r) => r.id === run.id)
        if (!currentRun || currentRun.status === 'paused') return

        const stepId = `tool-${toolCall.id}`
        addStep(run.id, {
          id: stepId,
          type: 'tool_call',
          content: `Calling ${toolCall.name}...`,
          toolName: toolCall.name,
          toolArgs: toolCall.arguments,
          status: 'running',
          timestamp: Date.now()
        })
        updateRun(run.id, { currentIteration: currentRun.currentIteration + 1 })
      })

      const unsubToolResult = window.api.chat.onToolResult((result) => {
        const currentRun = runs.find((r) => r.id === run.id)
        if (!currentRun || currentRun.status === 'paused') return

        // Find matching tool_call step
        const matchingToolCall = currentRun.steps.find(
          (s) => s.type === 'tool_call' && s.id === `tool-${result.toolCallId}`
        )
        if (matchingToolCall) {
          updateStep(run.id, matchingToolCall.id, { status: 'success' })
        }

        const stepId = `result-${result.toolCallId}`
        addStep(run.id, {
          id: stepId,
          type: 'tool_result',
          content: result.content,
          toolResult: result.content,
          status: result.isError ? 'error' : 'success',
          timestamp: Date.now()
        })
      })

      const unsubDone = window.api.chat.onDone(() => {
        const currentRun = runs.find((r) => r.id === run.id)
        if (!currentRun) return
        // Mark last running step as success
        const lastStep = currentRun.steps[currentRun.steps.length - 1]
        if (lastStep && lastStep.status === 'running') {
          updateStep(run.id, lastStep.id, { status: 'success' })
        }
        // Add final response step if not present
        const hasResponse = currentRun.steps.some((s) => s.type === 'response')
        if (!hasResponse) {
          addStep(run.id, {
            id: `response-${Date.now()}`,
            type: 'response',
            content: 'Task completed.',
            status: 'success',
            timestamp: Date.now()
          })
        }
        updateRun(run.id, { status: 'success', finishedAt: Date.now() })
      })

      const unsubError = window.api.chat.onError((error) => {
        const currentRun = runs.find((r) => r.id === run.id)
        if (!currentRun) return
        addStep(run.id, {
          id: `error-${Date.now()}`,
          type: 'error',
          content: error.message,
          status: 'error',
          timestamp: Date.now()
        })
        updateRun(run.id, { status: 'error', finishedAt: Date.now() })
      })

      const cleanup = () => {
        unsubToken()
        unsubToolCall()
        unsubToolResult()
        unsubDone()
        unsubError()
      }

      updateRun(run.id, { cleanup })

      // Send the chat request with a unique sessionId to isolate this agent run
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: run.goal,
        timestamp: Date.now(),
        kind: 'user_message'
      }

      // Get active provider from settings if possible
      let providerId: string | undefined
      try {
        const settings = (await window.api.settings.get()) as { providers?: Array<{ id: string; enabled: boolean }> }
        providerId = settings.providers?.find((p) => p.enabled)?.id
      } catch {
        // ignore
      }

      window.api.chat.send({
        messages: [userMessage],
        providerId,
        mode: 'agent',
        sessionId: run.id,
        systemPrompt:
          'You are an autonomous agent. You can use tools to accomplish the user\'s goal. Think step by step, use tools when needed, and provide a final answer.'
      })
    },
    [addStep, updateRun, updateStep, runs, runMockLoop]
  )

  const handleStart = useCallback(() => {
    if (!goal.trim()) return
    const run = createRun(goal.trim())
    startRun(run)
    setGoal('')
  }, [goal, createRun, startRun])

  const handleRestart = useCallback(
    (run: AgentRun) => {
      if (run.cleanup) {
        run.cleanup()
      }
      updateRun(run.id, { status: 'idle', steps: [], currentIteration: 0, finishedAt: undefined, cleanup: undefined })
      startRun({ ...run, status: 'idle', steps: [], currentIteration: 0, cleanup: undefined })
    },
    [updateRun, startRun]
  )

  const activeRun = runs.find((r) => r.id === activeRunId)

  // Cleanup all listeners on unmount
  useEffect(() => {
    return () => {
      runsRef.current.forEach((run) => {
        if (run.cleanup) run.cleanup()
      })
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-[var(--bg-content)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Agent Executor</h2>
          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-sidebar)] px-1.5 py-0.5 rounded border border-[var(--border)]">
            Beta
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span>Max iterations: {MAX_ITERATIONS_DEFAULT}</span>
        </div>
      </div>

      {/* Goal input */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            placeholder="Describe a task for the agent to execute..."
            className="flex-1 px-3.5 py-2.5 rounded-xl text-[13px] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
          />
          <button
            type="button"
            onClick={handleStart}
            disabled={!goal.trim() || activeRun?.status === 'running'}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5',
              goal.trim() && activeRun?.status !== 'running'
                ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm'
                : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)] opacity-50'
            )}
          >
            <Play size={13} />
            Execute
          </button>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          The agent will autonomously plan, use tools, and iterate until the task is complete.
          {!window.api?.chat?.send && ' (Mock mode — no IPC available)'}
        </p>
      </div>

      {/* Runs list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {runs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Brain size={32} className="text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">No agent runs yet</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Enter a task above and click Execute to start</p>
          </div>
        )}

        <AnimatePresence>
          {runs.map((run) => (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'rounded-xl border overflow-hidden',
                run.id === activeRunId ? 'border-[var(--accent)]/30' : 'border-[var(--border)]'
              )}
            >
              {/* Run header */}
              <div
                className="flex items-center justify-between px-3 py-2.5 bg-[var(--bg-sidebar)]/50 cursor-pointer"
                onClick={() => setActiveRunId(run.id === activeRunId ? null : run.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {run.status === 'running' && (
                    <Loader size={14} className="text-[var(--accent)] animate-spin shrink-0" />
                  )}
                  {run.status === 'success' && <CheckCircle size={14} className="text-[var(--success)] shrink-0" />}
                  {run.status === 'error' && <AlertCircle size={14} className="text-[var(--error)] shrink-0" />}
                  {run.status === 'idle' && <Brain size={14} className="text-[var(--text-muted)] shrink-0" />}
                  {run.status === 'paused' && <Pause size={14} className="text-[var(--warning)] shrink-0" />}
                  <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">{run.goal}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    {run.currentIteration}/{run.maxIterations}
                  </span>
                  {run.status === 'running' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        stopRun(run.id)
                      }}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                      aria-label="Stop agent"
                    >
                      <Square size={12} />
                    </button>
                  )}
                  {(run.status === 'success' || run.status === 'error' || run.status === 'paused') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRestart(run)
                      }}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                      aria-label="Restart agent"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Steps */}
              <AnimatePresence>
                {run.id === activeRunId && run.steps.length > 0 && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2 space-y-1">
                      {run.steps.map((step) => {
                        const isExpanded = expandedSteps.has(step.id)
                        return (
                          <div
                            key={step.id}
                            className={cn(
                              'rounded-lg border px-2.5 py-2',
                              step.status === 'error' && 'border-[var(--error-border)] bg-[var(--error-bg)]/50',
                              step.status === 'success' && 'border-[var(--border)] bg-[var(--bg-sidebar)]/30',
                              step.status === 'running' && 'border-[var(--accent)]/20 bg-[var(--bg-sidebar)]/50'
                            )}
                          >
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleStep(step.id)}>
                              {step.type === 'thought' && <Brain size={12} className="text-[var(--text-muted)]" />}
                              {step.type === 'tool_call' && <Wrench size={12} className="text-[var(--accent)]" />}
                              {step.type === 'response' && (
                                <MessageSquare size={12} className="text-[var(--success)]" />
                              )}
                              {step.type === 'error' && <AlertCircle size={12} className="text-[var(--error)]" />}
                              <span className="text-[11px] font-medium text-[var(--text-secondary)] capitalize">
                                {step.type.replace('_', ' ')}
                              </span>
                              {step.status === 'running' && (
                                <Loader size={11} className="text-[var(--accent)] animate-spin" />
                              )}
                              <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                                {new Date(step.timestamp).toLocaleTimeString()}
                              </span>
                              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </div>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-1.5 pl-5 text-[11px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                                    {step.content}
                                    {step.toolResult && (
                                      <div className="mt-1 p-1.5 rounded bg-[var(--bg-content)] border border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)]">
                                        {step.toolResult}
                                      </div>
                                    )}
                                    {step.toolName && (
                                      <div className="mt-1 text-[10px] text-[var(--text-muted)] font-mono">
                                        Tool: {step.toolName}
                                        {step.toolArgs && (
                                          <pre className="mt-0.5 p-1 rounded bg-[var(--bg-sidebar)]/50 overflow-x-auto">
                                            {JSON.stringify(step.toolArgs, null, 2)}
                                          </pre>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
