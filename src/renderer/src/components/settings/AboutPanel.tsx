import { RefreshCw, ExternalLink, FileText, ChevronRight, Heart } from 'lucide-react'
import { useToast } from '../../store/toast'
import packageJson from '../../../../../package.json'

export default function AboutPanel() {
  const toast = useToast()
  const version = packageJson.version

  return (
    <div className="flex flex-col gap-5">
      {/* Brand block */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div
          className="relative flex items-center justify-center rounded-2xl shadow-subtle overflow-hidden"
          style={{
            width: 88,
            height: 88,
            background:
              'linear-gradient(135deg, rgba(29,140,128,0.12) 0%, rgba(29,140,128,0.04) 50%, rgba(29,140,128,0.18) 100%)',
            border: '1px solid rgba(29,140,128,0.25)'
          }}
        >
          <img
            src="../../../resources/logo-1024.png"
            alt="OpenDesk logo"
            width={64}
            height={64}
            className="rounded-xl"
            style={{ objectFit: 'contain' }}
          />
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-[var(--text-primary)] tracking-tight">OpenDesk</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            v{version} · Apache 2.0 · Made with <Heart size={10} className="inline -mt-0.5 text-[var(--accent)]" /> for makers
          </div>
        </div>
      </div>

      <button
        type="button"
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
