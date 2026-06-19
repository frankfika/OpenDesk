export interface ProviderPreset {
  id: string
  type: string
  name: string
  baseUrl: string
  model: string
  color?: string
}

export const OLLAMA_BASE_URL = 'http://localhost:11434/v1'
export const OLLAMA_TAGS_BASE_URL = 'http://localhost:11434'
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
export const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1'

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    type: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    color: 'text-emerald-600'
  },
  {
    id: 'anthropic',
    type: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-5',
    color: 'text-orange-600'
  },
  {
    id: 'gemini',
    type: 'openai-compatible',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
    color: 'text-blue-600'
  },
  {
    id: 'deepseek',
    type: 'openai-compatible',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    color: 'text-sky-600'
  },
  { id: 'ollama', type: 'ollama', name: 'Ollama', baseUrl: OLLAMA_BASE_URL, model: 'llama3', color: 'text-violet-600' },
  {
    id: 'groq',
    type: 'openai-compatible',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    color: 'text-yellow-600'
  },
  {
    id: 'grok',
    type: 'openai-compatible',
    name: 'xAI Grok',
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-3',
    color: 'text-neutral-500'
  },
  {
    id: 'mistral',
    type: 'openai-compatible',
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'mistral-large-latest',
    color: 'text-indigo-600'
  },
  {
    id: 'doubao',
    type: 'openai-compatible',
    name: '豆包',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-pro-32k',
    color: 'text-cyan-600'
  },
  {
    id: 'kimi',
    type: 'openai-compatible',
    name: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    color: 'text-rose-600'
  },
  {
    id: 'glm',
    type: 'openai-compatible',
    name: 'GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    color: 'text-purple-600'
  },
  {
    id: 'qwen',
    type: 'openai-compatible',
    name: 'Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-max',
    color: 'text-amber-600'
  },
  {
    id: 'openrouter',
    type: 'openai-compatible',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o',
    color: 'text-teal-600'
  },
  {
    id: 'bitai',
    type: 'openai-compatible',
    name: 'b.ai',
    baseUrl: 'https://api.b.ai/v1',
    model: 'b-pro',
    color: 'text-orange-500'
  },
  { id: 'custom', type: 'openai-compatible', name: 'Custom', baseUrl: '', model: '', color: 'text-[var(--text-muted)]' }
]

export const PROVIDER_PRESETS_BY_ID: Record<string, ProviderPreset> = Object.fromEntries(
  PROVIDER_PRESETS.map((p) => [p.id, p])
)
