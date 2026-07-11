// Helper that flips the scenario on the trade store. Lives in its own
// file so non-React callers (the keyboard handler, the bottom bar)
// can use it without pulling in JSX.

import { useTradeStore } from '../../store/trade'

export function setScenario(id: 'chart' | 'order' | 'positions' | 'news' | 'analysis'): void {
  useTradeStore.getState().setScenario(id)
}
