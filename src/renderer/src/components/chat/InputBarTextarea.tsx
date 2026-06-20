import { memo } from 'react'
import MentionPopover from './MentionPopover'
import SkillPicker from './SkillPicker'

interface PopoverItem {
  type: string
  id: string
  name: string
  subtitle: string
  icon: React.ReactNode
}

interface InputBarTextareaProps {
  text: string
  onChange: (val: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onPaste: (e: React.ClipboardEvent) => void
  textareaRef: React.RefObject<HTMLTextAreaElement>
  placeholder: string
  _isDragging: boolean
  popoverType: 'mention' | 'thread' | 'command' | null
  popoverItems: PopoverItem[]
  popoverIndex: number
  onSelectPopover: (item: PopoverItem) => void
  showSkillPicker: boolean
  skillFilter: string
  onSelectSkill: (skillId: string) => void
}

function InputBarTextarea({
  text,
  onChange,
  onKeyDown,
  onPaste,
  textareaRef,
  placeholder,
  _isDragging,
  popoverType,
  popoverItems,
  popoverIndex,
  onSelectPopover,
  showSkillPicker,
  skillFilter,
  onSelectSkill
}: InputBarTextareaProps) {
  return (
    <div className="px-5 pt-4 pb-2 relative">
      <textarea
        ref={textareaRef}
        className="w-full bg-transparent resize-none outline-none text-[15px] leading-relaxed selectable text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-[height] duration-150 ease-out"
        style={{ minHeight: 28, maxHeight: 300 }}
        placeholder={placeholder}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        rows={1}
      />

      {popoverType && popoverItems.length > 0 && (
        <MentionPopover
          type={popoverType}
          items={popoverItems as unknown as Parameters<typeof MentionPopover>['items']}
          selectedIndex={popoverIndex}
          onSelect={(item) => onSelectPopover(item as unknown as PopoverItem)}
        />
      )}

      {showSkillPicker && <SkillPicker filter={skillFilter} onSelect={onSelectSkill} />}
    </div>
  )
}

export default memo(InputBarTextarea)
