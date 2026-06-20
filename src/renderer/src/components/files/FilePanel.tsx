import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useWorkspaceStore } from '../../store/workspace'
import { Folder, FileText, Save, X, RefreshCw, MessageSquarePlus, ChevronRight, ChevronDown } from 'lucide-react'

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  mtime: number
}

interface DirectoryNode {
  name: string
  path: string
  isDirectory: boolean
  children?: DirectoryNode[]
  expanded?: boolean
}

interface FilePanelProps {
  onClose: () => void
}

const MAX_DEPTH = 3
const MAX_FILES = 200

async function buildTreeRecursively(
  path: string,
  depth: number,
  countRef: { value: number }
): Promise<DirectoryNode[]> {
  if (depth > MAX_DEPTH || countRef.value > MAX_FILES) return []
  if (!window.api?.tools?.listDirectory) return []

  try {
    const result = await window.api.tools.listDirectory(path)
    if (!result.success || !result.entries) return []

    const sorted = result.entries.sort((a: FileEntry, b: FileEntry) =>
      a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1
    )

    const nodes: DirectoryNode[] = []

    for (const entry of sorted) {
      if (!entry.isDirectory) {
        countRef.value++
        if (countRef.value > MAX_FILES) break
      }

      const node: DirectoryNode = {
        name: entry.name,
        path: entry.path,
        isDirectory: entry.isDirectory,
        expanded: depth === 0
      }

      if (entry.isDirectory && depth < MAX_DEPTH) {
        node.children = await buildTreeRecursively(entry.path, depth + 1, countRef)
      }

      nodes.push(node)
    }

    return nodes
  } catch {
    return []
  }
}

function TreeNode({
  node,
  depth,
  selectedFile,
  onSelectFile,
  expandedPaths,
  onToggleExpand
}: {
  node: DirectoryNode
  depth: number
  selectedFile: string | null
  onSelectFile: (path: string) => void
  expandedPaths: Set<string>
  onToggleExpand: (path: string) => void
}) {
  const isExpanded = expandedPaths.has(node.path)
  const paddingLeft = depth * 16 + 12

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (node.isDirectory) {
            onToggleExpand(node.path)
          } else {
            onSelectFile(node.path)
          }
        }}
        className={`flex items-center gap-2 w-full py-2 text-left text-[13px] transition-colors ${
          selectedFile === node.path
            ? 'bg-[var(--accent)]/10 text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)]'
        }`}
        style={{ paddingLeft }}
      >
        {node.isDirectory ? (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(node.path)
            }}
            className="shrink-0 text-[var(--text-muted)] cursor-pointer"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span className="w-[14px] shrink-0" />
        )}
        {node.isDirectory ? (
          <Folder size={14} className="text-[var(--text-muted)] shrink-0" />
        ) : (
          <FileText size={14} className="text-[var(--text-muted)] shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FilePanel({ onClose }: FilePanelProps) {
  const workspace = useWorkspaceStore((state) => state.activeWorkspace())
  const [treeRoot, setTreeRoot] = useState<DirectoryNode[]>([])
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [totalFiles, setTotalFiles] = useState(0)
  const [currentPath, setCurrentPath] = useState(workspace?.folderPath || '')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const loadTree = useCallback(async () => {
    if (!workspace?.folderPath) return
    setLoading(true)
    setError(null)
    try {
      const countRef = { value: 0 }
      const nodes = await buildTreeRecursively(workspace.folderPath, 0, countRef)
      setTreeRoot(nodes)
      setTotalFiles(countRef.value)
      setCurrentPath(workspace.folderPath)

      // Auto-expand all directories that have children
      const paths = new Set<string>()
      function collectDirPaths(nodes: DirectoryNode[]) {
        for (const n of nodes) {
          if (n.isDirectory && n.children && n.children.length > 0) {
            paths.add(n.path)
            collectDirPaths(n.children)
          }
        }
      }
      collectDirPaths(nodes)
      setExpandedPaths(paths)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [workspace?.folderPath])

  useEffect(() => {
    if (workspace?.folderPath) {
      loadTree()
    }
  }, [workspace?.folderPath, loadTree])

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
      const result = await window.api.tools.writeFile(selectedFile, fileContent, workspace.folderPath)
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
    window.dispatchEvent(
      new CustomEvent('opendesk:reference-file', {
        detail: { path: selectedFile, name: selectedFile.split('/').pop() || selectedFile }
      })
    )
    onClose()
  }

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  if (!workspace) {
    return (
      <div className="flex flex-col h-full bg-[var(--bg-content)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold">Files</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--border)] text-[var(--text-muted)]"
          >
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
      className="flex flex-col h-full bg-[var(--bg-content)]"
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
            <h2 className="text-sm font-semibold truncate">
              {workspace.name || workspace.folderPath.split('/').pop()}
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] truncate">{currentPath}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadTree}
            className="p-1.5 rounded-md hover:bg-[var(--border)] text-[var(--text-muted)]"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--border)] text-[var(--text-muted)]"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="px-5 py-2 bg-[var(--error-bg)]/50 dark:bg-red-950/20 text-[var(--error)] text-xs shrink-0">{error}</div>}

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Tree view */}
        <div className="w-1/3 min-w-[240px] border-r border-[var(--border)] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-[var(--text-muted)] text-xs">Loading…</div>
          ) : treeRoot.length === 0 ? (
            <div className="p-4 text-[var(--text-muted)] text-xs">Empty directory</div>
          ) : (
            <div className="flex flex-col">
              {treeRoot.map((node) => (
                <TreeNode
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedFile={selectedFile}
                  onSelectFile={handleReadFile}
                  expandedPaths={expandedPaths}
                  onToggleExpand={toggleExpand}
                />
              ))}
              {totalFiles >= MAX_FILES && (
                <div className="px-4 py-2 text-[11px] text-[var(--text-muted)]">
                  Showing up to {MAX_FILES} files. Deep directories truncated.
                </div>
              )}
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
                    type="button"
                    onClick={handleReferenceInChat}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] transition-colors"
                  >
                    <MessageSquarePlus size={12} />
                    Reference
                  </button>
                  <button
                    type="button"
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
