import { globalShortcut, BrowserWindow, ipcMain } from 'electron'

export function registerShortcuts(win: BrowserWindow): void {
  // Toggle window visibility
  const toggleKey = process.platform === 'darwin' ? 'Command+Shift+Space' : 'Control+Shift+Space'
  globalShortcut.register(toggleKey, () => {
    if (win.isVisible() && win.isFocused()) {
      win.hide()
    } else {
      win.show()
      win.focus()
    }
  })

  // Emergency stop
  const stopKey = process.platform === 'darwin' ? 'Command+.' : 'Control+.'
  globalShortcut.register(stopKey, () => {
    win.webContents.send('desktop:emergencyStop')
  })

  // Focus input
  const focusKey = process.platform === 'darwin' ? 'Command+K' : 'Control+K'
  globalShortcut.register(focusKey, () => {
    if (!win.isVisible()) win.show()
    win.focus()
    win.webContents.send('app:focus-input')
  })

  // New chat
  const newChatKey = process.platform === 'darwin' ? 'Command+N' : 'Control+N'
  globalShortcut.register(newChatKey, () => {
    if (!win.isVisible()) win.show()
    win.focus()
    win.webContents.send('app:new-chat')
  })

  // Open settings
  const settingsKey = process.platform === 'darwin' ? 'Command+,' : 'Control+,'
  globalShortcut.register(settingsKey, () => {
    if (!win.isVisible()) win.show()
    win.focus()
    win.webContents.send('app:open-settings')
  })

  // Toggle sidebar
  const toggleSidebarKey = process.platform === 'darwin' ? 'Command+Shift+.' : 'Control+Shift+.'
  globalShortcut.register(toggleSidebarKey, () => {
    if (!win.isVisible()) win.show()
    win.focus()
    win.webContents.send('app:toggle-sidebar')
  })

  // Toggle theme
  const toggleThemeKey = process.platform === 'darwin' ? 'Command+Shift+T' : 'Control+Shift+T'
  globalShortcut.register(toggleThemeKey, () => {
    if (!win.isVisible()) win.show()
    win.focus()
    win.webContents.send('app:toggle-theme')
  })

  // Focus model picker
  const focusModelKey = process.platform === 'darwin' ? 'Command+Shift+M' : 'Control+Shift+M'
  globalShortcut.register(focusModelKey, () => {
    if (!win.isVisible()) win.show()
    win.focus()
    win.webContents.send('app:focus-model')
  })
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
