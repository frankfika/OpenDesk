import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../store/chat'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
import { useSkillsStore } from '../../store/skills'
import { useThemeStore } from '../../store/theme'
import { useArtifactsStore } from '../../store/artifacts'
import { useToast } from '../../store/toast'
import MessageRow from './Message'
import InputBar from './InputBar'
import ArtifactPanel from '../artifacts/ArtifactPanel'
import AgentActivityBar from './AgentActivityBar'
import EmptyState from '../ui/EmptyState'
import SuggestionCard from '../ui/SuggestionCard'
import { SkeletonMessage } from '../ui/Skeleton'
import {
  FolderSymlink, Plug, TerminalSquare, Library,
  Settings, Sun, Moon, CheckCircle2, AlertCircle,
  XCircle, FileText, Cpu, PanelRightOpen, Code2, FileEdit,
  Search, MessageSquare, FolderOpen, ChevronDown
} from 'lucide-react'

interface ChatPanelProps {
  onOpenSettings: () => void
  onOpenFiles?: () => void
}

interface QuickActionHandlers {
  onOpenSettings: () => void
  handleConnectFiles: () => void
  fillInput: (text: string) => void
}

const QUICK_ACTIONS = [
  {
    icon: FolderSymlink,
    title: 'Connect files',
    desc: 'Attach a folder as workspace',
    onClick: (h: QuickActionHandlers) => h.handleConnectFiles
  },
  {
    icon: Plug,
    title: 'Add provider',
    desc: 'Connect any AI model',
    onClick: (h: QuickActionHandlers) => h.onOpenSettings
  },
  {
    icon: TerminalSquare,
    title: 'Run a task',
    desc: 'Shell, web search, and more',
    onClick: (h: QuickActionHandlers) => () => h.fillInput('Run a shell command: ')
  }
]

