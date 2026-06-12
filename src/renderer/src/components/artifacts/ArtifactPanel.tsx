import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, PanelRightClose, PanelRightOpen, GripVertical
} from 'lucide-react'
import { useArtifactsStore, type Artifact } from '../../store/artifacts'
import ArtifactRenderer, { ArtifactTypeIcon } from './ArtifactRenderer'

interface ArtifactPanelProps {
  className?: string
}

export default function ArtifactPanel({ className = '' }: ArtifactPanelProps) {
  const { artifacts, activeId, panelOpen, setActive, removeArtifact, togglePanel, setPanelOpen } = useArtifactsStore()
  const activeArtifact = artifacts.find(a => a.id === activeId)
  const [width, setWidth] = useState(480)
  const [isResizing, setIsResizing] = useState(false)
  const [tabChanging, setTabChanging] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(280, Math.min(800, window.innerWidth - e.clientX))
      setWidth(newWidth)
    }
    const handleMouseUp = () => setIsResizing(false)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const handleSetActive = useCallback((id: string) => {
    setTabChanging(true)
    setActive(id)
    setTimeout(() => setTabChanging(false), 200)
  }, [setActive])

  if (!panelOpen) {
    return (
      <motion.button
        onClick={() => setPanelOpen(true)}
        className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--bg-sidebar)]/50 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-all ${className}`}
        title="Show artifacts"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <PanelRightOpen size={16} />
      </motion.button>
    )
  }

  return (
    <motion.div
      ref={panelRef}
      className={`shrink-0 flex flex-col h-full border-l border-[var(--border)] bg-[var(--bg-content)] backdrop-blur-xl relative ${className}`}
      style={{ width }}
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1.0] }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-[var(--accent)]/20 transition-colors"
      />
      <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 p-0.5 rounded bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-muted)] cursor-col-resize z-20">
        <GripVertical size={10} />
      </div>

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-primary)]">Artifacts</span>
          {artifacts.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-sidebar)] text-[var(--text-muted)] border border-[var(--border)]">
              {artifacts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={togglePanel}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
            title="Hide panel"
          >
            <PanelRightClose size={14} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      {artifacts.length > 0 && (
        <div className="shrink-0 flex items-center gap-1 px-2 py-1.5 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/20 overflow-x-auto">
          {artifacts.map(art => (
            <button
              key={art.id}
              onClick={() => handleSetActive(art.id)}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all border ${
                activeId === art.id
                  ? 'bg-[var(--bg-sidebar)] text-[var(--text-primary)] border-[var(--border-strong)] shadow-sm'
                  : 'bg-transparent text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-sidebar)]/60 hover:text-[var(--text-secondary)]'
              }`}
            >
              <ArtifactTypeIcon type={art.type} size={12} />
              <span className="max-w-[100px] truncate">{art.title}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  removeArtifact(art.id)
                }}
                className="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-500 transition-all"
              >
                <X size={10} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeArtifact ? (
            <motion.div
              key={activeArtifact.id}
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArtifactRenderer
                type={activeArtifact.type}
                content={activeArtifact.content}
                title={activeArtifact.title}
              />
            </motion.div>
          ) : artifacts.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-3 px-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PanelRightOpen size={32} className="opacity-30" />
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">No artifacts yet</p>
                <p className="text-[11px] leading-relaxed">
                  When the AI generates HTML, React, Mermaid, SVG, or Markdown code blocks, click <strong>Preview</strong> to open them here.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-3 px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <ArtifactTypeIcon type="code" size={32} />
              <p className="text-sm font-medium text-[var(--text-secondary)]">Select an artifact to view</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
