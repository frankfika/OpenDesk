/**
 * Claw manager — orchestrates one Telegram bot + many chat bindings.
 *
 * Persists config + bindings to userData/claw.json. Surfaces IPC events
 * (`claw:message` / `claw:status`) so the renderer can react and update UI.
 */

import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { createTelegramBot, type TelegramBot } from './telegram'

export interface ChatBinding {
  chatId: number
  label?: string
  /** When set, the inbound message is forwarded only into this thread. */
  threadId?: string
}

interface ClawConfig {
  telegramToken?: string
  allowedChatIds?: number[]
  pollingTimeout?: number
  bindings?: ChatBinding[]
  enabled?: boolean
}

interface Persisted {
  config: ClawConfig
}

const CONFIG_PATH = (): string => join(app.getPath('userData'), 'claw.json')

function readConfig(): ClawConfig {
  const p = CONFIG_PATH()
  if (!existsSync(p)) return {}
  try {
    const raw = JSON.parse(readFileSync(p, 'utf8')) as Persisted
    return raw.config ?? {}
  } catch {
    return {}
  }
}

function writeConfig(cfg: ClawConfig): void {
  const p = CONFIG_PATH()
  mkdirSync(dirnameSafe(p), { recursive: true })
  writeFileSync(p, JSON.stringify({ config: cfg }, null, 2), 'utf8')
}

function dirnameSafe(p: string): string {
  const i = p.lastIndexOf('/')
  return i === -1 ? p : p.slice(0, i)
}

export class ClawManager {
  private bot: TelegramBot | null = null
  private cfg: ClawConfig = {}
  private win: BrowserWindow | null = null

  init(win: BrowserWindow): void {
    this.win = win
    this.cfg = readConfig()
    if (this.cfg.enabled && this.cfg.telegramToken) {
      void this.start()
    }
  }

  isRunning(): boolean {
    return this.bot?.isRunning() ?? false
  }

  getConfig(): ClawConfig {
    return { ...this.cfg }
  }

  async updateConfig(patch: Partial<ClawConfig>): Promise<ClawConfig> {
    const next: ClawConfig = { ...this.cfg, ...patch }
    this.cfg = next
    writeConfig(next)
    if (this.bot) {
      await this.bot.stop()
      this.bot = null
    }
    if (next.enabled && next.telegramToken) {
      await this.start()
    }
    this.emitStatus()
    return next
  }

  async start(): Promise<void> {
    if (!this.cfg.telegramToken) throw new Error('Telegram token not configured')
    if (this.bot?.isRunning()) return
    this.bot = createTelegramBot({
      token: this.cfg.telegramToken,
      allowedChatIds: this.cfg.allowedChatIds,
      pollingTimeout: this.cfg.pollingTimeout
    })
    this.bot.on('message', (m) => {
      this.win?.webContents.send('claw:message', m)
    })
    this.bot.on('error', (err) => {
      this.win?.webContents.send('claw:error', { message: err.message })
    })
    await this.bot.start()
    this.emitStatus()
  }

  async stop(): Promise<void> {
    if (this.bot) {
      await this.bot.stop()
      this.bot = null
    }
    this.emitStatus()
  }

  async sendMessage(chatId: number, text: string): Promise<void> {
    if (!this.bot) throw new Error('Claw bot not running')
    await this.bot.sendMessage(chatId, text)
  }

  private emitStatus(): void {
    this.win?.webContents.send('claw:status', {
      running: this.isRunning(),
      hasToken: Boolean(this.cfg.telegramToken),
      bindingCount: this.cfg.bindings?.length ?? 0
    })
  }
}

let _manager: ClawManager | null = null

export function getClawManager(): ClawManager {
  if (!_manager) _manager = new ClawManager()
  return _manager
}