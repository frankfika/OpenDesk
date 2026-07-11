import { ipcMain, BrowserWindow, desktopCapturer, screen, shell } from 'electron'
import { abortAllControllers } from './abort'
import { getSettings } from '../app-state'

// `settings` was previously a mutable module-level `let`; callers used
// `getSettings().foo` directly. To make the export immutable without changing
// every call site, we alias the function under a local const below. Note:
// this captures a reference once at module load — to read fresh state,
// call `getSettings()` directly.

const channels = ['desktop:openPath', 'desktop:capture', 'desktop:emergencyStop', 'desktop:getWindows']

function removeStaleListeners(): void {
  for (const ch of channels) {
    ipcMain.removeAllListeners(ch)
  }
}

async function captureScreenshot(): Promise<string> {
  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: primaryDisplay.size
    })
    const primarySource = sources.find((s) => s.display_id === String(primaryDisplay.id)) || sources[0]
    if (!primarySource) throw new Error('No screen source found')
    return primarySource.thumbnail.toPNG().toString('base64')
  } catch (err) {
    throw new Error(`Screenshot failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export function registerDesktopHandlers(win: BrowserWindow): void {
  removeStaleListeners()

  ipcMain.handle('desktop:openPath', async (_e, filePath: string) => {
    if (!getSettings().desktopEnabled) return { success: false, error: 'Desktop control is disabled' }
    try {
      const result = await shell.openPath(filePath)
      return { success: result === '', error: result || undefined }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('desktop:capture', async () => {
    if (!getSettings().desktopEnabled) return { success: false, error: 'Desktop control is disabled' }
    return captureScreenshot()
  })

  ipcMain.handle('desktop:emergencyStop', () => {
    if (!getSettings().desktopEnabled) return { success: false, error: 'Desktop control is disabled' }
    abortAllControllers()
    win.webContents.send('desktop:emergencyStop')
    return true
  })

  ipcMain.handle('desktop:getWindows', async () => {
    if (!getSettings().desktopEnabled) return []
    try {
      const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 0, height: 0 } })
      return sources.map((s) => ({
        id: s.id,
        name: s.name,
        appIcon: s.appIcon ? s.appIcon.toPNG().toString('base64') : undefined
      }))
    } catch {
      return []
    }
  })
}
