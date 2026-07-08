/**
 * runDiagnostics — 触发 `window.api.doctor.run()` 并把结果用 Toast 回显。
 *
 * 解决之前 `Run Diagnostics` 按钮"点了没反应"的问题：之前的实现是
 * `await doctor.run().catch(console.error)`，执行了但用户看不到任何反馈。
 *
 * 用法（任意组件）：
 *   import { useRunDiagnostics } from '../lib/runDiagnostics'
 *   const runDiagnostics = useRunDiagnostics({ onViewDetail: () => openSettings('general') })
 *   <button onClick={runDiagnostics}>运行分析</button>
 */
import { useCallback } from 'react'
import { useToast } from '../store/toast'

export interface RunDiagnosticsOptions {
  /** 当结果包含失败项时，"查看详情" 按钮被点击时会调用此回调。 */
  onViewDetail?: () => void
}

export function useRunDiagnostics(opts: RunDiagnosticsOptions = {}): () => Promise<void> {
  const toast = useToast()
  return useCallback(async () => {
    toast.info('正在运行系统分析…')
    try {
      const report = (await window.api?.doctor?.run?.()) as
        | {
            overall: 'pass' | 'warn' | 'fail' | string
            checks: Array<{ status: 'pass' | 'warn' | 'fail' | string }>
          }
        | undefined
      if (!report) {
        toast.error('系统分析未返回结果')
        return
      }
      const failed = report.checks?.filter((c) => c.status === 'fail').length ?? 0
      const warned = report.checks?.filter((c) => c.status === 'warn').length ?? 0
      const passed = report.checks?.filter((c) => c.status === 'pass').length ?? 0
      const summary = `分析完成：${passed} 通过 · ${warned} 警告 · ${failed} 失败`
      if (report.overall === 'pass') toast.success(summary)
      else if (report.overall === 'warn') toast.info(summary)
      else
        toast.error(summary, {
          label: '查看详情',
          onClick: () => {
            if (opts.onViewDetail) opts.onViewDetail()
            else
              window.dispatchEvent(
                new CustomEvent('opendesk:open-settings', { detail: { tab: 'general' } })
              )
          }
        })
    } catch (e) {
      toast.error(`分析失败：${e instanceof Error ? e.message : String(e)}`)
    }
  }, [toast, opts])
}