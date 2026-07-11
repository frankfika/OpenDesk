// useTradeHotkeys — global keyboard handler mounted at the workbench
// level. Routes single-key shortcuts (B/S/Esc/Space/1-5/Tab/arrows) to
// the trade store; everything else falls through to the OS.
//
// Implemented as a custom hook so the effect cleans up on unmount and
// we don't accidentally register multiple listeners when the workbench
// remounts (e.g. on theme switch).

import { useEffect } from 'react'
import { useTradeStore } from '../store/trade'

export function useTradeHotkeys(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when the user is typing in an input/textarea/contenteditable.
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
      }

      // Skip when a modifier key is held — let browser shortcuts work.
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const store = useTradeStore.getState()

      // Scenario switching
      if (e.key === '1') { store.setScenario('chart'); return }
      if (e.key === '2') { store.setScenario('order'); return }
      if (e.key === '3') { store.setScenario('positions'); return }
      if (e.key === '4') { store.setScenario('news'); return }
      if (e.key === '5') { store.setScenario('analysis'); return }

      // Tab cycles scenarios
      if (e.key === 'Tab') {
        e.preventDefault()
        const order: typeof store.scenario[] = ['chart', 'order', 'positions', 'news', 'analysis']
        const idx = order.indexOf(store.scenario)
        const next = order[(idx + (e.shiftKey ? -1 : 1) + order.length) % order.length]
        store.setScenario(next)
        return
      }

      // Space pauses the ticker
      if (e.code === 'Space') {
        e.preventDefault()
        store.toggleTickerPause()
        return
      }

      // B/S open the order ticket for the selected symbol. The actual
      // ticket rendering is the Order scenario; we just focus the pane.
      if (e.key === 'b' || e.key === 'B' || e.key === 's' || e.key === 'S') {
        store.setScenario('order')
        return
      }

      // / focuses the watchlist search box
      if (e.key === '/') {
        e.preventDefault()
        const search = document.getElementById('trade-watchlist-search') as HTMLInputElement | null
        if (search) search.focus()
        return
      }

      // Esc blurs the focused search input
      if (e.key === 'Escape') {
        if (target && target.tagName === 'INPUT') (target as HTMLInputElement).blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
