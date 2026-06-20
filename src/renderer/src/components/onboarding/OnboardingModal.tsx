import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useWorkspaceStore } from '../../store/workspace'
import { useSettingsStore } from '../../store/settings'
import { Hexagon, FolderOpen, ArrowRight, SkipForward, KeyRound, Bot, Cpu, Check } from 'lucide-react'
import { PROVIDER_PRESETS_BY_ID } from '@shared/providers'

interface OnboardingModalProps {
  open: boolean
  onComplete: () => void
}

const STEPS = [
  { id: 0, title: 'Welcome' },
  { id: 1, title: 'First Workspace' },
  { id: 2, title: 'First Provider' }
]

const PROVIDER_TYPES = [
  { type: 'openai' as const, label: 'OpenAI', icon: KeyRound, color: 'text-[var(--success)]' },
  { type: 'anthropic' as const, label: 'Anthropic', icon: Bot, color: 'text-[var(--warning)]' },
  { type: 'ollama' as const, label: 'Ollama', icon: Cpu, color: 'text-[var(--info)]' }
]

export default function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [adding, setAdding] = useState(false)
  const { addWorkspace } = useWorkspaceStore()
  const { addProvider } = useSettingsStore()

  // Skip onboarding and start with guest mode
  function handleSkip() {
    onComplete()
  }

  async function handleOpenFolder() {
    try {
      const workspace = await addWorkspace('')
      if (workspace) {
        setStep(2)
      }
    } catch (e) {
      console.error('Failed to open folder:', e)
    }
  }

  async function handleAddProvider() {
    if (!selectedProvider) return
    const type = selectedProvider as 'openai' | 'anthropic' | 'ollama'
    const preset = PROVIDER_PRESETS_BY_ID[type]
    if (!preset) return
    setAdding(true)
    try {
      await addProvider(
        {
          id: Math.random().toString(36).slice(2) + Date.now().toString(36),
          name: preset.name,
          type,
          model: preset.model,
          baseUrl: preset.baseUrl,
          enabled: true
        },
        apiKey
      )
      onComplete()
    } catch (e) {
      console.error('Failed to add provider:', e)
    }
    setAdding(false)
  }

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <Dialog.Content
            className="rounded-2xl shadow-2xl overflow-hidden bg-[var(--bg-content)] border border-[var(--border-strong)] text-[var(--text-primary)]"
            style={{ width: 480, maxHeight: '80vh' }}
          >
            <Dialog.Title className="sr-only">Welcome to OpenDesk</Dialog.Title>
            <Dialog.Description className="sr-only">
              Set up your workspace and AI provider to get started with OpenDesk.
            </Dialog.Description>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 pt-6 pb-2">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      i <= step ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
                    }`}
                  />
                  {i < STEPS.length - 1 && (
                    <div
                      className={`w-8 h-px transition-colors ${
                        i < step ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step content */}
            <div className="px-8 py-6">
              {step === 0 && (
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--border)] flex items-center justify-center">
                    <Hexagon size={32} className="text-[var(--accent)]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Welcome to OpenDesk</h2>
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                      Your AI desktop assistant that can use any AI model.
                      <br />
                      You can start chatting right away or set up a provider first.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity shadow-sm"
                      aria-label="Start quick setup"
                    >
                      Quick Setup
                      <ArrowRight size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)] transition-colors"
                      aria-label="Skip setup and start"
                    >
                      <SkipForward size={16} />
                      Start Without Setup
                    </button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="flex flex-col gap-5">
                  <div className="text-center">
                    <h2 className="text-lg font-semibold mb-1">Workspace (Optional)</h2>
                    <p className="text-[13px] text-[var(--text-secondary)]">
                      Open a project folder to organize your AI conversations,
                      <br />
                      or skip to use the default workspace.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenFolder}
                    className="w-full flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-[var(--bg-sidebar)]/50 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--border)] flex items-center justify-center">
                      <FolderOpen size={24} className="text-[var(--text-muted)]" />
                    </div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">Open a folder</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Select any project folder on your computer
                    </div>
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)] transition-colors"
                    >
                      <SkipForward size={14} />
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col gap-5">
                  <div className="text-center">
                    <h2 className="text-lg font-semibold mb-1">AI Provider (Optional)</h2>
                    <p className="text-[13px] text-[var(--text-secondary)]">
                      Connect an AI model to start chatting,
                      <br />
                      or add it later in Settings.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {PROVIDER_TYPES.map((p) => {
                      const Icon = p.icon
                      const isSelected = selectedProvider === p.type
                      return (
                        <button
                          type="button"
                          key={p.type}
                          onClick={() => {
                            setSelectedProvider(p.type)
                            setApiKey('')
                          }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                            isSelected
                              ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5 shadow-sm'
                              : 'border-[var(--border)] hover:border-[var(--text-muted)] bg-[var(--bg-content)]'
                          }`}
                        >
                          <Icon size={18} className={p.color} />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{p.label}</div>
                            <div className="text-[11px] text-[var(--text-muted)]">
                              {p.type === 'ollama' ? 'Local model, no API key needed' : 'Requires API key'}
                            </div>
                          </div>
                          {isSelected && <Check size={16} className="text-[var(--accent)]" />}
                        </button>
                      )
                    })}
                  </div>

                  {selectedProvider && selectedProvider !== 'ollama' && (
                    <div>
                      <label className="block text-[12px] font-medium mb-1.5 text-[var(--text-primary)]">API Key</label>
                      <input
                        type="password"
                        autoFocus
                        className="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none font-mono bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--text-muted)] focus:shadow-sm transition-all"
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)] transition-colors"
                    >
                      Back
                    </button>
                    {selectedProvider && (selectedProvider === 'ollama' || apiKey) ? (
                      <button
                        type="button"
                        onClick={handleAddProvider}
                        disabled={adding}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${
                          adding
                            ? 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
                            : 'bg-[var(--accent)] text-white hover:opacity-90'
                        }`}
                      >
                        {adding ? 'Adding…' : 'Complete Setup'}
                        {!adding && <ArrowRight size={16} />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSkip}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)] transition-colors"
                      >
                        <SkipForward size={14} />
                        Skip & Start
                      </button>
                    )}
                  </div>

                  {selectedProvider && (selectedProvider === 'ollama' || apiKey) && (
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="flex items-center justify-center gap-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <SkipForward size={14} />
                      Skip and configure later
                    </button>
                  )}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
