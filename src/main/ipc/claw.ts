import { ipcMain, BrowserWindow } from 'electron'
import { getClawManager } from '../claw/manager'

const channels = [
  'claw:getConfig',
  'claw:updateConfig',
  'claw:start',
  'claw:stop',
  'claw:sendMessage',
  'claw:isRunning',
  'claw:onMessage',
  'claw:onStatus',
  'claw:onError'
]

function removeStaleListeners(): void {
  for (const ch of channels) ipcMain.removeAllListeners(ch)
}

export function registerClawHandlers(win: BrowserWindow): void {
  removeStaleListeners()
  const manager = getClawManager()
  manager.init(win)

  ipcMain.handle('claw:getConfig', () => manager.getConfig())
  ipcMain.handle('claw:updateConfig', (_e, patch: Parameters<typeof manager.updateConfig>[0]) =>
    manager.updateConfig(patch)
  )
  ipcMain.handle('claw:start', () => manager.start())
  ipcMain.handle('claw:stop', () => manager.stop())
  ipcMain.handle('claw:sendMessage', (_e, chatId: number, text: string) =>
    manager.sendMessage(chatId, text)
  )
  ipcMain.handle('claw:isRunning', () => manager.isRunning())
}