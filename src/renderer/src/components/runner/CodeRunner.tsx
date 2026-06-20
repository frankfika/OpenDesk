import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Square, Trash2, Copy, Terminal, Code2, FileCode } from 'lucide-react'
import { cn } from '../../lib/utils'

interface CodeBlock {
  id: string
  language: 'python' | 'javascript' | 'typescript' | 'shell'
  code: string
  output: string
  status: 'idle' | 'running' | 'success' | 'error'
  executionTime?: number
}

const LANGUAGE_CONFIG = {
  python: { icon: Code2, label: 'Python', runner: 'python3' },
  javascript: { icon: FileCode, label: 'JavaScript', runner: 'node' },
  typescript: { icon: FileCode, label: 'TypeScript', runner: 'tsx' },
  shell: { icon: Terminal, label: 'Shell', runner: 'bash' }
}

// Security whitelist for safe execution (future use)
const _ALLOWED_IMPORTS: Record<string, string[]> = {
  python: [
    'math',
    'json',
    'random',
    'datetime',
    're',
    'string',
    'statistics',
    'itertools',
    'collections',
    'functools',
    'typing',
    'os.path',
    'pathlib'
  ],
  javascript: [],
  typescript: [],
  shell: []
}

const MAX_EXECUTION_TIME = 30000 // 30 seconds
const MAX_OUTPUT_LENGTH = 10000

