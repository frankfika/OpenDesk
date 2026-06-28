import { ipcMain } from 'electron'
import { recordChange, updateChange, listChanges, clearChanges, type ChangeEntryRow } from '../changeLog/store'

const channels = ['changelog:record', 'changelog:update', 'changelog:list', 'changelog:clear']

function removeStaleListeners(): void {
  for (const ch of channels) ipcMain.removeAllListeners(ch)
}

export function registerChangeLogHandlers(): void {
  removeStaleListeners()
  ipcMain.handle(
    'changelog:record',
    (_e, entry: Omit<ChangeEntryRow, 'id' | 'ts'> & { id?: string; ts?: number }) => recordChange(entry)
  )
  ipcMain.handle('changelog:update', (_e, id: string, patch: Partial<Omit<ChangeEntryRow, 'id'>>) => {
    updateChange(id, patch)
  })
  ipcMain.handle('changelog:list', (_e, opts?: { threadId?: string | null; limit?: number; sinceTs?: number }) =>
    listChanges(opts)
  )
  ipcMain.handle('changelog:clear', (_e, opts?: { threadId?: string }) => clearChanges(opts))
}