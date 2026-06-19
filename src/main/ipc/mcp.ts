import { ipcMain, BrowserWindow } from 'electron'
import type { MCPServerConfig } from '../../shared/types'
import { mcpBridge } from '../mcp/mcp-bridge'
import { settings, patchSettings } from '../app-state'
import { saveSettingsToDisk } from '../persistence'

const channels = [
  'mcp:listServers',
  'mcp:addServer',
  'mcp:removeServer',
  'mcp:toggleServer',
  'mcp:listTools',
  'mcp:callTool'
]

function removeStaleListeners(): void {
  for (const ch of channels) {
    ipcMain.removeAllListeners(ch)
  }
}

export function registerMcpHandlers(_win: BrowserWindow): void {
  removeStaleListeners()

  ipcMain.handle('mcp:listServers', () => {
    return settings.mcpServers.map((s) => ({
      ...s,
      status: mcpBridge.getServerStatus(s.name)
    }))
  })

  ipcMain.handle('mcp:addServer', (_e, config: MCPServerConfig) => {
    const exists = settings.mcpServers.find((s) => s.name === config.name)
    if (exists) return false
    settings.mcpServers.push(config)
    saveSettingsToDisk()
    if (config.enabled) {
      mcpBridge.connectServer(config).catch((err) => {
        console.error(`Failed to connect MCP server ${config.name}:`, err)
      })
    }
    return true
  })

  ipcMain.handle('mcp:removeServer', async (_e, name: string) => {
    await mcpBridge.disconnectServer(name)
    patchSettings({ mcpServers: settings.mcpServers.filter((s) => s.name !== name) })
    saveSettingsToDisk()
    return true
  })

  ipcMain.handle('mcp:toggleServer', async (_e, name: string) => {
    const server = settings.mcpServers.find((s) => s.name === name)
    if (!server) return false
    server.enabled = !server.enabled
    saveSettingsToDisk()
    if (server.enabled) {
      await mcpBridge.connectServer(server).catch((err) => {
        console.error(`Failed to connect MCP server ${name}:`, err)
      })
    } else {
      await mcpBridge.disconnectServer(name)
    }
    return true
  })

  ipcMain.handle('mcp:listTools', () => {
    return mcpBridge.getAllTools()
  })

  ipcMain.handle('mcp:callTool', async (_e, name: string, args: Record<string, unknown>) => {
    return mcpBridge.callTool(name, args)
  })
}

export async function connectEnabledMcpServers(): Promise<void> {
  for (const server of settings.mcpServers) {
    if (server.enabled) {
      mcpBridge.connectServer(server).catch((err) => {
        console.error(`Failed to connect MCP server ${server.name} on startup:`, err)
      })
    }
  }
}
