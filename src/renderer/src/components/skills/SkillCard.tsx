import { useState } from 'react'
import type { Skill } from '@shared/types'
import { Zap, BookOpen, Code, Box, Tag, ChevronDown, ChevronUp, Power } from 'lucide-react'

interface SkillCardProps {
  skill: Skill
  isActive: boolean
  onToggle: () => void
  onViewDetail: () => void
}

const SOURCE_COLORS: Record<string, string> = {
  global: 'bg-blue-50 text-blue-600 border-blue-100',
  workspace: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  codex: 'bg-purple-50 text-purple-600 border-purple-100',
  claude: 'bg-orange-50 text-orange-600 border-orange-100',
  marketplace: 'bg-pink-50 text-pink-600 border-pink-100',
  github: 'bg-slate-50 text-slate-600 border-slate-100',
  builtin: 'bg-amber-50 text-amber-600 border-amber-100'
}

const SOURCE_LABELS: Record<string, string> = {
  global: 'Global',
  workspace: 'Workspace',
  codex: 'Codex',
  claude: 'Claude',
  marketplace: 'Marketplace',
  github: 'GitHub',
  builtin: 'Built-in'
}

export default function SkillCard({ skill, isActive, onToggle, onViewDetail }: SkillCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`relative rounded-xl border transition-all duration-200 overflow-hidden ${
        isActive
          ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5 shadow-sm'
          : 'border-[var(--border)] bg-[var(--bg-sidebar)]/40 hover:border-[var(--border-strong)] hover:shadow-sm'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onViewDetail}>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {skill.name}
              </h3>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium shrink-0 ${
                  SOURCE_COLORS[skill.source] || 'bg-gray-50 text-gray-600 border-gray-100'
                }`}
              >
                {SOURCE_LABELS[skill.source] || skill.source}
              </span>
            </div>
            <p className="text-[12px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
              {skill.description}
            </p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            className={`shrink-0 p-1.5 rounded-lg transition-all ${
              isActive
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title={isActive ? 'Deactivate skill' : 'Activate skill'}
          >
            <Power size={14} />
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          {skill.version && (
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              v{skill.version}
            </span>
          )}
          {skill.author && (
            <span className="text-[10px] text-[var(--text-muted)]">
              by {skill.author}
            </span>
          )}
          {skill.usageCount > 0 && (
            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5">
              <Zap size={10} />
              {skill.usageCount} uses
            </span>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            {skill.hasReference && (
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5" title="Has reference documentation">
                <BookOpen size={10} />
              </span>
            )}
            {skill.hasScripts && (
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5" title="Has executable scripts">
                <Code size={10} />
              </span>
            )}
            {skill.hasAssets && (
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5" title="Has assets">
                <Box size={10} />
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        {skill.tags && skill.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {skill.tags.slice(0, expanded ? undefined : 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--text-secondary)] flex items-center gap-0.5"
              >
                <Tag size={8} />
                {tag}
              </span>
            ))}
            {!expanded && skill.tags.length > 3 && (
              <span className="text-[10px] text-[var(--text-muted)]">
                +{skill.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 mt-2 py-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Show less' : 'Show more'}
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-2 pt-2 border-t border-[var(--border)]">
            {skill.tools && skill.tools.length > 0 && (
              <div className="mb-2">
                <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Tools
                </span>
                <div className="flex flex-col gap-1 mt-1">
                  {skill.tools.map((tool) => (
                    <div key={tool.name} className="text-[11px] text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]">{tool.name}</span>
                      {' — '}
                      {tool.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {skill.scripts && Object.keys(skill.scripts).length > 0 && (
              <div className="mb-2">
                <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Scripts
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.keys(skill.scripts).map((name) => (
                    <span
                      key={name}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-content)] text-[var(--text-secondary)] border border-[var(--border)]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">
              {skill.path}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
