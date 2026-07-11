// analysis — single-shot LLM analysis for the trade workbench's Analysis
// scenario. Unlike `chat:send` (which streams tokens to the renderer
// over IPC events), this IPC returns the full response when the stream
// finishes, so the trade pane doesn't have to wire up a token listener
// for a one-off prompt.
//
// The system prompt biases the model toward a concise trading-analyst
// voice: facts first, then a short interpretation. We don't try to be
// clever — the operator can read the quote themselves, so the LLM's
// job is to call out what they might miss.

import { ipcMain, BrowserWindow } from 'electron'
import { buildProviderById } from '../providers/builder'
import { loadKeys } from '../persistence'
import { getSettings } from '../app-state'
import type { Message } from '../../shared/types'

const channels = ['analysis:run']

function removeStaleListeners(): void {
  for (const ch of channels) ipcMain.removeAllListeners(ch)
}

const SYSTEM_PROMPT = `You are a concise trading analyst embedded in the OpenDesk trade workstation. The user can already see the live quote, day/52w range and recent activity in the pane to your left. Your job is to surface what they might miss: positioning, narrative shifts, upcoming catalysts, risk-reward framing. Keep responses under 200 words. Use plain prose, no markdown headers.`

export function registerAnalysisHandlers(_win: BrowserWindow): void {
  removeStaleListeners()

  ipcMain.handle('analysis:run', async (_e, prompt: string) => {
    if (!prompt || typeof prompt !== 'string') {
      return { error: 'Prompt is required' }
    }

    const settings = getSettings()
    const providerId = settings.activeProviderId
    if (!providerId) return { error: 'No active provider. Configure one in Settings.' }

    const apiKey = loadKeys()[providerId] ?? ''
    const provider = buildProviderById(settings.providers, providerId, apiKey)
    if (!provider) return { error: 'Provider not found or unsupported.' }

    const messages: Message[] = [
      { id: `sys-${Date.now()}`, role: 'system', content: SYSTEM_PROMPT, timestamp: Date.now() },
      { id: `usr-${Date.now()}`, role: 'user', content: prompt, timestamp: Date.now() }
    ]

    try {
      let out = ''
      for await (const chunk of provider.stream(messages, AbortSignal.timeout(45_000), undefined)) {
        if (typeof chunk === 'string') out += chunk
      }
      return { content: out || '(empty response from provider)' }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  })
}
