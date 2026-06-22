// Wagmi + Reown AppKit configuration.
// Wallet connection happens in the renderer; signing & broadcasting use
// the user's own wallet (MetaMask / Rabby / WalletConnect / etc.).
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, base, arbitrum, optimism, polygon, bsc, sepolia, baseSepolia, arbitrumSepolia, optimismSepolia, polygonAmoy, bscTestnet } from '@reown/appkit/networks'

// Project ID for Reown Cloud (WalletConnect). Replace with your own in
// production. Get one free at https://cloud.reown.com
const projectId = '0c8c75d309afe54c0c1f9bb9c0f7c7b6'

const networks = [
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  bsc,
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
  bscTestnet
] as const

export const wagmiAdapter = new WagmiAdapter({
  networks: [...networks],
  projectId,
  ssr: false
})

// Eager-init AppKit so the useAppKit hook in child components works on first render.
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [...networks],
  projectId,
  metadata: {
    name: 'OpenDesk Web3',
    description: 'AI-native Web3 Workbench',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://opendesk.app',
    icons: ['https://avatars.githubusercontent.com/u/179229932']
  },
  features: {
    analytics: false,
    email: false,
    socials: false
  },
  themeMode: 'dark'
} as Parameters<typeof createAppKit>[0])

export const wagmiConfig = wagmiAdapter.wagmiConfig
export { networks }
