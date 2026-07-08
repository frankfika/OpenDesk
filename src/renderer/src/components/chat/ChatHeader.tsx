import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Pencil,
  Sun,
  Moon,
  Library,
  Brain,
  PanelRightOpen,
  PanelRightClose,
  Settings,
  Stethoscope,
  Folder
} from 'lucide-react'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
import { useSkillsStore } from '../../store/skills'
import { useThemeStore } from '../../store/theme'
import { useArtifactsStore } from '../../store/artifacts'
import { useMemoryStore } from '../../store/memory'
import { useRunDiagnostics } from '../../lib/runDiagnostics'

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

  const provider = activeProvider()
  const workspace = activeWorkspace()
  const thread = activeThread()
  const activeSkill = thread?.skillId ? skills.find((s) => s.id === thread.skillId) : null

  const memoryCount = useMemo(
    () => [user, identity, soul].filter((m) => m.trim().length > 0).length,
    [user, identity, soul]
  )

  /* ------------ Online indicator ------------ */
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  /* ------------ Title editing ------------ */
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingTitle && thread) {
      setTitleValue(thread.title)
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [editingTitle, thread])

  const commitTitle = () => {
    if (thread && titleValue.trim() && titleValue.trim() !== thread.title) {
      updateThread(thread.id, { title: titleValue.trim() })
    }
    setEditingTitle(false)
  }

  /* ------------ Diagnostics ------------ */
  const runDiagnostics = useRunDiagnostics({
    onViewDetail: () => onOpenSettings()
  })

  /* ------------ Provider health (fixed: must check === true) ------------ */
  const providerHealth: 'pass' | 'fail' | 'unknown' =
    provider?.lastTestResult === true
      ? 'pass'
      : provider?.lastTestResult === false
        ? 'fail'
        : 'unknown'

  const healthColor =
    providerHealth === 'pass'
      ? 'bg-[var(--success)]'
      : providerHealth === 'fail'
        ? 'bg-[var(--error)]'
        : 'bg-[var(--warning)]'

  const workspaceLabel = workspace?.name || workspace?.folderPath.split('/').pop() || 'No workspace'

  return (
    <div
      className="drag-region shrink-0 flex items-center justify-between gap-3 px-4 border-b border-[var(--border)] bg-[var(--bg-content)]/80 backdrop-blur-xl"
      style={{ height: 'var(--titlebar-height)' }}
    >
      {/* ============ LEFT: Workspace identity ============ */}
      <div className="no-drag flex items-center gap-2 min-w-0 w-[200px]">
        <div
          className="flex items-center justify-center rounded-md shrink-0 overflow-hidden"
          style={{
            width: 22,
            height: 22,
            background:
              'linear-gradient(135deg, rgba(29,140,128,0.22) 0%, rgba(29,140,128,0.06) 100%)',
            border: '1px solid rgba(29,140,128,0.35)'
          }}
          aria-hidden="true"
        >
          {workspace ? (
            <Folder size={12} className="text-[var(--accent)]" />
          ) : (
            <img
              src="../../../resources/logo-1024.png"
              alt=""
              width={14}
              height={14}
              style={{ objectFit: 'contain' }}
            />
          )}
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <span
            className="text-[12px] font-semibold text-[var(--text-primary)] truncate"
            title={workspace?.folderPath}
          >
            {workspaceLabel}
          </span>
          {agentsMd?.loaded && (
            <span
              className="text-[10px] text-[var(--text-muted)] truncate"
              title={`${agentsMd.paths.length} rule file(s): ${agentsMd.paths.join('\n')}`}
            >
              {agentsMd.paths.length} rule{agentsMd.paths.length === 1 ? '' : 's'} active
            </span>
          )}
        </div>
      </div>

      {/* ============ CENTER: Conversation title + meta ============ */}
      <div className="no-drag flex-1 flex flex-col items-center justify-center min-w-0 px-2">
        <div className="group flex items-center gap-1.5 max-w-full">
          {editingTitle ? (
            <input
              ref={inputRef}
              autoFocus
              className="text-[13px] font-semibold px-2.5 py-0.5 rounded-md bg-[var(--bg-input)] border border-[var(--accent)] text-[var(--text-primary)] outline-none text-center min-w-[160px] max-w-[360px] shadow-sm focus:ring-2 focus:ring-[var(--accent)]/30"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitTitle()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setEditingTitle(false)
                }
              }}
              placeholder="Untitled conversation"
            />
          ) : (
            <button
              type="button"
              onClick={() => thread && setEditingTitle(true)}
              disabled={!thread}
              title={thread ? 'Click to rename · Enter to save · Esc to cancel' : ''}
              className="flex items-center gap-1 text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] px-2.5 py-0.5 rounded-md transition-colors max-w-full disabled:cursor-default disabled:hover:bg-transparent"
            >
              <span className="truncate max-w-[320px]">
                {thread?.title?.trim() || 'Untitled conversation'}
              </span>
              {thread && (
                <Pencil
                  size={11}
                  className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                />
              )}
            </button>
          )}
        </div>

        {/* Sub-line: model + skill + memory + rules (context at a glance) */}
        {(provider || activeSkill || memoryLoaded || (agentsMd?.loaded ?? false)) && (
          <div className="flex items-center gap-2 text-[10.5px] text-[var(--text-muted)] mt-0.5 min-w-0">
            {provider && (
              <button
                type="button"
                onClick={onOpenSettings}
                title={`${provider.name} · ${provider.model} — change provider`}
                className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors min-w-0"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${healthColor}`} />
                <span className="truncate max-w-[160px]">{provider.model}</span>
              </button>
            )}
            {provider && activeSkill && <Sep />}
            {activeSkill && (
              <span className="flex items-center gap-1 truncate max-w-[140px]" title={activeSkill.name}>
                <Library size={10} className="shrink-0" />
                <span className="truncate">{activeSkill.name}</span>
              </span>
            )}
            {(provider || activeSkill) && memoryLoaded && memoryCount > 0 && <Sep />}
            {memoryLoaded && (
              <span
                className="flex items-center gap-1"
                title={`${memoryCount}/3 memory entries: user · identity · soul`}
              >
                <Brain size={10} className="shrink-0" />
                <span>{memoryCount}/3</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ============ RIGHT: Global actions ============ */}
      <div className="no-drag flex items-center gap-0.5 justify-end w-[200px]">
        {memoryLoaded && onOpenMemory && (
          <IconButton
            onClick={onOpenMemory}
            label="Memory"
            active={memoryCount > 0}
            badge={memoryCount > 0 ? memoryCount : undefined}
            testId="chat-header-memory"
          >
            <Brain size={14} />
          </IconButton>
        )}

        {onOpenSkills && (
          <IconButton
            onClick={onOpenSkills}
            label="Skills"
            active={!!activeSkill}
            sublabel={activeSkill?.name}
            testId="chat-header-skills"
          >
            <Library size={14} />
          </IconButton>
        )}

        <IconButton
          onClick={runDiagnostics}
          label="Run diagnostics"
          tone={providerHealth === 'fail' ? 'danger' : providerHealth === 'unknown' ? 'warn' : 'default'}
          testId="chat-header-doctor"
        >
          <Stethoscope size={14} />
        </IconButton>

        <div className="w-px h-4 bg-[var(--border)] mx-1" />

        <IconButton onClick={toggleTheme} label={resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}>
          {resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </IconButton>

        <IconButton onClick={onOpenSettings} label="Settings" testId="chat-header-settings">
          <Settings size={14} />
        </IconButton>

        {artifacts.length > 0 && (
          <IconButton
            onClick={() => setPanelOpen(!panelOpen)}
            label={panelOpen ? 'Hide artifacts' : 'Show artifacts'}
            tone="accent"
            badge={artifacts.length}
            active={panelOpen}
            testId="chat-header-artifacts"
          >
            {panelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          </IconButton>
        )}

        <div
          className={`relative w-2 h-2 rounded-full ml-1.5 ${isOnline ? 'bg-[var(--accent)]' : 'bg-[var(--error)]'}`}
          title={isOnline ? 'Online' : 'Offline'}
        >
          {isOnline && (
            <span className="absolute inset-0 rounded-full bg-[var(--accent)] animate-ping opacity-50" />
          )}
        </div>
      </div>
    </div>
  )
}

/* =============== Local sub-components =============== */

function Sep() {
  return <span className="w-px h-2.5 bg-[var(--border)]" />
}

type Tone = 'default' | 'accent' | 'danger' | 'warn'

interface IconButtonProps {
  onClick: () => void
  label: string
  children: React.ReactNode
  tone?: Tone
  active?: boolean
  badge?: number
  sublabel?: string
  testId?: string
}

function IconButton({
  onClick,
  label,
  children,
  tone = 'default',
  active,
  badge,
  sublabel,
  testId
}: IconButtonProps) {
  const toneClasses = (() => {
    if (active || tone === 'accent')
      return 'bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent)]/90'
    if (tone === 'danger')
      return 'text-[var(--error)] bg-[var(--error-bg)] hover:bg-[var(--error)]/15 border border-[var(--error)]/30'
    if (tone === 'warn')
      return 'text-[var(--warning)] bg-[var(--warning-bg)] hover:bg-[var(--warning)]/15 border border-[var(--warning)]/30'
    return 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)]'
  })()

  return (
    <button
      type="button"
      onClick={onClick}
      title={sublabel ? `${label} · ${sublabel}` : label}
      aria-label={label}
      data-testid={testId}
      className={`relative inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${toneClasses}`}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-semibold leading-none flex items-center justify-center bg-[var(--bg-content)] text-[var(--text-primary)] border border-[var(--border-strong)]">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}