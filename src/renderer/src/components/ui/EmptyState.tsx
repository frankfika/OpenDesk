import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  icon?: LucideIcon
}

interface EmptyStateProps {
  icon?: LucideIcon
  iconSize?: number
  title: string
  description?: string
  actions?: EmptyStateAction[]
  children?: React.ReactNode
  className?: string
  animated?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: { icon: 24, title: 'text-sm', desc: 'text-[11px]', padding: 'py-6' },
  md: { icon: 32, title: 'text-base', desc: 'text-[13px]', padding: 'py-10' },
  lg: { icon: 48, title: 'text-xl', desc: 'text-[15px]', padding: 'py-16' }
}

export default function EmptyState({
  icon: Icon,
  iconSize,
  title,
  description,
  actions,
  children,
  className,
  animated = true,
  size = 'md'
}: EmptyStateProps) {
  const s = sizeMap[size]
  const Wrapper = animated ? motion.div : 'div'
  const wrapperProps = animated
    ? {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1.0] }
      }
    : {}

  return (
    <Wrapper
      className={cn(
        'flex flex-col items-center justify-center text-center px-6',
        s.padding,
        className
      )}
      {...wrapperProps}
    >
      {Icon && (
        <motion.div
          className="p-4 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--border)] mb-4"
          initial={animated ? { scale: 0.9, opacity: 0 } : undefined}
          animate={animated ? { scale: 1, opacity: 1 } : undefined}
          transition={{ duration: 0.3, delay: 0.1, ease: [0.25, 0.1, 0.25, 1.0] }}
        >
          <Icon size={iconSize ?? s.icon} className="text-[var(--text-muted)]" strokeWidth={1.5} />
        </motion.div>
      )}

      <h3 className={cn('font-semibold text-[var(--text-primary)] mb-1.5', s.title)}>
        {title}
      </h3>

      {description && (
        <p className={cn('text-[var(--text-secondary)] max-w-xs leading-relaxed mb-4', s.desc)}>
          {description}
        </p>
      )}

      {actions && actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          {actions.map((action, i) => {
            const ActionIcon = action.icon
            const isPrimary = action.variant === 'primary'
            const isGhost = action.variant === 'ghost'
            return (
              <motion.button
                key={i}
                onClick={action.onClick}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                  isPrimary
                    ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm'
                    : isGhost
                      ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]'
                      : 'bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {ActionIcon && <ActionIcon size={13} />}
                {action.label}
              </motion.button>
            )
          })}
        </div>
      )}

      {children}
    </Wrapper>
  )
}
