import { useAccount, useDisconnect, useEnsName } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { ChevronDown, LogOut, Copy, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export default function WalletConnectButton(): JSX.Element {
  const { address, isConnected, chain } = useAccount()
  const { data: ensName } = useEnsName({ address })
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  if (!isConnected || !address) {
    return (
      <motion.button
        type="button"
        onClick={() => open()}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1D8C80 0%, #16a085 50%, #0d6e63 100%)',
          boxShadow: '0 4px 20px rgba(29, 140, 128, 0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
        }}
      >
        <span
          className="absolute inset-0 opacity-50"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }}
        />
        <span className="relative flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
          Connect Wallet
        </span>
      </motion.button>
    )
  }

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 rounded-xl border border-[#2a2a2e] bg-[#181820] hover:bg-[#1d1d22] px-3 py-2 text-[12px] font-mono backdrop-blur-md transition-colors"
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: '#1D8C80', boxShadow: '0 0 8px #1D8C80' }}
        />
        <span className="text-white font-semibold">{ensName ?? shortAddr(address)}</span>
        {chain && (
          <span
            className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
          >
            {chain.name.toUpperCase()}
          </span>
        )}
        <ChevronDown size={12} className="web3-text-muted" />
      </motion.button>

      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-[#2a2a2e] bg-[#0a0a0a]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#1f1f23]">
                <div className="text-[10px] uppercase tracking-widest web3-text-muted font-bold mb-1">Connected</div>
                <div className="font-mono text-[12px] web3-text-strong break-all">{address}</div>
                {ensName && <div className="font-mono text-[11px] text-[#1D8C80] mt-1">{ensName}</div>}
              </div>
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(address)
                    setCopied(true)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] web3-text-body hover:text-white hover:bg-[#1f1f23] transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy address'}
                </button>
                <button
                  type="button"
                  onClick={() => open({ view: 'Networks' })}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] web3-text-body hover:text-white hover:bg-[#1f1f23] transition-colors"
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-white/30" />
                  Switch network
                </button>
                <button
                  type="button"
                  onClick={() => {
                    disconnect()
                    setMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={14} />
                  Disconnect
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
