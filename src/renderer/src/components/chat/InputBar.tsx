import { useRef, useState, useEffect, KeyboardEvent, useCallback, DragEvent, useMemo } from 'react'
import { useChatStore } from '../../store/chat'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
import { useSkillsStore } from '../../store/skills'
import type { Message, FileAttachment } from '@shared/types'
import { Send, Square, ChevronDown, Check, ShieldAlert, Cpu, Camera, Paperclip, X, Search, FileText, Folder, MessageSquare } from 'lucide-react'

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const APPROVAL_MODES = [
  { value: 'auto', label: 'Auto', desc: 'Approve safe actions automatically' },
  { value: 'suggest', label: 'Suggest', desc: 'Always ask before running tools' },
  { value: 'full', label: 'Full access', desc: 'Run all actions without approval' }
]

const QUICK_COMMANDS = [
  { id: 'clear', label: '/clear', desc: 'Clear current conversation', icon: '✨' },
  { id: 'model', label: '/model', desc: 'Switch model quickly', icon: '🤖' },
  { id: 'provider', label: '/provider', desc: 'Switch AI provider', icon: '🔌' },
  { id: 'workspace', label: '/workspace', desc: 'Switch workspace', icon: '📁' },
  { id: 'screenshot', label: '/screenshot', desc: 'Capture and send screenshot', icon: '📸' },
  { id: 'search', label: '/search', desc: 'Search the web', icon: '🔍' },
]

interface InputBarProps {
  onOpenSettings: () => void
  onClearChat?: () => void
  onScreenshot?: () => void
  onWebSearch?: (query: string) => void
}

