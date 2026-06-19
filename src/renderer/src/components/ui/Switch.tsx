interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
  'aria-label'?: string
}

export default function Switch({ checked, onCheckedChange, id, 'aria-label': ariaLabel }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={() => onCheckedChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onCheckedChange(!checked)
        }
      }}
      className={`relative inline-flex shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${checked ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'}`}
    >
      <span
        className="inline-block w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
        style={{ marginTop: 2, transform: checked ? 'translateX(16px)' : 'translateX(2px)' }}
      />
    </button>
  )
}
