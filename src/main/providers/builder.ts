import type { ProviderConfig } from '../../shared/types'
import type { Provider } from './base'
import { AnthropicProvider } from './anthropic'
import { OpenAIProvider } from './openai'
import { OLLAMA_BASE_URL } from '../../shared/providers'

export function buildProvider(config: ProviderConfig, apiKey: string): Provider | null {
  if (config.type === 'anthropic') {
    return new AnthropicProvider(apiKey, config.model)
  }
  if (config.type === 'openai' || config.type === 'openai-compatible') {
    return new OpenAIProvider(apiKey, config.model, config.baseUrl)
  }
  if (config.type === 'ollama') {
    return new OpenAIProvider(apiKey || 'ollama', config.model, config.baseUrl || OLLAMA_BASE_URL)
  }
  // 'google' and 'generic' are placeholders until dedicated providers are added
  return null
}

export function buildProviderById(providers: ProviderConfig[], providerId: string, apiKey: string): Provider | null {
  const config = providers.find((p) => p.id === providerId)
  if (!config) return null
  return buildProvider(config, apiKey)
}

export function getProviderConfig(providers: ProviderConfig[], providerId: string): ProviderConfig | undefined {
  return providers.find((p) => p.id === providerId)
}
