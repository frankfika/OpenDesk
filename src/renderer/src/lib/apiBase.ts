// Centralized API base URLs.
//
// In standalone browser mode (vite.standalone.config.ts) these go through
// the Vite dev proxy so the browser doesn't hit CORS walls. In Electron the
// renderer has no CORS, so direct https:// works too — but we keep the
// proxy paths here so a single build can run in both environments.

export const API_BASE = {
  // PublicNode RPCs
  ethereum: '/api/rpc',
  base: '/api/base',
  arbitrum: '/api/arb',
  optimism: '/api/op',
  polygon: '/api/polygon',
  bsc: '/api/bsc',
  zksync: '/api/zksync',
  linea: '/api/linea',
  scroll: '/api/scroll',
  mantle: '/api/mantle',

  // Aggregators
  ens: '/api/ens'
}

export const CHAIN_RPC: Record<string, string> = {
  ethereum: API_BASE.ethereum,
  base: API_BASE.base,
  arbitrum: API_BASE.arbitrum,
  optimism: API_BASE.optimism,
  polygon: API_BASE.polygon,
  bsc: API_BASE.bsc,
  zksync: API_BASE.zksync,
  linea: API_BASE.linea,
  scroll: API_BASE.scroll,
  mantle: API_BASE.mantle
}
