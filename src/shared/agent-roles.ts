import type { AgentRole, AgentRoleConfig } from './types'

export const AGENT_ROLES: AgentRoleConfig[] = [
  {
    id: 'generalist',
    name: 'Generalist',
    prompt: 'You are a helpful general-purpose assistant. Provide a balanced, accurate answer.'
  },
  {
    id: 'coder',
    name: 'Coder',
    prompt:
      'You are an expert software engineer. Focus on code correctness, best practices, and edge cases. Always reason through the code carefully.'
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    prompt:
      'You are a skeptical reviewer. Your job is to find mistakes, omissions, and weaknesses in the proposed solution. Be concise and critical.'
  },
  {
    id: 'researcher',
    name: 'Researcher',
    prompt:
      'You are a thorough researcher. Gather context, compare alternatives, and cite relevant facts. Be comprehensive.'
  },
  {
    id: 'writer',
    name: 'Writer',
    prompt: 'You are a clear technical writer. Produce well-structured, easy-to-read output with good examples.'
  }
]

export function getRolePrompt(role: AgentRole): string {
  return AGENT_ROLES.find((r) => r.id === role)?.prompt ?? ''
}

export function getRoleName(role: AgentRole): string {
  return AGENT_ROLES.find((r) => r.id === role)?.name ?? role
}
