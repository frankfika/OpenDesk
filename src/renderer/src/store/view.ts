// Top-level view router state. OpenDesk is a conversational AI assistant
// first; Trade and the legacy Web3 workbench are additional views reachable
// from the ViewRail. Persisted so a reload keeps you where you were, and so
// deep components (e.g. the Trade AnalysisScenario) can switch the user back
// to the assistant to hand a prompt off to the chat.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AppView = 'assistant' | 'trade' | 'web3'

interface ViewState {
  view: AppView
  setView: (view: AppView) => void
}

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      view: 'assistant',
      setView: (view) => set({ view })
    }),
    {
      name: 'opendesk-view',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.localStorage : (undefined as unknown as Storage)
      )
    }
  )
)
