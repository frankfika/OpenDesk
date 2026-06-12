import { useState } from 'react'

interface ShortcutHintProps {
  keys: string
  className?: string
  showOnHover?: boolean
}

export default function ShortcutHint({ keys, className = '', showOnHover = true }: ShortcutHintProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-sidebar)] border border-[var(--border)] rounded-md px-1.5 py-0.5 transition-opacity duration-200 ${
        showOnHover ? (hovered ? 'opacity-100' : 'opacity-40') : 'opacity-60'
      } ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {keys}
    </span>
  )
}
