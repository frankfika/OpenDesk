import { create } from 'zustand'
import type { MemoryEntry } from '@shared/types'

type MemoryCategory = 'user' | 'identity' | 'soul'

interface MemoryState {
  user: string
  identity: string
  soul: string
  loaded: boolean
  activeTab: MemoryCategory
  saving: boolean

  load: () => Promise<void>
  setActiveTab: (tab: MemoryCategory) => void
  updateContent: (category: MemoryCategory, content: string) => void
  save: (category: MemoryCategory) => Promise<void>
  extract: (messages: Array<{ role: string; content: string }>) => Promise<MemoryEntry[]>
  appendExtracted: (entries: MemoryEntry[]) => Promise<void>
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  user: '',
  identity: '',
  soul: '',
  loaded: false,
  activeTab: 'user',
  saving: false,

  load: async () => {
    if (!window.api?.memory?.load) {
      set({ loaded: true })
      return
    }
    try {
      const user = await window.api.memory.load('user')
      const identity = await window.api.memory.load('identity')
      const soul = await window.api.memory.load('soul')
      set({ user, identity, soul, loaded: true })
    } catch (e) {
      console.error('Failed to load memory:', e)
      set({ loaded: true })
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  updateContent: (category, content) => {
    set((s) => ({ ...s, [category]: content }))
  },

  save: async (category) => {
    if (!window.api?.memory?.save) return
    set({ saving: true })
    try {
      const content = get()[category]
      await window.api.memory.save(category, content)
    } catch (e) {
      console.error('Failed to save memory:', e)
    } finally {
      set({ saving: false })
    }
  },

  extract: async (messages) => {
    if (!window.api?.memory?.extract) return []
    try {
      return await window.api.memory.extract(messages)
    } catch (e) {
      console.error('Failed to extract memory:', e)
      return []
    }
  },

  appendExtracted: async (entries) => {
    if (!window.api?.memory?.append || entries.length === 0) return
    try {
      await window.api.memory.append(entries)
      // Reload to show updated content
      const user = await window.api.memory.load('user')
      const identity = await window.api.memory.load('identity')
      const soul = await window.api.memory.load('soul')
      set({ user, identity, soul })
    } catch (e) {
      console.error('Failed to append memory entries:', e)
    }
  }
}))
