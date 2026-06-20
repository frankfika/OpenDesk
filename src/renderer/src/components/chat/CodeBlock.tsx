import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Eye, Download, Terminal, Play } from 'lucide-react'
import { useToast } from '../../store/toast'
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

const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh'])

interface CodeBlockProps {
  code: string
  language?: string
  onPreview?: () => void
  filename?: string
}

export default function CodeBlock({ code, language, onPreview, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [runOutput, setRunOutput] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const toast = useToast()
  const codeRef = useRef<HTMLElement>(null)
  const isShell = language ? SHELL_LANGS.has(language.toLowerCase()) : false

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

  const handleRunShell = useCallback(async () => {
    if (!window.api?.tools) return
    setRunning(true)
    setRunOutput(null)
    try {
      // Use tools:writeFile + shell execution via IPC
      // We can use the existing applyPatch or a new shell route
      // For now, show a "copy to run" prompt — real execution needs shell IPC
      const lines = code
        .trim()
        .split('\n')
        .filter((l) => l.trim() && !l.trim().startsWith('#'))
      if (lines.length === 0) {
        setRunning(false)
        return
      }
      // Dispatch event so InputBar can pick it up
      window.dispatchEvent(
        new CustomEvent('opendesk:fill-input', {
          detail: { text: lines.join('\n') }
        })
      )
      toast.success('Command sent to input')
    } catch (e) {
      setRunOutput(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setRunning(false)
    }
  }, [code, toast])

  return (
    <div className="relative group/code my-3 text-sm font-mono rounded-lg overflow-hidden border border-[var(--border)] shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-sidebar)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          {isShell && <Terminal size={11} className="text-[var(--text-muted)]" />}
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
          {isShell && (
            <button
              onClick={handleRunShell}
              disabled={running}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-[var(--success)] hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
              title="Send to input"
            >
              <Play size={12} />
              <span>Run</span>
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

      {runOutput && (
        <div className="border-t border-[var(--border)] px-4 py-3 bg-black/5 font-mono text-[12px] text-[var(--text-secondary)] whitespace-pre-wrap max-h-[200px] overflow-y-auto">
          {runOutput}
        </div>
      )}
    </div>
  )
}
