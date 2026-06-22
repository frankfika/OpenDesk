import { X, ImageIcon, FileText, FileCode, File } from 'lucide-react'
import type { FileAttachment } from '@shared/types'

interface AttachmentListProps {
  attachments: FileAttachment[]
  onRemove: (id: string) => void
}

function getAttachmentIcon(type?: string) {
  switch (type) {
    case 'image':
      return <ImageIcon size={12} />
    case 'code':
      return <FileCode size={12} />
    case 'text':
      return <FileText size={12} />
    case 'pdf':
      return <FileText size={12} className="text-[var(--error)]" />
    case 'pptx':
      return <FileText size={12} className="text-[var(--warning)]" />
    case 'binary':
      return <File size={12} className="text-[var(--text-muted)]" />
    default:
      return <File size={12} />
  }
}

export default function AttachmentList({ attachments, onRemove }: AttachmentListProps) {
  if (attachments.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border)] text-[12px] text-[var(--text-secondary)] group"
        >
          {att.type === 'image' && att.path ? (
            <img
              src={att.path.startsWith('blob:') ? att.path : `file://${att.path}`}
              alt={att.name}
              className="w-5 h-5 rounded object-cover"
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
              }}
            />
          ) : (
            getAttachmentIcon(att.type)
          )}
          <span className="max-w-[120px] truncate">{att.name}</span>
          <button
            type="button"
            onClick={() => onRemove(att.id)}
            className="hover:text-[var(--error)] transition-colors"
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
