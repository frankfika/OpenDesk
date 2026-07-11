// Per-model USD pricing (per 1M tokens). Source: official provider pricing pages
// as of 2026-07-11. Update when providers change.
//
// Lookup order:
//   1. Exact model match in MODEL_PRICING (handles OpenRouter "openai/gpt-4o" too)
//   2. Provider default in PROVIDER_PRICING
//   3. Hard fallback $3/$15 (preserves prior behavior for unknown models)
//
// Adding a new model: append to MODEL_PRICING. Adding a new provider: append
// PROVIDER_PRICING default. Source from each provider's official pricing page.

export interface ModelPricing {
  inputPer1M: number
  outputPer1M: number
}

const DEFAULT_PRICING: ModelPricing = { inputPer1M: 3, outputPer1M: 15 }

// Per-model explicit pricing. Keys should be the raw `model` string the provider
// returns (e.g. "gpt-4o", "claude-sonnet-4-5", "openai/gpt-4o" for OpenRouter).
const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'gpt-4.1': { inputPer1M: 2, outputPer1M: 8 },
  'gpt-4.1-mini': { inputPer1M: 0.4, outputPer1M: 1.6 },
  'gpt-4.1-nano': { inputPer1M: 0.1, outputPer1M: 0.4 },
  'gpt-4-turbo': { inputPer1M: 10, outputPer1M: 30 },
  'o3': { inputPer1M: 10, outputPer1M: 40 },
  'o3-mini': { inputPer1M: 1.1, outputPer1M: 4.4 },
  'o4-mini': { inputPer1M: 1.1, outputPer1M: 4.4 },

  // Anthropic
  'claude-opus-4': { inputPer1M: 15, outputPer1M: 75 },
  'claude-opus-4-1': { inputPer1M: 15, outputPer1M: 75 },
  'claude-sonnet-4': { inputPer1M: 3, outputPer1M: 15 },
  'claude-sonnet-4-5': { inputPer1M: 3, outputPer1M: 15 },
  'claude-haiku-4': { inputPer1M: 0.8, outputPer1M: 4 },
  'claude-3-5-sonnet': { inputPer1M: 3, outputPer1M: 15 },
  'claude-3-5-haiku': { inputPer1M: 0.8, outputPer1M: 4 },
  'claude-3-opus': { inputPer1M: 15, outputPer1M: 75 },

  // Google Gemini (OpenAI-compatible endpoint at generativelanguage.googleapis.com)
  'gemini-2.0-flash': { inputPer1M: 0.075, outputPer1M: 0.3 },
  'gemini-2.5-pro': { inputPer1M: 1.25, outputPer1M: 10 },
  'gemini-1.5-pro': { inputPer1M: 1.25, outputPer1M: 5 },
  'gemini-1.5-flash': { inputPer1M: 0.075, outputPer1M: 0.3 },

  // DeepSeek
  'deepseek-chat': { inputPer1M: 0.14, outputPer1M: 0.28 },
  'deepseek-reasoner': { inputPer1M: 0.14, outputPer1M: 2.19 },

  // Groq (charged per token, varies by model)
  'llama-3.3-70b-versatile': { inputPer1M: 0.59, outputPer1M: 0.79 },
  'llama-3.1-8b-instant': { inputPer1M: 0.05, outputPer1M: 0.08 },
  'mixtral-8x7b-32768': { inputPer1M: 0.24, outputPer1M: 0.24 },

  // xAI Grok
  'grok-3': { inputPer1M: 3, outputPer1M: 15 },
  'grok-3-mini': { inputPer1M: 0.3, outputPer1M: 0.5 },
  'grok-2': { inputPer1M: 2, outputPer1M: 10 },

  // Mistral
  'mistral-large-latest': { inputPer1M: 2, outputPer1M: 6 },
  'mistral-small-latest': { inputPer1M: 0.2, outputPer1M: 0.6 },
  'codestral-latest': { inputPer1M: 0.3, outputPer1M: 0.9 },

  // 豆包 (Volcengine Ark, CNY -> USD approx from public docs)
  'doubao-pro-32k': { inputPer1M: 0.8, outputPer1M: 2 },
  'doubao-pro-256k': { inputPer1M: 1.2, outputPer1M: 3 },
  'doubao-lite-32k': { inputPer1M: 0.15, outputPer1M: 0.3 },

  // Kimi / Moonshot
  'moonshot-v1-8k': { inputPer1M: 1, outputPer1M: 1 },
  'moonshot-v1-32k': { inputPer1M: 2, outputPer1M: 2 },
  'moonshot-v1-128k': { inputPer1M: 4, outputPer1M: 4 },

  // 智谱 GLM (BigModel CN, free tier is essentially $0)
  'glm-4-flash': { inputPer1M: 0.001, outputPer1M: 0.001 },
  'glm-4-plus': { inputPer1M: 7, outputPer1M: 7 },
  'glm-4-air': { inputPer1M: 0.06, outputPer1M: 0.06 },

  // 阿里 Qwen / DashScope
  'qwen-max': { inputPer1M: 2.4, outputPer1M: 9.6 },
  'qwen-plus': { inputPer1M: 0.4, outputPer1M: 1.2 },
  'qwen-turbo': { inputPer1M: 0.18, outputPer1M: 0.18 },

  // b.ai
  'b-pro': { inputPer1M: 0.3, outputPer1M: 0.3 }
}

// Per-provider default (for when specific model is not in MODEL_PRICING).
// Used as fallback after model lookup miss.
const PROVIDER_PRICING: Record<string, ModelPricing> = {
  openai: { inputPer1M: 2.5, outputPer1M: 10 },
  anthropic: { inputPer1M: 3, outputPer1M: 15 },
  ollama: { inputPer1M: 0, outputPer1M: 0 }, // local, no per-token cost
  groq: { inputPer1M: 0.59, outputPer1M: 0.79 }
}

/**
 * Look up USD pricing for a model. Lookup order: exact model key -> OpenRouter
 * stripped form ("openai/gpt-4o" -> "gpt-4o") -> provider default -> $3/$15.
 */
export function lookupModelPricing(
  providerId: string | undefined,
  model: string | undefined
): ModelPricing {
  if (model) {
    const exact = MODEL_PRICING[model]
    if (exact) return exact
    if (model.includes('/')) {
      const stripped = model.split('/').pop()
      if (stripped && MODEL_PRICING[stripped]) return MODEL_PRICING[stripped]
    }
  }
  if (providerId && PROVIDER_PRICING[providerId]) {
    return PROVIDER_PRICING[providerId]
  }
  return DEFAULT_PRICING
}

/**
 * Compute estimated USD cost for a (input, output) token pair.
 * Returns 0 for local providers (ollama).
 */
export function computeCostUsd(
  inputTokens: number,
  outputTokens: number,
  providerId?: string,
  model?: string
): number {
  const p = lookupModelPricing(providerId, model)
  return (inputTokens * p.inputPer1M + outputTokens * p.outputPer1M) / 1_000_000
}
