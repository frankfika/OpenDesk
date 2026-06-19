import { ipcMain, BrowserWindow } from 'electron'
import type { Message } from '../../shared/types'
import { createMemoryService } from '../memory/memory-service'

const memoryService = createMemoryService()

const channels = ['memory:load', 'memory:save', 'memory:append', 'memory:extract']

function removeStaleListeners(): void {
  for (const ch of channels) {
    ipcMain.removeAllListeners(ch)
  }
}

export function registerMemoryHandlers(_win: BrowserWindow): void {
  removeStaleListeners()

  ipcMain.handle('memory:load', (_e, category: 'user' | 'identity' | 'soul') => {
    return memoryService.getMemory()[category]
  })

  ipcMain.handle('memory:save', (_e, category: 'user' | 'identity' | 'soul', content: string) => {
    memoryService.updateMemory(category, content)
  })

  ipcMain.handle('memory:append', (_e, entries: Array<{ content: string; timestamp: number; source: string }>) => {
    memoryService.appendExtracted(entries)
  })

  ipcMain.handle('memory:extract', (_e, messages: Array<{ role: string; content: string }>) => {
    return memoryService.extractFromMessages(messages as Message[])
  })
}

export { memoryService }
