import { useState, useRef, useEffect } from 'react'

interface InlineEditorProps {
  content: string
  onSave: (value: string) => void
  onCancel: () => void
}

export default function InlineEditor({ content, onSave, onCancel }: InlineEditorProps) {
  const [val, setVal] = useState(content)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.setSelectionRange(val.length, val.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = ref.current.scrollHeight + 'px'
  }, [val])

  return (
    <div className="flex-1 min-w-0">
      <textarea
        ref={ref}
        className="w-full resize-none bg-[var(--bg-sidebar)] border border-[var(--accent)] rounded-lg px-3 py-2 text-[15px] text-[var(--text-primary)] outline-none leading-relaxed"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (val.trim()) onSave(val.trim())
          }
          if (e.key === 'Escape') onCancel()
        }}
        rows={1}
      />
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() => {
            if (val.trim()) onSave(val.trim())
          }}
          className="px-3 py-1 rounded-lg text-[12px] font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 rounded-lg text-[12px] font-medium bg-[var(--bg-sidebar)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
        >
          Cancel
        </button>
        <span className="text-[11px] text-[var(--text-muted)] self-center">⏎ save · Esc cancel</span>
      </div>
    </div>
  )
}
