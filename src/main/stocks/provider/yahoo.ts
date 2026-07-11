// Yahoo Finance client. We hit Yahoo from the main process because the
// public quote endpoints reject cross-origin browser requests. The renderer
// talks to us over IPC; we run fetch on the Electron main process which
// has no CORS restrictions.
//
// All endpoints below are unofficial. They have been stable for years but
// Yahoo has no public SLA — the surface may change without notice. The
// functions in this file normalise responses so a future swap to Finnhub
// or Polygon can live behind the same types.

import type { StockHistory, StockQuote, StockSearchResponse, StockSearchResult, StockExchange } from '../types'

const CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
const SEARCH_BASE = 'https://query1.finance.yahoo.com/v1/finance/search'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

interface YahooChartMeta {
  symbol: string
  shortName?: string
  longName?: string
  fullExchangeName?: string
  exchangeName?: string
  currency?: string
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  regularMarketTime?: number
  marketState?: string
  preMarketPrice?: { regularMarketPrice?: number }
  postMarketPrice?: { regularMarketPrice?: number }
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  regularMarketVolume?: number
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: YahooChartMeta
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>
          high?: Array<number | null>
          low?: Array<number | null>
          close?: Array<number | null>
          volume?: Array<number | null>
        }>
      }
    }>
    error?: { code?: string; description?: string } | null
  }
}

interface YahooSearchResponse {
  quotes?: Array<{
    symbol: string
    shortname?: string
    longname?: string
    longName?: string
    exchange?: string
    typeDisp?: string
    quoteType?: string
  }>
}

function mapExchange(name: string | undefined): StockExchange {
  const n = (name ?? '').toUpperCase()
  if (n.includes('NASDAQ')) return 'NASDAQ'
  if (n.includes('NYSE')) return 'NYSE'
  if (n.includes('AMEX') || n.includes('AMERICAN')) return 'AMEX'
  return 'OTHER'
}

function mapMarketState(s: string | undefined): StockQuote['marketState'] {
  const v = (s ?? '').toUpperCase()
  if (v === 'PRE' || v === 'PREPRE' || v === 'PREPOST') return 'PRE'
  if (v === 'POST' || v === 'POSTPOST' || v === 'POSTPRE') return 'POST'
  if (v === 'REGULAR') return 'REGULAR'
  return 'CLOSED'
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(8_000)
  })
  if (!res.ok) {
    throw new Error(`Yahoo Finance HTTP ${res.status} for ${url}`)
  }
  return (await res.json()) as T
}

export async function getQuote(symbol: string): Promise<StockQuote | null> {
  const upper = symbol.toUpperCase()
  const url = `${CHART_BASE}/${encodeURIComponent(upper)}?interval=1m&range=1d&includePrePost=true`
  const data = await fetchJson<YahooChartResponse>(url)
  const result = data.chart?.result?.[0]
  const meta = result?.meta
  if (!meta || typeof meta.regularMarketPrice !== 'number') return null

  return {
    symbol: meta.symbol ?? upper,
    shortName: meta.shortName,
    longName: meta.longName,
    exchange: mapExchange(meta.fullExchangeName ?? meta.exchangeName),
    currency: meta.currency ?? 'USD',
    regularMarketPrice: meta.regularMarketPrice,
    regularMarketChange: meta.regularMarketChange ?? 0,
    regularMarketChangePercent: meta.regularMarketChangePercent ?? 0,
    regularMarketTime: meta.regularMarketTime ?? Math.floor(Date.now() / 1000),
    marketState: mapMarketState(meta.marketState),
    preMarketPrice: meta.preMarketPrice?.regularMarketPrice,
    postMarketPrice: meta.postMarketPrice?.regularMarketPrice,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    dayHigh: meta.regularMarketDayHigh,
    dayLow: meta.regularMarketDayLow,
    volume: meta.regularMarketVolume
  }
}

export async function searchSymbols(query: string, limit = 10): Promise<StockSearchResponse> {
  const trimmed = query.trim()
  if (!trimmed) return { results: [] }
  const url = `${SEARCH_BASE}?q=${encodeURIComponent(trimmed)}&quotesCount=${limit}&newsCount=0&listsCount=0`
  const data = await fetchJson<YahooSearchResponse>(url)
  const results: StockSearchResult[] = (data.quotes ?? [])
    .filter((q) => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
    .map((q) => ({
      symbol: q.symbol,
      shortName: q.shortname ?? q.symbol,
      longName: q.longName ?? q.longname,
      exchange: mapExchange(q.exchange),
      type: q.typeDisp ?? q.quoteType ?? 'Equity'
    }))
  return { results }
}

export async function getHistory(
  symbol: string,
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' = '1y',
  interval: '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo' = '1d'
): Promise<StockHistory> {
  const upper = symbol.toUpperCase()
  const url = `${CHART_BASE}/${encodeURIComponent(upper)}?interval=${interval}&range=${range}`
  const data = await fetchJson<YahooChartResponse>(url)
  const result = data.chart?.result?.[0]
  const meta = result?.meta
  const quote = result?.indicators?.quote?.[0]
  if (!result || !meta || !quote) {
    return { symbol: upper, candles: [] }
  }
  const ts = result.timestamp ?? []
  const opens = quote.open ?? []
  const highs = quote.high ?? []
  const lows = quote.low ?? []
  const closes = quote.close ?? []
  const vols = quote.volume ?? []
  const candles = ts
    .map((t, i) => ({
      t,
      o: opens[i] ?? 0,
      h: highs[i] ?? 0,
      l: lows[i] ?? 0,
      c: closes[i] ?? 0,
      v: vols[i] ?? 0
    }))
    .filter((c) => c.o > 0 || c.c > 0)
  return { symbol: upper, candles }
}

export interface StockNewsItem {
  title: string
  link: string
  pubDate: string
  source?: string
}

export async function getNews(symbol: string, region = 'US', lang = 'en-US'): Promise<StockNewsItem[]> {
  const upper = symbol.toUpperCase()
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(
    upper
  )}&region=${region}&lang=${lang}`
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml' },
    signal: AbortSignal.timeout(8_000)
  })
  if (!res.ok) {
    throw new Error(`Yahoo News HTTP ${res.status}`)
  }
  const xml = await res.text()
  return parseRss(xml)
}

function parseRss(xml: string): StockNewsItem[] {
  const out: StockNewsItem[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1]
    const title = readTag(block, 'title')
    const link = readTag(block, 'link')
    const pubDate = readTag(block, 'pubDate')
    const source = readTag(block, 'source')
    if (title && link) out.push({ title, link, pubDate, source: source || undefined })
  }
  return out
}

function readTag(block: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`).exec(block)
  if (cdata) return cdata[1].trim()
  const direct = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(block)
  return direct ? decodeEntities(direct[1].trim()) : ''
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
