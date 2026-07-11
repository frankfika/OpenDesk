// OpenDesk entry.
//
// OpenDesk is a conversational AI assistant first. `AppShell` owns the
// global chrome (settings, onboarding, skills, memory, search, shortcuts)
// and a far-left ViewRail that switches between three views:
//   - assistant (default): the streaming chat workspace
//   - trade:               the trading workstation
//   - web3:                the legacy Web3 workbench
//
// `Web3Providers` wraps everything because wagmi/Reown must be initialized
// once at the root, even when the wallet isn't in use.

import AppShell from './components/layout/AppShell'
import Web3Providers from './components/web3/Web3Providers'

export default function App(): JSX.Element {
  return (
    <Web3Providers>
      <AppShell />
    </Web3Providers>
  )
}
