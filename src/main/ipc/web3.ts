// Web3 IPC bridge: lets the AI agent (running in main) prepare transactions
// and the renderer (where the user's wallet lives) sign & broadcast them.
//
// Flow:
//   renderer → main:  'web3:prepareTx'  { chain, from, to, data, value, description }
//   main   → renderer:'web3:txRequest'  { id, payload }
//   renderer→ main:  'web3:txResult'   { id, signedTx | signedMessage | error, txHash? }
//   main returns the result to the original caller via promise resolution
import { ipcMain, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { WEB3_CHAINS, type ChainKey } from '../tools/web3-tools'

interface PreparedTx {
  chain: ChainKey
  from: string
  to: string
  data?: string
  value?: string
  description: string
}

interface TxRequest {
  id: string
  chain: ChainKey
  chainName: string
  from: string
  to: string
  data?: string
  value?: string
  description: string
}

const pendingRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

export function registerWeb3Handlers(win: BrowserWindow): void {
  // Renderer subscribes to incoming tx requests
  ipcMain.handle('web3:txResult', (_event, payload: { id: string; result?: unknown; error?: string }) => {
    const handler = pendingRequests.get(payload.id)
    if (!handler) return { success: false, error: 'No pending request' }
    pendingRequests.delete(payload.id)
    if (payload.error) handler.reject(new Error(payload.error))
    else handler.resolve(payload.result)
    return { success: true }
  })

  // Main → renderer: a tx needs user signature
  ipcMain.handle('web3:prepareTx', async (_event, payload: PreparedTx) => {
    const id = randomUUID()
    const chainKey = (payload.chain in WEB3_CHAINS ? payload.chain : 'ethereum') as ChainKey
    const def = WEB3_CHAINS[chainKey]
    const request: TxRequest = {
      id,
      chain: chainKey,
      chainName: def.name,
      from: payload.from,
      to: payload.to,
      data: payload.data,
      value: payload.value,
      description: payload.description
    }
    // Fire event to renderer
    win.webContents.send('web3:txRequest', request)
    // Wait for renderer to sign and return the result
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject })
      // Timeout after 5 minutes
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id)
          reject(new Error('Wallet signature timed out (5 min)'))
        }
      }, 5 * 60 * 1000)
    })
  })

  // Main: build a sample calldata for the user / AI to inspect
  // (helper for the chat UI to show "what the AI wants to do")
  ipcMain.handle('web3:explainCalldata', async (_event, payload: { chain: ChainKey; data: string }) => {
    try {
      // We don't decode the calldata generically; we just return the selector + length
      const selector = payload.data?.slice(0, 10) ?? '0x'
      return {
        selector,
        length: (payload.data?.length ?? 0) / 2 - 1,
        note: `First 4 bytes (function selector): ${selector}. Use a 4byte.directory lookup or a contract ABI to decode.`
      }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  })
}
