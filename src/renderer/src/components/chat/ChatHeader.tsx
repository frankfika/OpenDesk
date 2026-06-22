import { useState, useEffect } from 'react'
import {
  Settings,
  Sun,
  Moon,
  Library,
  FileText,
  PanelRightOpen,
  Hexagon,
  Brain,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
import { useSkillsStore } from '../../store/skills'
import { useThemeStore } from '../../store/theme'
import { useArtifactsStore } from '../../store/artifacts'
import { useMemoryStore } from '../../store/memory'
import { useToast } from '../../store/toast'

interface ChatHeaderProps {
  onOpenSettings: () => void
  onOpenMemory?: () => void
  onOpenSkills?: () => void
}

export default function ChatHeader({
  onOpenSettings,
  onOpenMemory,
  onOpenSkills
}: ChatHeaderProps) {
  const { activeProvider } = useSettingsStore()
  const { activeWorkspace, activeThread, updateThread, agentsMd } = useWorkspaceStore()
  const { skills } = useSkillsStore()
  const { resolvedTheme, toggleTheme } = useThemeStore()
  const { artifacts, panelOpen, setPanelOpen } = useArtifactsStore()
  const { user, identity, soul, loaded: memoryLoaded } = useMemoryStore()

  const [isOnline, setIsOnline] = useState(navigator.onLine)
  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const memoryCount = [user, identity, soul].filter((m) => m.trim().length > 0).length

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')

  const provider = activeProvider()
  const workspace = activeWorkspace()
  const thread = activeThread()
  const activeSkill = thread?.skillId ? skills.find((s) => s.id === thread.skillId) : null
  const toast = useToast()

  const providerHealth = provider?.lastTestResult ? 'pass' : provider?.lastTestResult === false ? 'fail' : 'unknown'

  const handleTitleSubmit = () => {
    if (thread && titleValue.trim() && titleValue !== thread.title) {
      updateThread(thread.id, { title: titleValue.trim() })
    }
    setEditingTitle(false)
  }

  return (
    <div
      className="drag-region shrink-0 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--bg-content)]/80 backdrop-blur-xl"
      style={{ height: 'var(--titlebar-height)' }}
    >
      {/* Left: Workspace & Provider Status */}
      <div className="no-drag flex items-center gap-2 flex-1 transition-all duration-300 min-w-0">
        {workspace && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] truncate shrink-0">
            <Hexagon size={13} className="text-[var(--text-muted)]" />
            <span className="truncate max-w-[100px]">
              {workspace.name || workspace.folderPath.split('/').pop()}
            </span>
          </div>
        )}

        <div className="h-3 w-px bg-[var(--border)] shrink-0" />

        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] truncate">
          {providerHealth === 'pass' && <CheckCircle2 size={12} className="text-[var(--success)] shrink-0" />}
          {providerHealth === 'fail' && <XCircle size={12} className="text-[var(--error)] shrink-0" />}
          {providerHealth === 'unknown' && <AlertCircle size={12} className="text-[var(--warning)] shrink-0" />}
          <span className="truncate max-w-[120px]">
            {provider ? provider.model : 'No provider'}
          </span>
        </div>
      </div>

      {/* Center: Thread title */}
      <div className="no-drag flex-[2] flex items-center justify-center min-w-0 px-4">
        {editingTitle && thread ? (
          <input
            autoFocus
            className="text-[13px] font-semibold px-3 py-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-primary)] outline-none text-center w-full max-w-[320px] shadow-sm"
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
            type="button"
            onClick={() => {
              if (thread) {
                setTitleValue(thread.title)
                setEditingTitle(true)
              }
            }}
            className="text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--border)] transition-all px-3 py-1 rounded-lg truncate max-w-full"
          >
            {thread?.title || 'New conversation'}
          </button>
        )}
      </div>

      {/* Right: Actions & Indicators */}
      <div className="no-drag flex items-center gap-1.5 flex-1 justify-end min-w-0">
        {agentsMd?.loaded && (
          <button
            type="button"
            onClick={() =>
              toast.info(
                `${agentsMd.paths.length} AI rule file${agentsMd.paths.length === 1 ? '' : 's'} loaded from this workspace:\n${agentsMd.paths.map((p) => '• ' + p).join('\n')}`
              )
            }
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[var(--success)] bg-[var(--success-bg)] border border-[var(--success-border)] hover:bg-[var(--success-border)]/30 transition-colors"
            title={`${agentsMd.paths.length} AI rule file${agentsMd.paths.length === 1 ? '' : 's'} found (AGENTS.md / .cursorrules / .traerules). These files tell the AI how to behave in this workspace.`}
          >
            <FileText size={11} />
            <span>
              {agentsMd.paths.length} rule{agentsMd.paths.length === 1 ? '' : 's'}
            </span>
          </button>
        )}

        {memoryLoaded && (
          <button
            type="button"
            onClick={onOpenMemory}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all border ${
              memoryCount > 0
                ? 'bg-[var(--accent)]/5 text-[var(--accent)] border-[var(--accent)]/20 shadow-sm'
                : 'text-[var(--text-secondary)] border-transparent hover:bg-[var(--border)]'
            }`}
          >
            <Brain size={12} />
            <span>{memoryCount > 0 ? memoryCount : 'Memory'}</span>
          </button>
        )}

        {onOpenSkills && (
          <button
            type="button"
            onClick={onOpenSkills}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all border ${
              activeSkill
                ? 'bg-[var(--info-bg)] text-[var(--info)] border-[var(--info-border)] shadow-sm'
                : 'text-[var(--text-secondary)] border-transparent hover:bg-[var(--border)]'
            }`}
          >
            <Library size={12} />
            <span>{activeSkill ? activeSkill.name : 'Skills'}</span>
          </button>
        )}

        <div className="w-px h-3 bg-[var(--border)] mx-1" />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            title="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            title="Settings"
          >
            <Settings size={14} />
          </button>
        </div>

        {artifacts.length > 0 && (
          <button
            type="button"
            onClick={() => setPanelOpen(!panelOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              panelOpen
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'bg-[var(--bg-sidebar)] text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-[var(--text-muted)]'
            }`}
          >
            <PanelRightOpen size={12} />
            <span>{artifacts.length}</span>
          </button>
        )}

        <div
          className={`w-2 h-2 rounded-full ml-1 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      </div>
    </div>
  )
}
