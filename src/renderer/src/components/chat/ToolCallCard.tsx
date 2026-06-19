import { useState, useMemo } from 'react'
import { FileText, Pencil, FolderOpen, Terminal, CheckCircle, XCircle, Wrench, Clock, ChevronRight } from 'lucide-react'

interface ToolCallCardProps {
  toolName: string
  args?: Record<string, unknown>
  isResult?: boolean
  content?: string
  isError?: boolean
}

export default function ToolCallCard({ toolName, args, isResult, content, isError }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)

  const { icon, label, summary, detail, color } = useMemo(() => {
    const a = args || {}
    switch (toolName) {
      case 'file_read':
      case 'read_file': {
        const path = (a.path || a.file_path || '') as string
        const short = path.split('/').pop() || path
        return {
          icon: <FileText size={13} />,
          label: 'Read file',
          summary: short,
          detail: path,
          color: 'text-blue-600 bg-blue-500/8 border-blue-200/60'
        }
      }
      case 'file_write':
      case 'write_file': {
        const path = (a.path || a.file_path || '') as string
        const short = path.split('/').pop() || path
        return {
          icon: <Pencil size={13} />,
          label: 'Write file',
          summary: short,
          detail: path,
          color: 'text-amber-600 bg-amber-500/8 border-amber-200/60'
        }
      }
      case 'file_list':
      case 'list_directory': {
        const path = (a.path || a.directory || '') as string
        const short = path.split('/').pop() || path || '.'
        return {
          icon: <FolderOpen size={13} />,
          label: 'List directory',
          summary: short,
          detail: path,
          color: 'text-indigo-600 bg-indigo-500/8 border-indigo-200/60'
        }
      }
      case 'shell':
      case 'bash':
      case 'run_command': {
        const cmd = (a.command || a.cmd || '') as string
        const short = cmd.slice(0, 60) + (cmd.length > 60 ? '…' : '')
        return {
          icon: <Terminal size={13} />,
          label: 'Shell',
          summary: short,
          detail: cmd,
          color: 'text-green-700 bg-green-500/8 border-green-200/60'
        }
      }
      case 'apply_patch': {
        const path = (a.path || '') as string
        const short = path.split('/').pop() || path
        return {
          icon: <CheckCircle size={13} />,
          label: 'Apply patch',
          summary: short,
          detail: path,
          color: 'text-teal-600 bg-teal-500/8 border-teal-200/60'
        }
      }
      default: {
        const argStr = Object.keys(a)
          .map((k) => `${k}=${JSON.stringify(a[k])?.slice(0, 40)}`)
          .join(', ')
        return {
          icon: <Wrench size={13} />,
          label: toolName.replace(/_/g, ' '),
          summary: argStr || '…',
          detail: JSON.stringify(a, null, 2),
          color: 'text-[var(--text-secondary)] bg-[var(--bg-sidebar)] border-[var(--border)]'
        }
      }
    }
  }, [toolName, args])

  if (isResult) {
    const isDiff = content?.startsWith('---') || content?.startsWith('@@') || content?.startsWith('diff ')
    const isFileWrite = toolName === 'file_write' || toolName === 'write_file' || toolName === 'apply_patch'

    return (
      <div
        className={`my-1 rounded-lg border text-[12px] overflow-hidden ${isError ? 'bg-red-500/5 border-red-200/60' : 'bg-[var(--bg-sidebar)]/40 border-[var(--border)]'}`}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--border)]/30 transition-colors"
        >
          {isError ? (
            <XCircle size={12} className="text-red-500 shrink-0" />
          ) : (
            <CheckCircle size={12} className="text-green-500 shrink-0" />
          )}
          <span className={`text-[11px] font-medium ${isError ? 'text-red-600' : 'text-[var(--text-muted)]'}`}>
            {isError ? 'Error' : isFileWrite ? 'Written' : 'Result'} · {toolName.replace(/_/g, ' ')}
          </span>
          {content && !expanded && (
            <span className="flex-1 min-w-0 truncate text-[var(--text-muted)] font-mono ml-1">
              {content.slice(0, 80)}
            </span>
          )}
          {content && (
            <ChevronRight
              size={12}
              className={`shrink-0 text-[var(--text-muted)] transition-transform ml-auto ${expanded ? 'rotate-90' : ''}`}
            />
          )}
        </button>
        {expanded &&
          content &&
          (isDiff ? (
            <div className="px-1 pb-2 max-h-[400px] overflow-y-auto">
              {content.split('\n').map((line, i) => {
                const cls =
                  line.startsWith('+') && !line.startsWith('+++')
                    ? 'bg-green-500/10 text-green-800 dark:text-green-300'
                    : line.startsWith('-') && !line.startsWith('---')
                      ? 'bg-red-500/10 text-red-800 dark:text-red-300'
                      : line.startsWith('@@')
                        ? 'text-blue-600 font-semibold'
                        : 'text-[var(--text-muted)]'
                return (
                  <div key={i} className={`px-3 py-px font-mono text-[11px] leading-5 ${cls}`}>
                    {line || ' '}
                  </div>
                )
              })}
            </div>
          ) : (
            <div
              className={`px-3 pb-3 font-mono text-[12px] whitespace-pre-wrap max-h-[300px] overflow-y-auto leading-relaxed ${isError ? 'text-red-700' : 'text-[var(--text-secondary)]'}`}
            >
              {content}
            </div>
          ))}
      </div>
    )
  }

  return (
    <div className={`my-1.5 rounded-lg border text-[12px] overflow-hidden ${color}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:brightness-95 transition-all"
      >
        <Clock size={11} className="shrink-0 animate-pulse opacity-60" />
        <span className="shrink-0">{icon}</span>
        <span className="font-medium shrink-0">{label}</span>
        <span className="flex-1 min-w-0 truncate font-mono opacity-80">{summary}</span>
        {detail !== summary && (
          <ChevronRight
            size={12}
            className={`shrink-0 opacity-60 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        )}
      </button>
      {expanded && detail !== summary && (
        <div className="px-3 pb-3 font-mono text-[12px] opacity-80 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
          {detail}
        </div>
      )}
    </div>
  )
}
