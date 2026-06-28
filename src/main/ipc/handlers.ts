import { BrowserWindow } from 'electron'
import { settings } from '../app-state'
import { saveSettingsToDisk } from '../persistence'
import { startHealthChecks } from '../providers/health-checker'
import type { ProviderConfig } from '../../shared/types'
import { registerSettingsHandlers } from './settings'
import { registerMemoryHandlers } from './memory'
import { registerMcpHandlers } from './mcp'
import { registerSkillsHandlers } from './skills'
import { registerWorkspaceHandlers } from './workspace'
import { registerThreadHandlers } from './thread'
import { registerChatHandlers } from './chat'
import { registerDesktopHandlers } from './desktop'
import { registerDoctorHandlers } from './doctor'
import { registerToolsHandlers } from './tools'
import { registerRAGHandlers } from './rag'
import { registerWeb3Handlers } from './web3'
import { registerArtifactExportHandlers } from './artifacts-export'
import { registerExpertsHandlers } from './experts'
import { registerSchedulerHandlers } from './scheduler'
import { registerChangeLogHandlers } from './changeLog'

export function registerIpcHandlers(win: BrowserWindow): void {
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
  registerToolsHandlers(win)
  registerRAGHandlers(win)
  registerWeb3Handlers(win)
  registerArtifactExportHandlers(win)
  registerExpertsHandlers()
  registerSchedulerHandlers()
  registerChangeLogHandlers()

  /* ===== Health Checks ===== */
  startHealthChecks(
    () => settings,
    (providerId, result) => {
      const idx = settings.providers.findIndex((p: ProviderConfig) => p.id === providerId)
      if (idx !== -1) {
        settings.providers[idx] = { ...settings.providers[idx], lastTestResult: result, lastTestedAt: Date.now() }
        saveSettingsToDisk()
        win.webContents.send('provider:healthChanged', { providerId, result })
      }
    }
  )
}
