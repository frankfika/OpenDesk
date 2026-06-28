import { ipcMain } from 'electron'
import { BUILTIN_EXPERTS } from '../experts/registry'

const channels = ['experts:list', 'experts:get']

function removeStaleListeners(): void {
  for (const ch of channels) ipcMain.removeAllListeners(ch)
}

export function registerExpertsHandlers(): void {
  removeStaleListeners()
  ipcMain.handle('experts:list', () => BUILTIN_EXPERTS)
  ipcMain.handle('experts:get', (_e, id: string) =>
    BUILTIN_EXPERTS.find((e) => e.id === id) ?? null
  )
}