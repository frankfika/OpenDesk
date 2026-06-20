import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useThemeStore } from './theme'

// Mock matchMedia
describe('theme store', () => {
  beforeEach(() => {
    // Reset store and DOM
    useThemeStore.setState({ theme: 'system', resolvedTheme: 'dark' })
    document.documentElement.classList.remove('dark', 'light')

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    })
  })

  it('should default to system theme', () => {
    const state = useThemeStore.getState()
    expect(state.theme).toBe('system')
  })

  it('should set light theme', () => {
    useThemeStore.getState().setTheme('light')
    expect(useThemeStore.getState().theme).toBe('light')
    expect(useThemeStore.getState().resolvedTheme).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('should set dark theme', () => {
    useThemeStore.getState().setTheme('dark')
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(useThemeStore.getState().resolvedTheme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should toggle through themes', () => {
    const store = useThemeStore.getState()
    store.setTheme('system')
    store.toggleTheme()
    expect(useThemeStore.getState().theme).toBe('dark')
    store.toggleTheme()
    expect(useThemeStore.getState().theme).toBe('light')
    store.toggleTheme()
    expect(useThemeStore.getState().theme).toBe('system')
  })

  it('should apply theme class to document', () => {
    useThemeStore.getState().setTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })
})
