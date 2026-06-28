/**
 * Worker Pool — fan-out a prompt across N providers/models and aggregate.
 *
 * The Pool is wired as a data-only abstraction in v0.6.0. The chat-stream
 * bridge (chat:send / chat:token) is event-based, so concurrent aggregation
 * is wired up via the chat listener store in v0.6.1.
 *
 * For now, the Pool accepts a "runner" callback (the caller wires it up
 * against the chat pipeline) so the rest of the app — including the
 * WorkerPoolPanel UI — can be exercised today.
 */

export interface PoolWorker {
  id: string
  providerId: string
  model?: string
  threadId?: string
  status: 'pending' | 'running' | 'success' | 'error'
  startedAt?: number
  finishedAt?: number
  resultText?: string
  error?: string
}

export interface PoolOptions {
  prompt: string
  workers: Array<Pick<PoolWorker, 'providerId' | 'model' | 'threadId'>>
  /** Runner is called once per worker; it returns a Promise of the assistant text. */
  runner: (worker: PoolWorker) => Promise<string>
  onWorkerUpdate?: (worker: PoolWorker) => void
  onComplete?: (workers: PoolWorker[]) => void
}

export interface PoolHandle {
  id: string
  workers: PoolWorker[]
  cancel(): void
  done: Promise<PoolWorker[]>
}

const uuid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function runWorkerPool(opts: PoolOptions): PoolHandle {
  const id = uuid()
  const workers: PoolWorker[] = opts.workers.map((w, idx) => ({
    id: `${id}-${idx}`,
    providerId: w.providerId,
    model: w.model,
    threadId: w.threadId,
    status: 'pending'
  }))

  const update = (idx: number, patch: Partial<PoolWorker>): void => {
    Object.assign(workers[idx], patch)
    opts.onWorkerUpdate?.(workers[idx])
  }

  let cancelled = false
  const cancel = (): void => {
    cancelled = true
  }

  const done = (async (): Promise<PoolWorker[]> => {
    await Promise.all(
      workers.map(async (w, idx) => {
        if (cancelled) {
          update(idx, { status: 'error', error: 'cancelled' })
          return
        }
        update(idx, { status: 'running', startedAt: Date.now() })
        try {
          const text = await opts.runner(w)
          if (cancelled) {
            update(idx, { status: 'error', error: 'cancelled' })
            return
          }
          update(idx, { status: 'success', resultText: text, finishedAt: Date.now() })
        } catch (err) {
          update(idx, {
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
            finishedAt: Date.now()
          })
        }
      })
    )
    opts.onComplete?.(workers)
    return workers
  })()

  return { id, workers, cancel, done }
}