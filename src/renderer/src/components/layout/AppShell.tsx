import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LeftColumn from './LeftColumn'
import MiddleColumn from './MiddleColumn'
import ChatPanel from '../chat/ChatPanel'
import SkillsPanel from '../skills/SkillsPanel'
import MemoryPanel from '../memory/MemoryPanel'
import SettingsModal from '../settings/SettingsModal'
import OnboardingModal from '../onboarding/OnboardingModal'
import CommandPalette from '../ui/CommandPalette'
import GlobalSearch from '../search/GlobalSearch'
import ShortcutHelp from '../ui/ShortcutHelp'
import ErrorBoundary from '../ui/ErrorBoundary'
import { ToastContainer } from '../ui/Toast'
import { useChatStore } from '../../store/chat'
import { useWorkspaceStore } from '../../store/workspace'
import { useSettingsStore } from '../../store/settings'
import { useThemeStore } from '../../store/theme'
import type { Thread } from '@shared/types'
import { useToast } from '../../store/toast'

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [skillsPanelOpen, setSkillsPanelOpen] = useState(false)
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const newThread = useChatStore((state) => state.newThread)
  const { createThread, activeWorkspace, loadWorkspaces } = useWorkspaceStore()
  const { settings, load: loadSettings, loaded: settingsLoaded } = useSettingsStore()
  const { setTheme, toggleTheme } = useThemeStore()
  const toast = useToast()

  // Listen for memory update events from main process
  useEffect(() => {
    const off = window.api?.memory?.onUpdated?.(({ count, categories }) => {
      const catLabels = categories.map((c) => (c === 'user' ? 'User' : c === 'identity' ? 'Identity' : 'Soul')).join(', ')
      // Use a small delay so the toast appears after the assistant response is rendered
      setTimeout(() => {
        toast.info(`Memory updated: ${count} new ${count === 1 ? 'entry' : 'entries'} saved to ${catLabels}`, {
          label: 'View',
          onClick: () => {
            setMemoryPanelOpen(true)
          }
        })
      }, 500)
    })
    return () => {
      off?.()
    }
  }, [toast])

  // Listen for quick-command request to open Memory panel
  useEffect(() => {
    const handler = () => {
      setMemoryPanelOpen(true)
    }
    window.addEventListener('opendesk:open-memory', handler)
    return () => window.removeEventListener('opendesk:open-memory', handler)
  }, [])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, loadSettings, loadWorkspaces, setTheme])

  // Listen for global shortcuts from main process
  useEffect(() => {
    const offTheme = window.api?.app?.onToggleTheme ? window.api.app.onToggleTheme(() => toggleTheme()) : () => {}
    const offFocusModel = window.api?.app?.onFocusModel
      ? window.api.app.onFocusModel(() => window.dispatchEvent(new CustomEvent('opendesk:focus-model')))
      : () => {}
    return () => {
      offTheme()
      offFocusModel()
    }
  }, [toggleTheme])

  // Show onboarding only if settings loaded AND no providers configured
  // Don't block on workspaces — default workspace is created automatically
  useEffect(() => {
    if (settingsLoaded && settings.providers.length === 0) {
      setOnboardingOpen(true)
    }
  }, [settingsLoaded, settings.providers.length])

  const handleNewThread = useCallback(() => {
    const ws = activeWorkspace()
    if (ws) {
      createThread(ws.id).then((_thread) => {
        // Thread is already activated in store
      })
    } else {
      // Fallback: create a thread without workspace
      const _thread: Thread = {
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
  }, [activeWorkspace, createThread, newThread])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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
        setShortcutHelpOpen((v) => !v)
      }
    },
    [handleNewThread]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const closeSkillsPanel = () => setSkillsPanelOpen(false)
  const closeMemoryPanel = () => setMemoryPanelOpen(false)

  const anyPanelOpen = skillsPanelOpen || memoryPanelOpen

  const [leftCollapsed] = useState(false)
  const [middleCollapsed] = useState(false)

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden text-[var(--text-primary)] bg-transparent">
        <AnimatePresence initial={false}>
          {!leftCollapsed && (
            <motion.div
              key="left-column"
              className="shrink-0 overflow-hidden border-r border-[var(--border)]"
              initial={{ width: 0 }}
              animate={{ width: 240 }}
              exit={{ width: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <div style={{ width: 240 }}>
                <LeftColumn />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {!middleCollapsed && (
            <motion.div
              key="middle-column"
              className="shrink-0 overflow-hidden border-r border-[var(--border)]"
              initial={{ width: 0 }}
              animate={{ width: 240 }}
              exit={{ width: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <div style={{ width: 240 }}>
                <MiddleColumn onNewThread={handleNewThread} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main
          role="main"
          aria-label="Chat"
          className="flex flex-col flex-1 overflow-hidden relative bg-[var(--bg-content)] min-w-[400px]"
        >
          <ErrorBoundary>
            <ChatPanel
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenMemory={() => setMemoryPanelOpen(true)}
              onOpenSkills={() => setSkillsPanelOpen(true)}
            />
          </ErrorBoundary>
        </main>

        {/* Backdrop for auxiliary panels */}
        <AnimatePresence>
          {anyPanelOpen && (
            <motion.div
              className="fixed inset-0 z-30 bg-black/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                closeSkillsPanel()
                closeMemoryPanel()
              }}
            />
          )}
        </AnimatePresence>

        {/* Right-side panel drawers — responsive max width */}
        <AnimatePresence>
          {skillsPanelOpen && (
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-40 bg-[var(--bg-content)] border-l border-[var(--border)] shadow-2xl max-w-[100vw] sm:max-w-[480px]"
              style={{ width: 480, maxWidth: 'calc(100vw - 520px)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <ErrorBoundary>
                <SkillsPanel onClose={closeSkillsPanel} />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {memoryPanelOpen && (
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-40 bg-[var(--bg-content)] border-l border-[var(--border)] shadow-2xl max-w-[100vw] sm:max-w-[480px]"
              style={{ width: 480, maxWidth: 'calc(100vw - 520px)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <ErrorBoundary>
                <MemoryPanel onClose={closeMemoryPanel} />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Modal with fade + slide */}
        <AnimatePresence>
          {settingsOpen && (
            <ErrorBoundary>
              <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
            </ErrorBoundary>
          )}
        </AnimatePresence>

        {/* Onboarding with fade + slide up */}
        <AnimatePresence>
          {onboardingOpen && <OnboardingModal open={onboardingOpen} onComplete={() => setOnboardingOpen(false)} />}
        </AnimatePresence>

        {/* Global Search */}
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

        {/* Shortcut Help */}
        <ShortcutHelp open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />

        {/* Command Palette */}
        <CommandPalette
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenSkills={() => setSkillsPanelOpen(true)}
          onOpenMemory={() => setMemoryPanelOpen(true)}
        />

        {/* Toast notifications */}
        <ToastContainer />
      </div>
    </ErrorBoundary>
  )
}
