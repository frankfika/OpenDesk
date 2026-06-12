import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../store/chat'
import {
  Terminal, FileText, FolderOpen, Wrench, CheckCircle, XCircle,
  Loader, Pencil, Search
} from 'lucide-react'

function toolIcon(name: string) {
  switch (name) {
    case 'file_read': case 'read_file': return <FileText size={11} className="text-blue-500" />
    case 'file_write': case 'write_file': case 'apply_patch': return <Pencil size={11} className="text-amber-500" />
    case 'file_list': case 'list_directory': return <FolderOpen size={11} className="text-indigo-500" />
    case 'shell': case 'bash': case 'run_command': return <Terminal size={11} className="text-green-600" />
    case 'web_search': return <Search size={11} className="text-purple-500" />
    default: return <Wrench size={11} className="text-[var(--text-muted)]" />
  }
}

function toolLabel(name: string, args?: Record<string, unknown>): string {
  const a = args || {}
  switch (name) {
    case 'file_read': case 'read_file': {
      const p = (a.path || a.file_path || '') as string
      return p.split('/').pop() || p || 'read file'
    }
    case 'file_write': case 'write_file': {
      const p = (a.path || a.file_path || '') as string
      return p.split('/').pop() || p || 'write file'
    }
    case 'apply_patch': {
      const p = (a.path || '') as string
      return p.split('/').pop() || p || 'patch file'
    }
    case 'file_list': case 'list_directory': {
      const p = (a.path || a.directory || '.') as string
      return p.split('/').pop() || p
    }
    case 'shell': case 'bash': {
      const cmd = (a.command || a.cmd || '') as string
      return cmd.slice(0, 50)
    }
    case 'web_search': return (a.query || '') as string
    default: return name.replace(/_/g, ' ')
  }
}

interface Step {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'running' | 'done' | 'error'
}

export default function AgentActivityBar() {
  const { messages, streaming } = useChatStore()

  const steps = useMemo((): Step[] => {
    const result: Step[] = []
    for (const msg of messages) {
      if (msg.kind === 'tool_call') {
        result.push({
          id: msg.id,
          name: (msg.metadata?.toolName as string) || 'tool',
          args: (msg.metadata?.params as Record<string, unknown>) || {},
          status: 'running'
        })
      } else if (msg.kind === 'tool_result') {
        // Mark the last running step as done/error
        const last = [...result].reverse().find(s => s.status === 'running')
        if (last) {
          last.status = msg.metadata?.isError ? 'error' : 'done'
        }
      }
    }
    return result
  }, [messages])

  // Only show when streaming with at least one tool step
  if (!streaming || steps.length === 0) return null

  const recentSteps = steps.slice(-5)

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mx-auto max-w-3xl w-full px-6 mb-2"
    >
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-sidebar)]/60 overflow-hidden">
        <div className="px-3 py-2 flex items-center gap-2 border-b border-[var(--border)]/60">
          <Loader size={11} className="text-[var(--accent)] animate-spin" />
          <span className="text-[11px] font-medium text-[var(--text-muted)]">
            Agent · {steps.filter(s => s.status === 'done').length}/{steps.length} steps
          </span>
        </div>
        <div className="flex flex-col divide-y divide-[var(--border)]/40">
          <AnimatePresence initial={false}>
            {recentSteps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: i * 0.03 }}
                className="flex items-center gap-2.5 px-3 py-1.5"
              >
                {step.status === 'running' ? (
                  <Loader size={11} className="text-[var(--accent)] animate-spin shrink-0" />
                ) : step.status === 'done' ? (
                  <CheckCircle size={11} className="text-green-500 shrink-0" />
                ) : (
                  <XCircle size={11} className="text-red-500 shrink-0" />
                )}
                <span className="shrink-0">{toolIcon(step.name)}</span>
                <span className="text-[11px] font-medium text-[var(--text-secondary)] shrink-0">
                  {step.name.replace(/_/g, ' ')}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] truncate font-mono">
                  {toolLabel(step.name, step.args)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
