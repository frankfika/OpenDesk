/**
 * WorkerPoolPanel — shows concurrent workers' progress, results, and timing.
 *
 * Triggered via the "Pool" button in the InputBarToolbar (next to Ensemble).
 * Renders a modal-style overlay with one row per worker; live updates
 * streamed from `runWorkerPool`.
 */

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Loader2, Check, AlertCircle, Layers } from 'lucide-react'
import { runWorkerPool, type PoolWorker, type PoolHandle } from '../../lib/workerPool'
import { runChat } from '../../lib/chatPipeline'
import { useSettingsStore } from '../../store/settings'

interface WorkerPoolPanelProps {
  open: boolean
  onClose: () => void
  prompt: string
}

export default function WorkerPoolPanel({ open, onClose, prompt }: WorkerPoolPanelProps): JSX.Element | null {
  const settings = useSettingsStore((s) => s.settings)
  const [workers, setWorkers] = useState<PoolWorker[]>([])
  const [running, setRunning] = useState(false)
  const [pool, setPool] = useState<PoolHandle | null>(null)
  const [tickAt, setTickAt] = useState<number>(0)

  // tick once per second while at least one worker is running, so duration
  // labels update. `tickAt` captures `Date.now()` in the effect (not render),
  // which keeps the JSX pure.
  useEffect(() => {
    if (!running) return
    setTickAt(Date.now())
    const t = setInterval(() => setTickAt(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running])

  const enabledProviders = settings.providers.filter((p) => p.enabled)

  const handleRun = useCallback(() => {
    if (running) return
    setRunning(true)
    setWorkers([])
    const poolId = `pool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const handle = runWorkerPool({
      prompt,
      workers: enabledProviders.slice(0, 4).map((p) => ({
        providerId: p.id,
        model: p.model,
        threadId: `${poolId}-${p.id.replace(/[^a-zA-Z0-9]/g, '')}`
      })),
      runner: async (w) => {
        if (!w.threadId) throw new Error('no threadId assigned')
        const result = await runChat({
          providerId: w.providerId,
          prompt,
          threadId: w.threadId
        })
        if (!result.ok) throw new Error(result.error ?? 'chat failed')
        return result.text ?? ''
      },
      onWorkerUpdate: (w) => {
        setWorkers((prev) => {
          const idx = prev.findIndex((x) => x.id === w.id)
          if (idx === -1) return [...prev, w]
          const next = [...prev]
          next[idx] = w
          return next
        })
      },
      onComplete: () => setRunning(false)
    })
    setPool(handle)
    void handle.done
  }, [running, prompt, enabledProviders])

  useEffect(() => {
    if (!open) {
      pool?.cancel()
      setPool(null)
      setWorkers([])
      setRunning(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        data-component="worker-pool-panel"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-[640px] max-w-[90vw] max-h-[80vh] flex flex-col rounded-lg border border-[var(--border)] bg-[var(--bg-content)] shadow-2xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-[var(--accent)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">多 Agent Worker Pool</span>
              <span className="text-[10px] text-[var(--text-muted)]">({enabledProviders.length} providers enabled)</span>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-[var(--bg-sidebar)]">
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="text-[11px] text-[var(--text-muted)] mb-3">
              同时跑 <strong>{Math.min(enabledProviders.length, 4)}</strong> 个 model，每个独立对话，最后汇总不同视角。
            </div>

            <div className="flex flex-col gap-2">
              {workers.length === 0 && !running && (
                <div className="border border-dashed border-[var(--border)] rounded-md px-4 py-8 text-center">
                  <p className="text-xs text-[var(--text-muted)]">点击下方按钮开始 fan-out</p>
                </div>
              )}
              {workers.map((w) => {
                const provider = enabledProviders.find((p) => p.id === w.providerId)
                return (
                  <div
                    key={w.id}
                    className="border border-[var(--border)] rounded-md p-3 bg-[var(--bg-sidebar)]/30"
                    data-worker-status={w.status}
                  >
                    <div className="flex items-center gap-2">
                      <StatusIcon status={w.status} />
                      <span className="text-xs font-medium text-[var(--text-primary)]">{provider?.name ?? w.providerId}</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">{w.model}</span>
                      <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                        {w.status === 'running'
                          ? `${Math.max(0, Math.floor((tickAt - (w.startedAt ?? tickAt)) / 1000))}s`
                          : w.finishedAt && w.startedAt
                          ? `${Math.max(0, Math.floor((w.finishedAt - w.startedAt) / 1000))}s`
                          : ''}
                      </span>
                    </div>
                    {w.status === 'success' && w.resultText && (
                      <p className="mt-2 text-[11px] text-[var(--text-secondary)] line-clamp-4">{w.resultText}</p>
                    )}
                    {w.status === 'error' && (
                      <p className="mt-2 text-[11px] text-red-500">{w.error}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="px-4 py-3 border-t border-[var(--border)] flex items-center gap-2">
            <button
              type="button"
              onClick={handleRun}
              disabled={running || enabledProviders.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[var(--accent)] text-white disabled:opacity-50"
            >
              <Play size={11} />
              {running ? '运行中…' : workers.length > 0 ? '再次 fan-out' : '开始 fan-out'}
            </button>
            {running && (
              <button
                type="button"
                onClick={() => pool?.cancel()}
                className="px-3 py-1.5 text-xs rounded border border-[var(--border)] hover:bg-[var(--bg-sidebar)]"
              >
                取消
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto px-3 py-1.5 text-xs rounded border border-[var(--border)] hover:bg-[var(--bg-sidebar)]"
            >
              关闭
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function StatusIcon({ status }: { status: PoolWorker['status'] }): JSX.Element {
  if (status === 'running') return <Loader2 size={12} className="text-[var(--accent)] animate-spin" />
  if (status === 'success') return <Check size={12} className="text-green-500" />
  if (status === 'error') return <AlertCircle size={12} className="text-red-500" />
  return <div className="w-3 h-3 rounded-full bg-[var(--text-muted)] opacity-40" />
}