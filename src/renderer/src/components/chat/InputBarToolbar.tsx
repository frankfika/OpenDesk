import { memo } from 'react'
import { Send, Square, Camera, Users, Paperclip, Sparkles } from 'lucide-react'
import ModeSwitcher from './ModeSwitcher'
import EnsembleModelPicker from './EnsembleModelPicker'
import ModelPicker from './ModelPicker'
import ApprovalModeSelector from './ApprovalModeSelector'
import { useSkillsStore } from '../../store/skills'
import type { AgentRole, ChatMode, ProviderConfig } from '@shared/types'

interface InputBarToolbarProps {
  onScreenshot: () => void
  onOpenSettings: () => void
  onAttachFiles: () => void
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
  streaming: boolean
  selectedEnsembleIds: string[]
  setSelectedEnsembleIds: React.Dispatch<React.SetStateAction<string[]>>
  showEnsemblePicker: boolean
  setShowEnsemblePicker: React.Dispatch<React.SetStateAction<boolean>>
  ensembleArbitratorId: string | null
  setEnsembleArbitratorId: React.Dispatch<React.SetStateAction<string | null>>
  ensembleRoleAssignments: Record<string, AgentRole>
  setEnsembleRoleAssignments: React.Dispatch<React.SetStateAction<Record<string, AgentRole>>>
  providers: ProviderConfig[]
  onSend: () => void
  onAbort: () => void
  text: string
}

function InputBarToolbar({
  onScreenshot,
  onOpenSettings,
  onAttachFiles,
  mode,
  onModeChange,
  streaming,
  selectedEnsembleIds,
  setSelectedEnsembleIds,
  showEnsemblePicker,
  setShowEnsemblePicker,
  ensembleArbitratorId,
  setEnsembleArbitratorId,
  ensembleRoleAssignments,
  setEnsembleRoleAssignments,
  providers,
  onSend,
  onAbort,
  text
}: InputBarToolbarProps) {
  const isEnsembleMode = mode === 'ensemble' || mode === 'agent'
  const activeSkills = useSkillsStore((state) => state.getActiveSkills())

  return (
    <div className="flex items-center px-4 pb-4 gap-2">
      <button
        type="button"
        onClick={onScreenshot}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        title="Capture screenshot"
      >
        <Camera size={14} />
      </button>

      <button
        type="button"
        onClick={onAttachFiles}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        title="Attach files"
      >
        <Paperclip size={14} />
      </button>

      {activeSkills.length > 0 && (
        <div className="flex items-center gap-1">
          {activeSkills.map((skill) => (
            <span
              key={skill.id}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20"
              title={skill.description}
            >
              <Sparkles size={10} />
              {skill.name}
            </span>
          ))}
        </div>
      )}

      {!isEnsembleMode && <ModelPicker onOpenSettings={onOpenSettings} />}
      <ModeSwitcher mode={mode} onChange={onModeChange} disabled={streaming} />

      {isEnsembleMode && (
        <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setShowEnsemblePicker((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20"
            title="Configure ensemble models"
          >
            <Users size={14} />
            <span className="font-medium">{selectedEnsembleIds.length || 0} models</span>
          </button>

          <EnsembleModelPicker
            open={showEnsemblePicker}
            providers={providers}
            selectedIds={selectedEnsembleIds}
            arbitratorId={ensembleArbitratorId}
            roleAssignments={ensembleRoleAssignments}
            onToggleProvider={(id) => {
              setSelectedEnsembleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
            }}
            onSetArbitrator={(id) => setEnsembleArbitratorId(id)}
            onSetRole={(id, role) => {
              setEnsembleRoleAssignments((prev) => ({ ...prev, [id]: role }))
            }}
            onClose={() => setShowEnsemblePicker(false)}
          />
        </div>
      )}

      <ApprovalModeSelector />
      <div className="flex-1" />

      {streaming ? (
        <button
          type="button"
          onClick={onAbort}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors bg-[var(--error-bg)] text-[var(--error)] hover:bg-[var(--error-border)]"
          title="Stop (Esc)"
        >
          <Square size={12} className="fill-current" />
          Stop
          <span className="ml-1 text-[10px] opacity-60">Esc</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          disabled={!text.trim()}
          className={`flex items-center justify-center rounded-md transition-colors w-8 h-8 ${
            text.trim()
              ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] cursor-pointer'
              : 'bg-[var(--border)] text-[var(--text-muted)] cursor-default'
          }`}
          title="Send (⌘↵)"
        >
          <Send size={14} />
        </button>
      )}
    </div>
  )
}

export default memo(InputBarToolbar)
