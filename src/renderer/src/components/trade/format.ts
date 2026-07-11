// Small formatting helpers shared by the trade components. Kept
// dependency-free so the workbench bundle stays light.

import type { ColorDirection } from '../../store/trade'

export function fmtUsd(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export function fmtPct(n: number, dir: ColorDirection = 'us'): string {
  const up = n >= 0
  const positive = dir === 'us' ? up : !up
  const sign = up ? '+' : ''
  // US: green up / red down. CN: red up / green down. The arrow flips
  // so the user always sees the direction the *market* went, while the
  // colour reflects the convention they picked.
  return `${sign}${n.toFixed(2)}%${positive ? '▲' : '▼'}`
}

export function fmtPrice(n: number | null | undefined, decimals = 2): string {
  if (n == null || !isFinite(n)) return '—'
  return n.toFixed(n < 1 ? Math.max(decimals, 4) : decimals)
}

export function fmtCompactUsd(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}
