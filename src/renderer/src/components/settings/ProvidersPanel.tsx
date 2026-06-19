import { motion } from 'framer-motion'
import { Bot, Plug, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import EmptyState from '../ui/EmptyState'
import ProviderForm from './ProviderForm'
import type { ProviderConfig } from '@shared/types'
import { PROVIDER_PRESETS } from '@shared/providers'
import type { AppSettings } from '@shared/types'

interface ProvidersPanelProps {
  settings: AppSettings
  showAddForm: boolean
  addFormPreset: { name: string; baseUrl: string; model: string } | null
  editingProvider: string | null
  editApiKey: string
  testingProvider: string | null
  onToggleAddForm: () => void
  onPresetClick: (preset: { name: string; baseUrl: string; model: string }) => void
  onAddProvider: (config: ProviderConfig, apiKey: string) => void
  onTestProvider: (providerId: string) => void
  onTestAll: () => void
  onSetActive: (id: string) => void
  onRemove: (id: string) => void
  onStartEdit: (id: string) => void
  onCancelEdit: () => void
  onEditApiKeyChange: (value: string) => void
  onSaveApiKey: (providerId: string) => void
  onFetchModels: (providerId: string) => void
  onUpdateProvider: (id: string, patch: Partial<ProviderConfig>) => void
}

export default function ProvidersPanel({
  settings,
  showAddForm,
  addFormPreset,
  editingProvider,
  editApiKey,
  testingProvider,
  onToggleAddForm,
  onPresetClick,
  onAddProvider,
  onTestProvider,
  onTestAll,
  onSetActive,
  onRemove,
  onStartEdit,
  onCancelEdit,
  onEditApiKeyChange,
  onSaveApiKey,
  onFetchModels,
  onUpdateProvider
}: ProvidersPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[var(--text-secondary)]">AI Providers</span>
        <div className="flex items-center gap-2">
          {settings.providers.filter((p) => p.enabled).length > 0 && (
            <button
              onClick={onTestAll}
              disabled={testingProvider !== null}
              className="text-xs px-3 py-2 rounded-lg font-medium transition-all duration-200 bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
            >
              {testingProvider !== null ? 'Testing…' : 'Test All'}
            </button>
          )}
          <button
            onClick={onToggleAddForm}
            className="text-xs px-3.5 py-2 rounded-lg font-medium transition-all duration-200 bg-[var(--accent)] text-white hover:opacity-90 shadow-sm hover:shadow"
          >
            {showAddForm ? 'Cancel' : '+ Add Provider'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <motion.div
          className="mb-4 p-5 rounded-2xl bg-[var(--bg-content)] border border-[var(--border-strong)] shadow-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <ProviderForm onSave={onAddProvider} initialValues={addFormPreset ?? undefined} />
        </motion.div>
      )}

      {settings.providers.length === 0 && !showAddForm && (
        <EmptyState
          icon={Plug}
          title="Connect your first AI model"
          description="Choose a provider and enter your API key to start chatting"
          size="md"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 w-full max-w-md">
            {PROVIDER_PRESETS.map((preset) => (
              <motion.button
                key={preset.id}
                onClick={() => onPresetClick({ name: preset.name, baseUrl: preset.baseUrl, model: preset.model })}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border border-[var(--border)] bg-[var(--bg-sidebar)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-content)] transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Bot size={14} className={preset.color} />
                <span className="text-[var(--text-primary)]">{preset.name}</span>
              </motion.button>
            ))}
          </div>
        </EmptyState>
      )}

      <div className="flex flex-col gap-2">
        {settings.providers.map((p) => (
          <motion.div
            key={p.id}
            className={`flex flex-col gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
              settings.activeProviderId === p.id
                ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30 shadow-sm'
                : 'bg-[var(--bg-content)] border-[var(--border)] hover:border-[var(--border-strong)] hover:shadow-sm'
            }`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      p.lastTestResult === true
                        ? 'bg-green-500'
                        : p.lastTestResult === false
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                    }`}
                    title={
                      p.lastTestResult === true ? 'Healthy' : p.lastTestResult === false ? 'Unhealthy' : 'Not tested'
                    }
                  />
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {p.type} · {p.model}
                      {p.lastTestedAt && (
                        <span className="ml-2 text-[10px] opacity-70">
                          Tested {new Date(p.lastTestedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {settings.activeProviderId !== p.id && (
                  <button
                    onClick={() => onSetActive(p.id)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors bg-[var(--bg-content)] border border-[var(--border)] hover:bg-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Use
                  </button>
                )}
                {settings.activeProviderId === p.id && (
                  <span className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white font-medium shadow-sm">
                    Active
                  </span>
                )}
                <button
                  onClick={() => onRemove(p.id)}
                  className="flex items-center justify-center rounded-lg transition-colors hover:bg-red-50 hover:text-red-600 text-[var(--text-muted)]"
                  style={{ width: 28, height: 28 }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
              {editingProvider === p.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="password"
                    autoFocus
                    placeholder="New API Key"
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                    value={editApiKey}
                    onChange={(e) => onEditApiKeyChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveApiKey(p.id)
                      if (e.key === 'Escape') onCancelEdit()
                    }}
                  />
                  <button
                    onClick={() => onSaveApiKey(p.id)}
                    className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onStartEdit(p.id)}
                    className="text-[11px] px-2 py-1 rounded-md bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Edit Token
                  </button>
                  <button
                    onClick={async () => {
                      const models = await onFetchModels(p.id)
                      if (models.length > 0) {
                        onUpdateProvider(p.id, { models: models.map((m) => m.id) })
                      }
                    }}
                    className="text-[11px] px-2 py-1 rounded-md bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                  >
                    <RefreshCw size={10} />
                    Fetch Models
                  </button>
                  <button
                    onClick={() => onTestProvider(p.id)}
                    disabled={testingProvider === p.id}
                    className="text-[11px] px-2 py-1 rounded-md bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                  >
                    {testingProvider === p.id ? (
                      <>
                        <Loader2 size={10} className="animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Plug size={10} />
                        Test
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {p.models && p.models.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-muted)]">Model:</span>
                <select
                  value={p.model}
                  onChange={(e) => onUpdateProvider(p.id, { model: e.target.value })}
                  className="flex-1 text-xs px-2 py-1 rounded-md bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none"
                >
                  {p.models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
