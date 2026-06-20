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
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
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
        <h1 className="text-3xl font-semibold mb-3 text-[var(--text-primary)]">What can I help with?</h1>
        <p className="text-[15px] text-[var(--text-secondary)]">{`Using ${provider.name} · ${provider.model}`}</p>
      </motion.div>

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

      <motion.div
        className="flex gap-4 flex-wrap justify-center max-w-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
      >
        {QUICK_ACTIONS.map((action, i) => {
          const Icon = action.icon
          return (
            <motion.button type="button"
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
                <motion.button type="button"
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
                    <div className="text-[11px] text-[var(--text-muted)] truncate">{ws.folderPath}</div>
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
