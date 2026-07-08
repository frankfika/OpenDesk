// RightRail — AI agent always visible. The heart of the workbench.
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Send, Sparkles, Loader2, AlertCircle, Plus, Bot } from 'lucide-react'
import { useChatStore } from '../../store/chat'
import { useWorkspaceStore } from '../../store/workspace'
import { useSettingsStore } from '../../store/settings'
import { useSkillsStore } from '../../store/skills'
import { useWeb3Store, type Web3ScenarioId } from '../../store/web3'
import { useAccount } from 'wagmi'
import { runWeb3Agent } from '../../lib/web3Chat'

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const SCENARIO_SKILL: Record<Web3ScenarioId, string> = {
  intel: 'web3-intel',
  trade: 'web3-trader',
  doctor: 'web3-intel',
  chat: ''
}

const SCENARIO_PROMPTS: Record<Web3ScenarioId, string[]> = {
  intel: [
    'Analyze vitalik.eth',
    'Show portfolio for 0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    'What does brantly.eth hold?'
  ],
  trade: [
    'Swap 0.05 ETH for USDC on Base',
    'Send 10 USDC to vitalik.eth',
    'Check gas for an Arbitrum swap'
  ],
  doctor: [
    'Scan 0xd8da6bf26964af9d7eed9e03e53415d37aa96045 for risky approvals',
    'Find infinite allowances on vitalik.eth',
    'Show me which protocols can still move my USDC'
  ],
  chat: [
    'What is a smart contract?',
    'Explain gas fees',
    'Compare L2 chains'
  ]
}

