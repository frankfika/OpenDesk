import { useRef, useState, useEffect, KeyboardEvent, useCallback, DragEvent, useMemo } from 'react'
import { useChatStore } from '../../store/chat'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
import type { Message, FileAttachment, AgentRole } from '@shared/types'
import { Send, Square, Camera, Users, FileText, Folder, MessageSquare } from 'lucide-react'
import ModeSwitcher from './ModeSwitcher'
import EnsembleModelPicker from './EnsembleModelPicker'
import AttachmentList from './AttachmentList'
import ErrorBanner from './ErrorBanner'
import MentionPopover from './MentionPopover'
import SkillPicker from './SkillPicker'
import ModelPicker from './ModelPicker'
import ApprovalModeSelector from './ApprovalModeSelector'

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const QUICK_COMMANDS = [
  { id: 'clear', label: '/clear', desc: 'Clear current conversation', icon: '✨' },
  { id: 'model', label: '/model', desc: 'Switch model quickly', icon: '🤖' },
  { id: 'provider', label: '/provider', desc: 'Switch AI provider', icon: '🔌' },
  { id: 'workspace', label: '/workspace', desc: 'Switch workspace', icon: '📁' },
  { id: 'screenshot', label: '/screenshot', desc: 'Capture and send screenshot', icon: '📸' },
  { id: 'search', label: '/search', desc: 'Search the web', icon: '🔍' }
]

interface InputBarProps {
  onOpenSettings: () => void
  onClearChat?: () => void
  onScreenshot?: () => void
  onWebSearch?: (query: string) => void
}

function _isComplexTask(content: string): boolean {
  if (content.includes('```')) return true
  if (content.includes('@file:')) return true
  if (content.length > 300) return true
  const complexKeywords = [
    'review',
    'refactor',
    'debug',
    'analyze',
    'analyse',
    'implement',
    'write',
    'create',
    'fix',
    'optimize',
    'compare',
    'explain in detail',
    'check for',
    'find bugs',
    'code review',
    '重构',
    '调试',
    '分析',
    '实现',
    '优化',
    '修复',
    '检查',
    '审查'
  ]
  const lower = content.toLowerCase()
  return complexKeywords.some((k) => lower.includes(k.toLowerCase()))
}

function determineFileType(file: File): 'text' | 'image' | 'code' | 'pdf' {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf') return 'pdf'
  const codeExts = [
    '.js',
    '.ts',
    '.tsx',
    '.jsx',
    '.py',
    '.css',
    '.html',
    '.xml',
    '.yaml',
    '.yml',
    '.json',
    '.java',
    '.cpp',
    '.c',
    '.h',
    '.go',
    '.rs',
    '.rb',
    '.php',
    '.swift',
    '.kt',
    '.scala',
    '.sh',
    '.bash',
    '.zsh',
    '.ps1',
    '.sql',
    '.dockerfile',
    '.dockerignore',
    '.gitignore',
    '.env',
    '.ini',
    '.cfg',
    '.conf',
    '.toml',
    '.lock',
    '.gradle',
    '.maven',
    '.sbt'
  ]
  if (codeExts.some((ext) => file.name.toLowerCase().endsWith(ext))) return 'code'
  return 'text'
}

