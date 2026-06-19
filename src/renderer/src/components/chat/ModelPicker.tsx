import { useState, useEffect, useMemo, useRef } from 'react'
import { Cpu, ChevronDown, Check, Search } from 'lucide-react'
import { useSettingsStore } from '../../store/settings'

interface ModelPickerProps {
  onOpenSettings: () => void
}

export default function ModelPicker({ onOpenSettings }: ModelPickerProps) {
  const { settings, activeProvider, update, updateProvider, fetchModels } = useSettingsStore()
  const provider = activeProvider()
  const containerRef = useRef<HTMLDivElement>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [search, setSearch] = useState('')
  const [fetchedModels, setFetchedModels] = useState<string[]>([])

  useEffect(() => {
    const handler = () => setShowPicker(true)
    window.addEventListener('opendesk:focus-model', handler)
    return () => window.removeEventListener('opendesk:focus-model', handler)
  }, [])

  useEffect(() => {
    if (!showPicker) return
    function onMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [showPicker])

  useEffect(() => {
    if (provider?.models && provider.models.length > 0) {
      setFetchedModels(provider.models)
    } else if (provider?.id) {
      fetchModels(provider.id)
        .then((models) => {
          if (models && models.length > 0) {
            setFetchedModels(models.map((m) => m.id))
          }
        })
        .catch(() => {})
    }
  }, [provider?.id, provider?.models, fetchModels])

  const filteredModels = useMemo(
    () => fetchedModels.filter((m) => m.toLowerCase().includes(search.toLowerCase())),
    [fetchedModels, search]
  )

  return (
    <div ref={containerRef} className="relative" onMouseDown={(e) => e.stopPropagation()}>
      <button
        onClick={() => {
          setShowPicker((v) => !v)
          setShowSearch(false)
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors hover:bg-[var(--border)] text-[var(--text-secondary)]"
      >
        <Cpu size={14} />
        <span className="max-w-[120px] truncate font-medium">{provider ? provider.name : 'No provider'}</span>
        <ChevronDown size={14} />
      </button>

      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 rounded-lg overflow-hidden z-50 py-1 bg-[var(--bg-content)] border border-[var(--border)] shadow-lg min-w-[240px]">
          {settings.providers.length === 0 ? (
            <button
              onClick={() => {
                setShowPicker(false)
                onOpenSettings()
              }}
              className="w-full px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--bg-sidebar)] font-medium"
            >
              + Add a provider
            </button>
          ) : (
            <>
              {settings.providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    update({ activeProviderId: p.id })
                    setShowPicker(false)
                  }}
                  className={`w-full px-3 py-2 text-sm text-left transition-colors flex items-center justify-between ${
                    p.id === settings.activeProviderId
                      ? 'bg-[var(--bg-sidebar)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)]'
                  }`}
                >
                  <span className="font-medium">
                    {p.name} · {p.model}
                  </span>
                  {p.id === settings.activeProviderId && <Check size={14} />}
                </button>
              ))}
              <div className="h-px bg-[var(--border)] my-1" />
              <div className="px-2 py-1">
                <button
                  onClick={() => setShowSearch((v) => !v)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)] transition-colors"
                >
                  <Search size={12} />
                  Search models…
                </button>
                {showSearch && (
                  <div className="mt-1">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search models…"
                      className="w-full px-2 py-1.5 rounded-md text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {filteredModels.length > 0 && (
                      <div className="mt-1 max-h-[120px] overflow-y-auto">
                        {filteredModels.map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              if (provider) {
                                updateProvider(provider.id, { model: m })
                              }
                              setShowSearch(false)
                              setShowPicker(false)
                            }}
                            className="w-full px-2 py-1 text-left text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar)] rounded transition-colors"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
