import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
import { useToast } from '../../store/toast'
import ProvidersPanel from './ProvidersPanel'
import EnsemblePanel from './EnsemblePanel'
import WorkspaceMCPPanel from './WorkspaceMCPPanel'
import GeneralPanel from './GeneralPanel'
import AboutPanel from './AboutPanel'
import type { ProviderConfig } from '@shared/types'

import { X } from 'lucide-react'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const TAB_LIST = [
  { id: 'providers', label: 'Providers' },
  { id: 'ensemble', label: 'Ensemble' },
  { id: 'workspace', label: 'Workspace & MCP' },
  { id: 'general', label: 'General' },
  { id: 'about', label: 'About' }
]

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const {
    settings,
    addProvider,
    removeProvider,
    update,
    updateProvider,
    fetchModels,
    testProvider,
    addMCPServer,
    removeMCPServer,
    toggleMCPServer,
    mcpTools,
    refreshMCPTools,
    fetchMCPServers
  } = useSettingsStore()
  const { workspaces, removeWorkspace, loadWorkspaces } = useWorkspaceStore()
  const toast = useToast()
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormPreset, setAddFormPreset] = useState<{ name: string; baseUrl: string; model: string } | null>(null)
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [editApiKey, setEditApiKey] = useState('')
  const [showAddMCP, setShowAddMCP] = useState(false)
  const [mcpCommand, setMcpCommand] = useState('npx')
  const [mcpCustomCommand, setMcpCustomCommand] = useState('')
  const [mcpName, setMcpName] = useState('')
  const [mcpArgs, setMcpArgs] = useState('')
  const [mcpEnv, setMcpEnv] = useState('')
  const [viewingTools, setViewingTools] = useState<string | null>(null)
  const [testingProvider, setTestingProvider] = useState<string | null>(null)

  useEffect(() => {
    if (open && !workspaces.length) {
      loadWorkspaces()
    }
  }, [open, workspaces.length, loadWorkspaces])

  useEffect(() => {
    if (open) {
      fetchMCPServers()
    }
  }, [open, fetchMCPServers])

  async function handleAddProvider(config: ProviderConfig, apiKey: string) {
    await addProvider(config, apiKey)
    setShowAddForm(false)
    toast.success(`${config.name} connected`, {
      label: 'Test',
      onClick: () => handleTestProvider(config.id)
    })
  }

  async function handleTestProvider(providerId: string) {
    const p = settings.providers.find((pr) => pr.id === providerId)
    if (!p) return
    setTestingProvider(providerId)
    try {
      const result = await testProvider(p.id, p.type, p.model, p.baseUrl)
      await updateProvider(p.id, { lastTestResult: result, lastTestedAt: Date.now() })
      if (result) {
        toast.success(`${p.name} connected successfully`)
      } else {
        toast.error(`${p.name} connection failed`, {
          label: 'Fix',
          onClick: () => setEditingProvider(providerId)
        })
      }
    } catch {
      toast.error(`Failed to test ${p.name}`)
    } finally {
      setTestingProvider(null)
    }
  }

  async function handleTestAllProviders() {
    const enabledProviders = settings.providers.filter((p) => p.enabled)
    if (enabledProviders.length === 0) {
      toast.info('No enabled providers to test')
      return
    }
    for (const p of enabledProviders) {
      await handleTestProvider(p.id)
    }
  }

  async function handleSetActive(id: string) {
    await update({ activeProviderId: id })
    const p = settings.providers.find((pr) => pr.id === id)
    if (p) {
      toast.success(`Switched to ${p.name}`)
    }
  }

  async function handleRemove(id: string) {
    const p = settings.providers.find((pr) => pr.id === id)
    await removeProvider(id)
    if (p) {
      toast.info(`${p.name} removed`)
    }
  }

  function handleEditApiKey(providerId: string) {
    if (editApiKey.trim()) {
      window.api.settings.setApiKey(providerId, editApiKey.trim())
      setEditingProvider(null)
      setEditApiKey('')
      toast.success('API key updated')
    }
  }

  async function handleAddMCP(e: React.FormEvent) {
    e.preventDefault()
    const command = mcpCommand === 'custom' ? mcpCustomCommand.trim() : mcpCommand
    if (!command || !mcpName.trim()) return
    const args = mcpArgs
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean)
    const env: Record<string, string> = {}
    if (mcpEnv.trim()) {
      for (const line of mcpEnv.split('\n')) {
        const [k, v] = line.split('=')
        if (k && v) env[k.trim()] = v.trim()
      }
    }
    const success = await addMCPServer({
      name: mcpName.trim(),
      command,
      args,
      env: Object.keys(env).length > 0 ? env : undefined,
      enabled: true
    })
    if (success) {
      setShowAddMCP(false)
      setMcpName('')
      setMcpArgs('')
      setMcpEnv('')
      setMcpCommand('npx')
      setMcpCustomCommand('')
      toast.success(`MCP server '${mcpName.trim()}' added`, {
        label: 'Configure',
        onClick: () => setViewingTools(mcpName.trim())
      })
    }
  }

  function addPresetMCP(preset: 'filesystem' | 'github' | 'sqlite' | 'fetch' | 'puppeteer') {
    const presets: Record<string, { name: string; command: string; args: string[]; env?: Record<string, string> }> = {
      filesystem: {
        name: 'filesystem',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/path']
      },
      github: {
        name: 'github',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' }
      },
      sqlite: {
        name: 'sqlite',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sqlite', '/path/to/db.sqlite']
      },
      fetch: { name: 'fetch', command: 'npx', args: ['-y', '@modelcontextprotocol/server-fetch'] },
      puppeteer: { name: 'puppeteer', command: 'npx', args: ['-y', '@modelcontextprotocol/server-puppeteer'] }
    }
    const p = presets[preset]
    setMcpName(p.name)
    setMcpCommand(p.command)
    setMcpArgs(p.args.join(', '))
    if (p.env)
      setMcpEnv(
        Object.entries(p.env)
          .map(([k, v]) => `${k}=${v}`)
          .join('\n')
      )
    setShowAddMCP(true)
  }

  async function handleAddWorkspace() {
    const ws = await window.api?.workspace?.add()
    if (ws) loadWorkspaces()
  }

  async function handleRelinkWorkspace(id: string) {
    const newWs = await window.api?.workspace?.relink(id)
    if (newWs) loadWorkspaces()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="rounded-xl shadow-2xl overflow-hidden bg-[var(--bg-content)] border border-[var(--border-strong)] text-[var(--text-primary)] flex flex-col pointer-events-auto"
              style={{ width: 640, maxHeight: '85vh' }}
              initial={{ y: 30, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
                <Dialog.Title className="text-sm font-semibold">Settings</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Configure AI providers, ensemble settings, workspaces, and app preferences.
                </Dialog.Description>
                <Dialog.Close
                  className="flex items-center justify-center rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]"
                  style={{ width: 28, height: 28 }}
                  aria-label="Close settings"
                >
                  <X size={14} />
                </Dialog.Close>
              </div>

              <Tabs.Root defaultValue="providers" className="flex flex-col flex-1 min-h-0">
                <Tabs.List className="flex px-5 gap-1 border-b border-[var(--border)] shrink-0 overflow-x-auto">
                  {TAB_LIST.map((tab) => (
                    <Tabs.Trigger
                      key={tab.id}
                      value={tab.id}
                      className="px-3 py-3 text-[12px] font-medium transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-[0_2px_0_0_var(--accent)] whitespace-nowrap"
                    >
                      {tab.label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>

                <div className="flex-1 overflow-y-auto p-5">
                  {/* Providers & Models */}
                  <Tabs.Content value="providers" className="flex flex-col gap-4">
                    <ProvidersPanel
                      settings={settings}
                      showAddForm={showAddForm}
                      addFormPreset={addFormPreset}
                      editingProvider={editingProvider}
                      editApiKey={editApiKey}
                      testingProvider={testingProvider}
                      onToggleAddForm={() => {
                        setShowAddForm((v) => !v)
                        setEditingProvider(null)
                      }}
                      onPresetClick={(preset) => {
                        setAddFormPreset(preset)
                        setShowAddForm(true)
                      }}
                      onAddProvider={handleAddProvider}
                      onTestProvider={handleTestProvider}
                      onTestAll={handleTestAllProviders}
                      onSetActive={handleSetActive}
                      onRemove={handleRemove}
                      onStartEdit={(id) => {
                        setEditingProvider(id)
                        setEditApiKey('')
                      }}
                      onCancelEdit={() => {
                        setEditingProvider(null)
                        setEditApiKey('')
                      }}
                      onEditApiKeyChange={setEditApiKey}
                      onSaveApiKey={handleEditApiKey}
                      onFetchModels={fetchModels}
                      onUpdateProvider={updateProvider}
                    />
                  </Tabs.Content>

                  {/* Ensemble */}
                  <Tabs.Content value="ensemble" className="flex flex-col gap-5">
                    <EnsemblePanel settings={settings} providers={settings.providers} onUpdate={update} />
                  </Tabs.Content>

                  {/* MCP Servers */}
                  {/* Workspace & MCP */}
                  <Tabs.Content value="workspace" className="flex flex-col gap-5">
                    <WorkspaceMCPPanel
                      workspaces={workspaces}
                      mcpServers={settings.mcpServers}
                      mcpTools={mcpTools}
                      showAddMCP={showAddMCP}
                      mcpCommand={mcpCommand}
                      mcpCustomCommand={mcpCustomCommand}
                      mcpName={mcpName}
                      mcpArgs={mcpArgs}
                      mcpEnv={mcpEnv}
                      viewingTools={viewingTools}
                      onToggleAddMCP={() => {
                        setShowAddMCP((v) => !v)
                        setViewingTools(null)
                      }}
                      onMcpCommandChange={setMcpCommand}
                      onMcpCustomCommandChange={setMcpCustomCommand}
                      onMcpNameChange={setMcpName}
                      onMcpArgsChange={setMcpArgs}
                      onMcpEnvChange={setMcpEnv}
                      onAddMCP={handleAddMCP}
                      onAddWorkspace={handleAddWorkspace}
                      onRelinkWorkspace={handleRelinkWorkspace}
                      onRemoveWorkspace={removeWorkspace}
                      onToggleMCPServer={toggleMCPServer}
                      onRemoveMCPServer={removeMCPServer}
                      onToggleViewTools={(name) => {
                        setViewingTools((prev) => (prev === name ? null : name))
                        refreshMCPTools()
                      }}
                      onRefreshMCPTools={refreshMCPTools}
                      onAddPresetMCP={addPresetMCP}
                    />
                  </Tabs.Content>

                  {/* General */}
                  <Tabs.Content value="general" className="flex flex-col gap-5">
                    <GeneralPanel />
                  </Tabs.Content>

                  {/* About */}
                  <Tabs.Content value="about" className="flex flex-col gap-5">
                    <AboutPanel />
                  </Tabs.Content>
                </div>
              </Tabs.Root>
            </motion.div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
