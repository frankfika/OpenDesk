// LeftSidebar — primary nav. Scenarios are top-level entries (not tabs).
import { motion } from 'framer-motion'
import { ScanLine, Zap, ShieldCheck, Plus, Layers, History, type LucideIcon } from 'lucide-react'
import { useWeb3Store, type Web3ScenarioId } from '../../store/web3'
import { useWorkspaceStore } from '../../store/workspace'
import { useChatStore } from '../../store/chat'

interface NavItem {
  id: Web3ScenarioId
  label: string
  short: string
  icon: LucideIcon
  color: string
  skill: string
}

const SCENARIOS: NavItem[] = [
  { id: 'intel', label: 'Chain Intel', short: 'INTEL', icon: ScanLine, color: '#627eea', skill: 'web3-intel' },
  { id: 'trade', label: 'One-Liner Trade', short: 'TRADE', icon: Zap, color: '#1D8C80', skill: 'web3-trader' },
  { id: 'doctor', label: 'Wallet Doctor', short: 'DOCTOR', icon: ShieldCheck, color: '#ffb250', skill: 'web3-intel' }
]

export default function LeftSidebar(): JSX.Element {
  const activeScenario = useWeb3Store((s) => s.activeScenario)
  const setActiveScenario = useWeb3Store((s) => s.setActiveScenario)
  const { activeWorkspace, threads, activeThreadId, setActiveThread, createThread } = useWorkspaceStore()
  const { clearMessages } = useChatStore()

  const handleScenario = (s: NavItem) => {
    setActiveScenario(s.id)
  }

  const handleNewChat = async () => {
    clearMessages()
    const ws = activeWorkspace()
    if (!ws) return
    await createThread(ws.id)
  }

  const handlePickThread = async (id: string) => {
    await setActiveThread(id)
  }

  return (
    <div className="relative w-60 flex flex-col border-r" style={{ background: '#0e0e10', borderColor: '#1f1f23' }}>
      {/* Scenarios — primary nav */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="web3-label">Scenarios</span>
          <span className="web3-label web3-status-accent">3</span>
        </div>
        <div className="space-y-1">
          {SCENARIOS.map((s) => {
            const Icon = s.icon
            const active = activeScenario === s.id
            return (
              <motion.button
                key={s.id}
                type="button"
                data-scenario={s.id}
                onClick={() => handleScenario(s)}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-all relative ${
                  active
                    ? 'bg-[#1a1a1d] text-white border border-[#2a2a2e]'
                    : 'web3-text-secondary hover:text-white hover:bg-[#141416] border border-transparent'
                }`}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                    style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }}
                  />
                )}
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{
                    background: active ? `${s.color}25` : 'rgba(255,255,255,0.03)',
                    border: active ? `1px solid ${s.color}40` : '1px solid rgba(255,255,255,0.04)'
                  }}
                >
                  <Icon size={13} style={{ color: active ? s.color : 'rgba(255,255,255,0.7)' }} />
                </div>
                <span className="flex-1 text-left">{s.label}</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Chat threads */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 border-t border-[#1f1f23] min-h-0">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="web3-label flex items-center gap-1">
            <History size={9} /> Threads
          </span>
          <button
            type="button"
            onClick={handleNewChat}
            className="web3-text-muted hover:text-[#1D8C80] transition-colors"
            title="New thread"
          >
            <Plus size={12} />
          </button>
        </div>
        {threads.length === 0 ? (
          <div className="px-2 py-4 text-center web3-label web3-text-muted">
            No threads yet
          </div>
        ) : (
          <div className="space-y-0.5">
            {threads.slice(0, 30).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => void handlePickThread(t.id)}
                className={`w-full text-left rounded-md px-2.5 py-1.5 text-[11px] transition-colors ${
                  activeThreadId === t.id
                    ? 'bg-[#1a1a1d] text-white border border-[#2a2a2e]'
                    : 'web3-text-muted hover:web3-text-body hover:bg-[#141416] border border-transparent'
                }`}
              >
                <div className="truncate font-medium">{t.title || 'New thread'}</div>
                <div className="web3-label web3-text-muted mt-0.5">{new Date(t.updatedAt).toLocaleDateString()}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Workspace footer */}
      <div className="p-3 border-t border-[#1f1f23] space-y-2">
        {activeWorkspace && (
          <div className="px-2">
            <div className="web3-label mb-1">Workspace</div>
            <div className="text-[11px] web3-text-body truncate font-medium">{activeWorkspace.name}</div>
            <div className="web3-label web3-text-muted mt-0.5">{threads.length} threads</div>
          </div>
        )}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('opendesk:open-skills'))}
          className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] web3-text-muted hover:text-white hover:bg-[#16161a] transition-colors"
        >
          <Layers size={11} />
          Skills
        </button>
      </div>
    </div>
  )
}
