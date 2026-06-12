// Tool registry for OpenDesk
import type { Tool } from '../providers/base'

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required?: string[]
  }
  handler: (args: Record<string, unknown>) => Promise<string>
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>()

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool)
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  toOpenAIFormat(): Array<{
    type: 'function'
    function: { name: string; description: string; parameters: object }
  }> {
    return this.list().map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }))
  }

  toAnthropicFormat(): Array<{
    name: string
    description: string
    input_schema: object
  }> {
    return this.list().map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters
    }))
  }

  toProviderTools(): Tool[] {
    return this.list().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }))
  }
}
