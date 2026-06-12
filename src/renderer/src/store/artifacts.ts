import { create } from 'zustand'

export type ArtifactType = 'html' | 'react' | 'mermaid' | 'svg' | 'code' | 'markdown'

export interface Artifact {
  id: string
  type: ArtifactType
  title: string
  content: string
  createdAt: number
}

interface ArtifactsState {
  artifacts: Artifact[]
  activeId: string | null
  panelOpen: boolean

  addArtifact: (artifact: Omit<Artifact, 'id' | 'createdAt'>) => string
  removeArtifact: (id: string) => void
  setActive: (id: string | null) => void
  togglePanel: () => void
  setPanelOpen: (open: boolean) => void
  clearAll: () => void
}

function genId(): string {
  return 'art_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const useArtifactsStore = create<ArtifactsState>((set, get) => ({
  artifacts: [],
  activeId: null,
  panelOpen: false,

  addArtifact: (artifact) => {
    const id = genId()
    const newArtifact: Artifact = {
      ...artifact,
      id,
      createdAt: Date.now()
    }
    set(s => ({
      artifacts: [...s.artifacts, newArtifact],
      activeId: id,
      panelOpen: true
    }))
    return id
  },

  removeArtifact: (id) => {
    set(s => {
      const filtered = s.artifacts.filter(a => a.id !== id)
      const newActive = s.activeId === id
        ? (filtered[filtered.length - 1]?.id ?? null)
        : s.activeId
      return {
        artifacts: filtered,
        activeId: newActive,
        panelOpen: filtered.length > 0 ? s.panelOpen : false
      }
    })
  },

  setActive: (id) => set({ activeId: id }),

  togglePanel: () => set(s => ({ panelOpen: !s.panelOpen })),

  setPanelOpen: (open) => set({ panelOpen: open }),

  clearAll: () => set({ artifacts: [], activeId: null, panelOpen: false })
}))
