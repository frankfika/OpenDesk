import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useMemoryStore } from '../../store/memory'
import { X, Save, User, Fingerprint, Sparkles, Loader2 } from 'lucide-react'

interface MemoryPanelProps {
  onClose: () => void
}

const TABS = [
  {
    key: 'user' as const,
    label: 'USER',
    icon: User,
    description: 'Preferences, habits, expertise, and facts about you.',
    examples: [
      'I prefer TypeScript over JavaScript.',
      'My default editor is VS Code with Vim keybindings.',
      'I like concise explanations with code examples.'
    ]
  },
  {
    key: 'identity' as const,
    label: 'IDENTITY',
    icon: Fingerprint,
    description: 'Your custom agent persona: role, tone, and project conventions for this workspace. Think of it as the default system prompt OpenDesk uses in every reply.',
    examples: [
      'You are a senior full-stack engineer.',
      'Use OKLCH colors and Tailwind for styling.',
      'Always write JSDoc for public functions.'
    ]
  },
  {
    key: 'soul' as const,
    label: 'SOUL',
    icon: Sparkles,
    description: 'Cross-project lessons, patterns, and reusable knowledge.',
    examples: [
      'Avoid heredocs in shell commands — they can hang.',
      'When parsing PPTX, read ppt/slides/*.xml.',
      'Debounce file writes to avoid repeated disk I/O.'
    ]
  }
]

export default function MemoryPanel({ onClose }: MemoryPanelProps) {
  const { user, identity, soul, loaded, activeTab, saving, load, setActiveTab, updateContent, save } = useMemoryStore()

  const [localContent, setLocalContent] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!loaded) load()
  }, [loaded, load])

  // Sync local content when tab changes or external content updates
  useEffect(() => {
    const content = activeTab === 'user' ? user : activeTab === 'identity' ? identity : soul
    setLocalContent(content)
  }, [activeTab, user, identity, soul])

  const handleChange = useCallback(
    (value: string) => {
      setLocalContent(value)
      updateContent(activeTab, value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        save(activeTab)
      }, 1000)
    },
    [activeTab, updateContent, save]
  )

  const handleBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    save(activeTab)
  }, [activeTab, save])

  const handleManualSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    save(activeTab)
  }, [activeTab, save])

  // Keep a ref to the latest activeTab so unmount cleanup always sees current value
  const tabRef = useRef(activeTab)
  useEffect(() => {
    tabRef.current = activeTab
  }, [activeTab])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      // Auto-save on unmount
      save(tabRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeTabInfo = TABS.find((t) => t.key === activeTab)
  const wordCount = localContent.trim().split(/\s+/).filter(Boolean).length

  return (
    <motion.div
      className="flex flex-col h-full bg-[var(--bg-content)]"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent)]/10">
            <Sparkles size={18} className="text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Memory</h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Persistent notes injected into every reply. Edit manually or let OpenDesk auto-learn.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {saving ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save size={12} />
                Save
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-5 py-3 border-b border-[var(--border)] shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all border ${
                isActive
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--bg-sidebar)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Description + examples */}
      <div className="px-5 py-3 border-b border-[var(--border)] shrink-0 space-y-2">
        <p className="text-[11px] text-[var(--text-muted)]">{activeTabInfo?.description}</p>
        <div className="flex flex-wrap gap-2">
          {activeTabInfo?.examples.map((ex, i) => (
            <button
              type="button"
              key={i}
              onClick={() => {
                const prefix = localContent.trim() ? localContent.trim() + '\n\n' : ''
                const next = prefix + ex
                setLocalContent(next)
                updateContent(activeTab, next)
                handleManualSave()
              }}
              className="text-[10px] px-2 py-1 rounded-md bg-[var(--bg-sidebar)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-left"
            >
              + {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {!loaded ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
            Loading memory…
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="flex-1 w-full p-5 bg-transparent outline-none resize-none font-mono text-[13px] text-[var(--text-primary)] leading-relaxed"
            value={localContent}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            spellCheck={false}
            placeholder={`# ${activeTab.toUpperCase()} Memory\n\nAdd notes here about ${activeTab === 'user' ? 'your preferences, habits, and expertise' : activeTab === 'identity' ? 'this workspace AI role and conventions' : 'cross-project lessons and best practices'}...`}
          />
        )}
      </div>

      {/* Footer hint */}
      <div className="px-5 py-2 border-t border-[var(--border)] shrink-0 flex items-center justify-between">
        <p className="text-[10px] text-[var(--text-muted)]">
          Auto-saves on blur. Memories are injected into the system prompt for every reply.
        </p>
        <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{wordCount} words</span>
      </div>
    </motion.div>
  )
}
