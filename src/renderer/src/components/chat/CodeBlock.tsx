import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Eye, Download } from 'lucide-react'
import { useToast } from '../../store/toast'

interface CodeBlockProps {
  code: string
  language?: string
  onPreview?: () => void
}

export default function CodeBlock({ code, language, onPreview }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('Code copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy:', e)
      toast.error('Failed to copy code')
    }
  }, [code, toast])

  const handleDownload = useCallback(() => {
    const ext = language ? `.${language}` : '.txt'
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `snippet${ext}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('File downloaded')
  }, [code, language, toast])

  return (
    <div className="relative group/code my-3">
      {/* Floating header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-sidebar)]/80 border border-[var(--border)] rounded-t-lg backdrop-blur-sm">
        {/* Language pill */}
        <span className="text-[10px] font-mono font-medium text-[var(--text-muted)] uppercase px-2 py-0.5 rounded-full bg-[var(--bg-content)]/60 border border-[var(--border)]">
          {language || 'text'}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          {onPreview && (
            <motion.button
              onClick={onPreview}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]"
              title="Preview artifact"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Eye size={12} />
              <span>Preview</span>
            </motion.button>
          )}
          <motion.button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]"
            title="Download as file"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={12} />
            <span>Save</span>
          </motion.button>
          <motion.button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]"
            title="Copy code"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="copied"
                  className="flex items-center gap-1 text-green-600"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                >
                  <Check size={12} />
                  <span>Copied!</span>
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  className="flex items-center gap-1"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                >
                  <Copy size={12} />
                  <span>Copy</span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
      <pre className="!rounded-t-none !mt-0 !border-t-0">
        <code>{code}</code>
      </pre>
    </div>
  )
}
