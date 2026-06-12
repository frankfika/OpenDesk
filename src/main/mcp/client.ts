import { spawn, type ChildProcess } from 'child_process'

export type MCPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface MCPServerConfig {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
  enabled: boolean
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  serverName: string
}

interface JSONRPCRequest {
  jsonrpc: '2.0'
  id?: number | string
  method: string
  params?: Record<string, unknown>
}

interface JSONRPCResponse {
  jsonrpc: '2.0'
  id?: number | string
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

interface JSONRPCNotification {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

export class MCPClient {
  private process: ChildProcess | null = null
  private requestId = 0
  private pendingRequests = new Map<number, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>()
  private tools: MCPTool[] = []
  private initialized = false
  private status: MCPConnectionStatus = 'disconnected'
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 3
  private buffer = ''
  private onStatusChange?: (status: MCPConnectionStatus, error?: string) => void

  constructor(private config: MCPServerConfig) {}

  setStatusCallback(cb: (status: MCPConnectionStatus, error?: string) => void): void {
    this.onStatusChange = cb
  }

  private setStatus(status: MCPConnectionStatus, error?: string): void {
    this.status = status
    this.onStatusChange?.(status, error)
  }

  getStatus(): MCPConnectionStatus {
    return this.status
  }

  getConfig(): MCPServerConfig {
    return { ...this.config }
  }

  async connect(): Promise<void> {
    if (this.process) {
      throw new Error('Already connected')
    }

    this.setStatus('connecting')
    this.requestId = 0
    this.pendingRequests.clear()
    this.tools = []
    this.initialized = false
    this.buffer = ''

    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.config.command, this.config.args, {
          env: { ...process.env, ...this.config.env },
          stdio: ['pipe', 'pipe', 'pipe']
        })

        let initTimeout: ReturnType<typeof setTimeout> | null = null

        const cleanup = (err?: Error) => {
          if (initTimeout) {
            clearTimeout(initTimeout)
            initTimeout = null
          }
          if (err) {
            this.setStatus('error', err.message)
            reject(err)
          }
        }

        initTimeout = setTimeout(() => {
          cleanup(new Error('MCP server initialization timeout'))
          this.disconnect().catch(() => {})
        }, 30000)

        this.process.stdout?.on('data', (data: Buffer) => {
          this.handleStdout(data)
        })

        this.process.stderr?.on('data', (data: Buffer) => {
          const msg = data.toString('utf-8').trim()
          if (msg) {
            console.error(`[MCP ${this.config.name}] ${msg}`)
          }
        })

        this.process.on('error', (err) => {
          console.error(`[MCP ${this.config.name}] process error:`, err)
          this.setStatus('error', err.message)
          cleanup(err)
        })

        this.process.on('close', (code) => {
          console.log(`[MCP ${this.config.name}] process exited with code ${code}`)
          this.setStatus('disconnected')
          this.process = null
          this.initialized = false
          this.pendingRequests.forEach((req) => {
            req.reject(new Error('MCP server process exited'))
          })
          this.pendingRequests.clear()

          // Auto-reconnect if not intentionally disconnected
          if (this.reconnectAttempts < this.maxReconnectAttempts && code !== 0) {
            this.reconnectAttempts++
            console.log(`[MCP ${this.config.name}] reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
            setTimeout(() => {
              this.connect().catch(() => {})
            }, 2000)
          }
        })

        // Send initialize request
        this.sendRequest('initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'opendesk', version: '0.1.0' }
        })
          .then(async () => {
            // Send initialized notification
            this.sendNotification('notifications/initialized', {})
            this.initialized = true

            // Fetch tools
            const toolsResult = await this.sendRequest('tools/list', {}) as { tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> }
            this.tools = (toolsResult.tools || []).map((t) => ({
              name: `${this.config.name}_${t.name}`,
              description: t.description,
              inputSchema: t.inputSchema,
              serverName: this.config.name
            }))

            this.setStatus('connected')
            this.reconnectAttempts = 0
            cleanup()
            resolve()
          })
          .catch((err) => {
            cleanup(err instanceof Error ? err : new Error(String(err)))
            this.disconnect().catch(() => {})
          })
      } catch (err) {
        this.setStatus('error', err instanceof Error ? err.message : String(err))
        reject(err)
      }
    })
  }

  async disconnect(): Promise<void> {
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent auto-reconnect
    this.setStatus('disconnected')

    // Reject all pending requests
    this.pendingRequests.forEach((req) => {
      req.reject(new Error('MCP client disconnected'))
    })
    this.pendingRequests.clear()

    if (this.process) {
      this.process.kill('SIGTERM')
      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL')
        }
      }, 5000)
      this.process = null
    }

    this.initialized = false
    this.tools = []
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.initialized) {
      throw new Error('MCP client not initialized')
    }
    return [...this.tools]
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    if (!this.initialized) {
      throw new Error('MCP client not initialized')
    }

    // Extract original tool name (remove server prefix)
    const originalName = name.startsWith(`${this.config.name}_`) ? name.slice(this.config.name.length + 1) : name

    const result = await this.sendRequest('tools/call', {
      name: originalName,
      arguments: args
    }) as { content?: Array<{ type: string; text?: string }>; isError?: boolean }

    if (result.isError) {
      throw new Error('Tool execution returned an error')
    }

    const textContent = result.content?.filter((c) => c.type === 'text').map((c) => c.text).join('\n')
    return textContent || JSON.stringify(result)
  }

  isConnected(): boolean {
    return this.status === 'connected' && this.initialized
  }

  getTools(): MCPTool[] {
    return [...this.tools]
  }

  private sendRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin?.writable) {
        reject(new Error('MCP server stdin not writable'))
        return
      }

      const id = ++this.requestId
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params
      }

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`MCP request timeout: ${method}`))
      }, 30000)

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeout)
          resolve(value)
        },
        reject: (reason) => {
          clearTimeout(timeout)
          reject(reason)
        }
      })

      this.process.stdin.write(JSON.stringify(request) + '\n', (err) => {
        if (err) {
          this.pendingRequests.delete(id)
          clearTimeout(timeout)
          reject(err)
        }
      })
    })
  }

  private sendNotification(method: string, params: Record<string, unknown>): void {
    if (!this.process?.stdin?.writable) {
      console.error('MCP server stdin not writable')
      return
    }

    const notification: JSONRPCNotification = {
      jsonrpc: '2.0',
      method,
      params
    }

    this.process.stdin.write(JSON.stringify(notification) + '\n', (err) => {
      if (err) {
        console.error(`Failed to send notification ${method}:`, err)
      }
    })
  }

  private handleStdout(data: Buffer): void {
    this.buffer += data.toString('utf-8')
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || '' // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const msg = JSON.parse(line) as JSONRPCResponse | JSONRPCNotification
        if ('id' in msg && msg.id !== undefined) {
          // Response
          const pending = this.pendingRequests.get(Number(msg.id))
          if (pending) {
            this.pendingRequests.delete(Number(msg.id))
            if (msg.error) {
              pending.reject(new Error(msg.error.message))
            } else {
              pending.resolve(msg.result)
            }
          }
        }
        // Notifications are ignored for now
      } catch (err) {
        console.error(`[MCP ${this.config.name}] Failed to parse JSON-RPC message:`, line, err)
      }
    }
  }
}
