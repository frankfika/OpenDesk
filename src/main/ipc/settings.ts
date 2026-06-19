import { ipcMain, BrowserWindow } from 'electron'
import type { AppSettings, ModelInfo } from '../../shared/types'
import type { Provider } from '../providers/base'
import { AnthropicProvider } from '../providers/anthropic'
import { OpenAIProvider } from '../providers/openai'
import { OLLAMA_BASE_URL, OLLAMA_TAGS_BASE_URL, DEFAULT_OPENAI_BASE_URL } from '../../shared/providers'
import { settings, patchSettings } from '../app-state'
import { loadKeys, saveKeys, loadDraft, saveDraft, saveSettingsToDisk } from '../persistence'

const channels = [
  'settings:get',
  'settings:set',
  'settings:setApiKey',
  'settings:testProvider',
  'settings:fetchModels',
  'draft:load',
  'draft:save'
]

function removeStaleListeners(): void {
  for (const ch of channels) {
    ipcMain.removeAllListeners(ch)
  }
}

async function fetchModels(type: string, baseUrl?: string, apiKey?: string): Promise<ModelInfo[]> {
  try {
    if (type === 'anthropic') {
      return [
        {
          id: 'claude-opus-4-5',
          displayName: 'Claude Opus 4.5',
          contextWindow: 200000,
          supportsVision: true,
          supportsTools: true
        },
        {
          id: 'claude-sonnet-4-5',
          displayName: 'Claude Sonnet 4.5',
          contextWindow: 200000,
          supportsVision: true,
          supportsTools: true
        },
        {
          id: 'claude-haiku-4-5',
          displayName: 'Claude Haiku 4.5',
          contextWindow: 200000,
          supportsVision: true,
          supportsTools: true
        }
      ]
    }

    if (type === 'ollama') {
      const base = (baseUrl || OLLAMA_TAGS_BASE_URL).replace(/\/v1$/, '')
      const res = await fetch(`${base}/api/tags`)
      if (!res.ok) return []
      const data = (await res.json()) as { models?: Array<{ name: string }> }
      return (data.models || []).map((m) => ({ id: m.name, displayName: m.name }))
    }

    const url = (baseUrl || DEFAULT_OPENAI_BASE_URL).replace(/\/$/, '') + '/models'
    const headers: Record<string, string> = {}
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = (await res.json()) as { data?: Array<{ id: string }> }
    return (data.data || []).map((m) => ({ id: m.id, displayName: m.id }))
  } catch {
    return []
  }
}

export function registerSettingsHandlers(_win: BrowserWindow): void {
  removeStaleListeners()

  ipcMain.handle('settings:get', () => ({ ...settings }))

  ipcMain.handle('settings:set', (_e, next: Partial<AppSettings>) => {
    patchSettings(next)
    saveSettingsToDisk()
    return true
  })

  ipcMain.handle('settings:setApiKey', (_e, providerId: string, apiKey: string) => {
    const keys = loadKeys()
    keys[providerId] = apiKey
    saveKeys(keys)
    return true
  })

  ipcMain.handle(
    'settings:testProvider',
    async (_e, providerId: string, type: string, model: string, baseUrl?: string) => {
      const apiKey = loadKeys()[providerId] ?? ''
      if (baseUrl) {
        try {
          const url = new URL(baseUrl)
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Invalid protocol')
          }
        } catch {
          throw new Error('Invalid baseUrl provided')
        }
      }
      let provider: Provider | null = null
      if (type === 'anthropic') {
        provider = new AnthropicProvider(apiKey, model)
      } else {
        const url = baseUrl || (type === 'ollama' ? OLLAMA_BASE_URL : DEFAULT_OPENAI_BASE_URL)
        const key = apiKey || (type === 'ollama' ? 'ollama' : '')
        provider = new OpenAIProvider(key, model, url)
      }
      try {
        if (!provider) return false
        return await provider.test()
      } catch {
        return false
      }
    }
  )

  ipcMain.handle('draft:load', () => loadDraft())
  ipcMain.handle('draft:save', (_e, draft: { text: string; threadId: string | null }) => {
    saveDraft({ ...draft, timestamp: Date.now() })
    return true
  })

  ipcMain.handle('settings:fetchModels', async (_e, providerId: string, type: string, baseUrl?: string) => {
    if (baseUrl) {
      try {
        const url = new URL(baseUrl)
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Invalid protocol')
        }
      } catch {
        throw new Error('Invalid baseUrl provided')
      }
    }
    const apiKey = loadKeys()[providerId] ?? ''
    return fetchModels(type, baseUrl, apiKey)
  })
}
