import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import ChatPanel from '../chat/ChatPanel'
import SkillsPanel from '../skills/SkillsPanel'
import FilePanel from '../files/FilePanel'
import MemoryPanel from '../memory/MemoryPanel'
import CodeRunner from '../runner/CodeRunner'
import AgentExecutor from '../agent/AgentExecutor'
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

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [skillsPanelOpen, setSkillsPanelOpen] = useState(false)
  const [filePanelOpen, setFilePanelOpen] = useState(false)
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false)
  const [runnerPanelOpen, setRunnerPanelOpen] = useState(false)
  const [agentPanelOpen, setAgentPanelOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeNav, setActiveNav] = useState('Chats')
  const newThread = useChatStore((state) => state.newThread)
  const { createThread, activeWorkspace, loadWorkspaces } = useWorkspaceStore()
  const { settings, load: loadSettings, loaded: settingsLoaded } = useSettingsStore()
  const { setTheme, toggleTheme } = useThemeStore()

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, loadSettings, loadWorkspaces, setTheme])

  // Listen for global shortcuts from main process
  useEffect(() => {
    const offSidebar = window.api?.app?.onToggleSidebar
      ? window.api.app.onToggleSidebar(() => setSidebarCollapsed((v) => !v))
      : () => {}
    const offTheme = window.api?.app?.onToggleTheme ? window.api.app.onToggleTheme(() => toggleTheme()) : () => {}
    const offFocusModel = window.api?.app?.onFocusModel
      ? window.api.app.onFocusModel(() => window.dispatchEvent(new CustomEvent('opendesk:focus-model')))
      : () => {}
    return () => {
      offSidebar()
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

  const closeSkillsPanel = () => {
    setSkillsPanelOpen(false)
    setActiveNav((current) => (current === 'Skills' ? 'Chats' : current))
  }
  const closeFilePanel = () => {
    setFilePanelOpen(false)
    setActiveNav((current) => (current === 'Files' ? 'Chats' : current))
  }
  const closeMemoryPanel = () => {
    setMemoryPanelOpen(false)
    setActiveNav((current) => (current === 'Memory' ? 'Chats' : current))
  }
  const closeRunnerPanel = () => {
    setRunnerPanelOpen(false)
    setActiveNav((current) => (current === 'Runner' ? 'Chats' : current))
  }
  const closeAgentPanel = () => {
    setAgentPanelOpen(false)
    setActiveNav((current) => (current === 'Agent' ? 'Chats' : current))
  }

  const anyPanelOpen = skillsPanelOpen || filePanelOpen || memoryPanelOpen || runnerPanelOpen || agentPanelOpen

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden text-[var(--text-primary)] bg-transparent">
        {!sidebarCollapsed && (
          <Sidebar
            activeNav={activeNav}
            setActiveNav={setActiveNav}
            onOpenSettings={() => setSettingsOpen(true)}
            onNewThread={handleNewThread}
            onOpenSkills={() => {
              setActiveNav('Skills')
              setSkillsPanelOpen(true)
            }}
            onOpenFiles={() => {
              setActiveNav('Files')
              setFilePanelOpen(true)
            }}
            onOpenMemory={() => {
              setActiveNav('Memory')
              setMemoryPanelOpen(true)
            }}
            onOpenRunner={() => {
              setActiveNav('Runner')
              setRunnerPanelOpen(true)
            }}
            onOpenAgent={() => {
              setActiveNav('Agent')
              setAgentPanelOpen(true)
            }}
          />
        )}
        <main
          role="main"
          aria-label="Chat"
          className="flex flex-col flex-1 overflow-hidden relative border-l border-[var(--border)] bg-[var(--bg-content)]"
        >
          <ErrorBoundary>
            <ChatPanel onOpenSettings={() => setSettingsOpen(true)} onOpenFiles={() => setFilePanelOpen(true)} />
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
                closeFilePanel()
                closeMemoryPanel()
                closeRunnerPanel()
                closeAgentPanel()
              }}
            />
          )}
        </AnimatePresence>

        {/* Right-side panel drawers — responsive max width */}
        <AnimatePresence>
          {skillsPanelOpen && (
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-40 bg-[var(--bg-content)] border-l border-[var(--border)] shadow-2xl max-w-[100vw] sm:max-w-[480px]"
              style={{ width: 480, maxWidth: 'calc(100vw - var(--sidebar-width, 0px))' }}
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
          {filePanelOpen && (
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-40 bg-[var(--bg-content)] border-l border-[var(--border)] shadow-2xl max-w-[100vw] sm:max-w-[640px]"
              style={{ width: 640, maxWidth: 'calc(100vw - var(--sidebar-width, 0px))' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <ErrorBoundary>
                <FilePanel onClose={closeFilePanel} />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {memoryPanelOpen && (
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-40 bg-[var(--bg-content)] border-l border-[var(--border)] shadow-2xl max-w-[100vw] sm:max-w-[480px]"
              style={{ width: 480, maxWidth: 'calc(100vw - var(--sidebar-width, 0px))' }}
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

        <AnimatePresence>
          {runnerPanelOpen && (
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-40 bg-[var(--bg-content)] border-l border-[var(--border)] shadow-2xl max-w-[100vw] sm:max-w-[640px]"
              style={{ width: 640, maxWidth: 'calc(100vw - var(--sidebar-width, 0px))' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <ErrorBoundary>
                <CodeRunner />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {agentPanelOpen && (
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-40 bg-[var(--bg-content)] border-l border-[var(--border)] shadow-2xl max-w-[100vw] sm:max-w-[480px]"
              style={{ width: 480, maxWidth: 'calc(100vw - var(--sidebar-width, 0px))' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <ErrorBoundary>
                <AgentExecutor />
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
        <CommandPalette onOpenSettings={() => setSettingsOpen(true)} onOpenSkills={() => setSkillsPanelOpen(true)} />

        {/* Toast notifications */}
        <ToastContainer />
      </div>
    </ErrorBoundary>
  )
}