function validateCode(code: string, _language: string): { valid: boolean; error?: string } {
  // Check for dangerous patterns
  const dangerousPatterns = [
    /rm\s+-rf\s+\//,
    /:\(\)\{\s*:\|:\s*\&\s*\};\s*:\)/, // Fork bomb
    /import\s+os\s*;\s*os\.system/,
    /eval\s*\(/,
    /exec\s*\(/,
    /subprocess\.call\s*\(/,
    /child_process/,
    /require\s*\(\s*['"]fs['"]\)/,
    /require\s*\(\s*['"]child_process['"]\)/,
    /process\.exit/,
    /while\s*\(\s*true\s*\)/,
    /for\s*\(\s*;\s*;\s*\)/
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return { valid: false, error: `Blocked dangerous pattern: ${pattern.source}` }
    }
  }

  return { valid: true }
}

export default function CodeRunner() {
  const [blocks, setBlocks] = useState<CodeBlock[]>([])
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)

  const addBlock = useCallback((language: CodeBlock['language'] = 'python') => {
    const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newBlock: CodeBlock = {
      id,
      language,
      code: '',
      output: '',
      status: 'idle'
    }
    setBlocks((prev) => [...prev, newBlock])
    setActiveBlockId(id)
  }, [])

  const updateBlock = useCallback((id: string, updates: Partial<CodeBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)))
  }, [])

  const removeBlock = useCallback(
    (id: string) => {
      setBlocks((prev) => prev.filter((b) => b.id !== id))
      if (activeBlockId === id) {
        setActiveBlockId(null)
      }
    },
    [activeBlockId]
  )

  const runBlock = useCallback(
    async (block: CodeBlock) => {
      const validation = validateCode(block.code, block.language)
      if (!validation.valid) {
        updateBlock(block.id, { status: 'error', output: `Security Error: ${validation.error}` })
        return
      }

      updateBlock(block.id, { status: 'running', output: 'Running...' })
      const startTime = Date.now()

      try {
        // In Electron, we can execute via IPC to main process
        // In browser mode, show a mock result
        if (window.api?.tools) {
          // Try to execute via shell tool (if available and safe)
          const runner = LANGUAGE_CONFIG[block.language].runner
          const tempFile = `/tmp/opendesk-runner-${block.id}.${block.language === 'python' ? 'py' : block.language === 'shell' ? 'sh' : 'js'}`

          // Write code to temp file
          await window.api.tools.writeFile(tempFile, block.code)

          // Execute with timeout
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Execution timed out after 30s')), MAX_EXECUTION_TIME)
          )

          const execPromise = window.api.tools.executeShell
            ? window.api.tools.executeShell(runner, [tempFile], { timeout: MAX_EXECUTION_TIME })
            : Promise.resolve({ stdout: 'Code execution requires shell tools to be enabled.', stderr: '' })

          const result = (await Promise.race([execPromise, timeoutPromise])) as {
            stdout?: string
            stderr?: string
          }

          const output = (result.stdout || '') + (result.stderr ? `\n[stderr]: ${result.stderr}` : '')
          const truncated =
            output.length > MAX_OUTPUT_LENGTH ? output.slice(0, MAX_OUTPUT_LENGTH) + '\n... (output truncated)' : output

          updateBlock(block.id, {
            status: 'success',
            output: truncated || '(no output)',
            executionTime: Date.now() - startTime
          })
        } else {
          // Browser mode - simulate execution
          await new Promise((r) => setTimeout(r, 500))
          const lines = block.code.split('\n').filter((l) => l.trim())
          const mockOutput =
            lines.map((l, i) => `[${i + 1}] ${l.trim()}`).join('\n') + '\n\nExecution completed (browser mode).'
          updateBlock(block.id, {
            status: 'success',
            output: mockOutput,
            executionTime: Date.now() - startTime
          })
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        updateBlock(block.id, {
          status: 'error',
          output: `Error: ${errorMsg}`,
          executionTime: Date.now() - startTime
        })
      }
    },
    [updateBlock]
  )

  const copyOutput = useCallback(async (output: string) => {
    await navigator.clipboard.writeText(output)
  }, [])

  return (
    <div className="flex flex-col h-full bg-[var(--bg-content)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Code Runner</h2>
          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-sidebar)] px-1.5 py-0.5 rounded border border-[var(--border)]">
            Beta
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {(Object.keys(LANGUAGE_CONFIG) as CodeBlock['language'][]).map((lang) => {
            const config = LANGUAGE_CONFIG[lang]
            const Icon = config.icon
            return (
              <button
                key={lang}
                type="button"
                onClick={() => addBlock(lang)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border border-[var(--border)] hover:bg-[var(--bg-sidebar)] text-[var(--text-secondary)]"
                title={`Add ${config.label} block`}
              >
                <Icon size={12} />
                {config.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Blocks list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {blocks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Terminal size={32} className="text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">No code blocks yet</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Click a language button above to start coding</p>
          </div>
        )}

        <AnimatePresence>
          {blocks.map((block) => {
            const config = LANGUAGE_CONFIG[block.language]
            const Icon = config.icon
            const isActive = activeBlockId === block.id

            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'rounded-xl border transition-all overflow-hidden',
                  isActive ? 'border-[var(--accent)]/30 shadow-sm' : 'border-[var(--border)]'
                )}
              >
                {/* Block header */}
                <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-sidebar)]/50 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <Icon size={13} className="text-[var(--text-muted)]" />
                    <span className="text-[11px] font-medium text-[var(--text-secondary)] uppercase">
                      {config.label}
                    </span>
                    {block.executionTime && (
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">{block.executionTime}ms</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {block.status === 'running' ? (
                      <button
                        type="button"
                        onClick={() => updateBlock(block.id, { status: 'idle' })}
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error-bg)] transition-colors"
                        aria-label="Stop execution"
                      >
                        <Square size={13} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => runBlock(block)}
                        disabled={!block.code.trim() || block.status === 'running'}
                        className={cn(
                          'p-1.5 rounded-md transition-colors',
                          block.code.trim()
                            ? 'text-[var(--success)] hover:bg-[var(--success-bg)]'
                            : 'text-[var(--text-muted)] opacity-50'
                        )}
                        aria-label="Run code"
                      >
                        <Play size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error-bg)] transition-colors"
                      aria-label="Remove block"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Code editor */}
                <div className="flex">
                  <div className="w-8 bg-[var(--bg-sidebar)]/30 border-r border-[var(--border)] py-2 text-right pr-1 select-none">
                    {block.code.split('\n').map((_, i) => (
                      <div key={i} className="text-[10px] text-[var(--text-muted)] leading-5">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={block.code}
                    onChange={(e) => updateBlock(block.id, { code: e.target.value })}
                    onFocus={() => setActiveBlockId(block.id)}
                    className="flex-1 bg-transparent p-2 text-[13px] font-mono leading-5 text-[var(--text-primary)] resize-none outline-none min-h-[80px]"
                    placeholder={`Enter ${config.label} code...`}
                    spellCheck={false}
                  />
                </div>

                {/* Output */}
                <AnimatePresence>
                  {block.output && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-[var(--border)]"
                    >
                      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-sidebar)]/30">
                        <span
                          className={cn(
                            'text-[10px] font-medium uppercase',
                            block.status === 'error' && 'text-[var(--error)]',
                            block.status === 'success' && 'text-[var(--success)]'
                          )}
                        >
                          {block.status === 'running' ? 'Running...' : block.status === 'error' ? 'Error' : 'Output'}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyOutput(block.output)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          aria-label="Copy output"
                        >
                          <Copy size={11} />
                        </button>
                      </div>
                      <pre
                        className={cn(
                          'p-3 text-[12px] font-mono leading-relaxed max-h-[300px] overflow-y-auto',
                          block.status === 'error' ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'
                        )}
                      >
                        {block.output}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
