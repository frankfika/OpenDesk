import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useWorkspaceStore } from '../../store/workspace'
import { Folder, FileText, Save, X, RefreshCw, MessageSquarePlus } from 'lucide-react'

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  mtime: number
}

interface FilePanelProps {
  onClose: () => void
}

export default function FilePanel({ onClose }: FilePanelProps) {
  const { activeWorkspace } = useWorkspaceStore()
  const workspace = activeWorkspace()
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [currentPath, setCurrentPath] = useState(workspace?.folderPath || '')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const listFiles = useCallback(async (path: string) => {
    if (!window.api?.tools?.listDirectory) return
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.tools.listDirectory(path)
      if (result.success && result.entries) {
        setEntries(result.entries.sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1)))
        setCurrentPath(path)
      } else {
        setError(result.error || 'Failed to list directory')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (workspace?.folderPath) {
      listFiles(workspace.folderPath)
    }
  }, [workspace?.folderPath, listFiles])

  async function handleReadFile(path: string) {
    if (!window.api?.tools?.readFile) return
    setSelectedFile(path)
    setSaveStatus('idle')
    setError(null)
    try {
      const result = await window.api.tools.readFile(path)
      if (result.success) {
        setFileContent(result.content || '')
      } else {
        setError(result.error || 'Failed to read file')
        setFileContent('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setFileContent('')
    }
  }

  async function handleSaveFile() {
    if (!selectedFile || !window.api?.tools?.writeFile) return
    setSaveStatus('saving')
    try {
      const result = await window.api.tools.writeFile(selectedFile, fileContent)
      if (result.success) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 1500)
      } else {
        setError(result.error || 'Failed to save file')
        setSaveStatus('error')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaveStatus('error')
    }
  }

  function handleReferenceInChat() {
    if (!selectedFile) return
    window.dispatchEvent(new CustomEvent('opendesk:reference-file', {
      detail: { path: selectedFile, name: selectedFile.split('/').pop() || selectedFile }
    }))
    onClose()
  }

  function handleEntryClick(entry: FileEntry) {
    if (entry.isDirectory) {
      listFiles(entry.path)
      setSelectedFile(null)
      setFileContent('')
    } else {
      handleReadFile(entry.path)
    }
  }

  function navigateUp() {
    const parts = currentPath.split('/')
    parts.pop()
    const parent = parts.join('/') || '/'
    if (workspace && parent.startsWith(workspace.folderPath)) {
      listFiles(parent)
    } else if (workspace) {
      listFiles(workspace.folderPath)
    }
  }

  if (!workspace) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg-content)]/95 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold">Files</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--border)] text-[var(--text-muted)]">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
          Open a workspace to browse files
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-[var(--bg-content)] flex flex-col"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Folder size={18} className="text-[var(--text-muted)] shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{workspace.name || workspace.folderPath.split('/').pop()}</h2>
            <p className="text-[11px] text-[var(--text-muted)] truncate">{currentPath}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => listFiles(currentPath)}
            className="p-1.5 rounded-md hover:bg-[var(--border)] text-[var(--text-muted)]"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[var(--border)] text-[var(--text-muted)]">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Breadcrumb / up */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-[var(--border)] shrink-0">
        <button
          onClick={navigateUp}
          disabled={currentPath === workspace.folderPath}
          className="text-[11px] px-2 py-1 rounded bg-[var(--bg-sidebar)] text-[var(--text-secondary)] disabled:opacity-40 hover:text-[var(--text-primary)]"
        >
          ↑ Up
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-2 bg-red-50/50 dark:bg-red-950/20 text-red-600 text-xs shrink-0">
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* File list */}
        <div className="w-1/3 min-w-[240px] border-r border-[var(--border)] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-[var(--text-muted)] text-xs">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="p-4 text-[var(--text-muted)] text-xs">Empty directory</div>
          ) : (
            <div className="flex flex-col">
              {entries.map((entry) => (
                <button
                  key={entry.path}
                  onClick={() => handleEntryClick(entry)}
                  className={`flex items-center gap-2 px-4 py-2 text-left text-[13px] transition-colors ${
                    selectedFile === entry.path
                      ? 'bg-[var(--accent)]/10 text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)]'
                  }`}
                >
                  {entry.isDirectory ? (
                    <Folder size={14} className="text-[var(--text-muted)] shrink-0" />
                  ) : (
                    <FileText size={14} className="text-[var(--text-muted)] shrink-0" />
                  )}
                  <span className="truncate">{entry.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedFile ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] shrink-0">
                <span className="text-xs text-[var(--text-muted)] truncate">{selectedFile}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReferenceInChat}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] transition-colors"
                  >
                    <MessageSquarePlus size={12} />
                    Reference
                  </button>
                  <button
                    onClick={handleSaveFile}
                    disabled={saveStatus === 'saving'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <Save size={12} />
                    {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
              <textarea
                className="flex-1 w-full p-4 bg-transparent outline-none resize-none font-mono text-[13px] text-[var(--text-primary)] leading-relaxed"
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                spellCheck={false}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
              Select a file to view or edit
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
