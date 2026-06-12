import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import type { LucideIcon } from 'lucide-react'

interface SuggestionCardProps {
  icon: LucideIcon
  title: string
  description: string
  onClick?: () => void
  className?: string
  index?: number
}

export default function SuggestionCard({
  icon: Icon,
  title,
  description,
  onClick,
  className,
  index = 0
}: SuggestionCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'flex flex-col gap-3 p-5 rounded-2xl text-left transition-all duration-300',
        'bg-[var(--bg-sidebar)]/50 backdrop-blur-xl border border-[var(--border)]',
        'hover:border-[var(--text-muted)] hover:shadow-lg hover:-translate-y-0.5',
        'w-[180px] group',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.08,
        ease: [0.25, 0.1, 0.25, 1.0]
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="p-2.5 rounded-lg bg-[var(--bg-content)]/80 w-max shadow-sm border border-[var(--border)] group-hover:border-[var(--border-strong)] transition-colors">
        <Icon size={20} className="text-[var(--text-primary)]" />
      </div>
      <div className="mt-1">
        <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          {title}
        </div>
        <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          {description}
        </div>
      </div>
    </motion.button>
  )
}
