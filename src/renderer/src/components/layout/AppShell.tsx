import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import ChatPanel from '../chat/ChatPanel'
import SkillsPanel from '../skills/SkillsPanel'
import SettingsModal from '../settings/SettingsModal'
import OnboardingModal from '../onboarding/OnboardingModal'
import CommandPalette from '../ui/CommandPalette'
import GlobalSearch from '../search/GlobalSearch'
import ShortcutHelp from '../ui/ShortcutHelp'
import { ToastContainer } from '../ui/Toast'
import { useChatStore } from '../../store/chat'
import { useWorkspaceStore } from '../../store/workspace'
import { useSettingsStore } from '../../store/settings'
import { useThemeStore } from '../../store/theme'
import type { Thread } from '@shared/types'

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Simple error boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-[var(--bg-content)] text-[var(--text-primary)] p-8">
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <pre className="text-xs text-[var(--text-muted)] bg-[var(--bg-sidebar)] p-4 rounded-lg max-w-lg overflow-auto">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium"
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [skillsPanelOpen, setSkillsPanelOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const { newThread } = useChatStore()
  const { createThread, activeWorkspace, loadWorkspaces, workspaces } = useWorkspaceStore()
  const { settings, load: loadSettings, loaded: settingsLoaded } = useSettingsStore()
  const { setTheme } = useThemeStore()

  // Check if first launch (no workspaces and no providers)
  useEffect(() => {
    if (!settingsLoaded) {
      loadSettings().then(() => {
        // Apply saved theme
        if (settings.theme) {
          setTheme(settings.theme)
        }
      })
    }
    loadWorkspaces()
  }, [settingsLoaded, loadSettings, loadWorkspaces, setTheme])

  // Show onboarding only if settings loaded AND no providers configured
  // Don't block on workspaces — default workspace is created automatically
  useEffect(() => {
    if (settingsLoaded && settings.providers.length === 0) {
      setOnboardingOpen(true)
    }
  }, [settingsLoaded, settings.providers.length])

  function handleNewThread() {
    const ws = activeWorkspace()
    if (ws) {
      createThread(ws.id).then((thread) => {
        // Thread is already activated in store
      })
    } else {
      // Fallback: create a thread without workspace
      const thread: Thread = {
        id: genId(),
        workspaceId: '',
        title: 'New conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        providerId: '',
        model: '',
        totalInputTokens: 0,
        totalOutputTokens: 0,
        status: 'active'
      }
      // We can't use addThread anymore, so just clear messages
      newThread()
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault()
      setSettingsOpen(true)
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault()
      handleNewThread()
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || (e.shiftKey && e.key === 'F'))) {
      e.preventDefault()
      setSearchOpen(true)
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === '/' || (e.shiftKey && e.key === '?'))) {
      e.preventDefault()
      setShortcutHelpOpen(v => !v)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden text-[var(--text-primary)] bg-transparent">
        <Sidebar
          onOpenSettings={() => setSettingsOpen(true)}
          onNewThread={handleNewThread}
          onOpenSkills={() => setSkillsPanelOpen(true)}
        />
        <main className="flex flex-col flex-1 overflow-hidden relative border-l border-[var(--border)] bg-[var(--bg-content)]">
          <ChatPanel onOpenSettings={() => setSettingsOpen(true)} />
        </main>

        {/* SkillsPanel with slide-in animation */}
        <AnimatePresence>
          {skillsPanelOpen && (
            <motion.div
              className="fixed inset-0 z-40 bg-[var(--bg-content)]/95"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <SkillsPanel onClose={() => setSkillsPanelOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Modal with fade + slide */}
        <AnimatePresence>
          {settingsOpen && (
            <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
          )}
        </AnimatePresence>

        {/* Onboarding with fade + slide up */}
        <AnimatePresence>
          {onboardingOpen && (
            <OnboardingModal open={onboardingOpen} onComplete={() => setOnboardingOpen(false)} />
          )}
        </AnimatePresence>

        {/* Global Search */}
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

        {/* Shortcut Help */}
        <ShortcutHelp open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />

        {/* Command Palette */}
        <CommandPalette
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenSkills={() => setSkillsPanelOpen(true)}
        />

        {/* Toast notifications */}
        <ToastContainer />
      </div>
    </ErrorBoundary>
  )
}
