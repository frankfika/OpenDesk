import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Message } from '@shared/types'
import { ChevronDown } from 'lucide-react'
import MessageRow from './Message'
import { SkeletonMessage } from '../ui/Skeleton'

interface MessageListProps {
  messages: Message[]
  streaming: boolean
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return 'Today'
  if (isYesterday) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function MessageList({ messages, streaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streaming])

  const lastContent = messages[messages.length - 1]?.content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [lastContent])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const nearBottom = scrollHeight - scrollTop - clientHeight < 200
      setShowScrollButton(!nearBottom && streaming)
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [streaming])

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const messageGroups = useMemo(() => {
    const groups: { dateLabel: string; messages: typeof messages }[] = []
    let currentGroup: typeof messages = []
    let currentDate = ''

    messages.forEach((msg) => {
      const msgDate = formatDate(msg.timestamp)
      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ dateLabel: currentDate, messages: currentGroup })
        }
        currentDate = msgDate
        currentGroup = [msg]
      } else {
        currentGroup.push(msg)
      }
    })
    if (currentGroup.length > 0) {
      groups.push({ dateLabel: currentDate, messages: currentGroup })
    }
    return groups
  }, [messages])

  if (messages.length === 0) return null

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth relative">
      <div className="py-6 max-w-3xl mx-auto w-full px-6">
        <AnimatePresence mode="popLayout">
          {messageGroups.map((group, groupIdx) => (
            <div key={group.dateLabel + groupIdx}>
              {groupIdx > 0 && (
                <div className="flex items-center gap-3 py-4">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-[11px] text-[var(--text-muted)] font-medium">{group.dateLabel}</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
              )}
              {group.messages.map((msg, i) => {
                const globalIdx = messages.findIndex((m) => m.id === msg.id)
                const prevMsg = messages[globalIdx - 1]
                const hideTimestamp = prevMsg && msg.timestamp - prevMsg.timestamp < 5 * 60 * 1000
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: i === group.messages.length - 1 && msg.role === 'assistant' ? 0 : 0,
                      ease: [0.25, 0.1, 0.25, 1.0]
                    }}
                  >
                    <MessageRow
                      message={msg}
                      isStreaming={streaming && globalIdx === messages.length - 1 && msg.role === 'assistant'}
                      showDateDivider={i === 0 && groupIdx === 0}
                      dateLabel={group.dateLabel}
                      hideTimestamp={hideTimestamp}
                    />
                  </motion.div>
                )
              })}
            </div>
          ))}
        </AnimatePresence>

        {streaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <SkeletonMessage />
          </motion.div>
        )}

        <div ref={bottomRef} className="h-4" />

        <AnimatePresence>
          {showScrollButton && (
            <motion.button type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={scrollToBottom}
              className="fixed bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-lg transition-colors"
            >
              <ChevronDown size={14} />
              Scroll to bottom
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
