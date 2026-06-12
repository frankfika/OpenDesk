import { MCPClient, type MCPServerConfig, type MCPTool, type MCPConnectionStatus } from './client'

export interface MCPBridgeTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export class MCPBridge {
  private clients = new Map<string, MCPClient>()
  private serverStatus = new Map<string, MCPConnectionStatus>()
  private serverErrors = new Map<string, string>()

  async connectServer(config: MCPServerConfig): Promise<void> {
    if (this.clients.has(config.name)) {
      await this.disconnectServer(config.name)
    }

    const client = new MCPClient(config)
    client.setStatusCallback((status, error) => {
      this.serverStatus.set(config.name, status)
      if (error) {
        this.serverErrors.set(config.name, error)
      } else {
        this.serverErrors.delete(config.name)
      }
    })

    this.clients.set(config.name, client)
    this.serverStatus.set(config.name, 'connecting')

    await client.connect()
  }

  async disconnectServer(name: string): Promise<void> {
    const client = this.clients.get(name)
    if (client) {
      await client.disconnect()
      this.clients.delete(name)
    }
    this.serverStatus.set(name, 'disconnected')
    this.serverErrors.delete(name)
  }

  async disconnectAll(): Promise<void> {
    await Promise.all(Array.from(this.clients.keys()).map((name) => this.disconnectServer(name)))
  }

  getServerStatus(name: string): MCPConnectionStatus {
    return this.serverStatus.get(name) || 'disconnected'
  }

  getServerError(name: string): string | undefined {
    return this.serverErrors.get(name)
  }

  getAllTools(): MCPTool[] {
    const tools: MCPTool[] = []
    for (const client of this.clients.values()) {
      if (client.isConnected()) {
        tools.push(...client.getTools())
      }
    }
    return tools
  }

  toOpenAITools(): MCPBridgeTool[] {
    return this.getAllTools().map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }))
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    // Find which server owns this tool
    const tool = this.getAllTools().find((t) => t.name === name)
    if (!tool) {
      throw new Error(`Tool not found: ${name}`)
    }

    const client = this.clients.get(tool.serverName)
    if (!client || !client.isConnected()) {
      throw new Error(`MCP server ${tool.serverName} not connected`)
    }

    return client.callTool(name, args)
  }

  getConnectedClients(): MCPClient[] {
    return Array.from(this.clients.values()).filter((c) => c.isConnected())
  }
}

export const mcpBridge = new MCPBridge()
