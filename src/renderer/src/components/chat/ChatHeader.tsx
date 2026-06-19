import { useState } from 'react'
import {
  FolderSymlink,
  Settings,
  Sun,
  Moon,
  CheckCircle2,
  Library,
  FileText,
  PanelRightOpen,
  FolderOpen,
  ChevronDown
} from 'lucide-react'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
import { useSkillsStore } from '../../store/skills'
import { useThemeStore } from '../../store/theme'
import { useArtifactsStore } from '../../store/artifacts'

interface ChatHeaderProps {
  onOpenSettings: () => void
  onOpenFiles?: () => void
}

export default function ChatHeader({ onOpenSettings, onOpenFiles }: ChatHeaderProps) {
  const { activeProvider } = useSettingsStore()
  const { workspaces, activeWorkspace, activeThread, setActiveWorkspace, updateThread, agentsMd } = useWorkspaceStore()
  const { skills } = useSkillsStore()
  const { resolvedTheme, toggleTheme } = useThemeStore()
  const { artifacts, panelOpen, setPanelOpen } = useArtifactsStore()

  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')

  const provider = activeProvider()
  const workspace = activeWorkspace()
  const thread = activeThread()
  const activeSkill = thread?.skillId ? skills.find((s) => s.id === thread.skillId) : null

  const handleTitleSubmit = () => {
    if (thread && titleValue.trim() && titleValue !== thread.title) {
      updateThread(thread.id, { title: titleValue.trim() })
    }
    setEditingTitle(false)
  }

  return (
    <div
      className="drag-region shrink-0 flex items-center justify-between px-6 border-b border-[var(--border)]"
      style={{ height: 'var(--titlebar-height)' }}
    >
      {/* Left: Workspace name */}
      <div className="no-drag flex items-center gap-2 flex-1 relative">
        {workspace ? (
          <div className="relative">
            <button
              onClick={() => setShowWorkspacePicker((v) => !v)}
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
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace(ws.id)
                      setShowWorkspacePicker(false)
                    }}
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
  )
}
