import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Eye, Download, Play, Loader2 } from 'lucide-react'
import { useToast } from '../../store/toast'
import {
  useCodeExecution,
  normalizeExecutableLanguage,
  LANGUAGE_CONFIG
} from '../../hooks/useCodeExecution'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import rust from 'highlight.js/lib/languages/rust'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('tsx', typescript)
hljs.registerLanguage('jsx', javascript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('zsh', bash)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('rs', rust)
hljs.registerLanguage('go', go)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c', cpp)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)

interface CodeBlockProps {
  id?: string
  code: string
  language?: string
  onPreview?: () => void
  filename?: string
}

export default function CodeBlock({ id, code, language, onPreview, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  const codeRef = useRef<HTMLElement>(null)
  const [stableBlockId] = useState(() => id ?? `codeblock-${crypto.randomUUID()}`)
  const executableLang = normalizeExecutableLanguage(language)
  const { outputs, execute } = useCodeExecution()
  const runState = outputs[stableBlockId] ?? { output: '', status: 'idle' as const }
  const isRunning = runState.status === 'running'

  useEffect(() => {
    if (!codeRef.current) return
    const lang = language?.toLowerCase()
    if (lang && hljs.getLanguage(lang)) {
      try {
        const result = hljs.highlight(code, { language: lang })
        codeRef.current.innerHTML = result.value
      } catch {
        codeRef.current.textContent = code
      }
    } else {
      // Auto-detect
      try {
        const result = hljs.highlightAuto(code, [
          'javascript',
          'typescript',
          'python',
          'bash',
          'json',
          'yaml',
          'html',
          'css',
          'sql',
          'go',
          'rust'
        ])
        codeRef.current.innerHTML = result.value
      } catch {
        codeRef.current.textContent = code
      }
    }
  }, [code, language])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy code')
    }
  }, [code, toast])

  const handleDownload = useCallback(() => {
    const ext = language ? `.${language}` : '.txt'
    const name = filename || `snippet${ext}`
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }, [code, language, filename])

  const handleRun = useCallback(async () => {
    if (!executableLang) return
    await execute(stableBlockId, code, executableLang)
  }, [stableBlockId, code, executableLang, execute])

  const handleCopyOutput = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(runState.output)
      toast.success('Output copied')
    } catch {
      toast.error('Failed to copy output')
    }
  }, [runState.output, toast])

  return (
    <div className="relative group/code my-3 text-sm font-mono rounded-lg overflow-hidden border border-[var(--border)] shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-sidebar)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          {executableLang && <Play size={11} className="text-[var(--text-muted)]" />}
          {filename ? (
            <span className="text-[11px] font-sans text-[var(--text-secondary)] truncate max-w-[240px]">
              {filename}
            </span>
          ) : (
            <span className="text-[10px] font-mono font-medium text-[var(--text-muted)] uppercase">
              {language || 'text'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {onPreview && (
            <button
              onClick={onPreview}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
              title="Preview"
            >
              <Eye size={12} />
              <span>Preview</span>
            </button>
          )}
          {executableLang && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors disabled:opacity-50 text-[var(--success)] hover:bg-emerald-500/10"
              title={`Run ${LANGUAGE_CONFIG[executableLang].label}`}
            >
              {isRunning ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={12} />
              )}
              <span>{isRunning ? 'Running' : 'Run'}</span>
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            title="Save"
          >
            <Download size={12} />
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            title="Copy"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="ok"
                  className="flex items-center gap-1 text-[var(--success)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Check size={12} />
                  <span>Copied</span>
                </motion.span>
              ) : (
                <motion.span
                  key="cp"
                  className="flex items-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Copy size={12} />
                  <span>Copy</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          {runState.output && (
            <button
              onClick={handleCopyOutput}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
              title="Copy output"
            >
              <Copy size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Code body */}
      <div className="overflow-x-auto bg-[var(--bg-sidebar)]/40">
        <pre className="p-4 m-0 text-[13px] leading-relaxed overflow-visible whitespace-pre">
          <code ref={codeRef} className={`hljs language-${language || ''}`}>
            {code}
          </code>
        </pre>
      </div>

      {runState.output && (
        <div className="border-t border-[var(--border)]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-sidebar)]/30">
            <span
              className={`text-[10px] font-medium uppercase ${
                runState.status === 'error'
                  ? 'text-[var(--error)]'
                  : runState.status === 'success'
                    ? 'text-[var(--success)]'
                    : 'text-[var(--text-muted)]'
              }`}
            >
              {runState.status === 'running'
                ? 'Running...'
                : runState.status === 'error'
                  ? 'Error'
                  : 'Output'}
            </span>
            {runState.executionTime && (
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                {runState.executionTime}ms
              </span>
            )}
          </div>
          <pre
            className={`p-3 text-[12px] font-mono leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap ${
              runState.status === 'error' ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'
            }`}
          >
            {runState.output}
          </pre>
        </div>
      )}
    </div>
  )
}
