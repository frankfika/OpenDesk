import { ipcMain, BrowserWindow } from 'electron'
import { getQuote, searchSymbols, getHistory, getNews } from '../stocks/provider/yahoo'

const channels = ['stocks:quote', 'stocks:search', 'stocks:history', 'stocks:news']

function removeStaleListeners(): void {
  for (const ch of channels) {
    ipcMain.removeAllListeners(ch)
  }
}

export function registerStocksHandlers(_win: BrowserWindow): void {
  removeStaleListeners()

  ipcMain.handle('stocks:quote', async (_e, symbol: string) => {
    if (!symbol || typeof symbol !== 'string') {
      return { error: 'Symbol is required' }
    }
    try {
      const quote = await getQuote(symbol)
      if (!quote) return { error: 'Symbol not found' }
      return { quote }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('stocks:search', async (_e, query: string, limit?: number) => {
    try {
      const result = await searchSymbols(query, limit ?? 10)
      return { results: result.results }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(
    'stocks:history',
    async (_e, symbol: string, range?: string, interval?: string) => {
      try {
        const history = await getHistory(
          symbol,
          (range as '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' | undefined) ?? '1y',
          (interval as '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo' | undefined) ?? '1d'
        )
        return { history }
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle('stocks:news', async (_e, symbol: string) => {
    if (!symbol || typeof symbol !== 'string') {
      return { items: [] }
    }
    try {
      const items = await getNews(symbol)
      return { items }
    } catch {
      // News failures are non-fatal — return an empty list rather than
      // an error so the UI can render an empty state.
      return { items: [] }
    }
  })
}