export default function InputBar({ onOpenSettings, onClearChat, onScreenshot, onWebSearch }: InputBarProps) {
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
  const _setArbitrationMode = useChatStore((state) => state.setArbitrationMode)
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
  const activeThread = threads.find((t) => t.id === activeThreadId)

  // Ensemble picker state
  const [selectedEnsembleIds, setSelectedEnsembleIds] = useState<string[]>([])
  const [ensembleArbitratorId, setEnsembleArbitratorId] = useState<string | null>(null)
  const [ensembleRoleAssignments, setEnsembleRoleAssignments] = useState<Record<string, AgentRole>>({})

  // Mention / reference / command popover state
  const [popoverType, setPopoverType] = useState<'mention' | 'thread' | 'command' | null>(null)
  const [popoverQuery, setPopoverQuery] = useState('')
  const [popoverIndex, setPopoverIndex] = useState(0)

  const provider = activeProvider()
  const workspace = activeWorkspace()
  const [_fetchedModels, _setFetchedModels] = useState<string[]>([])
  const [_showModelSearch, _setShowModelSearch] = useState(false)
  const inputBarRef = useRef<HTMLDivElement>(null)

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
    if (settings.ensembleModeDefault) {
      setMode('ensemble')
    }
  }, [settings.ensembleModeDefault, setMode])

  // Sync ensemble state from thread or settings
  useEffect(() => {
    if (activeThread) {
      setSelectedEnsembleIds(activeThread.ensembleProviderIds || [])
      setEnsembleArbitratorId(activeThread.arbitratorProviderId || null)
      setEnsembleRoleAssignments(activeThread.agentRoleAssignments || {})
      if (activeThread.mode) {
        setMode(activeThread.mode)
      }
    } else {
      // Default from settings
      const defaultProviders = ensembleProviders().map((p) => p.id)
      const defaultArbitrator = arbitratorProvider()?.id || null
      setSelectedEnsembleIds(defaultProviders)
      setEnsembleArbitratorId(defaultArbitrator)
      setEnsembleRoleAssignments(settings.agentRoleAssignments || {})
    }
  }, [
    activeThread,
    settings.agentRoleAssignments,
    ensembleProviders,
    arbitratorProvider,
    setMode,
    setSelectedEnsembleIds,
    setEnsembleArbitratorId,
    setEnsembleRoleAssignments
  ])

  // Draft auto-save and restore
  useEffect(() => {
    // Load draft on mount
    if (window.api?.draft?.load) {
      window.api.draft
        .load()
        .then((draft) => {
          if (draft && draft.text && Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
            setText(draft.text)
          }
        })
        .catch(console.error)
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
    const chat = window.api?.chat
    if (!chat) return
    const offToken = typeof chat.onToken === 'function' ? chat.onToken((token) => appendToken(token)) : () => {}
    const offToolCall =
      typeof chat.onToolCall === 'function' ? chat.onToolCall((toolCall) => addToolCall(toolCall)) : () => {}
    const offToolResult =
      typeof chat.onToolResult === 'function' ? chat.onToolResult((result) => addToolResult(result)) : () => {}
    const offDone = typeof chat.onDone === 'function' ? chat.onDone(() => setStreaming(false)) : () => {}
    const offError =
      typeof chat.onError === 'function'
        ? chat.onError((error) => {
            setStreaming(false)
            setError(
              error.message,
              error.type as 'auth' | 'network' | 'model' | 'provider' | 'workspace' | 'ollama' | 'generic' | null
            )
          })
        : () => {}

    // Ensemble event listeners
    const offAgentToken =
      typeof chat.onAgentToken === 'function'
        ? chat.onAgentToken(({ runId, agentId, providerId: _pid, token }) => {
            appendAgentToken(runId, agentId, _pid, token)
          })
        : () => {}
    const offAgentDone =
      typeof chat.onAgentDone === 'function'
        ? chat.onAgentDone(({ runId, agentId, providerId: _pid, latencyMs, inputTokens, outputTokens }) => {
            setAgentRunStatus(runId, agentId, 'done')
            if (latencyMs !== undefined || inputTokens !== undefined || outputTokens !== undefined) {
              setAgentMetrics(runId, agentId, { latencyMs, inputTokens, outputTokens })
            }
          })
        : () => {}
    const offAgentError =
      typeof chat.onAgentError === 'function'
        ? chat.onAgentError(({ runId, agentId, providerId: _pid, error }) => {
            setAgentRunStatus(runId, agentId, 'error', error)
          })
        : () => {}
    const offAgentToolCall =
      typeof chat.onAgentToolCall === 'function'
        ? chat.onAgentToolCall(({ runId, agentId, toolCall }) => {
            addAgentToolCall(runId, agentId, toolCall)
          })
        : () => {}
    const offAgentToolResult =
      typeof chat.onAgentToolResult === 'function'
        ? chat.onAgentToolResult(({ runId, agentId, toolResult }) => {
            addAgentToolResult(runId, agentId, toolResult)
          })
        : () => {}
    const offArbitrationToken =
      typeof chat.onArbitrationToken === 'function'
        ? chat.onArbitrationToken(({ runId, token }) => {
            const run = useChatStore.getState().ensembleRuns[runId]
            if (!run?.arbitrationMessageId) {
              startArbitration(runId)
            }
            appendArbitrationToken(runId, token)
          })
        : () => {}
    const offArbitrationDone =
      typeof chat.onArbitrationDone === 'function'
        ? chat.onArbitrationDone(({ runId, result }) => {
            const run = useChatStore.getState().ensembleRuns[runId]
            if (!run?.arbitrationMessageId) {
              startArbitration(runId)
            }
            finalizeArbitration(runId, result)
          })
        : () => {}
    const offEnsembleDone =
      typeof chat.onEnsembleDone === 'function'
        ? chat.onEnsembleDone(({ runId, agentAnswers, arbitrationMode }) => {
            const {
              ensembleRuns,
              threadId: currentThreadId,
              arbitrationMode: currentArbitrationMode
            } = useChatStore.getState()
            const run = ensembleRuns[runId]
            if (!run) return

            // Persist agent answers to thread for future reference
            if (currentThreadId && agentAnswers && agentAnswers.length > 0) {
              updateThread(currentThreadId, { agentAnswers })
            }

            // For manual/compare mode, show the compare UI instead of arbitration
            const mode = (arbitrationMode || currentArbitrationMode) === 'manual' ? 'compare' : 'ensemble'
            if (mode === 'compare') {
              finalizeManualEnsemble(runId, agentAnswers || [])
            }
            completeEnsembleRun(runId)
          })
        : () => {}

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

  useEffect(() => {
    function handler(event: MouseEvent) {
      const target = event.target as Node
      if (inputBarRef.current && inputBarRef.current.contains(target)) {
        return
      }
      setShowSkillPicker(false)
      setPopoverType(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
    const prefix =
      item.type === 'workspace'
        ? '@workspace:'
        : item.type === 'file'
          ? '@file:'
          : item.type === 'thread'
            ? '#thread:'
            : ''
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

  const handleSelectCommand = useCallback(
    (cmd: (typeof QUICK_COMMANDS)[0]) => {
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
    },
    [onClearChat, onScreenshot, onWebSearch, text]
  )

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
    // Real workspace files
    if (workspace) {
      workspaceFiles
        .filter((f) => f.toLowerCase().includes(q))
        .slice(0, 6)
        .forEach((f) => {
          items.push({ type: 'file', id: f, name: f, subtitle: workspace.folderPath, icon: <FileText size={14} /> })
        })
    }
    return items.slice(0, 8)
  }, [popoverQuery, workspaces, workspace, workspaceFiles])

  // Thread items
  const threadItems = useMemo(() => {
    const q = popoverQuery.toLowerCase()
    if (!workspace) return []
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
  }, [popoverQuery, threads, workspace])

  // Command items
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
          if (popoverType === 'command') {
            handleSelectCommand(item as unknown as (typeof QUICK_COMMANDS)[0])
          } else {
            insertMention(item as unknown as Parameters<typeof insertMention>[0])
          }
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
    if (e.key === 'Escape' && streaming) {
      abort()
    }
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

    // Resolve @file references to actual content
    let processedContent = content
    // NOTE: file content resolution moved to main process for security
    // @file references are preserved as-is and resolved server-side

    // Legacy mention handling for workspace/thread
    const mentionRegex = /@workspace:([^\s]+)|#thread:([^\s]+)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      if (match[1]) mentions.push(`Workspace: ${match[1]}`)
      if (match[2]) mentions.push(`Thread: ${match[2]}`)
    }
    if (mentions.length > 0) {
      processedContent = processedContent + '\n\n[Context: ' + mentions.join(', ') + ']'
    }

    // Process attachments
    let attachmentContent = ''
    for (const att of attachments) {
      if (!att.file) continue
      if (att.type === 'text' || att.type === 'code') {
        const text = await att.file.text()
        attachmentContent += `\n\n[Attachment: ${att.file.name}]\n\`\`\`\n${text}\n\`\`\`\n`
      } else if (att.type === 'image') {
        // For now, just note the image name
        attachmentContent += `\n\n[Image attached: ${att.file.name}]\n`
      }
    }
    if (attachmentContent) {
      processedContent += attachmentContent
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      messages: [...messages, userMsg],
      sessionId,
      threadId,
      mode: currentMode === 'compare' ? 'compare' : currentMode,
      arbitrationMode
    }

    if (workspace) {
      payload.workspaceId = workspace.id
    }

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
    const chat = window.api?.chat
    if (!chat) return
    const { activeRunId } = useChatStore.getState()
    if (activeRunId) {
      chat.abort(activeRunId)
    } else if (settings.activeProviderId) {
      chat.abort(settings.activeProviderId)
    }
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
      const files = Array.from(e.dataTransfer.files)
      files.forEach((file) => {
        const attachment: FileAttachment = {
          id: genId(),
          name: file.name,
          path: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          file,
          type: determineFileType(file)
        }
        addAttachment(attachment)
      })
    },
    [addAttachment]
  )

  // Paste handler for images
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
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
              mimeType: file.type,
              file,
              type: 'image'
            }
            addAttachment(attachment)
          }
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
      // base64 is PNG data — convert to blob URL for preview and attach
      const byteChars = atob(base64)
      const byteArr = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i)
      const blob = new Blob([byteArr], { type: 'image/png' })
      const url = URL.createObjectURL(blob)
      const file = new File([byteArr], `screenshot-${Date.now()}.png`, { type: 'image/png' })
      const attachment: FileAttachment = {
        id: genId(),
        name: file.name,
        path: url,
        size: byteArr.length,
        mimeType: 'image/png',
        content: base64,
        file,
        type: 'image'
      }
      addAttachment(attachment)
    } catch (e) {
      console.error('Screenshot failed:', e)
      // Show user-friendly error if permission denied
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('Failed to get sources') || msg.includes('permission')) {
        alert(
          'Screenshot permission denied.\n\nPlease go to System Settings → Privacy & Security → Screen Recording and allow OpenDesk.'
        )
      }
    }
  }, [addAttachment])

  // Load workspace file list for @file mentions
  // NOTE: disabled due to tools:* IPC removal. File list loading moved to main process.
  useEffect(() => {
    setWorkspaceFiles([])
  }, [workspace?.folderPath])

  return (
    <div ref={inputBarRef} className="shrink-0 px-6 pb-8 pt-2 max-w-3xl w-full mx-auto relative">
      <ErrorBanner
        error={error}
        errorType={errorType}
        onOpenSettings={onOpenSettings}
        onDismiss={() => setError(null)}
      />

      {/* Attachments */}
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

        <div className="px-5 pt-4 pb-2 relative">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent resize-none outline-none text-[15px] leading-relaxed selectable text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-[height] duration-150 ease-out"
            style={{ minHeight: 28, maxHeight: 300 }}
            placeholder={
              provider
                ? 'Message OpenDesk… (↵ to send, ⇧↵ for new line, / for skills)'
                : 'Configure a provider to start…'
            }
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
          />

          {/* Popover for @ / # / / */}
          {popoverType && popoverItems.length > 0 && (
            <MentionPopover
              type={popoverType}
              items={popoverItems as unknown as Parameters<typeof MentionPopover>['items']}
              selectedIndex={popoverIndex}
              onSelect={(item) => {
                if (popoverType === 'command') {
                  handleSelectCommand(item as unknown as (typeof QUICK_COMMANDS)[0])
                } else {
                  insertMention(item as unknown as Parameters<typeof insertMention>[0])
                }
              }}
            />
          )}

          {/* Legacy skill picker */}
          {showSkillPicker && <SkillPicker filter={skillFilter} onSelect={handleSelectSkill} />}
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

          <ModelPicker onOpenSettings={onOpenSettings} />

          {/* Mode Switcher */}
          <ModeSwitcher mode={mode} onChange={setMode} disabled={streaming} />

          {/* Ensemble Config Button - show when in ensemble/agent/compare mode */}
          {(mode === 'ensemble' || mode === 'agent' || mode === 'compare') && (
            <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowEnsemblePicker((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20"
                title="Configure ensemble models"
              >
                <Users size={14} />
                <span className="font-medium">{selectedEnsembleIds.length || 0} models</span>
              </button>

              <EnsembleModelPicker
                open={showEnsemblePicker}
                providers={settings.providers}
                selectedIds={selectedEnsembleIds}
                arbitratorId={ensembleArbitratorId}
                roleAssignments={ensembleRoleAssignments}
                onToggleProvider={(id) => {
                  setSelectedEnsembleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
                }}
                onSetArbitrator={(id) => setEnsembleArbitratorId(id)}
                onSetRole={(id, role) => {
                  setEnsembleRoleAssignments((prev) => ({ ...prev, [id]: role }))
                }}
                onClose={() => setShowEnsemblePicker(false)}
              />
            </div>
          )}

          <ApprovalModeSelector />

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
                  ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] cursor-pointer'
                  : 'bg-[var(--border)] text-[var(--text-muted)] cursor-default'
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
