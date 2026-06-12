import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  add: (toast: Omit<Toast, 'id'>) => string
  remove: (id: string) => void
  success: (message: string, action?: { label: string; onClick: () => void }) => void
  error: (message: string, action?: { label: string; onClick: () => void }) => void
  info: (message: string, action?: { label: string; onClick: () => void }) => void
  warning: (message: string, action?: { label: string; onClick: () => void }) => void
}

let toastIdCounter = 0
function genToastId(): string {
  return `toast_${++toastIdCounter}_${Date.now()}`
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  add: (toast) => {
    const id = genToastId()
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    // Auto-remove after duration
    const duration = toast.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
    return id
  },

  remove: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },

  success: (message, action) => {
    const id = genToastId()
    set((s) => ({ toasts: [...s.toasts, { id, type: 'success', message, action, duration: 4000 }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },

  error: (message, action) => {
    const id = genToastId()
    set((s) => ({ toasts: [...s.toasts, { id, type: 'error', message, action, duration: 6000 }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 6000)
  },

  info: (message, action) => {
    const id = genToastId()
    set((s) => ({ toasts: [...s.toasts, { id, type: 'info', message, action, duration: 3500 }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3500)
  },

  warning: (message, action) => {
    const id = genToastId()
    set((s) => ({ toasts: [...s.toasts, { id, type: 'warning', message, action, duration: 5000 }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 5000)
  }
}))

// Hook for easy toast usage in components
export function useToast() {
  const store = useToastStore()
  return {
    success: store.success,
    error: store.error,
    info: store.info,
    warning: store.warning,
    add: store.add,
    remove: store.remove
  }
}
