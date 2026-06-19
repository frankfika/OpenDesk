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
  remaining?: number
  timerId?: ReturnType<typeof setTimeout> | null
}

interface ToastState {
  toasts: Toast[]
  add: (toast: Omit<Toast, 'id' | 'remaining' | 'timerId'>) => string
  remove: (id: string) => void
  pause: (id: string) => void
  resume: (id: string) => void
  success: (message: string, action?: { label: string; onClick: () => void }) => void
  error: (message: string, action?: { label: string; onClick: () => void }) => void
  info: (message: string, action?: { label: string; onClick: () => void }) => void
  warning: (message: string, action?: { label: string; onClick: () => void }) => void
}

let toastIdCounter = 0
function genToastId(): string {
  return `toast_${++toastIdCounter}_${Date.now()}`
}

function scheduleRemove(id: string, duration: number, set: (fn: (s: ToastState) => Partial<ToastState>) => void) {
  const timer = setTimeout(() => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  }, duration)
  return timer
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  add: (toast) => {
    const id = genToastId()
    const duration = toast.duration ?? 4000
    const timer = scheduleRemove(id, duration, set)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id, remaining: duration, timerId: timer }] }))
    return id
  },

  remove: (id) => {
    set((s) => {
      const toast = s.toasts.find((t) => t.id === id)
      if (toast?.timerId) clearTimeout(toast.timerId)
      return { toasts: s.toasts.filter((t) => t.id !== id) }
    })
  },

  pause: (id) => {
    set((s) => {
      const toast = s.toasts.find((t) => t.id === id)
      if (!toast || !toast.timerId) return s
      clearTimeout(toast.timerId)
      const elapsed = (toast.duration ?? 4000) - (toast.remaining ?? toast.duration ?? 4000)
      const remaining = Math.max(0, (toast.remaining ?? toast.duration ?? 4000) - elapsed)
      return { toasts: s.toasts.map((t) => (t.id === id ? { ...t, timerId: null, remaining } : t)) }
    })
  },

  resume: (id) => {
    set((s) => {
      const toast = s.toasts.find((t) => t.id === id)
      if (!toast || toast.timerId) return s
      const remaining = toast.remaining ?? toast.duration ?? 4000
      const timer = scheduleRemove(id, remaining, set)
      return { toasts: s.toasts.map((t) => (t.id === id ? { ...t, timerId: timer, remaining } : t)) }
    })
  },

  success: (message, action) => {
    const id = genToastId()
    const duration = 4000
    const timer = scheduleRemove(id, duration, set)
    set((s) => ({
      toasts: [...s.toasts, { id, type: 'success', message, action, duration, remaining: duration, timerId: timer }]
    }))
  },

  error: (message, action) => {
    const id = genToastId()
    const duration = 6000
    const timer = scheduleRemove(id, duration, set)
    set((s) => ({
      toasts: [...s.toasts, { id, type: 'error', message, action, duration, remaining: duration, timerId: timer }]
    }))
  },

  info: (message, action) => {
    const id = genToastId()
    const duration = 3500
    const timer = scheduleRemove(id, duration, set)
    set((s) => ({
      toasts: [...s.toasts, { id, type: 'info', message, action, duration, remaining: duration, timerId: timer }]
    }))
  },

  warning: (message, action) => {
    const id = genToastId()
    const duration = 5000
    const timer = scheduleRemove(id, duration, set)
    set((s) => ({
      toasts: [...s.toasts, { id, type: 'warning', message, action, duration, remaining: duration, timerId: timer }]
    }))
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