const SUGGESTION_CARDS = [
  { icon: Code2,    title: 'Code Review', description: 'Review code for bugs',  prompt: 'Please review the following code for bugs and improvements:\n\n```\n\n```' },
  { icon: FileEdit, title: 'Write Docs',  description: 'Write documentation',   prompt: 'Please write documentation for: ' },
  { icon: Search,   title: 'Web Search',  description: 'Search the web',        prompt: '/search ' }
]

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return 'Today'
  if (isYesterday) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function ChatPanel({ onOpenSettings, onOpenFiles }: ChatPanelProps) {
  const { messages, streaming, error, threadId, attachments, clearMessages } = useChatStore()
  const { settings, activeProvider } = useSettingsStore()
  const { workspaces, activeWorkspace, activeThread, threadsByWorkspace, agentsMd, addWorkspace, setActiveWorkspace, updateThread } = useWorkspaceStore()
  const { skills } = useSkillsStore()
  const { resolvedTheme, toggleTheme } = useThemeStore()
  const { artifacts, panelOpen, setPanelOpen } = useArtifactsStore()
  const toast = useToast()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const provider = activeProvider()
  const workspace = activeWorkspace()
  const thread = activeThread()
  const activeSkill = thread?.skillId ? skills.find(s => s.id === thread?.skillId) : null

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  // Provider health indicator
  const providerHealth = provider?.lastTestResult
    ? 'pass'
    : provider?.lastTestResult === false
      ? 'fail'
      : 'unknown'

  // Token estimate (rough)
  const totalTokens = messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streaming])

  const lastContent = messages[messages.length - 1]?.content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [lastContent])

  // Fill input bar with a prompt text
  function fillInput(text: string) {
    window.dispatchEvent(new CustomEvent('opendesk:fill-input', { detail: { text } }))
  }

  // Connect files — open folder picker
  async function handleConnectFiles() {
    const ws = await window.api?.workspace?.add()
    if (ws) toast.success(`Workspace "${ws.name}" added`)
  }

  const handleTitleSubmit = () => {
    if (thread && titleValue.trim() && titleValue !== thread.title) {
      updateThread(thread.id, { title: titleValue.trim() })
    }
    setEditingTitle(false)
  }

  const recentWorkspaces = workspaces.slice(0, 3)

  // Date grouping for messages
  const messageGroups = useMemo(() => {
    const groups: { dateLabel: string; messages: typeof messages }[] = []
    let currentGroup: typeof messages = []
    let currentDate = ''

    messages.forEach((msg, i) => {
      const msgDate = formatDate(msg.timestamp)
      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ dateLabel: currentDate, messages: currentGroup })
        }
        currentDate = msgDate
        currentGroup = [msg]
      } else {
        currentGroup.push(msg)
      }
    })
    if (currentGroup.length > 0) {
      groups.push({ dateLabel: currentDate, messages: currentGroup })
    }
    return groups
  }, [messages])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      {/* Custom title bar area */}
      <div
        className="drag-region shrink-0 flex items-center justify-between px-6 border-b border-[var(--border)]"
        style={{ height: 'var(--titlebar-height)' }}
      >
        {/* Left: Workspace name */}
        <div className="no-drag flex items-center gap-2 flex-1 relative">
          {workspace ? (
            <div className="relative">
              <button
                onClick={() => setShowWorkspacePicker(v => !v)}
                className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded bg-[var(--bg-sidebar)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-muted)] transition-colors"
              >
                <FolderSymlink size={12} />
                {workspace.name || workspace.folderPath.split('/').pop()}
                <ChevronDown size={10} className="opacity-60" />
              </button>
              {showWorkspacePicker && (
                <div
                  className="absolute top-full left-0 mt-1.5 min-w-[220px] rounded-xl bg-[var(--bg-content)] border border-[var(--border)] shadow-xl z-50 py-1 overflow-hidden"
                  onMouseLeave={() => setShowWorkspacePicker(false)}
                >
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)] mb-1">
                    Switch Workspace
                  </div>
                  {workspaces.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => { setActiveWorkspace(ws.id); setShowWorkspacePicker(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors ${
                        ws.id === workspace.id
                          ? 'bg-[var(--bg-sidebar)] text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)]'
                      }`}
                    >
                      <FolderSymlink size={13} className="shrink-0 text-[var(--text-muted)]" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{ws.name || ws.folderPath.split('/').pop()}</div>
                        <div className="truncate text-[11px] text-[var(--text-muted)]">{ws.folderPath}</div>
                      </div>
                      {ws.id === workspace.id && <CheckCircle2 size={12} className="text-[var(--accent)] shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">No workspace</span>
          )}
        </div>

        {/* Center: Thread title */}
        <div className="no-drag flex-1 flex items-center justify-center">
          {editingTitle && thread ? (
            <input
              autoFocus
              className="text-xs font-medium px-2 py-1 rounded bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] text-center min-w-[200px]"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit()
                if (e.key === 'Escape') setEditingTitle(false)
              }}
            />
          ) : (
            <button
              onClick={() => {
                if (thread) {
                  setTitleValue(thread.title)
                  setEditingTitle(true)
                }
              }}
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 rounded hover:bg-[var(--bg-sidebar)]"
            >
              {thread?.title || 'New conversation'}
            </button>
          )}
        </div>

        {/* Right: Tags */}
        <div className="no-drag flex items-center gap-2 flex-1 justify-end">
          {activeSkill && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 mt-1">
              <Library size={12} />
              {activeSkill.name}
            </span>
          )}
          {agentsMd?.loaded && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 mt-1">
              <FileText size={12} />
              {agentsMd.tokenCount} rules
            </span>
          )}
          <span className="text-xs font-medium px-2 py-1 rounded bg-[var(--bg-sidebar)] text-[var(--text-secondary)] border border-[var(--border)] mt-1">
            {provider ? `${provider.name} · ${provider.model}` : 'No provider'}
          </span>
          {/* Artifacts toggle button */}
          {artifacts.length > 0 && (
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors mt-1 ${
                panelOpen
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--bg-sidebar)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-muted)]'
              }`}
              title="Toggle artifacts panel"
            >
              <PanelRightOpen size={12} />
              <span>{artifacts.length}</span>
            </button>
          )}
          <button
            onClick={onOpenFiles}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors mt-1 bg-[var(--bg-sidebar)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-muted)]"
            title="Browse workspace files"
          >
            <FolderOpen size={12} />
            <span>Files</span>
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors mt-1"
            title="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors mt-1"
            title="Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Status bar - optimized */}
      <div className="shrink-0 flex items-center gap-4 px-6 py-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/30">
        {/* Provider health - clickable to switch */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="Click to switch provider"
        >
          {providerHealth === 'pass' && <CheckCircle2 size={12} className="text-green-500" />}
          {providerHealth === 'fail' && <XCircle size={12} className="text-red-500" />}
          {providerHealth === 'unknown' && <AlertCircle size={12} className="text-yellow-500" />}
          <span>
            {provider
              ? providerHealth === 'pass'
                ? `${provider.name} · ${provider.model}`
                : providerHealth === 'fail'
                  ? `${provider.name} failed`
                  : `${provider.name} untested`
              : 'No provider'}
          </span>
        </button>

        {/* AGENTS.md status - clickable */}
        {agentsMd?.loaded && (
          <button
            onClick={() => toast.info(`${agentsMd.paths.length} AGENTS.md loaded · ${agentsMd.tokenCount} rules`)}
            className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="View loaded AGENTS.md rules"
          >
            <FileText size={12} />
            <span>{agentsMd.paths.length} rules</span>
          </button>
        )}

        {/* Skill active status */}
        {activeSkill && (
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <Library size={12} className="text-indigo-500" />
            <span>{activeSkill.name}</span>
          </div>
        )}

        {/* Token estimate */}
        {messages.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] ml-auto">
            <Cpu size={12} />
            <span>~{totalTokens.toLocaleString()} tokens</span>
          </div>
        )}

        {/* Network status */}
        <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Main content: Chat + Artifacts */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Message list */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto scroll-smooth">
            {messages.length === 0 && !provider && (
              <div className="flex flex-col items-center justify-center h-full px-8">
                <EmptyState
                  icon={Plug}
                  title="Connect an AI model"
                  description="Add a provider to start chatting with OpenDesk"
                  actions={[
                    { label: 'Add provider', onClick: onOpenSettings, variant: 'primary', icon: Plug }
                  ]}
                  size="lg"
                  className="max-w-sm"
                />
              </div>
            )}

            {messages.length === 0 && provider && (
              <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
                {/* Animated empty state */}
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
                >
                  <motion.div
                    className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--border)]"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35, delay: 0.1 }}
                  >
                    <MessageSquare size={28} className="text-[var(--text-muted)]" />
                  </motion.div>
                  <h1 className="text-3xl font-semibold mb-3 text-[var(--text-primary)]">
                    What can I help with?
                  </h1>
                  <p className="text-[15px] text-[var(--text-secondary)]">
                    {`Using ${provider.name} · ${provider.model}`}
                  </p>
                </motion.div>

                {/* Suggestion cards */}
                <div className="flex gap-4 flex-wrap justify-center max-w-2xl">
                  {SUGGESTION_CARDS.map((card, i) => (
                    <SuggestionCard
                      key={card.title}
                      icon={card.icon}
                      title={card.title}
                      description={card.description}
                      index={i}
                      onClick={() => fillInput(card.prompt)}
                    />
                  ))}
                </div>

                {/* Quick Actions */}
                <motion.div
                  className="flex gap-4 flex-wrap justify-center max-w-2xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.3 }}
                >
                  {QUICK_ACTIONS.map((action, i) => {
                    const Icon = action.icon
                    return (
                      <motion.button
                        key={action.title}
                        onClick={action.onClick({ onOpenSettings, handleConnectFiles, fillInput })}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-all"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: 0.35 + i * 0.05 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Icon size={15} />
                        {action.title}
                      </motion.button>
                    )
                  })}
                </motion.div>

                {/* Recent Workspaces */}
                <AnimatePresence>
                  {recentWorkspaces.length > 0 && (
                    <motion.div
                      className="w-full max-w-md"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3 text-center">
                        Recent Workspaces
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {recentWorkspaces.map((ws, i) => (
                          <motion.button
                            key={ws.id}
                            onClick={() => setActiveWorkspace(ws.id)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-sidebar)]/50 border border-[var(--border)] hover:border-[var(--text-muted)] transition-all text-left"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.55 + i * 0.05 }}
                            whileHover={{ x: 4 }}
                          >
                            <FolderSymlink size={16} className="text-[var(--text-muted)]" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                                {ws.name || ws.folderPath.split('/').pop()}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)] truncate">
                                {ws.folderPath}
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {messages.length > 0 && (
              <div className="py-6 max-w-3xl mx-auto w-full px-6">
                <AnimatePresence mode="popLayout">
                  {messageGroups.map((group, groupIdx) => (
                    <div key={group.dateLabel + groupIdx}>
                      {/* Date divider */}
                      {groupIdx > 0 && (
                        <div className="flex items-center gap-3 py-4">
                          <div className="flex-1 h-px bg-[var(--border)]" />
                          <span className="text-[11px] text-[var(--text-muted)] font-medium">{group.dateLabel}</span>
                          <div className="flex-1 h-px bg-[var(--border)]" />
                        </div>
                      )}
                      {group.messages.map((msg, i) => {
                        const globalIdx = messages.findIndex(m => m.id === msg.id)
                        // Hide timestamp for messages within 5 minutes of each other
                        const prevMsg = messages[globalIdx - 1]
                        const hideTimestamp = prevMsg && (msg.timestamp - prevMsg.timestamp) < 5 * 60 * 1000
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: i === group.messages.length - 1 && msg.role === 'assistant' ? 0 : 0,
                              ease: [0.25, 0.1, 0.25, 1.0]
                            }}
                          >
                            <MessageRow
                              message={msg}
                              isStreaming={streaming && globalIdx === messages.length - 1 && msg.role === 'assistant'}
                              showDateDivider={i === 0 && groupIdx === 0}
                              dateLabel={group.dateLabel}
                              hideTimestamp={hideTimestamp}
                            />
                          </motion.div>
                        )
                      })}
                    </div>
                  ))}
                </AnimatePresence>

                {/* Streaming skeleton */}
                {streaming && messages[messages.length - 1]?.role !== 'assistant' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SkeletonMessage />
                  </motion.div>
                )}

                <div ref={bottomRef} className="h-4" />
              </div>
            )}
          </div>

          <AnimatePresence>
            <AgentActivityBar />
          </AnimatePresence>

          <InputBar
            onOpenSettings={onOpenSettings}
            onClearChat={clearMessages}
            onScreenshot={() => {}}
            onWebSearch={(query) => {
              toast.info(`Web search: ${query}`)
            }}
          />
        </div>

        {/* Artifacts panel */}
        <ArtifactPanel />
      </div>
    </div>
  )
}
