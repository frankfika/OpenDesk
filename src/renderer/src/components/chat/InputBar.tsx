import { useRef, useState, useEffect, KeyboardEvent, useCallback, DragEvent, useMemo } from 'react'
import { useChatStore } from '../../store/chat'
import { useToast } from '../../store/toast'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
import type { Message, AgentRole } from '@shared/types'
import { Folder, FileText, MessageSquare } from 'lucide-react'
import AttachmentList from './AttachmentList'
import ErrorBanner from './ErrorBanner'
import InputBarTextarea from './InputBarTextarea'
import InputBarToolbar from './InputBarToolbar'
import {
  genId,
  determineFileType,
  QUICK_COMMANDS,
  detectTrigger,
  getTriggerQuery,
  getMentionPrefix,
  type QuickCommand
} from '../../lib/chat-utils'

interface InputBarProps {
  onOpenSettings: () => void
  onClearChat?: () => void
  onWebSearch?: (query: string) => void
}

export default function InputBar({ onOpenSettings, onClearChat, onWebSearch }: InputBarProps) {
  const [text, setText] = useState('')
  const [showEnsemblePicker, setShowEnsemblePicker] = useState(false)
  const [showSkillPicker, setShowSkillPicker] = useState(false)
  const [skillFilter, setSkillFilter] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const messages = useChatStore((state) => state.messages)
  const streaming = useChatStore((state) => state.streaming)
  const error = useChatStore((state) => state.error)
  const errorType = useChatStore((state) => state.errorType)
  const addMessage = useChatStore((state) => state.addMessage)
  const appendToken = useChatStore((state) => state.appendToken)
  const addToolCall = useChatStore((state) => state.addToolCall)
  const addToolResult = useChatStore((state) => state.addToolResult)
  const setStreaming = useChatStore((state) => state.setStreaming)
  const setError = useChatStore((state) => state.setError)
  const attachments = useChatStore((state) => state.attachments)
  const addAttachment = useChatStore((state) => state.addAttachment)
  const removeAttachment = useChatStore((state) => state.removeAttachment)
  const clearAttachments = useChatStore((state) => state.clearAttachments)
  const mode = useChatStore((state) => state.mode)
  const setMode = useChatStore((state) => state.setMode)
  const startEnsembleRun = useChatStore((state) => state.startEnsembleRun)
  const appendAgentToken = useChatStore((state) => state.appendAgentToken)
  const setAgentRunStatus = useChatStore((state) => state.setAgentRunStatus)
  const setAgentMetrics = useChatStore((state) => state.setAgentMetrics)
  const addAgentToolCall = useChatStore((state) => state.addAgentToolCall)
  const addAgentToolResult = useChatStore((state) => state.addAgentToolResult)
  const startArbitration = useChatStore((state) => state.startArbitration)
  const appendArbitrationToken = useChatStore((state) => state.appendArbitrationToken)
  const finalizeArbitration = useChatStore((state) => state.finalizeArbitration)
  const finalizeManualEnsemble = useChatStore((state) => state.finalizeManualEnsemble)
  const completeEnsembleRun = useChatStore((state) => state.completeEnsembleRun)
  const { settings, activeProvider, ensembleProviders, arbitratorProvider } = useSettingsStore()
  const { activeThreadId, activeWorkspace, createThread, updateThread, workspaces, threads } = useWorkspaceStore()
  const toast = useToast()
  const activeThread = threads.find((t) => t.id === activeThreadId)
  const provider = activeProvider()
  const workspace = activeWorkspace()
  const inputBarRef = useRef<HTMLDivElement>(null)

  // Ensemble picker state
  const [selectedEnsembleIds, setSelectedEnsembleIds] = useState<string[]>([])
  const [ensembleArbitratorId, setEnsembleArbitratorId] = useState<string | null>(null)
  const [ensembleRoleAssignments, setEnsembleRoleAssignments] = useState<Record<string, AgentRole>>({})

  // Mention / reference / command popover state
  const [popoverType, setPopoverType] = useState<'mention' | 'thread' | 'command' | null>(null)
  const [popoverQuery, setPopoverQuery] = useState('')
  const [popoverIndex, setPopoverIndex] = useState(0)

  // Listen for fill-input event
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail.text
      setText(text)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
    window.addEventListener('opendesk:fill-input', handler)
    return () => window.removeEventListener('opendesk:fill-input', handler)
  }, [])

  // Listen for file reference from FilePanel
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ path: string; name: string }>).detail
      const prefix = text.trim() ? text.trim() + '\n\n' : ''
      setText(prefix + `@file:${detail.name}`)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
    window.addEventListener('opendesk:reference-file', handler)
    return () => window.removeEventListener('opendesk:reference-file', handler)
  }, [text])

  useEffect(() => {
    if (settings.ensembleModeDefault) setMode('ensemble')
  }, [settings.ensembleModeDefault, setMode])

  // Sync ensemble state from thread or settings
  useEffect(() => {
    if (activeThread) {
      setSelectedEnsembleIds(activeThread.ensembleProviderIds || [])
      setEnsembleArbitratorId(activeThread.arbitratorProviderId || null)
      setEnsembleRoleAssignments(activeThread.agentRoleAssignments || {})
      if (activeThread.mode) setMode(activeThread.mode)
    } else {
      const defaultProviders = ensembleProviders().map((p) => p.id)
      setSelectedEnsembleIds(defaultProviders)
      setEnsembleArbitratorId(arbitratorProvider()?.id || null)
      setEnsembleRoleAssignments(settings.agentRoleAssignments || {})
    }
  }, [activeThread, settings.agentRoleAssignments, ensembleProviders, arbitratorProvider, setMode])

  // Draft auto-save and restore
  useEffect(() => {
    if (window.api?.draft?.load) {
      window.api.draft
        .load()
        .then((draft) => {
          if (draft?.text && Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) setText(draft.text)
        })
        .catch(console.error)
    }
  }, [])

  useEffect(() => {
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
    el.style.height = Math.min(el.scrollHeight, 300) + 'px'
  }, [text])

  // Chat IPC listeners
  useEffect(() => {
    const chat = window.api?.chat
    if (!chat) return
    const offToken = chat.onToken?.((token) => appendToken(token)) || (() => {})
    const offToolCall = chat.onToolCall?.((toolCall) => addToolCall(toolCall)) || (() => {})
    const offToolResult = chat.onToolResult?.((result) => addToolResult(result)) || (() => {})
    const offDone = chat.onDone?.(() => setStreaming(false)) || (() => {})
    const offError =
      chat.onError?.((error) => {
        setStreaming(false)
        setError(error.message, error.type as Parameters<typeof setError>[1])
      }) || (() => {})
    const offAgentToken =
      chat.onAgentToken?.(({ runId, agentId, providerId: _pid, token }) => {
        appendAgentToken(runId, agentId, _pid, token)
      }) || (() => {})
    const offAgentDone =
      chat.onAgentDone?.(({ runId, agentId, latencyMs, inputTokens, outputTokens }) => {
        setAgentRunStatus(runId, agentId, 'done')
        if (latencyMs || inputTokens || outputTokens)
          setAgentMetrics(runId, agentId, { latencyMs, inputTokens, outputTokens })
      }) || (() => {})
    const offAgentError =
      chat.onAgentError?.(({ runId, agentId, error }) => {
        setAgentRunStatus(runId, agentId, 'error', error)
      }) || (() => {})
    const offAgentToolCall =
      chat.onAgentToolCall?.(({ runId, agentId, toolCall }) => {
        addAgentToolCall(runId, agentId, toolCall)
      }) || (() => {})
    const offAgentToolResult =
      chat.onAgentToolResult?.(({ runId, agentId, toolResult }) => {
        addAgentToolResult(runId, agentId, toolResult)
      }) || (() => {})
    const offArbitrationToken =
      chat.onArbitrationToken?.(({ runId, token }) => {
        const run = useChatStore.getState().ensembleRuns[runId]
        if (!run?.arbitrationMessageId) startArbitration(runId)
        appendArbitrationToken(runId, token)
      }) || (() => {})
    const offArbitrationDone =
      chat.onArbitrationDone?.(({ runId, result }) => {
        const run = useChatStore.getState().ensembleRuns[runId]
        if (!run?.arbitrationMessageId) startArbitration(runId)
        finalizeArbitration(runId, result)
      }) || (() => {})
    const offEnsembleDone =
      chat.onEnsembleDone?.(({ runId, agentAnswers, arbitrationMode }) => {
        const {
          ensembleRuns,
          threadId: currentThreadId,
          arbitrationMode: currentArbitrationMode
        } = useChatStore.getState()
        const run = ensembleRuns[runId]
        if (!run) return
        if (currentThreadId && agentAnswers?.length) updateThread(currentThreadId, { agentAnswers })
        const mode = (arbitrationMode || currentArbitrationMode) === 'manual' ? 'compare' : 'ensemble'
        if (mode === 'compare') finalizeManualEnsemble(runId, agentAnswers || [])
        completeEnsembleRun(runId)
      }) || (() => {})

    return () => {
      offToken()
      offToolCall()
      offToolResult()
      offDone()
      offError()
      offAgentToken()
      offAgentDone()
      offAgentError()
      offAgentToolCall()
      offAgentToolResult()
      offArbitrationToken()
      offArbitrationDone()
      offEnsembleDone()
    }
  }, [
    appendToken,
    addToolCall,
    addToolResult,
    setStreaming,
    setError,
    appendAgentToken,
    setAgentRunStatus,
    setAgentMetrics,
    addAgentToolCall,
    addAgentToolResult,
    startArbitration,
    appendArbitrationToken,
    finalizeArbitration,
    completeEnsembleRun,
    updateThread,
    finalizeManualEnsemble
  ])

  // Click outside to close popover
  useEffect(() => {
    function handler(event: MouseEvent) {
      const target = event.target as Node
      if (inputBarRef.current?.contains(target)) return
      setShowSkillPicker(false)
      setPopoverType(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
    const match = val.match(/\/\w*$/)
    if (match && !trigger) {
      setShowSkillPicker(true)
      setSkillFilter(match[1].toLowerCase())
    } else {
      setShowSkillPicker(false)
    }
  }

  const insertMention = useCallback(
    (item: { type: string; id: string; name: string }) => {
      const el = textareaRef.current
      if (!el) return
      const cursorPos = el.selectionStart
      const before = text.slice(0, cursorPos)
      const after = text.slice(cursorPos)
      const lastAt = before.lastIndexOf('@')
      const lastHash = before.lastIndexOf('#')
      const lastSlash = before.lastIndexOf('/')
      const lastTrigger = Math.max(lastAt, lastHash, lastSlash)
      const prefix = getMentionPrefix(item.type)
      const newText = before.slice(0, lastTrigger) + prefix + item.name + ' ' + after
      setText(newText)
      setPopoverType(null)
      setTimeout(() => {
        el.focus()
        const newPos = lastTrigger + prefix.length + item.name.length + 1
        el.setSelectionRange(newPos, newPos)
      }, 0)
    },
    [text]
  )

  function handleSelectSkill(skillId: string) {
    if (activeThreadId) updateThread(activeThreadId, { skillId })
    setText(text.replace(/\/\w*$/, ''))
    setShowSkillPicker(false)
    textareaRef.current?.focus()
  }

  const handleSelectCommand = useCallback(
    (cmd: QuickCommand) => {
      setText(text.replace(/\/\w*$/, ''))
      setPopoverType(null)
      if (cmd.id === 'clear') onClearChat?.()
      else if (cmd.id === 'model' || cmd.id === 'provider') {
        window.dispatchEvent(new CustomEvent('opendesk:focus-model'))
      } else if (cmd.id === 'screenshot') {
        handleScreenshot()
      } else if (cmd.id === 'search') {
        const query = text.replace(/.*\/search\s*/, '').trim()
        if (query) onWebSearch?.(query)
        else toast.info('Enter a search query after /search')
      } else if (cmd.id === 'workspace') {
        toast.info('Switch workspace from the sidebar')
      }
      textareaRef.current?.focus()
    },
    [onClearChat, onWebSearch, text, toast, handleScreenshot]
  )

  const mentionItems = useMemo(() => {
    const q = popoverQuery.toLowerCase()
    const items: Array<{ type: string; id: string; name: string; subtitle: string; icon: React.ReactNode }> = []
    workspaces.forEach((ws) => {
      const name = ws.name || ws.folderPath.split('/').pop() || 'Untitled'
      if (name.toLowerCase().includes(q)) {
        items.push({ type: 'workspace', id: ws.id, name, subtitle: ws.folderPath, icon: <Folder size={14} /> })
      }
    })
    if (workspace?.folderPath) {
      workspaceFiles
        .filter((f) => f.toLowerCase().includes(q))
        .slice(0, 6)
        .forEach((f) => {
          items.push({ type: 'file', id: f, name: f, subtitle: workspace.folderPath, icon: <FileText size={14} /> })
        })
    }
    return items.slice(0, 8)
  }, [popoverQuery, workspaces, workspaceFiles, workspace?.folderPath])

  const threadItems = useMemo(() => {
    const q = popoverQuery.toLowerCase()
    if (!workspace?.id) return []
    return threads
      .filter((t) => t.workspaceId === workspace.id && t.title.toLowerCase().includes(q))
      .map((t) => ({
        type: 'thread',
        id: t.id,
        name: t.title,
        subtitle: new Date(t.updatedAt).toLocaleDateString(),
        icon: <MessageSquare size={14} />
      }))
      .slice(0, 8)
  }, [popoverQuery, threads, workspace?.id])

  const commandItems = useMemo(() => {
    const q = popoverQuery.toLowerCase()
    return QUICK_COMMANDS.filter((c) => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q))
  }, [popoverQuery])

  const popoverItems =
    popoverType === 'mention'
      ? mentionItems
      : popoverType === 'thread'
        ? threadItems
        : popoverType === 'command'
          ? commandItems
          : []

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (popoverType && popoverItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPopoverIndex((i) => Math.min(i + 1, popoverItems.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPopoverIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const item = popoverItems[popoverIndex]
        if (item) {
          if (popoverType === 'command') handleSelectCommand(item as unknown as QuickCommand)
          else insertMention(item)
        }
        return
      }
      if (e.key === 'Escape') {
        setPopoverType(null)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
      return
    }
    if (e.key === 'Escape' && streaming) abort()
  }

  async function send() {
    const content = text.trim()
    if (!content || streaming) return

    const currentMode = mode
    const isEnsembleMode = currentMode === 'ensemble' || currentMode === 'compare' || currentMode === 'agent'

    const ensProviders = isEnsembleMode
      ? selectedEnsembleIds.length > 0
        ? selectedEnsembleIds
            .map((id) => settings.providers.find((p) => p.id === id))
            .filter((p): p is NonNullable<typeof p> => Boolean(p))
        : ensembleProviders()
      : []

    const arbProvider = isEnsembleMode
      ? ensembleArbitratorId
        ? settings.providers.find((p) => p.id === ensembleArbitratorId)
        : arbitratorProvider()
      : null

    if (!provider && ensProviders.length === 0) {
      onOpenSettings()
      return
    }
    if (isEnsembleMode && ensProviders.length === 0) {
      setShowEnsemblePicker(true)
      return
    }

    let processedContent = content
    const mentionRegex = /@workspace:([^\s]+)|#thread:([^\s]+)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      if (match[1]) mentions.push(`Workspace: ${match[1]}`)
      if (match[2]) mentions.push(`Thread: ${match[2]}`)
    }
    if (mentions.length > 0) processedContent += '\n\n[Context: ' + mentions.join(', ') + ']'

    let attachmentContent = ''
    for (const att of attachments) {
      if (!att.file) continue
      if (att.type === 'text' || att.type === 'code') {
        const txt = await att.file.text()
        attachmentContent += `\n\n[Attachment: ${att.file.name}]\n\`\`\`\n${txt}\n\`\`\`\n`
      } else if (att.type === 'image') {
        attachmentContent += `\n\n[Image attached: ${att.file.name}]\n`
      }
    }
    if (attachmentContent) processedContent += attachmentContent

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

    if (window.api?.draft?.save) window.api.draft.save({ text: '', threadId: null }).catch(console.error)

    const roleAssignments = ensembleRoleAssignments
    const arbitrationMode = currentMode === 'compare' ? 'manual' : 'auto'

    if (threadId) {
      updateThread(threadId, {
        mode: currentMode,
        ensembleProviderIds: isEnsembleMode ? selectedEnsembleIds : undefined,
        arbitratorProviderId: isEnsembleMode ? ensembleArbitratorId || undefined : undefined,
        arbitrationMode,
        agentRoleAssignments: isEnsembleMode ? roleAssignments : undefined
      })
    }

    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const payload: Record<string, unknown> = {
      messages: [...messages, userMsg],
      sessionId,
      threadId,
      mode: currentMode === 'compare' ? 'compare' : currentMode,
      arbitrationMode
    }
    if (workspace) payload.workspaceId = workspace.id

    if (isEnsembleMode && ensProviders.length > 0) {
      payload.providerIds = ensProviders.map((p) => p.id)
      payload.arbitratorProviderId = arbProvider?.id
      payload.agentRoleAssignments = roleAssignments
      startEnsembleRun(
        sessionId,
        ensProviders.map((p) => p.id),
        arbProvider?.id
      )
    } else {
      if (!settings.activeProviderId) {
        onOpenSettings()
        setStreaming(false)
        return
      }
      payload.providerId = settings.activeProviderId
    }

    if (window.api?.chat) {
      window.api.chat.send(payload as never)
    } else {
      console.warn('window.api.chat.send not available')
      setTimeout(() => {
        setStreaming(false)
        addMessage({ id: genId(), role: 'assistant', content: 'Mock response (browser mode)', timestamp: Date.now() })
      }, 1000)
    }
  }

  function abort() {
    const chat = window.api?.chat
    if (!chat) return
    const { activeRunId } = useChatStore.getState()
    if (activeRunId) chat.abort(activeRunId)
    else if (settings.activeProviderId) chat.abort(settings.activeProviderId)
    setStreaming(false)
  }

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
  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      Array.from(e.dataTransfer.files).forEach((file) => {
        addAttachment({
          id: genId(),
          name: file.name,
          path: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          file,
          type: determineFileType(file)
        })
      })
    },
    [addAttachment]
  )

  // Paste handler
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      Array.from(e.clipboardData.items).forEach((item) => {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file)
            addAttachment({
              id: genId(),
              name: file.name || 'pasted-image.png',
              path: file.name || 'pasted-image.png',
              size: file.size,
              mimeType: file.type,
              file,
              type: 'image'
            })
        }
      })
    },
    [addAttachment]
  )

  // Screenshot handler
  const handleScreenshot = useCallback(async () => {
    try {
      const base64 = await window.api?.desktop?.capture()
      if (!base64) return
      const byteChars = atob(base64)
      const byteArr = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i)
      const blob = new Blob([byteArr], { type: 'image/png' })
      const url = URL.createObjectURL(blob)
      const file = new File([byteArr], `screenshot-${Date.now()}.png`, { type: 'image/png' })
      addAttachment({
        id: genId(),
        name: file.name,
        path: url,
        size: byteArr.length,
        mimeType: 'image/png',
        content: base64,
        file,
        type: 'image'
      })
    } catch (e) {
      console.error('Screenshot failed:', e)
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('Failed to get sources') || msg.includes('permission')) {
        alert(
          'Screenshot permission denied.\n\nPlease go to System Settings → Privacy & Security → Screen Recording and allow OpenDesk.'
        )
      }
    }
  }, [addAttachment])

  // Load workspace file list for @file mentions
  useEffect(() => {
    if (!workspace?.folderPath) {
      setWorkspaceFiles([])
      return
    }
    async function loadFiles() {
      try {
        const result = await window.api.tools.listDirectory(workspace.folderPath)
        if (result.success && result.entries) {
          const files = result.entries.filter((e) => !e.isDirectory).map((e) => e.name)
          setWorkspaceFiles(files)
        } else {
          setWorkspaceFiles([])
        }
      } catch {
        setWorkspaceFiles([])
      }
    }
    loadFiles()
  }, [workspace?.folderPath])

  const handleSelectPopover = useCallback(
    (item: { type: string; id: string; name: string }) => {
      if (popoverType === 'command') {
        handleSelectCommand(item as unknown as QuickCommand)
      } else {
        insertMention(item)
      }
    },
    [popoverType, handleSelectCommand, insertMention]
  )

  return (
    <div ref={inputBarRef} className="shrink-0 px-6 pb-8 pt-2 max-w-3xl w-full mx-auto relative">
      <ErrorBanner
        error={error}
        errorType={errorType}
        onOpenSettings={onOpenSettings}
        onDismiss={() => setError(null)}
      />
      <AttachmentList attachments={attachments} onRemove={removeAttachment} />

      <div
        className={`rounded-2xl overflow-visible bg-[var(--bg-input)]/80 border transition-all duration-300 relative shadow-sm ${
          isDragging
            ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20'
            : 'border-[var(--border)] focus-within:border-[var(--text-muted)] focus-within:shadow-md'
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

        <InputBarTextarea
          text={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          textareaRef={textareaRef}
          placeholder={
            provider ? 'Message OpenDesk… (↵ to send, ⇧↵ for new line, / for skills)' : 'Configure a provider to start…'
          }
          isDragging={isDragging}
          popoverType={popoverType}
          popoverItems={popoverItems}
          popoverIndex={popoverIndex}
          onSelectPopover={handleSelectPopover}
          showSkillPicker={showSkillPicker}
          skillFilter={skillFilter}
          onSelectSkill={handleSelectSkill}
        />

        <InputBarToolbar
          onScreenshot={handleScreenshot}
          onOpenSettings={onOpenSettings}
          mode={mode}
          onModeChange={setMode}
          streaming={streaming}
          selectedEnsembleIds={selectedEnsembleIds}
          setSelectedEnsembleIds={setSelectedEnsembleIds}
          showEnsemblePicker={showEnsemblePicker}
          setShowEnsemblePicker={setShowEnsemblePicker}
          ensembleArbitratorId={ensembleArbitratorId}
          setEnsembleArbitratorId={setEnsembleArbitratorId}
          ensembleRoleAssignments={ensembleRoleAssignments}
          setEnsembleRoleAssignments={setEnsembleRoleAssignments}
          providers={settings.providers}
          onSend={send}
          onAbort={abort}
          text={text}
        />
      </div>
    </div>
  )
}
