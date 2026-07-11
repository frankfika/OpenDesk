// Unified Trade store. The trading workstation crosses crypto (existing
// `store/web3.ts`) and stocks (new). This store owns the cross-cutting
// bits every scenario needs: the watchlist, the currently selected
// symbol, and the colour scheme direction (US green-up vs CN red-up).
//
// Scenario layout state (which pane is shown) lives in component state
// for now — once we settle on the keyboard navigation it can move here.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type TradeScenario = 'chart' | 'order' | 'positions' | 'news' | 'analysis'
export type AssetClass = 'crypto'
export type ColorDirection = 'us' | 'cn' // us=green up/red down, cn=red up/green down

export interface WatchlistItem {
  symbol: string
  assetClass: AssetClass
  /** Optional chain key for crypto items (e.g. 'ethereum', 'base'). */
  chain?: string
  addedAt: number
}

interface TradeState {
  watchlist: WatchlistItem[]
  selectedSymbol: string | null
  selectedAsset: AssetClass
  scenario: TradeScenario
  colorDirection: ColorDirection
  tickerPaused: boolean

  addWatch: (item: Omit<WatchlistItem, 'addedAt'>) => void
  removeWatch: (symbol: string) => void
  selectSymbol: (symbol: string, asset: AssetClass) => void
  setScenario: (s: TradeScenario) => void
  setColorDirection: (d: ColorDirection) => void
  toggleTickerPause: () => void
}

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  // Crypto — high-volume majors; the chain defaults to 'ethereum' but
  // the quote hook looks up the right chain for each symbol.
  { symbol: 'BTC', assetClass: 'crypto', addedAt: Date.now() },
  { symbol: 'ETH', assetClass: 'crypto', addedAt: Date.now() },
  { symbol: 'SOL', assetClass: 'crypto', addedAt: Date.now() }
]

export const useTradeStore = create<TradeState>()(
  persist(
    (set) => ({
      watchlist: DEFAULT_WATCHLIST,
      selectedSymbol: 'BTC',
      selectedAsset: 'crypto',
      scenario: 'chart',
      colorDirection: 'us',
      tickerPaused: false,

      addWatch: (item) =>
        set((s) => {
          if (s.watchlist.some((w) => w.symbol === item.symbol && w.assetClass === item.assetClass)) {
            return s
          }
          return {
            watchlist: [...s.watchlist, { ...item, addedAt: Date.now() }]
          }
        }),
      removeWatch: (symbol) =>
        set((s) => ({ watchlist: s.watchlist.filter((w) => w.symbol !== symbol) })),
      selectSymbol: (symbol, asset) => set({ selectedSymbol: symbol, selectedAsset: asset }),
      setScenario: (scenario) => set({ scenario }),
      setColorDirection: (colorDirection) => set({ colorDirection }),
      toggleTickerPause: () => set((s) => ({ tickerPaused: !s.tickerPaused }))
    }),
    {
      name: 'opendesk-trade-store',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.localStorage : (undefined as unknown as Storage)
      ),
      partialize: (s) => ({
        watchlist: s.watchlist,
        colorDirection: s.colorDirection,
        selectedSymbol: s.selectedSymbol,
        selectedAsset: s.selectedAsset
      })
    }
  )
)
