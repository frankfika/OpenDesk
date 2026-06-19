import { ipcMain, BrowserWindow, desktopCapturer, screen, shell } from 'electron'
import { abortAllControllers } from './abort'
import { settings } from '../app-state'

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
    if (!settings.desktopEnabled) return { success: false, error: 'Desktop control is disabled' }
    try {
      const result = await shell.openPath(filePath)
      return { success: result === '', error: result || undefined }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('desktop:capture', async () => {
    if (!settings.desktopEnabled) return { success: false, error: 'Desktop control is disabled' }
    return captureScreenshot()
  })

  ipcMain.handle('desktop:emergencyStop', () => {
    if (!settings.desktopEnabled) return { success: false, error: 'Desktop control is disabled' }
    abortAllControllers()
    win.webContents.send('desktop:emergencyStop')
    return true
  })

  ipcMain.handle('desktop:getWindows', async () => {
    if (!settings.desktopEnabled) return []
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
