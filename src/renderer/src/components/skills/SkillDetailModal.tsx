import { useState, useEffect } from 'react'
import { useSkillsStore } from '../../store/skills'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  X, Download, Trash2, ExternalLink, FileText, Code, Box,
  Tag, Clock, User, Hash
} from 'lucide-react'

interface SkillDetailModalProps {
  skillId: string
  onClose: () => void
}

export default function SkillDetailModal({ skillId, onClose }: SkillDetailModalProps) {
  const { getSkillById, loadSkillContent, exportSkill, deleteSkill, refresh } = useSkillsStore()
  const skill = getSkillById(skillId)
  const [fullContent, setFullContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!skill) return
    setLoading(true)
    loadSkillContent(skillId, 2).then((result) => {
      setFullContent(result.content)
      setLoading(false)
    })
  }, [skillId, skill, loadSkillContent])

  if (!skill) return null

  const isDeletable = skill.source === 'global' || skill.source === 'github' || skill.source === 'marketplace'

  async function handleExport() {
    const outputPath = prompt('Enter output directory path:', skill!.path)
    if (!outputPath) return
    try {
      await exportSkill(skillId, outputPath)
      alert('Skill exported successfully')
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete skill "${skill!.name}"? This cannot be undone.`)) return
    setDeleting(true)
    const result = await deleteSkill(skillId)
    if (result) {
      onClose()
      refresh()
    } else {
      setDeleting(false)
      alert('Failed to delete skill')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl max-h-[85vh] bg-[var(--bg-content)] rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[var(--border)] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {skill.name}
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md border font-medium bg-[var(--bg-sidebar)] text-[var(--text-secondary)] border-[var(--border)]">
                {skill.source}
              </span>
              {skill.version && (
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  v{skill.version}
                </span>
              )}
            </div>
            <p className="text-[12px] text-[var(--text-secondary)]">
              {skill.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Meta info */}
        <div className="shrink-0 px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/30">
          <div className="flex items-center gap-4 flex-wrap">
            {skill.author && (
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <User size={11} />
                {skill.author}
              </div>
            )}
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <Clock size={11} />
              {new Date(skill.installedAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <Hash size={11} />
              {skill.id}
            </div>
            {skill.hasReference && (
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <FileText size={11} />
                Reference
              </div>
            )}
            {skill.hasScripts && (
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <Code size={11} />
                Scripts
              </div>
            )}
            {skill.hasAssets && (
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <Box size={11} />
                Assets
              </div>
            )}
          </div>

          {skill.tags && skill.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {skill.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--text-secondary)] flex items-center gap-0.5"
                >
                  <Tag size={8} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
            </div>
          ) : (
            <div className="prose-od text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {fullContent}
              </ReactMarkdown>
            </div>
          )}

          {/* Tools section */}
          {skill.tools && skill.tools.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Defined Tools
              </h3>
              <div className="space-y-2">
                {skill.tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="p-3 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border)]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Code size={12} className="text-[var(--text-muted)]" />
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        {tool.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {tool.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scripts section */}
          {skill.scripts && Object.keys(skill.scripts).length > 0 && (
            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Scripts
              </h3>
              <div className="space-y-1">
                {Object.entries(skill.scripts).map(([name, path]) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)]"
                  >
                    <Code size={11} />
                    <span className="font-mono">{name}</span>
                    <span className="text-[var(--text-muted)] truncate ml-auto">{path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* References section */}
          {skill.references && skill.references.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                References
              </h3>
              <div className="space-y-1">
                {skill.references.map((ref) => (
                  <div
                    key={ref}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)]"
                  >
                    <FileText size={11} />
                    <span className="truncate">{ref}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 px-6 py-3 border-t border-[var(--border)] flex items-center justify-between">
          <div className="text-[10px] text-[var(--text-muted)] font-mono truncate max-w-[60%]">
            {skill.path}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
            >
              <Download size={12} />
              Export
            </button>
            {isDeletable && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
              >
                <Trash2 size={12} />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
