// Web3Workbench — main app container. 3-column layout.
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWeb3Store } from '../../store/web3'
import TopBar from './TopBar'
import LeftSidebar from './LeftSidebar'
import RightRail from './RightRail'
import PortfolioView from './PortfolioView'
import IntelPanel from './IntelPanel'
import TradePanel from './TradePanel'
import DoctorPanel from './DoctorPanel'
import TxConfirmCard from './TxConfirmCard'

export default function Web3Workbench(): JSX.Element {
  const activeScenario = useWeb3Store((s) => s.activeScenario)

  useEffect(() => {
    if (!activeScenario) {
      useWeb3Store.getState().setActiveScenario('chat')
    }
  }, [activeScenario])

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden" style={{ background: '#0a0a0a' }}>
      {/* Ambient glow — kept subtle so it doesn't fight opaque cards */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(29, 140, 128, 0.1) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(98, 126, 234, 0.08) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10">
        <TopBar />
      </div>

      <div className="relative z-10 flex flex-1 min-h-0" style={{ background: '#0a0a0a' }}>
        <LeftSidebar />

        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden" style={{ background: '#0a0a0a' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScenario}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 flex flex-col overflow-hidden"
            >
              {activeScenario === 'intel' && <IntelPanel />}
              {activeScenario === 'trade' && <TradePanel />}
              {activeScenario === 'doctor' && <DoctorPanel />}
              {activeScenario === 'chat' && <PortfolioView />}
            </motion.div>
          </AnimatePresence>
        </main>

        <RightRail />
      </div>

      <TxConfirmCard />
    </div>
  )
}
