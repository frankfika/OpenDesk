import { create } from 'zustand'
import { useSettingsStore } from './settings'

interface ThemeState {
  theme: 'dark' | 'light' | 'system'
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light' | 'system') => void
  toggleTheme: () => void
}

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'dark' | 'light') {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(resolved)
}

function resolveTheme(theme: 'dark' | 'light' | 'system'): 'dark' | 'light' {
  return theme === 'system' ? getSystemTheme() : theme
}

export const useThemeStore = create<ThemeState>((set, get) => {
  // Listen to system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = (e: MediaQueryListEvent) => {
    if (get().theme === 'system') {
      const resolved = e.matches ? 'dark' : 'light'
      set({ resolvedTheme: resolved })
      applyTheme(resolved)
    }
  }
  mediaQuery.addEventListener('change', listener)

  return {
    theme: 'system',
    resolvedTheme: getSystemTheme(),

    setTheme: (theme) => {
      const resolved = resolveTheme(theme)
      set({ theme, resolvedTheme: resolved })
      applyTheme(resolved)
      // Sync to settings store (fire-and-forget)
      const settingsStore = useSettingsStore.getState()
      if (settingsStore.loaded) {
        settingsStore.update({ theme }).catch(console.error)
      }
    },

    toggleTheme: () => {
      const current = get().theme
      const next: 'dark' | 'light' | 'system' =
        current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark'
      get().setTheme(next)
    }
  }
})
