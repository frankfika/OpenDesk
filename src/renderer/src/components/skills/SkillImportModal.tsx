import { useState } from 'react'
import { useSkillsStore } from '../../store/skills'
import { FolderOpen, Globe, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface SkillImportModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function SkillImportModal({ onClose, onSuccess }: SkillImportModalProps) {
  const { importFromFolder, importFromGitHub } = useSkillsStore()
  const [tab, setTab] = useState<'folder' | 'github'>('folder')
  const [folderPath, setFolderPath] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleImportFolder() {
    if (!folderPath.trim()) return
    setLoading(true)
    setResult(null)
    const res = await importFromFolder(folderPath.trim())
    setLoading(false)
    if (res.success) {
      setResult({ success: true, message: `Imported "${res.skill?.name}" successfully` })
      setTimeout(onSuccess, 1200)
    } else {
      setResult({ success: false, message: res.error || 'Import failed' })
    }
  }

  async function handleImportGitHub() {
    if (!githubUrl.trim()) return
    setLoading(true)
    setResult(null)
    const res = await importFromGitHub(githubUrl.trim())
    setLoading(false)
    if (res.success) {
      setResult({ success: true, message: `Imported "${res.skill?.name}" from GitHub successfully` })
      setTimeout(onSuccess, 1200)
    } else {
      setResult({ success: false, message: res.error || 'Import failed' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[var(--bg-content)] rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Import Skill
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex items-center gap-2">
          <button
            onClick={() => { setTab('folder'); setResult(null) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              tab === 'folder'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--bg-sidebar)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
            }`}
          >
            <FolderOpen size={12} />
            From Folder
          </button>
          <button
            onClick={() => { setTab('github'); setResult(null) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              tab === 'github'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--bg-sidebar)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
            }`}
          >
            <Globe size={12} />
            From GitHub
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {tab === 'folder' ? (
            <div className="space-y-3">
              <p className="text-[12px] text-[var(--text-muted)]">
                Import a skill from a local folder. The folder must contain a{' '}
                <code className="text-[11px] bg-[var(--bg-sidebar)] px-1 py-0.5 rounded border border-[var(--border)]">
                  SKILL.md
                </code>{' '}
                file.
              </p>
              <div>
                <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
                  Folder Path
                </label>
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="/path/to/skill-folder"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-strong)]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] text-[var(--text-muted)]">
                Import a skill from a GitHub repository. Supports full URLs or{' '}
                <code className="text-[11px] bg-[var(--bg-sidebar)] px-1 py-0.5 rounded border border-[var(--border)]">
                  owner/repo
                </code>{' '}
                shorthand.
              </p>
              <div>
                <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
                  GitHub URL or Shorthand
                </label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="owner/repo or https://github.com/owner/repo"
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                result.success
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {result.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {result.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={tab === 'folder' ? handleImportFolder : handleImportGitHub}
            disabled={loading || (tab === 'folder' ? !folderPath.trim() : !githubUrl.trim())}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
