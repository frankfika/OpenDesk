import { ipcMain, BrowserWindow } from 'electron'
import { runDoctor } from '../doctor'

export function registerDoctorHandlers(_win: BrowserWindow): void {
  ipcMain.removeAllListeners('doctor:run')
  ipcMain.handle('doctor:run', () => runDoctor())
}
