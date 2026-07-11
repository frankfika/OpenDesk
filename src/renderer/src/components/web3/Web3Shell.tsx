// Web3Shell — replaces AppShell as the app's root component.
// Initializes settings, workspaces, and global modals around Web3Workbench.
import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
import { useThemeStore } from '../../store/theme'
import { useToast } from '../../store/toast'
import ErrorBoundary from '../ui/ErrorBoundary'
import { ToastContainer } from '../ui/Toast'
import SettingsModal from '../settings/SettingsModal'
import OnboardingModal from '../onboarding/OnboardingModal'
import SkillsPanel from '../skills/SkillsPanel'
import MemoryPanel from '../memory/MemoryPanel'
import GlobalSearch from '../search/GlobalSearch'
import ShortcutHelp from '../ui/ShortcutHelp'
import Web3Workbench from './Web3Workbench'
import SectionRail from '../layout/SectionRail'
import SectionDock from '../layout/SectionDock'

import { initAutomationDriver } from '../../lib/automationDriver'

export default function Web3Shell(): JSX.Element {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [skillsPanelOpen, setSkillsPanelOpen] = useState(false)
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const { settings, load: loadSettings, loaded: settingsLoaded } = useSettingsStore()
  const { loadWorkspaces } = useWorkspaceStore()
  const { setTheme, toggleTheme } = useThemeStore()
  const toast = useToast()

  // Initialize Automation Driver
  useEffect(() => {
    initAutomationDriver()
  }, [])

  // Memory toast listener
  useEffect(() => {
    let pendingToast: ReturnType<typeof setTimeout> | null = null
    const off = window.api?.memory?.onUpdated?.(({ count, categories }) => {
      const catLabels = categories
        .map((c) => (c === 'user' ? 'User' : c === 'identity' ? 'Identity' : 'Soul'))
        .join(', ')
      // Defer the toast so it doesn't pop mid-render. Track the timer so
      // we can clear it on unmount (prevents the toast firing after the
      // user has navigated away).
      pendingToast = setTimeout(() => {
        pendingToast = null
        toast.info(`Memory updated: ${count} new ${count === 1 ? 'entry' : 'entries'} saved to ${catLabels}`, {
          label: 'View',
          onClick: () => setMemoryPanelOpen(true)
        })
      }, 500)
    })
    return () => {
      if (pendingToast) clearTimeout(pendingToast)
      off?.()
    }
  }, [toast])

  useEffect(() => {
    if (!settingsLoaded) {
      loadSettings().then(() => {
        if (settings.theme) setTheme(settings.theme)
      })
    }
    loadWorkspaces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, loadSettings, loadWorkspaces, setTheme])

  // Onboarding gate — Web3 workbench doesn't need AI provider onboarding;
  // the user is prompted to connect their wallet from the top bar instead.
  // (No effect needed — the top bar surfaces wallet connect directly.)

  // Global shortcut listener
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

  // Open settings via event
  useEffect(() => {
    const openSettings = () => setSettingsOpen(true)
    const openSkills = () => setSkillsPanelOpen(true)
    const openMemory = () => setMemoryPanelOpen(true)
    window.addEventListener('opendesk:open-settings', openSettings)
    window.addEventListener('opendesk:open-skills', openSkills)
    window.addEventListener('opendesk:open-memory', openMemory)
    return () => {
      window.removeEventListener('opendesk:open-settings', openSettings)
      window.removeEventListener('opendesk:open-skills', openSkills)
      window.removeEventListener('opendesk:open-memory', openMemory)
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
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
    []
  )
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const anyPanelOpen = skillsPanelOpen || memoryPanelOpen

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#0a0a0a' }}>
        <SectionRail />
        <div className="flex-1 min-w-0 min-h-0" style={{ background: '#0a0a0a' }}>
          <SectionDock
            assistantView={
              <ErrorBoundary>
                <Web3Workbench />
              </ErrorBoundary>
            }
          />
        </div>

        {/* Panel backdrops */}
        <AnimatePresence>
          {anyPanelOpen && (
            <motion.div
              className="fixed inset-0 z-30 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setSkillsPanelOpen(false)
                setMemoryPanelOpen(false)
              }}
            />
          )}
        </AnimatePresence>

        {/* Right-side drawer: Skills */}
        <AnimatePresence>
          {skillsPanelOpen && (
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-40 bg-[var(--bg-content)] border-l border-[var(--border)] shadow-2xl"
              style={{ width: 480, maxWidth: 'calc(100vw - 200px)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <ErrorBoundary>
                <SkillsPanel onClose={() => setSkillsPanelOpen(false)} />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right-side drawer: Memory */}
        <AnimatePresence>
          {memoryPanelOpen && (
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-40 bg-[var(--bg-content)] border-l border-[var(--border)] shadow-2xl"
              style={{ width: 480, maxWidth: 'calc(100vw - 200px)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <ErrorBoundary>
                <MemoryPanel onClose={() => setMemoryPanelOpen(false)} />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings */}
        <AnimatePresence>
          {settingsOpen && (
            <ErrorBoundary>
              <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
            </ErrorBoundary>
          )}
        </AnimatePresence>

        {/* Onboarding */}
        <AnimatePresence>
          {onboardingOpen && <OnboardingModal open={onboardingOpen} onComplete={() => setOnboardingOpen(false)} />}
        </AnimatePresence>

        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        <ShortcutHelp open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
        <ToastContainer />
      </div>
    </ErrorBoundary>
  )
}
