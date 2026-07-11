// Web3 store — bridges wagmi account state to the rest of the renderer.
// The actual wagmi hooks live in the React components; this store only
// holds derived, app-level data (selected chain, recent searches, etc.).
import { create } from 'zustand'

export type Web3ScenarioId = 'intel' | 'trade' | 'doctor' | 'chat'

interface Web3State {
  activeScenario: Web3ScenarioId
  setActiveScenario: (id: Web3ScenarioId) => void
  selectedChain: string
  setSelectedChain: (chain: string) => void
  recentAddresses: string[]
  pushRecentAddress: (addr: string) => void
  pendingTxRequest: null | {
    id: string
    chain: string
    chainName: string
    from: string
    to: string
    data?: string
    value?: string
    description: string
  }
  setPendingTxRequest: (req: Web3State['pendingTxRequest']) => void
}

export const useWeb3Store = create<Web3State>((set) => ({
  activeScenario: 'chat',
  setActiveScenario: (id) => set({ activeScenario: id }),
  selectedChain: 'ethereum',
  setSelectedChain: (chain) => set({ selectedChain: chain }),
  recentAddresses: [],
  pushRecentAddress: (addr) =>
    set((s) => {
      const next = [addr, ...s.recentAddresses.filter((a) => a !== addr)].slice(0, 8)
      return { recentAddresses: next }
    }),
  pendingTxRequest: null,
  setPendingTxRequest: (req) => set({ pendingTxRequest: req })
}))
