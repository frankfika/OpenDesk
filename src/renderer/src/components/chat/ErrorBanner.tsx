import { ShieldAlert } from 'lucide-react'

interface ErrorBannerProps {
  error: string | null
  errorType?: 'auth' | 'network' | 'model' | 'provider' | 'ollama' | 'workspace' | 'generic' | null
  onOpenSettings?: () => void
  onDismiss?: () => void
}

export default function ErrorBanner({ error, errorType, onOpenSettings, onDismiss }: ErrorBannerProps) {
  if (!error) return null
  return (
    <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-[var(--error-bg)]/80 dark:bg-[var(--error-bg)]/30 text-[var(--error)] dark:text-red-400 border border-[var(--error-border)] dark:border-red-800 shadow-sm">
      <div className="flex items-start gap-2">
        <ShieldAlert size={16} className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{error}</p>
          {errorType === 'auth' && (
            <p className="mt-1 text-xs opacity-80">API key 无效或已过期。请检查设置中的 API key。</p>
          )}
          {errorType === 'network' && (
            <p className="mt-1 text-xs opacity-80">网络连接失败。请检查网络或 provider 的 base URL 是否正确。</p>
          )}
          {errorType === 'model' && <p className="mt-1 text-xs opacity-80">模型不可用或不存在。请尝试切换其他模型。</p>}
          {errorType === 'provider' && (
            <p className="mt-1 text-xs opacity-80">Provider 未配置。请先添加并启用一个 AI provider。</p>
          )}
          {errorType === 'ollama' && (
            <p className="mt-1 text-xs opacity-80">Ollama 服务未运行。请启动 Ollama 或检查端口设置。</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {errorType === 'auth' && onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-2.5 py-1 rounded-lg bg-[var(--error-bg)] dark:bg-red-900/40 text-[var(--error)] dark:text-[var(--error)] text-xs font-medium hover:bg-[var(--error-border)] dark:hover:bg-red-900/60 transition-colors"
            >
              设置 API Key
            </button>
          )}
          {errorType === 'provider' && onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-2.5 py-1 rounded-lg bg-[var(--error-bg)] dark:bg-red-900/40 text-[var(--error)] dark:text-[var(--error)] text-xs font-medium hover:bg-[var(--error-border)] dark:hover:bg-red-900/60 transition-colors"
            >
              配置 Provider
            </button>
          )}
          {errorType === 'ollama' && (
            <button
              type="button"
              onClick={() => window.open('https://ollama.com/download', '_blank')}
              className="px-2.5 py-1 rounded-lg bg-[var(--error-bg)] dark:bg-red-900/40 text-[var(--error)] dark:text-[var(--error)] text-xs font-medium hover:bg-[var(--error-border)] dark:hover:bg-red-900/60 transition-colors"
            >
              下载 Ollama
            </button>
          )}
          {onDismiss && (
            <button type="button" onClick={onDismiss} className="opacity-70 hover:opacity-100 p-1">
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