export default function RightRail(): JSX.Element {
  const { isConnected } = useAccount()
  const streaming = useChatStore((s) => s.streaming)
  const messages = useChatStore((s) => s.messages)
  const addMessage = useChatStore((s) => s.addMessage)
  const setStreaming = useChatStore((s) => s.setStreaming)
  const clearMessages = useChatStore((s) => s.clearMessages)
  const { activeWorkspace, activeThreadId, createThread, setActiveThread, updateThread } = useWorkspaceStore()
  const settings = useSettingsStore()
  const { activeSkillIds, activateSkill } = useSkillsStore()
  const activeScenario = useWeb3Store((s) => s.activeScenario)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent).detail?.text ?? ''
      setInput(text)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    window.addEventListener('opendesk:fill-input', handler)
    return () => window.removeEventListener('opendesk:fill-input', handler)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streaming])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    setError(null)

    const skillId = SCENARIO_SKILL[activeScenario]
    if (skillId) activateSkill(skillId)

    const userMsg = {
      id: genId(),
      role: 'user' as const,
      content: text,
      timestamp: Date.now()
    }
    addMessage(userMsg)
    setInput('')

    // ── Browser-mode path: run the web3 agent directly. ──────────────────
    // No Electron IPC, no LLM provider — just on-chain reads + a synthesized
    // reply. The full "AI agent" experience still works end-to-end in
    // standalone browser mode for the demo.
    if (!window.api?.chat?.send) {
      setStreaming(true)
      try {
        const reply = await runWeb3Agent(text, activeScenario)
        addMessage({
          id: genId(),
          role: 'assistant' as const,
          content: reply.content,
          timestamp: Date.now()
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setStreaming(false)
      }
      return
    }

    // ── Electron path: hand off to the main process. ────────────────────
    const ws = activeWorkspace()
    if (!ws) {
      setError('No active workspace')
      return
    }
    const provider = settings.activeProvider()
    if (!provider) {
      setError('No AI provider configured. Press ⌘, to set one up.')
      return
    }

    let threadId = activeThreadId
    if (!threadId) {
      const t = await createThread(ws.id, skillId || undefined)
      threadId = t?.id ?? null
      if (threadId) await setActiveThread(threadId)
    } else if (skillId) {
      await updateThread(threadId, { skillId })
    }

    setStreaming(true)

    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const payload: Record<string, unknown> = {
      messages: [userMsg],
      sessionId,
      threadId,
      mode: 'single',
      activeSkillIds: skillId ? Array.from(new Set([...activeSkillIds, skillId])) : activeSkillIds,
      providerId: provider.id
    }
    payload.workspaceId = ws.id

    try {
      window.api.chat.send(payload as never)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStreaming(false)
    }
  }, [input, streaming, activeScenario, activeWorkspace, activeThreadId, createThread, setActiveThread, updateThread, settings, activeSkillIds, activateSkill, addMessage, setStreaming])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleNewChat = () => {
    clearMessages()
  }

  return (
    <div className="relative w-[360px] flex flex-col h-full min-h-0 border-l" style={{ background: '#0e0e10', borderColor: '#1f1f23' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f23]">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center relative"
            style={{ background: 'rgba(29, 140, 128, 0.15)', border: '1px solid rgba(29, 140, 128, 0.3)' }}
          >
            <Bot size={13} className="text-[#1D8C80]" />
            {streaming && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400"
                style={{ boxShadow: '0 0 6px #34d399', animation: 'pulse 1s infinite' }}
              />
            )}
          </div>
          <div>
            <div className="text-[12px] font-bold text-white">AI Agent</div>
            <div className={`web3-label ${streaming ? 'web3-status-live' : isConnected ? 'web3-status-accent' : 'web3-text-muted'}`}>
              {streaming ? '● THINKING' : isConnected ? '● READY' : '● IDLE'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          className="rounded-md p-1.5 web3-text-muted hover:text-white hover:bg-[#1f1f23] transition-colors"
          title="New chat"
        >
          <Plus size={12} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && !streaming ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
            <Sparkles size={20} className="web3-status-accent mb-3" />
            <div className="text-[12px] web3-text-strong font-medium mb-1">Ready to act on-chain</div>
            <div className="text-[10.5px] web3-text-muted leading-relaxed mb-5 max-w-[280px]">
              Ask the agent to analyze addresses, simulate trades, scan approvals — or use a quick prompt below.
            </div>
            <div className="w-full space-y-1.5">
              {SCENARIO_PROMPTS[activeScenario].map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setInput(p)
                    setTimeout(() => inputRef.current?.focus(), 50)
                  }}
                  className="w-full text-left rounded-lg border border-[#1f1f23] bg-[#141416] hover:bg-[#1a1a1d] hover:border-[#1D8C80]/30 px-3 py-2 text-[11px] web3-text-body font-mono transition-colors"
                >
                  <span className="web3-status-accent">$</span> {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {streaming && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1D8C80]/20 bg-[#1D8C80]/5">
                <Loader2 size={12} className="web3-status-accent animate-spin" />
                <span className="web3-label web3-status-accent">Agent is thinking…</span>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-300">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
            <button type="button" onClick={() => setError(null)} className="text-red-300/60 hover:text-red-300">×</button>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#1f1f23]">
        <div
          className="rounded-xl border border-[#2a2a2e] bg-[#0e0e10] p-2"
          style={{ boxShadow: '0 0 20px rgba(29, 140, 128, 0.08)' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected
                ? 'Ask the agent… (Enter to send)'
                : 'Connect a wallet to start — or ask anything…'
            }
            rows={2}
            disabled={streaming}
            className="w-full bg-transparent outline-none resize-none text-[12px] text-white placeholder:web3-text-muted font-mono min-h-[44px] max-h-32"
          />
          <div className="flex items-center justify-between mt-1 px-1">
            <span className="web3-label web3-text-muted">
              {activeScenario !== 'chat' && `Skill: ${SCENARIO_SKILL[activeScenario]}`}
            </span>
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10.5px] font-bold text-white disabled:opacity-30 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #1D8C80, #0d6e63)',
                boxShadow: '0 2px 8px rgba(29, 140, 128, 0.25)'
              }}
            >
              {streaming ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ role, content }: { role: string; content: string }): JSX.Element {
  if (role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl rounded-br-md px-3 py-2 bg-[#1D8C80]/15 border border-[#1D8C80]/25 text-[12px] web3-text-strong font-mono ml-8"
      >
        {content}
      </motion.div>
    )
  }
  if (role === 'assistant') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl rounded-bl-md px-3 py-2 bg-[#16161a] border border-[#2a2a2e] text-[12px] web3-text-body leading-relaxed mr-8 whitespace-pre-wrap"
      >
        {content}
      </motion.div>
    )
  }
  return <div className="web3-label web3-text-muted text-center">{content}</div>
}
