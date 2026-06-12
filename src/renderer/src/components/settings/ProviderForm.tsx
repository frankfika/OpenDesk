import { useState, useCallback } from 'react'
import type { ProviderConfig, ModelInfo } from '@shared/types'
import { useSettingsStore } from '../../store/settings'
import { RefreshCw, Check, X } from 'lucide-react'

interface ProviderFormProps {
  onSave: (config: ProviderConfig, apiKey: string) => void
  initialValues?: { name?: string; baseUrl?: string; model?: string }
}

type ProviderType = ProviderConfig['type']

const TYPE_PRESETS: Record<ProviderType, { label: string; defaultModel: string; models: string[]; baseUrl?: string }> = {
  anthropic: {
    label: 'Anthropic',
    defaultModel: 'claude-sonnet-4',
    models: ['claude-sonnet-4', 'claude-opus-4'],
    baseUrl: 'https://api.anthropic.com'
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
    baseUrl: 'https://api.openai.com/v1'
  },
  'openai-compatible': {
    label: 'OpenAI-Compatible',
    defaultModel: 'gpt-4o',
    models: [],
    baseUrl: ''
  },
  ollama: {
    label: 'Ollama (local)',
    defaultModel: 'llama3',
    models: ['llama3', 'qwen2.5', 'deepseek-coder'],
    baseUrl: 'http://localhost:11434/v1'
  },
  google: {
    label: 'Google',
    defaultModel: 'gemini-1.5-pro',
    models: [],
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
  },
  generic: {
    label: 'Generic',
    defaultModel: '',
    models: [],
    baseUrl: ''
  }
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function ProviderForm({ onSave, initialValues }: ProviderFormProps) {
  const [type, setType] = useState<ProviderType>('openai-compatible')
  const [name, setName] = useState(initialValues?.name ?? '')
  const [model, setModel] = useState(initialValues?.model ?? '')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState(initialValues?.baseUrl ?? '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [fetchedModels, setFetchedModels] = useState<ModelInfo[]>([])
  const { testProvider } = useSettingsStore()

  function handleTypeChange(t: ProviderType) {
    setType(t)
    setModel(TYPE_PRESETS[t].defaultModel)
    setBaseUrl(TYPE_PRESETS[t].baseUrl || '')
    setTestResult(null)
    setFetchedModels([])
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    const ok = await testProvider(type, model, apiKey, baseUrl || undefined)
    setTestResult(ok)
    setTesting(false)
  }

  async function handleFetchModels() {
    if (!apiKey && type !== 'ollama') return
    setFetchingModels(true)
    try {
      // Use the testProvider's internal fetch or a dedicated endpoint
      const ok = await testProvider(type, model, apiKey, baseUrl || undefined)
      if (ok) {
        // Mock fetched models for demo; in real app, call dedicated endpoint
        const presets = TYPE_PRESETS[type].models
        if (presets.length > 0) {
          setFetchedModels(presets.map((id) => ({ id, displayName: id })))
        } else {
          // Try to fetch via settings API if available
          setFetchedModels([])
        }
      }
    } catch (e) {
      console.error('Failed to fetch models:', e)
    }
    setFetchingModels(false)
  }

  function handleSave() {
    const config: ProviderConfig = {
      id: genId(),
      name: name || TYPE_PRESETS[type].label,
      type,
      model,
      baseUrl: baseUrl || undefined,
      enabled: true,
      models: fetchedModels.length > 0 ? fetchedModels.map((m) => m.id) : undefined
    }
    onSave(config, apiKey)
  }

  const needsKey = type !== 'ollama'
  const canSave = model && (!needsKey || apiKey)
  const canFetch = (needsKey && apiKey) || type === 'ollama'

  return (
    <div className="flex flex-col gap-4">
      {/* Provider type */}
      <div>
        <label className="block text-[13px] font-medium mb-2 text-[var(--text-primary)]">Provider</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(TYPE_PRESETS) as ProviderType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`px-3 py-2.5 rounded-xl text-xs font-medium text-center transition-all duration-200 border ${
                type === t
                  ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30 text-[var(--accent)] shadow-sm'
                  : 'bg-[var(--bg-sidebar)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]'
              }`}
            >
              {TYPE_PRESETS[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-[13px] font-medium mb-1.5 text-[var(--text-primary)]">
          Display name <span className="text-[var(--text-muted)] font-normal ml-1">(optional)</span>
        </label>
        <input
          type="text"
          className="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none selectable bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--text-muted)] focus:bg-[var(--bg-content)] focus:shadow-sm transition-all duration-200"
          placeholder={TYPE_PRESETS[type].label}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* API Key */}
      {needsKey && (
        <div>
          <label className="block text-[13px] font-medium mb-1.5 text-[var(--text-primary)]">API Key</label>
          <input
            type="password"
            className="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none selectable font-mono bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--text-muted)] focus:bg-[var(--bg-content)] focus:shadow-sm transition-all duration-200"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setTestResult(null) }}
          />
        </div>
      )}

      {/* Model */}
      <div>
        <label className="block text-[13px] font-medium mb-1.5 text-[var(--text-primary)]">Model</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 px-3.5 py-2.5 rounded-xl text-[13px] outline-none selectable font-mono bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--text-muted)] focus:bg-[var(--bg-content)] focus:shadow-sm transition-all duration-200"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          {canFetch && (
            <button
              onClick={handleFetchModels}
              disabled={fetchingModels}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-200 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] disabled:opacity-50"
            >
              <RefreshCw size={12} className={fetchingModels ? 'animate-spin' : ''} />
              {fetchingModels ? 'Fetching…' : 'Fetch Models'}
            </button>
          )}
        </div>

        {/* Preset models */}
        {TYPE_PRESETS[type].models.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {TYPE_PRESETS[type].models.map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                  model === m
                    ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30 text-[var(--accent)]'
                    : 'bg-[var(--bg-sidebar)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Fetched models dropdown */}
        {fetchedModels.length > 0 && (
          <div className="mt-2">
            <label className="block text-[11px] text-[var(--text-muted)] mb-1">Available models</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[12px] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
            >
              {fetchedModels.map((m) => (
                <option key={m.id} value={m.id}>{m.displayName || m.id}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Base URL */}
      <div>
        <label className="block text-[13px] font-medium mb-1.5 text-[var(--text-primary)]">
          Base URL
        </label>
        <input
          type="text"
          className="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none selectable font-mono border transition-all duration-200 bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--text-muted)] focus:bg-[var(--bg-content)] focus:shadow-sm"
          placeholder="https://api.example.com/v1"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-3 mt-1 border-t border-[var(--border)]">
        <button
          onClick={handleTest}
          disabled={testing || !canSave}
          className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 border ${
            testing || !canSave
              ? 'border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed'
              : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)] hover:text-[var(--text-primary)]'
          }`}
        >
          {testing ? 'Testing…' : 'Test connection'}
        </button>

        {testResult !== null && (
          <span className={`text-[13px] font-medium flex items-center gap-1 ${testResult ? 'text-green-600' : 'text-red-600'}`}>
            {testResult ? <Check size={14} /> : <X size={14} />}
            {testResult ? 'Connected' : 'Failed'}
          </span>
        )}

        <div className="flex-1" />

        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`px-5 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 shadow-sm ${
            canSave
              ? 'bg-[var(--accent)] text-white hover:shadow hover:opacity-90 cursor-pointer'
              : 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed shadow-none'
          }`}
        >
          Save Provider
        </button>
      </div>
    </div>
  )
}
