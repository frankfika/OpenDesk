import { useWorkspaceStore, type DirectoryNode } from '../../store/workspace'
import { Folder, FileText, RefreshCw, ChevronRight, ChevronDown, MessageSquarePlus } from 'lucide-react'

function TreeNode({ node, depth }: { node: DirectoryNode; depth: number }) {
  const { selectedFile, selectFile, toggleExpandedPath, expandedPaths } = useWorkspaceStore()
  const isExpanded = expandedPaths.has(node.path)
  const paddingLeft = depth * 16 + 12

  const handleReference = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.dispatchEvent(
      new CustomEvent('opendesk:reference-file', {
        detail: { path: node.path, name: node.name }
      })
    )
  }

  return (
    <div>
      <div className="group relative flex items-center">
        <button
          type="button"
          onClick={() => {
            if (node.isDirectory) {
              toggleExpandedPath(node.path)
            } else {
              selectFile(node.path)
            }
          }}
          className={`flex items-center gap-2 w-full py-1.5 pr-8 text-left text-[13px] transition-colors ${
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
                toggleExpandedPath(node.path)
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
          <span className="flex-1 truncate">{node.name}</span>
        </button>
        {!node.isDirectory && (
          <button
            type="button"
            onClick={handleReference}
            className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-all"
            title="Reference in chat"
          >
            <MessageSquarePlus size={12} />
          </button>
        )}
      </div>
      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FileTree() {
  const {
    activeWorkspace,
    fileTree,
    fileTreeLoading,
    fileTreeError,
    totalFiles,
    loadFileTree
  } = useWorkspaceStore()

  const workspace = activeWorkspace()

  if (!workspace) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 text-[var(--text-muted)] text-xs text-center">
        Open a workspace to browse files
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--text-primary)] truncate">
            {workspace.name || workspace.folderPath.split('/').pop()}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] truncate">{workspace.folderPath}</p>
        </div>
        <button
          type="button"
          onClick={() => loadFileTree()}
          disabled={fileTreeLoading}
          className="shrink-0 p-1.5 rounded-md hover:bg-[var(--border)] text-[var(--text-muted)] disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={14} className={fileTreeLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {fileTreeError && (
        <div className="px-3 py-2 bg-[var(--error-bg)]/50 text-[var(--error)] text-[11px] shrink-0">
          {fileTreeError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {fileTreeLoading && fileTree.length === 0 ? (
          <div className="p-3 text-[var(--text-muted)] text-xs">Loading…</div>
        ) : fileTree.length === 0 ? (
          <div className="p-3 text-[var(--text-muted)] text-xs">Empty directory</div>
        ) : (
          <div className="flex flex-col">
            {fileTree.map((node) => (
              <TreeNode key={node.path} node={node} depth={0} />
            ))}
            {totalFiles >= 1000 && (
              <div className="px-3 py-2 text-[11px] text-[var(--text-muted)]">
                Showing up to 1000 files. Deep directories truncated.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
