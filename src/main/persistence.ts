import { app, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import type { AppSettings, Message, Thread } from '../shared/types'
import { settings, setSettings, defaultSettings } from './app-state'

export function getConfigDir(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function getSettingsPath(): string {
  return join(getConfigDir(), 'settings.json')
}

export function getKeysPath(): string {
  return join(getConfigDir(), 'keys.bin')
}

export function getMessagesDir(): string {
  const dir = join(getConfigDir(), 'messages')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function getThreadsPath(): string {
  return join(getConfigDir(), 'threads.json')
}

export function getDraftPath(): string {
  return join(getConfigDir(), 'draft.json')
}

export function loadSettingsFromDisk(): AppSettings {
  const p = getSettingsPath()
  if (!existsSync(p)) return { ...defaultSettings }
  try {
    const saved = JSON.parse(readFileSync(p, 'utf-8')) as AppSettings
    const validModes: Array<AppSettings['approvalMode']> = ['ask', 'auto-edits', 'auto-all', 'bypass']
    // Migrate legacy approval mode: old 'ask' blocks shell/file tools by default.
    // Modern default is 'auto-edits' which auto-approves tools within allowed directories.
    if ((saved as AppSettings & { approvalMode?: string }).approvalMode === 'ask') {
      saved.approvalMode = 'auto-edits'
    }
    // Guard against invalid/missing approvalMode values (e.g. stale stubs, manual edits)
    if (!validModes.includes(saved.approvalMode)) {
      saved.approvalMode = 'auto-edits'
    }
    return { ...defaultSettings, ...saved }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettingsToDisk(s: AppSettings = settings): void {
  writeFileSync(getSettingsPath(), JSON.stringify(s, null, 2), 'utf-8')
}

export function loadKeys(): Record<string, string> {
  const p = getKeysPath()
  if (!existsSync(p)) return {}
  try {
    const buf = readFileSync(p)
    const decrypted = safeStorage.decryptString(buf)
    return JSON.parse(decrypted) as Record<string, string>
  } catch {
    return {}
  }
}

export function saveKeys(keys: Record<string, string>): void {
  const encrypted = safeStorage.encryptString(JSON.stringify(keys))
  writeFileSync(getKeysPath(), encrypted)
}

export function loadDraft(): { text: string; threadId: string | null; timestamp: number } | null {
  try {
    const p = getDraftPath()
    if (!existsSync(p)) return null
    return JSON.parse(readFileSync(p, 'utf-8')) as { text: string; threadId: string | null; timestamp: number }
  } catch {
    return null
  }
}

export function saveDraft(draft: { text: string; threadId: string | null; timestamp: number }): void {
  try {
    writeFileSync(getDraftPath(), JSON.stringify(draft))
  } catch {
    // ignore
  }
}

export function loadThreads(): Thread[] {
  const p = getThreadsPath()
  if (!existsSync(p)) return []
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as Thread[]
  } catch {
    return []
  }
}

export function saveThreads(threads: Thread[]): void {
  writeFileSync(getThreadsPath(), JSON.stringify(threads, null, 2), 'utf-8')
}

export function getMessagesPath(threadId: string): string {
  return join(getMessagesDir(), `${threadId}.json`)
}

export function loadMessages(threadId: string): Message[] {
  const p = getMessagesPath(threadId)
  if (!existsSync(p)) return []
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as Message[]
  } catch {
    return []
  }
}

export function saveMessages(threadId: string, messages: Message[]): void {
  writeFileSync(getMessagesPath(threadId), JSON.stringify(messages, null, 2), 'utf-8')
}

export function initSettings(): void {
  try {
    const migrated = loadSettingsFromDisk()
    setSettings(migrated)
    // Persist any migrated values (e.g. approvalMode) so the migration happens only once
    saveSettingsToDisk(migrated)
  } catch (err) {
    // Don't let a disk/permission failure crash app startup. Fall back to defaults in memory.
    console.error('[persistence] initSettings failed, falling back to defaults:', err)
    setSettings({ ...defaultSettings })
  }
}
