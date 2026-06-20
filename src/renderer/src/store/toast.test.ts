import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useToastStore } from './toast'

describe('toast store', () => {
  beforeEach(() => {
    // Reset store state
    useToastStore.setState({ toasts: [] })
  })

  it('should add a toast', () => {
    const store = useToastStore.getState()
    const id = store.add({ type: 'info', message: 'Test message' })
    expect(id).toBeTypeOf('string')
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0].message).toBe('Test message')
  })

  it('should remove a toast', () => {
    const store = useToastStore.getState()
    const id = store.add({ type: 'info', message: 'Test' })
    store.remove(id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('should add success toast with helper', () => {
    useToastStore.getState().success('Operation successful')
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('success')
    expect(toasts[0].duration).toBe(4000)
  })

  it('should add error toast with longer duration', () => {
    useToastStore.getState().error('Something failed')
    const toasts = useToastStore.getState().toasts
    expect(toasts[0].type).toBe('error')
    expect(toasts[0].duration).toBe(6000)
  })

  it('should add info toast with default duration', () => {
    useToastStore.getState().info('Information')
    const toasts = useToastStore.getState().toasts
    expect(toasts[0].type).toBe('info')
    expect(toasts[0].duration).toBe(3500)
  })

  it('should add warning toast', () => {
    useToastStore.getState().warning('Warning message')
    const toasts = useToastStore.getState().toasts
    expect(toasts[0].type).toBe('warning')
    expect(toasts[0].duration).toBe(5000)
  })

  it('should support toast action', () => {
    const action = vi.fn()
    useToastStore.getState().success('Done', { label: 'Undo', onClick: action })
    const toast = useToastStore.getState().toasts[0]
    expect(toast.action?.label).toBe('Undo')
    toast.action?.onClick()
    expect(action).toHaveBeenCalled()
  })

  it('should pause and resume toast timer', () => {
    const store = useToastStore.getState()
    const id = store.add({ type: 'info', message: 'Test', duration: 5000 })
    store.pause(id)
    const pausedToast = useToastStore.getState().toasts.find((t) => t.id === id)
    expect(pausedToast?.timerId).toBeNull()
    store.resume(id)
    const resumedToast = useToastStore.getState().toasts.find((t) => t.id === id)
    expect(resumedToast?.timerId).not.toBeNull()
  })

  it('should handle multiple toasts', () => {
    const store = useToastStore.getState()
    store.success('First')
    store.error('Second')
    store.info('Third')
    expect(useToastStore.getState().toasts).toHaveLength(3)
  })

  it('should not crash when pausing non-existent toast', () => {
    expect(() => useToastStore.getState().pause('non-existent')).not.toThrow()
  })

  it('should not crash when resuming non-existent toast', () => {
    expect(() => useToastStore.getState().resume('non-existent')).not.toThrow()
  })
})
