import { mcpBridge } from '../mcp/mcp-bridge'
import { ToolRegistry } from './registry'
import { registerBuiltins } from './builtins'
import { scanAllSkills, executeSkillTool, getSkillToolAsProviderTool } from '../skills'
import type { ApprovalMode } from '../../shared/types'
import type { Tool, ToolCall, ToolResult } from '../providers/base'

const toolRegistry = new ToolRegistry()
registerBuiltins(toolRegistry)

function getWorkspacePath(workspaceId?: string): string | null {
  if (!workspaceId) return null
  // Import dynamically to avoid circular dependency with workspace module
  const { listWorkspaces } = require('../workspace')
  const workspaces = listWorkspaces()
  const ws = workspaces.find((w: { id: string; folderPath: string }) => w.id === workspaceId)
  return ws?.folderPath ?? null
}

import { resolve, sep } from 'path'
import { homedir } from 'os'

function isPathInAnyBase(filePath: string, bases: (string | null)[]): boolean {
  const resolved = resolve(filePath)
  for (const base of bases) {
    if (!base) continue
    const resolvedBase = resolve(base)
    if (resolved === resolvedBase || resolved.startsWith(resolvedBase + sep)) return true
  }
  return false
}

async function executeBuiltinTool(toolCall: ToolCall, workspaceId?: string): Promise<ToolResult> {
  const tool = toolRegistry.get(toolCall.name)
  if (!tool) {
    return {
      toolCallId: toolCall.id,
      content: `Tool '${toolCall.name}' not found`,
      isError: true
    }
  }

  // Security: desktop tools require desktopEnabled
  if (toolCall.name.startsWith('desktop_')) {
    // Settings are not directly available here; desktopEnabled is checked in handlers.ts before calling
  }

  // Security: file tools restricted to workspace or home directory
  if (toolCall.name.startsWith('file_') || toolCall.name === 'apply_patch') {
    const workspacePath = getWorkspacePath(workspaceId)
    const targetPath = (toolCall.arguments.path as string) || ''
    const allowedBases = [workspacePath, homedir()].filter(Boolean) as string[]
    if (!isPathInAnyBase(targetPath, allowedBases)) {
      return {
        toolCallId: toolCall.id,
        content: `Path is outside allowed directories (workspace or home directory)`,
        isError: true
      }
    }
    // Normalize relative paths to absolute workspace paths before invoking the handler
    if (workspacePath && targetPath) {
      toolCall.arguments.path = resolve(workspacePath, targetPath)
    }
  }

  try {
    const result = await tool.handler(toolCall.arguments)
    return { toolCallId: toolCall.id, content: result, isError: false }
  } catch (err) {
    return {
      toolCallId: toolCall.id,
      content: err instanceof Error ? err.message : String(err),
      isError: true
    }
  }
}

export async function executeTool(
  toolCall: ToolCall,
  workspaceId?: string,
  options?: { desktopEnabled?: boolean; approvalMode?: ApprovalMode }
): Promise<ToolResult> {
  // Security: desktop tools require desktopEnabled
  if (toolCall.name.startsWith('desktop_')) {
    if (!options?.desktopEnabled) {
      return {
        toolCallId: toolCall.id,
        content: 'Desktop control is disabled. Enable it in Settings.',
        isError: true
      }
    }
  }

  // Security: approval mode check for shell and desktop tools
  // 'ask' blocks shell/desktop until the user enables an auto mode in Settings.
  // All other modes allow shell/desktop within the workspace/home directory sandbox.
  const approvalMode = options?.approvalMode ?? 'auto-edits'
  if (approvalMode === 'ask' && (toolCall.name === 'shell' || toolCall.name.startsWith('desktop_'))) {
    return {
      toolCallId: toolCall.id,
      content: `Tool execution blocked: approvalMode is '${approvalMode}'. The tool '${toolCall.name}' requires user approval. Enable an auto-approval mode in Settings to run tools without confirmation.`,
      isError: true
    }
  }

  const skillToolMatch = toolCall.name.match(/^([^_]+_[^_]+)_(.+)$/)
  if (skillToolMatch) {
    const possibleSkillId = skillToolMatch[1].replace(/_/g, ':')
    const toolName = skillToolMatch[2]
    const allSkills = scanAllSkills(getWorkspacePath(workspaceId) || undefined)
    const skill = allSkills.find(
      (s) => s.id === possibleSkillId || s.id.endsWith(':' + skillToolMatch[1].split('_').pop())
    )
    if (skill && skill.scripts && skill.scripts[toolName]) {
      const result = await executeSkillTool(skill, toolName, toolCall.arguments)
      return {
        toolCallId: toolCall.id,
        content: result.success ? result.output || '' : result.error || 'Unknown error',
        isError: !result.success
      }
    }
  }

  // Try MCP first, then built-in
  const mcpTools = mcpBridge.getAllTools()
  const isMcpTool = mcpTools.some((t) => t.name === toolCall.name)

  if (isMcpTool) {
    try {
      const result = await mcpBridge.callTool(toolCall.name, toolCall.arguments)
      return { toolCallId: toolCall.id, content: result, isError: false }
    } catch (err) {
      return {
        toolCallId: toolCall.id,
        content: err instanceof Error ? err.message : String(err),
        isError: true
      }
    }
  }

  return executeBuiltinTool(toolCall, workspaceId)
}

export function buildTools(workspaceId?: string): Tool[] {
  const mcpTools = mcpBridge.getAllTools()
  const builtinTools = toolRegistry.toProviderTools()
  const tools: Tool[] = [
    ...builtinTools,
    ...mcpTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema
    }))
  ]

  // Add skill-defined tools
  const allSkills = scanAllSkills(getWorkspacePath(workspaceId) || undefined)
  for (const skill of allSkills) {
    const skillTools = getSkillToolAsProviderTool(skill)
    tools.push(...skillTools)
  }

  return tools
}

export { toolRegistry }
