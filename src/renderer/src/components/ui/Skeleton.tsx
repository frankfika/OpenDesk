import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circle' | 'rect'
  width?: string | number
  height?: string | number
  lines?: number
  shimmer?: boolean
}

export function SkeletonLine({
  className,
  width = '100%',
  shimmer = true
}: {
  className?: string
  width?: string | number
  shimmer?: boolean
}) {
  return (
    <div className={cn('h-3 rounded-md', shimmer ? 'shimmer' : 'bg-[var(--border)]/60', className)} style={{ width }} />
  )
}

export function SkeletonAvatar({ className, size = 32 }: { className?: string; size?: number }) {
  return <div className={cn('rounded-full shimmer flex-shrink-0', className)} style={{ width: size, height: size }} />
}

export function SkeletonText({
  className,
  lines = 3,
  widths = ['60%', '80%', '40%']
}: {
  className?: string
  lines?: number
  widths?: string[]
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  )
}

export function SkeletonMessage({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-4 py-4', className)}>
      <SkeletonAvatar size={32} />
      <div className="flex-1 flex flex-col gap-2 pt-1">
        <SkeletonLine width="40%" />
        <SkeletonLine width="80%" />
        <SkeletonLine width="60%" />
        <SkeletonLine width="70%" />
      </div>
    </div>
  )
}

export function SkeletonWorkspaceItem({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 px-3 py-2.5', className)}>
      <SkeletonAvatar size={20} />
      <div className="flex-1 flex flex-col gap-1.5">
        <SkeletonLine width="60%" className="h-2.5" />
        <SkeletonLine width="40%" className="h-2" />
      </div>
    </div>
  )
}

export function SkeletonProviderCard({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 p-4 rounded-xl border border-[var(--border)]', className)}>
      <SkeletonAvatar size={36} />
      <div className="flex-1 flex flex-col gap-2">
        <SkeletonLine width="50%" className="h-3" />
        <SkeletonLine width="70%" className="h-2.5" />
      </div>
    </div>
  )
}

export default function Skeleton({ className, variant = 'text', width, height, lines = 3 }: SkeletonProps) {
  if (variant === 'circle') {
    return (
      <div className={cn('rounded-full shimmer', className)} style={{ width: width ?? 32, height: height ?? 32 }} />
    )
  }

  if (variant === 'rect') {
    return <div className={cn('rounded-lg shimmer', className)} style={{ width, height }} />
  }

  return <SkeletonText className={className} lines={lines} />
}
