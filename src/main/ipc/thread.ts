import { ipcMain, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { existsSync, rmSync } from 'fs'
import type { Thread, ThreadCreatePayload, ThreadUpdatePayload, Message } from '../../shared/types'
import { getSettings } from '../app-state'

import { loadThreads, saveThreads, getMessagesPath, loadMessages, saveMessages } from '../persistence'

const channels = [
  'thread:list',
  'thread:create',
  'thread:update',
  'thread:delete',
  'thread:loadMessages',
  'thread:saveMessages'
]

function removeStaleListeners(): void {
  for (const ch of channels) {
    ipcMain.removeAllListeners(ch)
  }
}

export function registerThreadHandlers(_win: BrowserWindow): void {
  removeStaleListeners()

  ipcMain.handle('thread:list', (_e, workspaceId: string) => {
    const threads = loadThreads()
    return threads.filter((t) => t.workspaceId === workspaceId)
  })

  ipcMain.handle('thread:create', (_e, payload: ThreadCreatePayload) => {
    const now = Date.now()
    const thread: Thread = {
      id: randomUUID(),
      workspaceId: payload.workspaceId,
      title: payload.title || 'New Chat',
      createdAt: now,
      updatedAt: now,
      providerId: payload.providerId || getSettings().activeProviderId || '',
      model: payload.model || '',
      totalInputTokens: 0,
      totalOutputTokens: 0,
      status: 'active',
      skillId: payload.skillId,
      mode: payload.mode,
      ensembleProviderIds: payload.ensembleProviderIds,
      arbitratorProviderId: payload.arbitratorProviderId
    }
    const threads = loadThreads()
    threads.push(thread)
    saveThreads(threads)
    return thread
  })

  ipcMain.handle('thread:update', (_e, id: string, patch: ThreadUpdatePayload) => {
    const threads = loadThreads()
    const idx = threads.findIndex((t) => t.id === id)
    if (idx === -1) return null
    threads[idx] = { ...threads[idx], ...patch, updatedAt: Date.now() }
    saveThreads(threads)
    return threads[idx]
  })

  ipcMain.handle('thread:delete', (_e, id: string) => {
    const threads = loadThreads()
    const filtered = threads.filter((t) => t.id !== id)
    if (filtered.length === threads.length) return false
    saveThreads(filtered)
    const msgPath = getMessagesPath(id)
    if (existsSync(msgPath)) {
      try {
        rmSync(msgPath)
      } catch {
        /* ignore */
      }
    }
    return true
  })

  ipcMain.handle('thread:loadMessages', (_e, threadId: string) => {
    return loadMessages(threadId)
  })

  ipcMain.handle('thread:saveMessages', (_e, threadId: string, messages: Message[]) => {
    saveMessages(threadId, messages)
    return true
  })
}
