/**
 * Chat pipeline helper — drives the chat IPC for non-UI flows (WorkerPool,
 * scheduled tasks, expert seeding, etc).
 *
 * The chat:send IPC is fire-and-forget; tokens stream via chat:token events,
 * and completion is signalled by chat:done. This helper accumulates tokens
 * for a given threadId and resolves when the done event arrives.
 */

export interface ChatSendArgs {
  providerId: string
  prompt: string
  threadId: string
}

export interface ChatSendResult {
  ok: boolean
  text?: string
  error?: string
}

const DEFAULT_TIMEOUT_MS = 120_000

export async function runChat(args: ChatSendArgs, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<ChatSendResult> {
  const tokens: string[] = []
  let resolved = false

  const cleanups: Array<() => void> = []

  const unsubToken = window.api.chat.onToken(({ token, threadId }) => {
    if (resolved) return
    if (threadId !== args.threadId) return
    tokens.push(token)
  })
  cleanups.push(unsubToken)

  const donePromise = new Promise<{ ok: boolean; error?: string }>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const unsubDone = window.api.chat.onDone((meta) => {
      if (meta.threadId !== args.threadId) return
      if (resolved) return
      resolved = true
      if (timer) clearTimeout(timer)
      resolve({ ok: !meta.error, error: meta.error })
    })
    cleanups.push(unsubDone)
    timer = setTimeout(() => {
      if (resolved) return
      resolved = true
      resolve({ ok: true })
    }, timeoutMs)
    cleanups.push(() => {
      if (timer) clearTimeout(timer)
    })
  })

  try {
    window.api.chat.send({
      messages: [{ id: `user-${Date.now()}`, role: 'user', content: args.prompt, ts: Date.now() }],
      providerId: args.providerId,
      threadId: args.threadId
    } as unknown as Parameters<typeof window.api.chat.send>[0])
  } catch (err) {
    for (const c of cleanups) {
      try { c() } catch { /* ignore */ }
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  const result = await donePromise
  for (const c of cleanups) {
    try { c() } catch { /* ignore */ }
  }
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, text: tokens.join('') }
}