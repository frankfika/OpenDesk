import { Paperclip, X } from 'lucide-react'
import type { FileAttachment } from '@shared/types'

interface AttachmentListProps {
  attachments: FileAttachment[]
  onRemove: (id: string) => void
}

export default function AttachmentList({ attachments, onRemove }: AttachmentListProps) {
  if (attachments.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border)] text-[12px] text-[var(--text-secondary)]"
        >
          <Paperclip size={12} />
          <span className="max-w-[120px] truncate">{att.name}</span>
          <button onClick={() => onRemove(att.id)} className="hover:text-red-500 transition-colors">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
