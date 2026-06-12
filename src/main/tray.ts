import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import { join } from 'path'

let trayInstance: Tray | null = null

function createIcon(): native.NativeImage {
  // Try to use bundled icon
  const iconPath = join(process.resourcesPath || __dirname, 'resources', 'icon.png')
  if (existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath)
  }

  // Fallback: generate a simple 16x16 template icon (transparent with a dot)
  const size = { width: 16, height: 16 }
  const empty = nativeImage.createEmpty()
  // Create a simple colored square as fallback
  const canvas = nativeImage.createFromBuffer(Buffer.alloc(size.width * size.height * 4), size)
  return canvas
}

function existsSync(p: string): boolean {
  try {
    const { existsSync: fsExists } = require('fs')
    return fsExists(p)
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
