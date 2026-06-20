import { RefreshCw, ExternalLink, FileText, ChevronRight } from 'lucide-react'
import { useToast } from '../../store/toast'
import packageJson from '../../../../../package.json'

export default function AboutPanel() {
  const toast = useToast()
  const version = packageJson.version

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center py-4">
        <div className="text-2xl font-bold mb-1 text-[var(--text-primary)]">OpenDesk</div>
        <div className="text-[13px] text-[var(--text-muted)]">v{version} · Apache 2.0</div>
      </div>

      <button
        onClick={() => toast.info(`You are on the latest version (v${version})`)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
      >
        <RefreshCw size={14} />
        Check for Updates
      </button>

      <div className="flex flex-col gap-2">
        <a
          href="https://github.com/opendesk/opendesk"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] border border-transparent hover:border-[var(--border)] transition-colors"
        >
          <ExternalLink size={14} />
          GitHub Repository
          <ChevronRight size={12} className="ml-auto text-[var(--text-muted)]" />
        </a>
        <a
          href="#"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] border border-transparent hover:border-[var(--border)] transition-colors"
        >
          <FileText size={14} />
          Documentation
          <ChevronRight size={12} className="ml-auto text-[var(--text-muted)]" />
        </a>
      </div>
    </div>
  )
}
