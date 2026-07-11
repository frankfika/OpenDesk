// Stock domain types. Kept narrow on purpose — Phase 1 only needs quote
// and search; history and news come in later phases. The shape mirrors
// Yahoo Finance's chart API so the renderer can pass fields through
// without remapping.

export type StockExchange = 'NASDAQ' | 'NYSE' | 'AMEX' | 'OTHER'

export interface StockQuote {
  symbol: string
  shortName?: string
  longName?: string
  exchange: StockExchange
  currency: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketTime: number // epoch seconds
  marketState: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED'
  preMarketPrice?: number
  postMarketPrice?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  dayHigh?: number
  dayLow?: number
  volume?: number
}

export interface StockSearchResult {
  symbol: string
  shortName: string
  longName?: string
  exchange: StockExchange
  type: string // 'Equity', 'ETF', etc.
}

export interface StockHistoryCandle {
  t: number // epoch seconds
  o: number
  h: number
  l: number
  c: number
  v: number
}

export interface StockHistory {
  symbol: string
  candles: StockHistoryCandle[]
}

export interface StockSearchResponse {
  results: StockSearchResult[]
}
