import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useToastStore, type Toast, type ToastType } from '../../store/toast'

const toastConfig: Record<ToastType, { icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
  success: {
    icon: CheckCircle2,
    color: 'text-[var(--success)]',
    bg: 'bg-[var(--success-bg)]/80',
    border: 'border-[var(--success-border)]'
  },
  error: {
    icon: AlertCircle,
    color: 'text-[var(--error)]',
    bg: 'bg-[var(--error-bg)]/80',
    border: 'border-[var(--error-border)]'
  },
  info: {
    icon: Info,
    color: 'text-[var(--info)]',
    bg: 'bg-[var(--info-bg)]/80',
    border: 'border-[var(--info-border)]'
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-[var(--warning)]',
    bg: 'bg-[var(--warning-bg)]/80',
    border: 'border-[var(--warning-border)]'
  }
}

function ToastItem({
  toast,
  onRemove,
  onPause,
  onResume
}: {
  toast: Toast
  onRemove: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
}) {
  const config = toastConfig[toast.type]
  const Icon = config.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
      onMouseEnter={() => onPause(toast.id)}
      onMouseLeave={() => onResume(toast.id)}
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg',
        'min-w-[280px] max-w-[400px]',
        config.bg,
        config.border,
        'bg-[var(--bg-content)]/90'
      )}
    >
      <Icon size={18} className={cn('mt-0.5 shrink-0', config.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{toast.message}</p>
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick()
              onRemove(toast.id)
            }}
            className={cn('mt-1.5 text-[11px] font-medium hover:underline', config.color)}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

export function ToastContainer() {
  const { toasts, remove, pause, resume } = useToastStore()

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={remove} onPause={pause} onResume={resume} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
