import { BrowserWindow } from 'electron'
import { initSettings, saveSettingsToDisk } from '../persistence'
import { settings } from '../app-state'
import { startHealthChecks } from '../providers/health-checker'
import { registerSettingsHandlers } from './settings'
import { registerMemoryHandlers } from './memory'
import { registerMcpHandlers, connectEnabledMcpServers } from './mcp'
import { registerSkillsHandlers } from './skills'
import { registerWorkspaceHandlers } from './workspace'
import { registerThreadHandlers } from './thread'
import { registerChatHandlers } from './chat'
import { registerDesktopHandlers } from './desktop'
import { registerDoctorHandlers } from './doctor'

export function registerIpcHandlers(win: BrowserWindow): void {
  // Load persisted settings on startup
  initSettings()

  // Connect enabled MCP servers on startup
  connectEnabledMcpServers().catch((err) => {
    console.error('Failed to connect enabled MCP servers on startup:', err)
  })

  // Register domain-specific handlers
  registerSettingsHandlers(win)
  registerMemoryHandlers(win)
  registerMcpHandlers(win)
  registerSkillsHandlers(win)
  registerWorkspaceHandlers(win)
  registerThreadHandlers(win)
  registerChatHandlers(win)
  registerDesktopHandlers(win)
  registerDoctorHandlers(win)

  /* ===== Health Checks ===== */
  startHealthChecks(
    () => settings,
    (providerId, result) => {
      const idx = settings.providers.findIndex((p) => p.id === providerId)
      if (idx !== -1) {
        settings.providers[idx] = { ...settings.providers[idx], lastTestResult: result, lastTestedAt: Date.now() }
        saveSettingsToDisk()
        win.webContents.send('provider:healthChanged', { providerId, result })
      }
    }
  )
}
