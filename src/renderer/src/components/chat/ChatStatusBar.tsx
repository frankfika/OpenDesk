import { useEffect, useState, useMemo } from 'react'
import { CheckCircle2, AlertCircle, XCircle, FileText, Library, Cpu } from 'lucide-react'
import { useChatStore } from '../../store/chat'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
import { useSkillsStore } from '../../store/skills'
import { useToast } from '../../store/toast'

interface ChatStatusBarProps {
  onOpenSettings: () => void
}

export default function ChatStatusBar({ onOpenSettings }: ChatStatusBarProps) {
  const messages = useChatStore((state) => state.messages)
  const { activeProvider } = useSettingsStore()
  const { agentsMd } = useWorkspaceStore()
  const { skills } = useSkillsStore()
  const toast = useToast()
  const provider = activeProvider()
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

  const providerHealth = provider?.lastTestResult ? 'pass' : provider?.lastTestResult === false ? 'fail' : 'unknown'

  const totalTokens = useMemo(() => messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0), [messages])

  // Active skill is derived from current thread
  const thread = useWorkspaceStore((state) => state.activeThread())
  const activeSkill = thread?.skillId ? skills.find((s) => s.id === thread.skillId) : null

  return (
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
  )
}
