import { motion, AnimatePresence } from 'framer-motion'
import { useWorkspaceStore } from '../../store/workspace'
import { Save, MessageSquarePlus, X } from 'lucide-react'

export default function FileEditorPanel() {
  const {
    selectedFile,
    fileContent,
    fileSaveStatus,
    fileReadError,
    setFileContent,
    saveSelectedFile,
    selectFile
  } = useWorkspaceStore()

  if (!selectedFile) {
    return null
  }

  const fileName = selectedFile.split('/').pop() || selectedFile

  const handleReference = () => {
    window.dispatchEvent(
      new CustomEvent('opendesk:reference-file', {
        detail: { path: selectedFile, name: fileName }
      })
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
        className="absolute top-0 bottom-0 right-0 flex flex-col bg-[var(--bg-content)] border-l border-[var(--border)] shadow-2xl z-20"
        style={{ width: 420, maxWidth: 'calc(100vw - 560px)' }}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] shrink-0">
          <span className="text-xs text-[var(--text-muted)] truncate flex-1 min-w-0" title={selectedFile}>
            {selectedFile}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReference}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] transition-colors"
            >
              <MessageSquarePlus size={12} />
              Reference
            </button>
            <button
              type="button"
              onClick={() => saveSelectedFile()}
              disabled={fileSaveStatus === 'saving'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-60"
            >
              <Save size={12} />
              {fileSaveStatus === 'saved' ? 'Saved' : fileSaveStatus === 'saving' ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => selectFile(null)}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
              title="Close editor"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {fileReadError && (
          <div className="px-4 py-1.5 bg-[var(--error-bg)]/50 text-[var(--error)] text-[11px] shrink-0">
            {fileReadError}
          </div>
        )}

        {fileSaveStatus === 'error' && (
          <div className="px-4 py-1.5 bg-[var(--error-bg)]/50 text-[var(--error)] text-[11px] shrink-0">
            Failed to save file
          </div>
        )}

        <textarea
          className="flex-1 w-full p-4 bg-transparent outline-none resize-none font-mono text-[13px] text-[var(--text-primary)] leading-relaxed"
          value={fileContent}
          onChange={(e) => setFileContent(e.target.value)}
          spellCheck={false}
        />
      </motion.div>
    </AnimatePresence>
  )
}
