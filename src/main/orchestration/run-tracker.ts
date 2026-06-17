import type { AgentRun } from '../../shared/types'

interface ActiveRun {
  runId: string
  controller: AbortController
  agents: Map<string, AbortController>
}

const activeRuns = new Map<string, ActiveRun>()

export function registerRun(runId: string, controller: AbortController): void {
  activeRuns.set(runId, { runId, controller, agents: new Map() })
}

export function registerAgent(runId: string, agentId: string, controller: AbortController): void {
  const run = activeRuns.get(runId)
  if (run) {
    run.agents.set(agentId, controller)
  }
}

export function abortRun(runId: string): void {
  const run = activeRuns.get(runId)
  if (!run) return
  run.controller.abort()
  for (const ac of run.agents.values()) {
    ac.abort()
  }
  activeRuns.delete(runId)
}

export function unregisterAgent(runId: string, agentId: string): void {
  const run = activeRuns.get(runId)
  if (run) {
    run.agents.delete(agentId)
  }
}

export function completeRun(runId: string): void {
  activeRuns.delete(runId)
}

export function isRunAborted(runId: string): boolean {
  return activeRuns.get(runId)?.controller.signal.aborted ?? false
}
