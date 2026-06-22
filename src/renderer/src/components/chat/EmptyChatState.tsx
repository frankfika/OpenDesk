import { motion, AnimatePresence } from 'framer-motion'
import { FolderSymlink, Plug, TerminalSquare, Code2, FileEdit, Search, MessageSquare } from 'lucide-react'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
import { useToast } from '../../store/toast'
import EmptyState from '../ui/EmptyState'
import SuggestionCard from '../ui/SuggestionCard'

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
  {
    icon: Code2,
    title: 'Code Review',
    description: 'Review code for bugs',
    prompt: 'Please review the following code for bugs and improvements:\n\n```\n\n```'
  },
  {
    icon: FileEdit,
    title: 'Write Docs',
    description: 'Write documentation',
    prompt: 'Please write documentation for: '
  },
  { icon: Search, title: 'Web Search', description: 'Search the web', prompt: '/search ' }
]

interface EmptyChatStateProps {
  onOpenSettings: () => void
}

export default function EmptyChatState({ onOpenSettings }: EmptyChatStateProps) {
  const { activeProvider } = useSettingsStore()
  const { workspaces, setActiveWorkspace } = useWorkspaceStore()
  const toast = useToast()
  const provider = activeProvider()
  const recentWorkspaces = workspaces.slice(0, 3)

  function fillInput(text: string) {
    window.dispatchEvent(new CustomEvent('opendesk:fill-input', { detail: { text } }))
  }

  async function handleConnectFiles() {
    const ws = await window.api?.workspace?.add()
    if (ws) toast.success(`Workspace "${ws.name}" added`)
  }

  if (!provider) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8">
        <EmptyState
          icon={Plug}
          title="Connect an AI model"
          description="Add a provider to start chatting with OpenDesk"
          actions={[{ label: 'Add provider', onClick: onOpenSettings, variant: 'primary', icon: Plug }]}
          size="lg"
          className="max-w-sm"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 px-8">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }}
      >
        <motion.div
          className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[var(--bg-sidebar)] border border-[var(--border)] shadow-sm"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <MessageSquare size={36} className="text-[var(--text-primary)]" strokeWidth={1.5} />
        </motion.div>
        <h1 className="text-4xl font-bold mb-3 tracking-tight text-[var(--text-primary)]">What can I help with?</h1>
        <p className="text-[15px] text-[var(--text-secondary)] font-medium">
          {`Ready with ${provider.name} · ${provider.model}`}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
        {SUGGESTION_CARDS.map((card, i) => (
          <SuggestionCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            description={card.description}
            index={i}
            onClick={() => fillInput(card.prompt)}
            className="w-full"
          />
        ))}
      </div>

      <motion.div
        className="flex gap-3 flex-wrap justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        {QUICK_ACTIONS.map((action, i) => {
          const Icon = action.icon
          return (
            <motion.button type="button"
              key={action.title}
              onClick={action.onClick({ onOpenSettings, handleConnectFiles, fillInput })}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[13px] font-semibold bg-[var(--bg-content)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] hover:border-[var(--border-strong)] shadow-sm transition-all"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
              whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={14} className="text-[var(--text-muted)]" />
              {action.title}
            </motion.button>
          )
        })}
      </motion.div>

      <AnimatePresence>
        {recentWorkspaces.length > 0 && (
          <motion.div
            className="w-full max-w-md mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4 text-center">
              Jump Back In
            </div>
            <div className="grid grid-cols-1 gap-2">
              {recentWorkspaces.map((ws, i) => (
                <motion.button type="button"
                  key={ws.id}
                  onClick={() => setActiveWorkspace(ws.id)}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-[var(--bg-sidebar)]/40 border border-[var(--border)] hover:border-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]/60 transition-all text-left group"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.05 }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-content)] border border-[var(--border)] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <FolderSymlink size={18} className="text-[var(--text-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                      {ws.name || ws.folderPath.split('/').pop()}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{ws.folderPath}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
