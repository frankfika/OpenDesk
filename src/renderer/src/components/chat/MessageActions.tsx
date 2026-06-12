import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { Message } from '@shared/types'
import { Copy, RefreshCw, Pencil, GitBranch, Trash2, MoreHorizontal, MessageSquarePlus, Star, FileCode } from 'lucide-react'
import { useState } from 'react'

interface MessageActionsProps {
  message: Message
  onCopy: () => void
  onCopyMarkdown?: () => void
  onRegenerate?: () => void
  onEdit?: () => void
  onFork?: () => void
  onDelete?: () => void
  onReplyTo?: () => void
  onAddToFavorites?: () => void
}

export default function MessageActions({
  message,
  onCopy,
  onCopyMarkdown,
  onRegenerate,
  onEdit,
  onFork,
  onDelete,
  onReplyTo,
  onAddToFavorites
}: MessageActionsProps) {
  const [open, setOpen] = useState(false)

  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-md hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          style={{ width: 28, height: 28 }}
          title="Message actions"
        >
          <MoreHorizontal size={14} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[180px] rounded-lg overflow-hidden bg-[var(--bg-content)] backdrop-blur-2xl border border-[var(--border)] shadow-xl py-1"
          sideOffset={4}
          align="end"
        >
          <DropdownMenu.Item
            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
            onSelect={() => { onCopy(); setOpen(false) }}
          >
            <Copy size={13} />
            Copy
          </DropdownMenu.Item>

          {onCopyMarkdown && (
            <DropdownMenu.Item
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
              onSelect={() => { onCopyMarkdown(); setOpen(false) }}
            >
              <FileCode size={13} />
              Copy as Markdown
            </DropdownMenu.Item>
          )}

          {isUser && onEdit && (
            <DropdownMenu.Item
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
              onSelect={() => { onEdit(); setOpen(false) }}
            >
              <Pencil size={13} />
              Edit
            </DropdownMenu.Item>
          )}

          {isAssistant && onRegenerate && (
            <DropdownMenu.Item
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
              onSelect={() => { onRegenerate(); setOpen(false) }}
            >
              <RefreshCw size={13} />
              Regenerate
            </DropdownMenu.Item>
          )}

          {onReplyTo && (
            <DropdownMenu.Item
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
              onSelect={() => { onReplyTo(); setOpen(false) }}
            >
              <MessageSquarePlus size={13} />
              Reply to this message
            </DropdownMenu.Item>
          )}

          {onAddToFavorites && (
            <DropdownMenu.Item
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
              onSelect={() => { onAddToFavorites(); setOpen(false) }}
            >
              <Star size={13} />
              Add to Favorites
            </DropdownMenu.Item>
          )}

          {onFork && (
            <>
              <DropdownMenu.Separator className="h-px bg-[var(--border)] my-1" />
              <DropdownMenu.Item
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] cursor-pointer outline-none transition-colors"
                onSelect={() => { onFork(); setOpen(false) }}
              >
                <GitBranch size={13} />
                Fork thread
              </DropdownMenu.Item>
            </>
          )}

          <DropdownMenu.Separator className="h-px bg-[var(--border)] my-1" />

          {onDelete && (
            <DropdownMenu.Item
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50/10 cursor-pointer outline-none transition-colors"
              onSelect={() => { onDelete(); setOpen(false) }}
            >
              <Trash2 size={13} />
              Delete
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
