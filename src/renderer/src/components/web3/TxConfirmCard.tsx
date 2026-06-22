import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useSendTransaction, useSwitchChain, useChainId, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther } from 'viem'
import { ShieldCheck, X, ArrowRight, AlertTriangle, Loader2, ExternalLink, Check } from 'lucide-react'
import { useWeb3Store } from '../../store/web3'
import ChainBadge from './ChainBadge'

const CHAIN_ID_MAP: Record<string, number> = {
  ethereum: 1, mainnet: 1,
  base: 8453,
  arbitrum: 42161,
  optimism: 10,
  polygon: 137,
  bsc: 56,
  sepolia: 11155111,
  'base-sepolia': 84532,
  'arbitrum-sepolia': 421614,
  'optimism-sepolia': 11155420,
  'polygon-amoy': 80002,
  'bsc-testnet': 97
}

export default function TxConfirmCard(): JSX.Element | null {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { sendTransactionAsync, isPending: isSending } = useSendTransaction()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const pendingTx = useWeb3Store((s) => s.pendingTxRequest)
  const setPendingTx = useWeb3Store((s) => s.setPendingTxRequest)

  const [result, setResult] = useState<null | { txHash: string; chainName: string; explorer: string }>(null)
  const [error, setError] = useState<string | null>(null)

  // Listen for tx requests from main
  useEffect(() => {
    if (!window.api?.web3?.onTxRequest) return
    const off = window.api.web3.onTxRequest((req) => {
      setResult(null)
      setError(null)
      setPendingTx(req)
    })
    return off
  }, [setPendingTx])

  // When tx is broadcast, watch for receipt
  const txHash = result?.txHash
  const { isLoading: isWaiting, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
    chainId: pendingTx ? CHAIN_ID_MAP[pendingTx.chain] : undefined
  })

  if (!pendingTx) return null

  const requiredChainId = CHAIN_ID_MAP[pendingTx.chain] ?? 1
  const chainMatches = chainId === requiredChainId
  const isTestnet = pendingTx.chain.includes('sepolia') || pendingTx.chain.includes('amoy') || pendingTx.chain.includes('testnet')

  const handleSign = async () => {
    if (!isConnected || !address) {
      setError('Wallet not connected')
      return
    }
    setError(null)
    try {
      // Switch chain if needed
      if (!chainMatches) {
        await switchChain({ chainId: requiredChainId })
      }
      const hash = await sendTransactionAsync({
        to: pendingTx.to as `0x${string}`,
        data: (pendingTx.data ?? '0x') as `0x${string}`,
        value: pendingTx.value ? BigInt(pendingTx.value) : 0n,
        chainId: requiredChainId
      })
      setResult({
        txHash: hash,
        chainName: pendingTx.chainName,
        explorer: getExplorer(pendingTx.chain)
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleClose = () => {
    if (result) {
      window.api?.web3?.prepareTx?.({
        // No-op: tell main we're done — actually we should send the result back.
        // For now we just close the modal.
        chain: pendingTx.chain,
        from: pendingTx.from,
        to: pendingTx.to,
        data: pendingTx.data,
        value: pendingTx.value,
        description: pendingTx.description
      }).catch(() => undefined)
    }
    setPendingTx(null)
    setResult(null)
    setError(null)
  }

  return (
    <AnimatePresence>
      <motion.div
        key="tx-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
          className="relative w-full max-w-md rounded-2xl border border-[#2a2a2e] overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(29, 140, 128, 0.15)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f23]">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(29, 140, 128, 0.15)', border: '1px solid rgba(29, 140, 128, 0.3)' }}
              >
                <ShieldCheck size={16} className="text-[#1D8C80]" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-white">
                  {result ? 'Transaction Sent' : 'Sign Transaction'}
                </div>
                <div className="text-[10px] web3-text-muted font-mono">AI Agent requested your signature</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="web3-text-muted hover:text-white p-1.5 rounded-md hover:bg-[#1f1f23] transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Description */}
            <div className="rounded-lg border border-[#1f1f23] bg-[#141416] p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-widest web3-text-muted mb-1.5">Intent</div>
              <div className="text-[13px] web3-text-strong leading-relaxed">{pendingTx.description}</div>
            </div>

            {!result ? (
              <>
                {/* Details grid */}
                <div className="space-y-2.5 text-[12px] font-mono">
                  <Row label="Chain" value={<ChainBadge chain={pendingTx.chain} size="sm" />} />
                  <Row label="From" value={<span className="web3-text-body">{shortAddr(pendingTx.from)}</span>} />
                  <Row label="To" value={<span className="web3-text-body">{shortAddr(pendingTx.to)}</span>} />
                  {pendingTx.value && pendingTx.value !== '0' && (
                    <Row
                      label="Value"
                      value={<span className="text-white">{formatEther(BigInt(pendingTx.value))} {pendingTx.chainName === 'BNB Chain' ? 'BNB' : pendingTx.chainName === 'Polygon' ? 'POL' : 'ETH'}</span>}
                    />
                  )}
                  {pendingTx.data && pendingTx.data !== '0x' && (
                    <Row
                      label="Calldata"
                      value={<span className="web3-text-muted">{pendingTx.data.slice(0, 10)}…({(pendingTx.data.length - 2) / 2} bytes)</span>}
                    />
                  )}
                </div>

                {!chainMatches && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-200">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <div>You're on a different network. The agent will request a switch to {pendingTx.chainName}.</div>
                  </div>
                )}

                {isTestnet && (
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-widest text-cyan-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    TESTNET — NO REAL VALUE
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-300">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-lg border border-[#2a2a2e] bg-[#141416] py-2.5 text-[12px] font-semibold web3-text-body hover:bg-[#1f1f23] transition-colors"
                  >
                    Reject
                  </button>
                  <motion.button
                    type="button"
                    onClick={handleSign}
                    disabled={isSending || isSwitching || !isConnected}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 rounded-lg py-2.5 text-[12px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
                    style={{
                      background: 'linear-gradient(135deg, #1D8C80, #0d6e63)',
                      boxShadow: '0 4px 20px rgba(29, 140, 128, 0.3)'
                    }}
                  >
                    {isSending || isSwitching ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        {isSwitching ? 'Switching…' : 'Confirming…'}
                      </>
                    ) : (
                      <>
                        Sign & Send
                        <ArrowRight size={12} />
                      </>
                    )}
                  </motion.button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(16, 185, 129, 0.15)' }}
                  >
                    {isConfirmed ? <Check size={16} className="text-emerald-400" /> : <Loader2 size={16} className="text-emerald-400 animate-spin" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-white">
                      {isConfirmed ? 'Confirmed on-chain' : isWaiting ? 'Pending confirmation' : 'Broadcast'}
                    </div>
                    <div className="text-[10px] font-mono web3-text-muted truncate">{result.txHash}</div>
                  </div>
                </div>
                <a
                  href={`${result.explorer}/tx/${result.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#2a2a2e] bg-[#141416] py-2.5 text-[12px] font-semibold web3-text-body hover:bg-[#1f1f23] transition-colors"
                >
                  View on Block Explorer
                  <ExternalLink size={12} />
                </a>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full rounded-lg py-2.5 text-[12px] font-semibold web3-text-secondary hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="web3-text-muted uppercase tracking-widest text-[9px] font-bold">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

function shortAddr(a: string): string {
  if (!a) return '—'
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function getExplorer(chain: string): string {
  const map: Record<string, string> = {
    ethereum: 'https://etherscan.io',
    base: 'https://basescan.org',
    arbitrum: 'https://arbiscan.io',
    optimism: 'https://optimistic.etherscan.io',
    polygon: 'https://polygonscan.com',
    bsc: 'https://bscscan.com',
    sepolia: 'https://sepolia.etherscan.io',
    'base-sepolia': 'https://sepolia.basescan.org',
    'arbitrum-sepolia': 'https://sepolia.arbiscan.io',
    'optimism-sepolia': 'https://sepolia-optimism.etherscan.io',
    'polygon-amoy': 'https://amoy.polygonscan.com',
    'bsc-testnet': 'https://testnet.bscscan.com'
  }
  return map[chain] ?? 'https://etherscan.io'
}
