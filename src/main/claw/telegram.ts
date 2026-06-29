/**
 * Claw — Telegram bot driver (long polling).
 *
 * Get a token from @BotFather, drop it in Settings → Claw → Telegram Token,
 * and the bot forwards every incoming message into the chat pipeline. The
 * assistant's reply is then sent back to the chat that originated it.
 *
 * No enterprise verification needed — anyone can create a bot in 30
 * seconds. For WeChat / WeCom / Lark / DingTalk we'd need corporate
 * credentials and webhook URLs, so we ship Telegram first and leave
 * platform-specific adapters as TODOs.
 */

export type TelegramEvent = 'message' | 'error'
export interface TelegramMessage {
  chatId: number
  text: string
  from: string
  messageId: number
}

export interface TelegramConfig {
  token: string
  allowedChatIds?: number[]
  pollingTimeout?: number
}

export interface TelegramBot {
  start(): Promise<void>
  stop(): Promise<void>
  sendMessage(chatId: number, text: string): Promise<void>
  isRunning(): boolean
  on(event: 'message', cb: (m: TelegramMessage) => void): () => void
  on(event: 'error', cb: (err: Error) => void): () => void
}

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: { id: number; first_name?: string; username?: string }
    chat: { id: number; type: string }
    date: number
    text?: string
  }
}

const TELEGRAM_API = (token: string): string => `https://api.telegram.org/bot${token}`

export function createTelegramBot(config: TelegramConfig): TelegramBot {
  const listeners = new Map<TelegramEvent, Set<(...args: unknown[]) => void>>()
  let running = false
  let offset = 0
  let pollAbort: AbortController | null = null

  function on(event: 'message', cb: (m: TelegramMessage) => void): () => void
  function on(event: 'error', cb: (err: Error) => void): () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function on(event: TelegramEvent, cb: (arg: any) => void): () => void {
    let set = listeners.get(event)
    if (!set) {
      set = new Set()
      listeners.set(event, set)
    }
    set.add(cb)
    return () => {
      set?.delete(cb)
    }
  }

  function fire<E extends TelegramEvent>(event: E, payload: unknown): void {
    const set = listeners.get(event)
    if (!set) return
    for (const cb of set) {
      try {
        cb(payload)
      } catch (err) {
        // never let a buggy listener kill the bot
        console.error('[telegram] listener error', err)
      }
    }
  }

  async function call<T>(method: string, body?: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    const res = await fetch(`${TELEGRAM_API(config.token)}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      signal
    })
    if (!res.ok) {
      throw new Error(`Telegram ${method} ${res.status}: ${(await res.text()).slice(0, 200)}`)
    }
    const json = (await res.json()) as { ok: boolean; result?: T; description?: string }
    if (!json.ok) {
      throw new Error(`Telegram ${method} failed: ${json.description ?? 'unknown'}`)
    }
    return json.result as T
  }

  async function pollOnce(): Promise<void> {
    if (!running) return
    pollAbort = new AbortController()
    try {
      const updates = await call<TelegramUpdate[]>(
        'getUpdates',
        {
          offset,
          timeout: Math.max(1, Math.min(30, config.pollingTimeout ?? 25)),
          allowed_updates: ['message']
        },
        pollAbort.signal
      )
      for (const u of updates) {
        offset = Math.max(offset, u.update_id + 1)
        if (!u.message?.text) continue
        if (config.allowedChatIds && config.allowedChatIds.length > 0) {
          if (!config.allowedChatIds.includes(u.message.chat.id)) continue
        }
        fire('message', {
          chatId: u.message.chat.id,
          messageId: u.message.message_id,
          text: u.message.text,
          from: u.message.from?.username ?? u.message.from?.first_name ?? 'unknown',
          date: u.message.date
        })
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      fire('error', err)
    } finally {
      if (running) setTimeout(() => void pollOnce(), 250)
    }
  }

  return {
    start: async () => {
      if (running) return
      running = true
      // Verify token up front so the user sees config errors immediately
      await call('getMe')
      void pollOnce()
    },
    stop: async () => {
      running = false
      pollAbort?.abort()
      pollAbort = null
    },
    sendMessage: async (chatId, text) => {
      const chunks: string[] = []
      let rest = text
      while (rest.length > 4000) {
        chunks.push(rest.slice(0, 4000))
        rest = rest.slice(4000)
      }
      chunks.push(rest)
      for (const chunk of chunks) {
        await call('sendMessage', { chat_id: chatId, text: chunk })
      }
    },
    isRunning: () => running,
    on
  }
}