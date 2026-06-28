import { create } from 'zustand'

export type SectionId =
  | 'assistant'
  | 'projects'
  | 'experts'
  | 'automation'
  | 'files'
  | 'knowledge'
  | 'inspiration'

interface SectionState {
  activeSection: SectionId
  setActiveSection: (id: SectionId) => void
}

export const useSectionStore = create<SectionState>((set) => ({
  activeSection: 'assistant',
  setActiveSection: (id) => set({ activeSection: id })
}))

export interface SectionDef {
  id: SectionId
  label: string
  short: string
  icon: string // lucide icon name
}

export const SECTIONS: SectionDef[] = [
  { id: 'assistant', short: 'Assistant', label: '助理', icon: 'MessageSquare' },
  { id: 'projects', short: 'Projects', label: '项目', icon: 'Folder' },
  { id: 'experts', short: 'Experts', label: '专家', icon: 'Sparkles' },
  { id: 'automation', short: 'Automation', label: '自动化', icon: 'Clock' },
  { id: 'files', short: 'Files', label: '文件', icon: 'FileText' },
  { id: 'knowledge', short: 'KB', label: '知识库', icon: 'Database' },
  { id: 'inspiration', short: 'Inspiration', label: '灵感', icon: 'Lightbulb' }
]