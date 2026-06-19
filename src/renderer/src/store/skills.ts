import { create } from 'zustand'
import type { Skill, SkillLoadLevel, SkillLoadResult, SkillImportResult } from '@shared/types'

interface SkillsState {
  skills: Skill[]
  loaded: boolean
  activeSkillIds: string[]
  searchQuery: string
  sourceFilter: string
  sortBy: 'usage' | 'name' | 'installed'

  load: () => Promise<void>
  refresh: () => Promise<void>
  activateSkill: (skillId: string) => void
  deactivateSkill: (skillId: string) => void
  toggleSkill: (skillId: string) => void
  getActiveSkills: () => Skill[]
  getSkillById: (id: string) => Skill | undefined
  setSearchQuery: (q: string) => void
  setSourceFilter: (f: string) => void
  setSortBy: (s: 'usage' | 'name' | 'installed') => void
  getFilteredSkills: () => Skill[]

  importFromFolder: (path: string) => Promise<SkillImportResult>
  importFromGitHub: (url: string) => Promise<SkillImportResult>
  exportSkill: (skillId: string, outputPath: string) => Promise<string>
  deleteSkill: (skillId: string) => Promise<boolean>
  createSkill: (name: string, description: string, tags: string[]) => Promise<SkillImportResult>
  loadSkillContent: (skillId: string, level: SkillLoadLevel) => Promise<SkillLoadResult>
}

export const useSkillsStore = create<SkillsState>((set, get) => ({
  skills: [],
  loaded: false,
  activeSkillIds: [],
  searchQuery: '',
  sourceFilter: 'all',
  sortBy: 'installed',

  load: async () => {
    try {
      if (!window.api?.skills?.scan) {
        console.warn('window.api.skills not available (likely running in browser instead of Electron)')
        set({
          loaded: true,
          skills: []
        })
        return
      }
      const skills = await window.api.skills.scan()
      set({ skills, loaded: true })
    } catch (e) {
      console.error('Failed to load skills:', e)
      set({ loaded: true })
    }
  },

  refresh: async () => {
    await get().load()
  },

  activateSkill: (skillId) => {
    set((s) => ({
      activeSkillIds: s.activeSkillIds.includes(skillId) ? s.activeSkillIds : [...s.activeSkillIds, skillId]
    }))
  },

  deactivateSkill: (skillId) => {
    set((s) => ({
      activeSkillIds: s.activeSkillIds.filter((id) => id !== skillId)
    }))
  },

  toggleSkill: (skillId) => {
    set((s) => ({
      activeSkillIds: s.activeSkillIds.includes(skillId)
        ? s.activeSkillIds.filter((id) => id !== skillId)
        : [...s.activeSkillIds, skillId]
    }))
  },

  getActiveSkills: () => {
    const { skills, activeSkillIds } = get()
    return skills.filter((s) => activeSkillIds.includes(s.id))
  },

  getSkillById: (id) => {
    return get().skills.find((s) => s.id === id)
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSourceFilter: (f) => set({ sourceFilter: f }),
  setSortBy: (s) => set({ sortBy: s }),

  getFilteredSkills: () => {
    const { skills, searchQuery, sourceFilter, sortBy } = get()
    let filtered = skills

    if (sourceFilter !== 'all') {
      filtered = filtered.filter((s) => s.source === sourceFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
      )
    }

    switch (sortBy) {
      case 'name':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'usage':
        filtered = [...filtered].sort((a, b) => b.usageCount - a.usageCount)
        break
      case 'installed':
      default:
        filtered = [...filtered].sort((a, b) => b.installedAt - a.installedAt)
        break
    }

    return filtered
  },

  importFromFolder: async (path) => {
    if (!window.api?.skills?.importFromFolder) {
      return { success: false, error: 'Skills API not available' }
    }
    const result = await window.api.skills.importFromFolder(path)
    if (result.success && result.skill) {
      set((s) => ({ skills: [...s.skills, result.skill!] }))
    }
    return result
  },

  importFromGitHub: async (url) => {
    if (!window.api?.skills?.importFromGitHub) {
      return { success: false, error: 'Skills API not available' }
    }
    const result = await window.api.skills.importFromGitHub(url)
    if (result.success && result.skill) {
      set((s) => ({ skills: [...s.skills, result.skill!] }))
    }
    return result
  },

  exportSkill: async (skillId, outputPath) => {
    if (!window.api?.skills?.export) {
      throw new Error('Skills API not available')
    }
    return window.api.skills.export(skillId, outputPath)
  },

  deleteSkill: async (skillId) => {
    if (!window.api?.skills?.delete) {
      return false
    }
    const result = await window.api.skills.delete(skillId)
    if (result) {
      set((s) => ({
        skills: s.skills.filter((sk) => sk.id !== skillId),
        activeSkillIds: s.activeSkillIds.filter((id) => id !== skillId)
      }))
    }
    return result
  },

  createSkill: async (name, description, tags) => {
    if (!window.api?.skills?.create) {
      return { success: false, error: 'Skills API not available' }
    }
    const result = await window.api.skills.create(name, description, tags)
    if (result.success && result.skill) {
      set((s) => ({ skills: [...s.skills, result.skill!] }))
    }
    return result
  },

  loadSkillContent: async (skillId, level) => {
    if (!window.api?.skills?.load) {
      return { level, tokens: 0, content: '' }
    }
    return window.api.skills.load(skillId, level)
  }
}))