export default function InputBar({ onOpenSettings, onClearChat, onScreenshot, onWebSearch }: InputBarProps) {
  const [text, setText] = useState('')
  const [approvalMode, setApprovalMode] = useState('suggest')
  const [showApproval, setShowApproval] = useState(false)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSkillPicker, setShowSkillPicker] = useState(false)
  const [skillFilter, setSkillFilter] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { messages, streaming, error, errorType, addMessage, appendToken, addToolCall, addToolResult, setStreaming, setError, attachments, addAttachment, removeAttachment, clearAttachments } = useChatStore()
  const { settings, activeProvider, update, fetchModels, updateProvider } = useSettingsStore()
  const { activeThreadId, activeWorkspace, createThread, updateThread, workspaces, threads } = useWorkspaceStore()
  const { skills } = useSkillsStore()

  // Mention / reference / command popover state
  const [popoverType, setPopoverType] = useState<'mention' | 'thread' | 'command' | null>(null)
  const [popoverQuery, setPopoverQuery] = useState('')
  const [popoverIndex, setPopoverIndex] = useState(0)

  const provider = activeProvider()
  const workspace = activeWorkspace()
  const [fetchedModels, setFetchedModels] = useState<string[]>([])
  const [showModelSearch, setShowModelSearch] = useState(false)

  // Listen for fill-input event from suggestion cards / quick actions
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail.text
      setText(text)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
    window.addEventListener('opendesk:fill-input', handler)
    return () => window.removeEventListener('opendesk:fill-input', handler)
  }, [])

  // Draft auto-save and restore
  useEffect(() => {
    // Load draft on mount
    if (window.api?.draft?.load) {
      window.api.draft.load().then((draft) => {
        if (draft && draft.text && Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
          setText(draft.text)
        }
      }).catch(console.error)
    }
  }, [])

  useEffect(() => {
    // Auto-save draft every 5 seconds
    const interval = setInterval(() => {
      if (text.trim() && window.api?.draft?.save) {
        window.api.draft.save({ text, threadId: activeThreadId }).catch(console.error)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [text, activeThreadId])

  // Smart textarea height
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const newHeight = Math.min(el.scrollHeight, 300)
    el.style.height = newHeight + 'px'
  }, [text])

  useEffect(() => {
    if (!window.api?.chat) return
    const offToken = window.api.chat.onToken((token) => appendToken(token))
    const offToolCall = window.api.chat.onToolCall((toolCall) => {
      addToolCall(toolCall)
    })
    const offToolResult = window.api.chat.onToolResult((result) => {
      addToolResult(result)
    })
    const offDone = window.api.chat.onDone(() => setStreaming(false))
    const offError = window.api.chat.onError((error) => {
      setStreaming(false)
      setError(error.message, error.type as 'auth' | 'network' | 'model' | 'provider' | 'workspace' | 'ollama' | 'generic' | null)
    })
    return () => { offToken(); offToolCall(); offToolResult(); offDone(); offError() }
  }, [appendToken, addToolCall, addToolResult, setStreaming, setError])

  useEffect(() => {
    function handler() { setShowApproval(false); setShowModelPicker(false); setShowSkillPicker(false); setShowModelSearch(false); setPopoverType(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch models when provider changes
  useEffect(() => {
    if (provider?.models && provider.models.length > 0) {
      setFetchedModels(provider.models)
    } else if (provider?.id) {
      fetchModels(provider.id).then((models) => {
        if (models && models.length > 0) {
          setFetchedModels(models.map((m) => m.id))
        }
      }).catch(() => {})
    }
  }, [provider?.id, provider?.models, fetchModels])

  // Detect trigger characters
  function detectTrigger(val: string, cursorPos: number): 'mention' | 'thread' | 'command' | null {
    if (cursorPos === 0) return null
    const before = val.slice(0, cursorPos)
    const lastAt = before.lastIndexOf('@')
    const lastHash = before.lastIndexOf('#')
    const lastSlash = before.lastIndexOf('/')
    const lastSpace = Math.max(before.lastIndexOf(' '), before.lastIndexOf('\n'))

    if (lastAt > lastSpace && lastAt > lastHash && lastAt > lastSlash) {
      const afterAt = before.slice(lastAt + 1)
      if (!afterAt.includes(' ')) return 'mention'
    }
    if (lastHash > lastSpace && lastHash > lastAt && lastHash > lastSlash) {
      const afterHash = before.slice(lastHash + 1)
      if (!afterHash.includes(' ')) return 'thread'
    }
    if (lastSlash > lastSpace && lastSlash > lastAt && lastSlash > lastHash) {
      const afterSlash = before.slice(lastSlash + 1)
      if (!afterSlash.includes(' ')) return 'command'
    }
    return null
  }

  function getTriggerQuery(val: string, cursorPos: number): string {
    const before = val.slice(0, cursorPos)
    const lastAt = before.lastIndexOf('@')
    const lastHash = before.lastIndexOf('#')
    const lastSlash = before.lastIndexOf('/')
    const lastSpace = Math.max(before.lastIndexOf(' '), before.lastIndexOf('\n'))
    const lastTrigger = Math.max(lastAt, lastHash, lastSlash)
    if (lastTrigger > lastSpace) {
      return before.slice(lastTrigger + 1)
    }
    return ''
  }

  function handleTextChange(val: string) {
    setText(val)
    const el = textareaRef.current
    const cursorPos = el?.selectionStart ?? val.length
    const trigger = detectTrigger(val, cursorPos)
    if (trigger) {
      setPopoverType(trigger)
      setPopoverQuery(getTriggerQuery(val, cursorPos))
      setPopoverIndex(0)
    } else {
      setPopoverType(null)
    }

    // Legacy skill picker via /
    const match = val.match(/\/(\w*)$/)
    if (match && !trigger) {
      setShowSkillPicker(true)
      setSkillFilter(match[1].toLowerCase())
    } else {
      setShowSkillPicker(false)
    }
  }

  function insertMention(item: { type: string; id: string; name: string }) {
    const el = textareaRef.current
    if (!el) return
    const cursorPos = el.selectionStart
    const before = text.slice(0, cursorPos)
    const after = text.slice(cursorPos)
    const lastAt = before.lastIndexOf('@')
    const lastHash = before.lastIndexOf('#')
    const lastSlash = before.lastIndexOf('/')
    const lastTrigger = Math.max(lastAt, lastHash, lastSlash)
    const prefix = item.type === 'workspace' ? '@workspace:' : item.type === 'file' ? '@file:' : item.type === 'thread' ? '#thread:' : ''
    const newText = before.slice(0, lastTrigger) + prefix + item.name + ' ' + after
    setText(newText)
    setPopoverType(null)
    setTimeout(() => {
      el.focus()
      const newPos = lastTrigger + prefix.length + item.name.length + 1
      el.setSelectionRange(newPos, newPos)
    }, 0)
  }

  function handleSelectSkill(skillId: string) {
    if (activeThreadId) {
      updateThread(activeThreadId, { skillId })
    }
    setText(text.replace(/\/(\w*)$/, ''))
    setShowSkillPicker(false)
    textareaRef.current?.focus()
  }

  function handleSelectCommand(cmd: typeof QUICK_COMMANDS[0]) {
    setText(text.replace(/\/(\w*)$/, ''))
    setPopoverType(null)
    if (cmd.id === 'clear') {
      onClearChat?.()
    } else if (cmd.id === 'model') {
      setShowModelPicker(true)
    } else if (cmd.id === 'provider') {
      setShowModelPicker(true)
    } else if (cmd.id === 'workspace') {
      // Could open workspace switcher
    } else if (cmd.id === 'screenshot') {
      onScreenshot?.()
    } else if (cmd.id === 'search') {
      const query = text.replace(/.*\/search\s*/, '').trim()
      if (query) onWebSearch?.(query)
    }
    textareaRef.current?.focus()
  }

  // Mention items
  const mentionItems = useMemo(() => {
    const q = popoverQuery.toLowerCase()
    const items: { type: string; id: string; name: string; subtitle: string; icon: React.ReactNode }[] = []
    // Workspaces
    workspaces.forEach((ws) => {
      const name = ws.name || ws.folderPath.split('/').pop() || 'Untitled'
      if (name.toLowerCase().includes(q)) {
        items.push({ type: 'workspace', id: ws.id, name, subtitle: ws.folderPath, icon: <Folder size={14} /> })
      }
    })
    // Files (mock - in real app would list workspace files)
    if (workspace) {
      const mockFiles = ['README.md', 'src/main.ts', 'package.json', 'tsconfig.json']
      mockFiles.filter(f => f.toLowerCase().includes(q)).forEach(f => {
        items.push({ type: 'file', id: f, name: f, subtitle: workspace.folderPath, icon: <FileText size={14} /> })
      })
    }
    return items.slice(0, 8)
  }, [popoverQuery, workspaces, workspace])

  // Thread items
  const threadItems = useMemo(() => {
    const q = popoverQuery.toLowerCase()
    if (!workspace) return []
    return threads
      .filter(t => t.workspaceId === workspace.id && t.title.toLowerCase().includes(q))
      .map(t => ({
        type: 'thread',
        id: t.id,
        name: t.title,
        subtitle: new Date(t.updatedAt).toLocaleDateString(),
        icon: <MessageSquare size={14} />
      }))
      .slice(0, 8)
  }, [popoverQuery, threads, workspace])

  // Command items
  const commandItems = useMemo(() => {
    const q = popoverQuery.toLowerCase()
    return QUICK_COMMANDS.filter(c => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q))
  }, [popoverQuery])

  const popoverItems = popoverType === 'mention' ? mentionItems : popoverType === 'thread' ? threadItems : popoverType === 'command' ? commandItems : []

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (popoverType && popoverItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPopoverIndex(i => Math.min(i + 1, popoverItems.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPopoverIndex(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const item = popoverItems[popoverIndex]
        if (item) {
          if (popoverType === 'command') {
            handleSelectCommand(item as any)
          } else {
            insertMention(item as any)
          }
        }
        return
      }
      if (e.key === 'Escape') {
        setPopoverType(null)
        return
      }
    }

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      send()
    }
    if (e.key === 'Escape' && streaming) {
      abort()
    }
  }

  async function send() {
    const content = text.trim()
    if (!content || streaming) return
    if (!provider) { onOpenSettings(); return }

    // Parse mentions
    let processedContent = content
    const mentionRegex = /@workspace:([^\s]+)|@file:([^\s]+)|#thread:([^\s]+)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      if (match[1]) mentions.push(`Workspace: ${match[1]}`)
      if (match[2]) mentions.push(`File: ${match[2]}`)
      if (match[3]) mentions.push(`Thread: ${match[3]}`)
    }
    if (mentions.length > 0) {
      processedContent = content.replace(mentionRegex, '') + '\n\n[Context: ' + mentions.join(', ') + ']'
    }

    // Ensure we have an active thread
    let threadId = activeThreadId
    if (!threadId && workspace) {
      const thread = await createThread(workspace.id, content.slice(0, 40))
      threadId = thread.id
    }

    const userMsg: Message = { id: genId(), role: 'user', content: processedContent, timestamp: Date.now() }
    addMessage(userMsg)
    setText('')
    setStreaming(true)
    setError(null)
    clearAttachments()

    // Clear draft after sending
    if (window.api?.draft?.save) {
      window.api.draft.save({ text: '', threadId: null }).catch(console.error)
    }

    const payload: any = {
      messages: [...messages, userMsg],
      providerId: settings.activeProviderId!,
      threadId
    }

    if (workspace) {
      payload.workspaceId = workspace.id
    }

    if (window.api?.chat) {
      window.api.chat.send(payload)
    } else {
      console.warn('window.api.chat.send not available')
      setTimeout(() => {
        setStreaming(false)
        addMessage({ id: genId(), role: 'assistant', content: 'Mock response (browser mode)', timestamp: Date.now() })
      }, 1000)
    }
  }

  function abort() {
    if (settings.activeProviderId && window.api?.chat) window.api.chat.abort(settings.activeProviderId)
    setStreaming(false)
  }

  const currentMode = APPROVAL_MODES.find(m => m.value === approvalMode)!

  // Drag & drop handlers
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    files.forEach((file) => {
      const attachment: FileAttachment = {
        id: genId(),
        name: file.name,
        path: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream'
      }
      addAttachment(attachment)
    })
  }, [addAttachment])

  // Paste handler for images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    items.forEach((item) => {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          const attachment: FileAttachment = {
            id: genId(),
            name: file.name || 'pasted-image.png',
            path: file.name || 'pasted-image.png',
            size: file.size,
            mimeType: file.type
          }
          addAttachment(attachment)
        }
      }
    })
  }, [addAttachment])

  // Screenshot handler
  const handleScreenshot = useCallback(async () => {
    try {
      const base64 = await window.api?.desktop?.capture()
      if (!base64) return
      // base64 is PNG data — convert to blob URL for preview and attach
      const byteChars = atob(base64)
      const byteArr = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i)
      const blob = new Blob([byteArr], { type: 'image/png' })
      const url = URL.createObjectURL(blob)
      const attachment: FileAttachment = {
        id: genId(),
        name: `screenshot-${Date.now()}.png`,
        path: url,
        size: byteArr.length,
        mimeType: 'image/png',
        content: base64
      }
      addAttachment(attachment)
    } catch (e) {
      console.error('Screenshot failed:', e)
      // Show user-friendly error if permission denied
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('Failed to get sources') || msg.includes('permission')) {
        alert('Screenshot permission denied.\n\nPlease go to System Settings → Privacy & Security → Screen Recording and allow OpenDesk.')
      }
    }
  }, [addAttachment])

  const filteredModels = fetchedModels.filter((m) => m.toLowerCase().includes(modelSearch.toLowerCase()))

  return (
    <div className="shrink-0 px-6 pb-8 pt-2 max-w-3xl w-full mx-auto relative">
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50/80 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-sm">
          <div className="flex items-start gap-2">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{error}</p>
              {errorType === 'auth' && (
                <p className="mt-1 text-xs opacity-80">
                  API key 无效或已过期。请检查设置中的 API key。
                </p>
              )}
              {errorType === 'network' && (
                <p className="mt-1 text-xs opacity-80">
                  网络连接失败。请检查网络或 provider 的 base URL 是否正确。
                </p>
              )}
              {errorType === 'model' && (
                <p className="mt-1 text-xs opacity-80">
                  模型不可用或不存在。请尝试切换其他模型。
                </p>
              )}
              {errorType === 'provider' && (
                <p className="mt-1 text-xs opacity-80">
                  Provider 未配置。请先添加并启用一个 AI provider。
                </p>
              )}
              {errorType === 'ollama' && (
                <p className="mt-1 text-xs opacity-80">
                  Ollama 服务未运行。请启动 Ollama 或检查端口设置。
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {errorType === 'auth' && (
                <button
                  onClick={onOpenSettings}
                  className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                >
                  设置 API Key
                </button>
              )}
              {errorType === 'provider' && (
                <button
                  onClick={onOpenSettings}
                  className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                >
                  配置 Provider
                </button>
              )}
              {errorType === 'ollama' && (
                <button
                  onClick={() => window.open('https://ollama.com/download', '_blank')}
                  className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                >
                  下载 Ollama
                </button>
              )}
              <button
                onClick={() => setError(null)}
                className="opacity-70 hover:opacity-100 p-1"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border)] text-[12px] text-[var(--text-secondary)]"
            >
              <Paperclip size={12} />
              <span className="max-w-[120px] truncate">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="hover:text-red-500 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={`rounded-2xl overflow-visible bg-[var(--bg-input)]/80 border transition-all duration-300 relative shadow-sm ${
          isDragging ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20' : 'border-[var(--border)] focus-within:border-[var(--text-muted)] focus-within:shadow-md'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--accent)]/5 rounded-2xl border-2 border-dashed border-[var(--accent)]/30">
            <span className="text-sm font-medium text-[var(--accent)]">Drop files here</span>
          </div>
        )}

        <div className="px-5 pt-4 pb-2 relative">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent resize-none outline-none text-[15px] leading-relaxed selectable text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-[height] duration-150 ease-out"
            style={{ minHeight: 28, maxHeight: 300 }}
            placeholder={provider ? 'Message OpenDesk… (⌘↵ to send, ⇧↵ for new line, / for skills)' : 'Configure a provider to start…'}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
          />

          {/* Popover for @ / # / / */}
          {popoverType && popoverItems.length > 0 && (
            <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 rounded-xl overflow-hidden z-50 py-2 bg-[var(--bg-content)]/95 border border-[var(--border)] shadow-xl max-h-[280px] flex flex-col">
              <div className="px-3 pb-2 text-xs font-semibold text-[var(--text-muted)] border-b border-[var(--border)] mb-1">
                {popoverType === 'mention' ? 'Mention workspace or file' : popoverType === 'thread' ? 'Reference thread' : 'Quick command'}
              </div>
              <div className="overflow-y-auto flex-1 px-1">
                {popoverItems.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (popoverType === 'command') {
                        handleSelectCommand(item as any)
                      } else {
                        insertMention(item as any)
                      }
                    }}
                    className={`w-full px-3 py-2 text-left transition-colors rounded-lg flex items-center gap-2 ${
                      idx === popoverIndex ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--bg-sidebar)]'
                    }`}
                  >
                    <div className="shrink-0 w-6 h-6 rounded bg-[var(--bg-sidebar)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
                      {popoverType === 'command' ? <span className="text-xs">{(item as any).icon}</span> : item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{popoverType === 'command' ? (item as any).label : (item as any).name}</span>
                      <span className="text-[11px] text-[var(--text-secondary)] ml-2">{popoverType === 'command' ? (item as any).desc : (item as any).subtitle}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Legacy skill picker */}
          {showSkillPicker && (
            <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 rounded-xl overflow-hidden z-50 py-2 bg-[var(--bg-content)]/90 border border-[var(--border)] shadow-xl max-h-[300px] flex flex-col">
              <div className="px-3 pb-2 text-xs font-semibold text-[var(--text-muted)] border-b border-[var(--border)] mb-1">
                Select a skill
              </div>
              <div className="overflow-y-auto flex-1 px-1">
                {skills.filter(s => s.name.toLowerCase().includes(skillFilter)).length === 0 ? (
                  <div className="px-3 py-4 text-xs text-center text-[var(--text-muted)]">
                    No matching skills found
                  </div>
                ) : (
                  skills.filter(s => s.name.toLowerCase().includes(skillFilter)).map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSkill(s.id)}
                      className="w-full px-3 py-2 text-left transition-colors hover:bg-[var(--bg-sidebar)] rounded-lg flex flex-col gap-0.5"
                    >
                      <span className="text-sm font-medium text-[var(--text-primary)]">{s.name}</span>
                      <span className="text-[11px] text-[var(--text-secondary)] line-clamp-1">{s.description}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center px-4 pb-4 gap-2">
          {/* Screenshot button */}
          <button
            onClick={handleScreenshot}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Capture screenshot"
          >
            <Camera size={14} />
          </button>

          <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setShowModelPicker(v => !v); setShowApproval(false); setShowModelSearch(false) }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors hover:bg-[var(--border)] text-[var(--text-secondary)]"
            >
              <Cpu size={14} />
              <span className="max-w-[120px] truncate font-medium">
                {provider ? `${provider.name}` : 'No provider'}
              </span>
              <ChevronDown size={14} />
            </button>

            {showModelPicker && (
              <div className="absolute bottom-full left-0 mb-2 rounded-lg overflow-hidden z-50 py-1 bg-[var(--bg-content)] border border-[var(--border)] shadow-lg min-w-[240px]">
                {settings.providers.length === 0 ? (
                  <button
                    onClick={() => { setShowModelPicker(false); onOpenSettings() }}
                    className="w-full px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--bg-sidebar)] font-medium"
                  >
                    + Add a provider
                  </button>
                ) : (
                  <>
                    {/* Provider list */}
                    {settings.providers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { update({ activeProviderId: p.id }); setShowModelPicker(false) }}
                        className={`w-full px-3 py-2 text-sm text-left transition-colors flex items-center justify-between ${
                          p.id === settings.activeProviderId ? "bg-[var(--bg-sidebar)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)]"
                        }`}
                      >
                        <span className="font-medium">{p.name} · {p.model}</span>
                        {p.id === settings.activeProviderId && <Check size={14} />}
                      </button>
                    ))}
                    <div className="h-px bg-[var(--border)] my-1" />
                    {/* Model search */}
                    <div className="px-2 py-1">
                      <button
                        onClick={() => setShowModelSearch(!showModelSearch)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)] transition-colors"
                      >
                        <Search size={12} />
                        Search models…
                      </button>
                      {showModelSearch && (
                        <div className="mt-1">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Search models…"
                            className="w-full px-2 py-1.5 rounded-md text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                            value={modelSearch}
                            onChange={(e) => setModelSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {filteredModels.length > 0 && (
                            <div className="mt-1 max-h-[120px] overflow-y-auto">
                              {filteredModels.map((m) => (
                                <button
                                  key={m}
                                  onClick={() => {
                                    if (provider) {
                                      updateProvider(provider.id, { model: m })
                                    }
                                    setShowModelSearch(false)
                                    setShowModelPicker(false)
                                  }}
                                  className="w-full px-2 py-1 text-left text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)] rounded transition-colors"
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setShowApproval(v => !v); setShowModelPicker(false) }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors hover:bg-[var(--border)] text-[var(--text-secondary)]"
            >
              <ShieldAlert size={14} />
              <span className="font-medium">{currentMode.label}</span>
              <ChevronDown size={14} />
            </button>

            {showApproval && (
              <div className="absolute bottom-full left-0 mb-2 rounded-lg overflow-hidden z-50 py-1 bg-[var(--bg-content)] border border-[var(--border)] shadow-lg min-w-[220px]">
                {APPROVAL_MODES.map(mode => (
                  <button
                    key={mode.value}
                    onClick={() => { setApprovalMode(mode.value); setShowApproval(false) }}
                    className={`w-full px-3 py-2 text-left transition-colors flex items-start gap-2 ${
                      mode.value === approvalMode ? "bg-[var(--bg-sidebar)]" : "hover:bg-[var(--bg-sidebar)]"
                    }`}
                  >
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${mode.value === approvalMode ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                        {mode.label}
                      </div>
                      <div className="text-xs mt-0.5 text-[var(--text-muted)]">{mode.desc}</div>
                    </div>
                    {mode.value === approvalMode && <Check size={14} className="mt-1 text-[var(--text-primary)]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {streaming ? (
            <button
              onClick={abort}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors bg-red-100 text-red-600 hover:bg-red-200"
              title="Stop (Esc)"
            >
              <Square size={12} className="fill-current" />
              Stop
              <span className="ml-1 text-[10px] opacity-60">Esc</span>
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!text.trim()}
              className={`flex items-center justify-center rounded-md transition-colors w-8 h-8 ${
                text.trim()
                  ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] cursor-pointer"
                  : "bg-[var(--border)] text-[var(--text-muted)] cursor-default"
              }`}
              title="Send (⌘↵)"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
