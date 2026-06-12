import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSkillsStore } from '../../store/skills'
import { useToast } from '../../store/toast'
import SkillCard from './SkillCard'
import SkillDetailModal from './SkillDetailModal'
import SkillImportModal from './SkillImportModal'
import EmptyState from '../ui/EmptyState'
import {
  Search, Filter, ArrowUpDown, Download, Plus, X,
  Globe, FolderOpen, Code2, Bot, Store, Box, Sparkles,
  Wand2, GitBranch, FilePlus, Loader2
} from 'lucide-react'

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources', icon: Filter },
  { value: 'global', label: 'Global', icon: Globe },
  { value: 'workspace', label: 'Workspace', icon: FolderOpen },
  { value: 'codex', label: 'Codex', icon: Code2 },
  { value: 'claude', label: 'Claude', icon: Bot },
  { value: 'marketplace', label: 'Marketplace', icon: Store },
  { value: 'github', label: 'GitHub', icon: Globe },
  { value: 'builtin', label: 'Built-in', icon: Box }
]

const SORT_OPTIONS = [
  { value: 'installed', label: 'Recently Installed' },
  { value: 'usage', label: 'Most Used' },
  { value: 'name', label: 'Name' }
] as const

interface SkillsPanelProps {
  onClose: () => void
}

export default function SkillsPanel({ onClose }: SkillsPanelProps) {
  const {
    skills,
    loaded,
    activeSkillIds,
    searchQuery,
    sourceFilter,
    sortBy,
    load,
    refresh,
    toggleSkill,
    setSearchQuery,
    setSourceFilter,
    setSortBy,
    getFilteredSkills,
    createSkill
  } = useSkillsStore()
  const toast = useToast()

  const [detailSkillId, setDetailSkillId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createTags, setCreateTags] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!loaded) load()
  }, [loaded, load])

  const filteredSkills = getFilteredSkills()
  const activeCount = activeSkillIds.length

  async function handleCreateSkill() {
    if (!createName.trim() || !createDesc.trim()) return
    setCreating(true)
    const tags = createTags.split(',').map((t) => t.trim()).filter(Boolean)
    const result = await createSkill(createName.trim(), createDesc.trim(), tags)
    setCreating(false)
    setCreateOpen(false)
    setCreateName('')
    setCreateDesc('')
    setCreateTags('')
    if (result.success) {
      toast.success(`Skill '${createName.trim()}' created`)
    } else {
      toast.error(result.error || 'Failed to create skill')
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-content)]">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Skills</h2>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
              {skills.length} available · {activeCount} active
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
            >
              <Download size={13} />
              Import
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all"
            >
              <Plus size={13} />
              Create
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search skills by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-strong)] transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {SOURCE_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isActive = sourceFilter === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setSourceFilter(isActive ? 'all' : opt.value)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                    isActive
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'bg-[var(--bg-sidebar)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
                  }`}
                  title={opt.label}
                >
                  <Icon size={12} />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              )
            })}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Skills grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredSkills.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No skills yet"
            description="Skills let you teach OpenDesk specialized tasks. Import from your favorite sources or create your own."
            size="lg"
            actions={[
              { label: 'Import from Codex', onClick: () => setImportOpen(true), icon: Code2, variant: 'secondary' },
              { label: 'Import from Claude', onClick: () => setImportOpen(true), icon: Bot, variant: 'secondary' },
              { label: 'Create New', onClick: () => setCreateOpen(true), icon: FilePlus, variant: 'primary' }
            ]}
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {filteredSkills.map((skill, i) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <SkillCard
                  skill={skill}
                  isActive={activeSkillIds.includes(skill.id)}
                  onToggle={() => toggleSkill(skill.id)}
                  onViewDetail={() => setDetailSkillId(skill.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Detail modal */}
      {detailSkillId && (
        <SkillDetailModal
          skillId={detailSkillId}
          onClose={() => setDetailSkillId(null)}
        />
      )}

      {/* Import modal */}
      {importOpen && (
        <SkillImportModal
          onClose={() => setImportOpen(false)}
          onSuccess={() => {
            setImportOpen(false)
            refresh()
            toast.success('Skills imported successfully')
          }}
        />
      )}

      {/* Create modal */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md bg-[var(--bg-content)] rounded-2xl border border-[var(--border)] shadow-2xl p-6"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
                Create New Skill
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
                    Name
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g., python-debugger"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
                    Description
                  </label>
                  <textarea
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    placeholder="What does this skill do?"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-strong)] resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={createTags}
                    onChange={(e) => setCreateTags(e.target.value)}
                    placeholder="e.g., python, debugging, testing"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSkill}
                  disabled={!createName.trim() || !createDesc.trim() || creating}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Skill'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
