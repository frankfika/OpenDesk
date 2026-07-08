import { Tray, Menu, nativeImage, BrowserWindow, app, NativeImage } from 'electron'
import { join } from 'path'

let trayInstance: Tray | null = null

function createIcon(): NativeImage {
  // Try multiple candidate paths for dev + packaged environments.
  const candidates = [
    join(process.resourcesPath || '', 'resources', 'icon.png'),
    join(process.resourcesPath || '', 'icon.png'),
    join(app.getAppPath(), 'resources', 'icon.png'),
    join(__dirname, '..', '..', 'resources', 'icon.png'),
    join(__dirname, '..', '..', '..', 'resources', 'icon.png'),
    join(__dirname, 'resources', 'icon.png')
  ]
  for (const p of candidates) {
    if (p && fsExists(p)) {
      const img = nativeImage.createFromPath(p)
      if (!img.isEmpty()) return img
    }
  }

  // Fallback: empty 16x16 image (OS will render as a generic icon)
  return nativeImage.createEmpty()
}

function fsExists(p: string): boolean {
  try {
    const { existsSync } = require('fs')
    return existsSync(p)
  } catch {
    return false
  }
}

export function createTray(win: BrowserWindow): Tray {
  if (trayInstance) {
    trayInstance.destroy()
  }

  const icon = createIcon()
  trayInstance = new Tray(icon)
  trayInstance.setToolTip('OpenDesk')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'New Chat',
      click: () => {
        win.webContents.send('app:new-chat')
        if (!win.isVisible()) win.show()
        win.focus()
      }
    },
    {
      label: 'Show Window',
      click: () => {
        if (win.isVisible()) {
          win.hide()
        } else {
          win.show()
          win.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        win.webContents.send('app:open-settings')
        if (!win.isVisible()) win.show()
        win.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  trayInstance.setContextMenu(contextMenu)

  trayInstance.on('click', () => {
    if (win.isVisible()) {
      win.hide()
    } else {
      win.show()
      win.focus()
    }
  })

  return trayInstance
}

export function destroyTray(): void {
  if (trayInstance) {
    trayInstance.destroy()
    trayInstance = null
  }
}
