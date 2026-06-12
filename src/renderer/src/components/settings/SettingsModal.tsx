import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useSettingsStore } from '../../store/settings'
import { useWorkspaceStore } from '../../store/workspace'
import { useThemeStore } from '../../store/theme'
import { useToast } from '../../store/toast'
import ProviderForm from './ProviderForm'
import EmptyState from '../ui/EmptyState'
import { SkeletonProviderCard } from '../ui/Skeleton'
import type { ProviderConfig, DoctorReport, DoctorCheck } from '@shared/types'
import {
  X, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Sun, Moon, Monitor, FolderOpen, Trash2, FolderInput,
  Shield, ShieldCheck, ShieldAlert, Type, Globe, Power,
  Cpu, FileText, ExternalLink, ChevronRight, Plug, Wrench,
  Plus, Server, Zap, Database, Globe2, FileCode, MousePointer,
  Loader2, Bot
} from 'lucide-react'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const TAB_LIST = [
  { id: 'providers', label: 'Providers & Models' },
  { id: 'mcp', label: 'MCP Servers' },
  { id: 'workspaces', label: 'Workspaces' },
  { id: 'desktop', label: 'Desktop & Computer Use' },
  { id: 'general', label: 'General' },
  { id: 'doctor', label: 'Doctor' },
  { id: 'about', label: 'About' }
]

const PROVIDER_PRESETS = [
  { id: 'openai',     name: 'OpenAI',          icon: Bot, color: 'text-emerald-600', bg: 'bg-emerald-50',  baseUrl: 'https://api.openai.com/v1',               model: 'gpt-4o' },
  { id: 'anthropic',  name: 'Anthropic',        icon: Bot, color: 'text-orange-600',  bg: 'bg-orange-50',   baseUrl: 'https://api.anthropic.com/v1',             model: 'claude-sonnet-4-5' },
  { id: 'gemini',     name: 'Google Gemini',    icon: Bot, color: 'text-blue-600',    bg: 'bg-blue-50',     baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
  { id: 'deepseek',   name: 'DeepSeek',         icon: Bot, color: 'text-sky-600',     bg: 'bg-sky-50',      baseUrl: 'https://api.deepseek.com/v1',              model: 'deepseek-chat' },
  { id: 'ollama',     name: 'Ollama',           icon: Cpu, color: 'text-violet-600',  bg: 'bg-violet-50',   baseUrl: 'http://localhost:11434/v1',                 model: 'llama3' },
  { id: 'groq',       name: 'Groq',             icon: Bot, color: 'text-yellow-600',  bg: 'bg-yellow-50',   baseUrl: 'https://api.groq.com/openai/v1',           model: 'llama-3.3-70b-versatile' },
  { id: 'grok',       name: 'xAI Grok',         icon: Bot, color: 'text-neutral-600', bg: 'bg-neutral-50',  baseUrl: 'https://api.x.ai/v1',                      model: 'grok-3' },
  { id: 'mistral',    name: 'Mistral',          icon: Bot, color: 'text-indigo-600',  bg: 'bg-indigo-50',   baseUrl: 'https://api.mistral.ai/v1',                model: 'mistral-large-latest' },
  { id: 'doubao',     name: '豆包 (ByteDance)', icon: Bot, color: 'text-cyan-600',    bg: 'bg-cyan-50',     baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-pro-32k' },
  { id: 'kimi',       name: 'Kimi (Moonshot)',  icon: Bot, color: 'text-rose-600',    bg: 'bg-rose-50',     baseUrl: 'https://api.moonshot.cn/v1',               model: 'moonshot-v1-8k' },
  { id: 'glm',        name: 'GLM (智谱)',       icon: Bot, color: 'text-purple-600',  bg: 'bg-purple-50',   baseUrl: 'https://open.bigmodel.cn/api/paas/v4',     model: 'glm-4-flash' },
  { id: 'qwen',       name: 'Qwen (阿里)',      icon: Bot, color: 'text-amber-600',   bg: 'bg-amber-50',    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-max' },
  { id: 'openrouter', name: 'OpenRouter',       icon: Bot, color: 'text-teal-600',    bg: 'bg-teal-50',     baseUrl: 'https://openrouter.ai/api/v1',             model: 'openai/gpt-4o' },
  { id: 'custom',     name: 'Custom / Other',   icon: Bot, color: 'text-gray-600',    bg: 'bg-gray-50',     baseUrl: '',                                         model: '' },
]

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settings, addProvider, removeProvider, update, updateProvider, activeProvider, fetchModels, testProvider, addMCPServer, removeMCPServer, toggleMCPServer, mcpTools, refreshMCPTools, fetchMCPServers } = useSettingsStore()
  const { workspaces, removeWorkspace, loadWorkspaces, updateWorkspace } = useWorkspaceStore()
  const { theme, setTheme } = useThemeStore()
  const toast = useToast()
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormPreset, setAddFormPreset] = useState<{ name: string; baseUrl: string; model: string } | null>(null)
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [editApiKey, setEditApiKey] = useState('')
  const [doctorReport, setDoctorReport] = useState<DoctorReport | null>(null)
  const [doctorHistory, setDoctorHistory] = useState<DoctorReport[]>([])
  const [runningDoctor, setRunningDoctor] = useState(false)
  const [fontSize, setFontSize] = useState(14)
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
    const p = settings.providers.find(pr => pr.id === providerId)
    if (!p) return
    setTestingProvider(providerId)
    try {
      const apiKey = await window.api?.settings?.getApiKey?.(providerId) ?? ''
      const result = await testProvider(p.type, p.model, apiKey, p.baseUrl)
      if (result) {
        toast.success(`${p.name} connected successfully`)
      } else {
        toast.error(`${p.name} connection failed`, {
          label: 'Fix',
          onClick: () => setEditingProvider(providerId)
        })
      }
    } catch (e) {
      toast.error(`Failed to test ${p.name}`)
    } finally {
      setTestingProvider(null)
    }
  }

  async function handleSetActive(id: string) {
    await update({ activeProviderId: id })
    const p = settings.providers.find(pr => pr.id === id)
    if (p) {
      toast.success(`Switched to ${p.name}`)
    }
  }

  async function handleRemove(id: string) {
    const p = settings.providers.find(pr => pr.id === id)
    await removeProvider(id)
    if (p) {
      toast.info(`${p.name} removed`)
    }
  }

  async function handleRunDoctor() {
    setRunningDoctor(true)
    try {
      const report = await window.api.doctor.run()
      setDoctorReport(report)
      toast.success('Diagnostics complete')
    } catch (e) {
      console.error('Doctor failed:', e)
      toast.error('Diagnostics failed')
    }
    setRunningDoctor(false)
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
    const args = mcpArgs.split(',').map((a) => a.trim()).filter(Boolean)
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
      filesystem: { name: 'filesystem', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/path'] },
      github: { name: 'github', command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'], env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' } },
      sqlite: { name: 'sqlite', command: 'npx', args: ['-y', '@modelcontextprotocol/server-sqlite', '/path/to/db.sqlite'] },
      fetch: { name: 'fetch', command: 'npx', args: ['-y', '@modelcontextprotocol/server-fetch'] },
      puppeteer: { name: 'puppeteer', command: 'npx', args: ['-y', '@modelcontextprotocol/server-puppeteer'] }
    }
    const p = presets[preset]
    setMcpName(p.name)
    setMcpCommand(p.command)
    setMcpArgs(p.args.join(', '))
    if (p.env) setMcpEnv(Object.entries(p.env).map(([k, v]) => `${k}=${v}`).join('\n'))
    setShowAddMCP(true)
  }

  function statusIcon(status: 'pass' | 'warn' | 'fail') {
    if (status === 'pass') return <CheckCircle2 size={14} className="text-green-500" />
    if (status === 'warn') return <AlertTriangle size={14} className="text-yellow-500" />
    return <XCircle size={14} className="text-red-500" />
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
          </motion.div>
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
              <Dialog.Close className="flex items-center justify-center rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]" style={{ width: 28, height: 28 }}>
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
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[var(--text-secondary)]">AI Providers</span>
                    <button
                      onClick={() => { setShowAddForm((v) => !v); setEditingProvider(null) }}
                      className="text-xs px-3.5 py-2 rounded-lg font-medium transition-all duration-200 bg-[var(--accent)] text-white hover:opacity-90 shadow-sm hover:shadow"
                    >
                      {showAddForm ? 'Cancel' : '+ Add Provider'}
                    </button>
                  </div>

                  {showAddForm && (
                    <motion.div
                      className="mb-4 p-5 rounded-2xl bg-[var(--bg-content)] border border-[var(--border-strong)] shadow-sm"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <ProviderForm onSave={handleAddProvider} initialValues={addFormPreset ?? undefined} />
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
                        {PROVIDER_PRESETS.map((preset) => {
                          const Icon = preset.icon
                          return (
                            <motion.button
                              key={preset.id}
                              onClick={() => {
                                setAddFormPreset({ name: preset.name, baseUrl: preset.baseUrl, model: preset.model })
                                setShowAddForm(true)
                              }}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${preset.bg} border-[var(--border)] hover:border-[var(--border-strong)] hover:shadow-sm`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Icon size={14} className={preset.color} />
                              <span className="text-[var(--text-primary)]">{preset.name}</span>
                            </motion.button>
                          )
                        })}
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
                            {p.lastTestResult === true && <CheckCircle2 size={14} className="text-green-500" />}
                            {p.lastTestResult === false && <XCircle size={14} className="text-red-500" />}
                            {p.lastTestResult === undefined && <AlertTriangle size={14} className="text-yellow-500" />}
                            <div>
                              <div className="text-sm font-medium">{p.name}</div>
                              <div className="text-xs text-[var(--text-muted)]">{p.type} · {p.model}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {settings.activeProviderId !== p.id && (
                              <button
                                onClick={() => handleSetActive(p.id)}
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
                              onClick={() => handleRemove(p.id)}
                              className="flex items-center justify-center rounded-lg transition-colors hover:bg-red-50 hover:text-red-600 text-[var(--text-muted)]"
                              style={{ width: 28, height: 28 }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Edit API Key & Fetch Models */}
                        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                          {editingProvider === p.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="password"
                                autoFocus
                                placeholder="New API Key"
                                className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                                value={editApiKey}
                                onChange={(e) => setEditApiKey(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEditApiKey(p.id)
                                  if (e.key === 'Escape') { setEditingProvider(null); setEditApiKey('') }
                                }}
                              />
                              <button
                                onClick={() => handleEditApiKey(p.id)}
                                className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-white"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => { setEditingProvider(p.id); setEditApiKey('') }}
                                className="text-[11px] px-2 py-1 rounded-md bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                Edit Token
                              </button>
                              <button
                                onClick={async () => {
                                  const models = await fetchModels(p.id)
                                  if (models.length > 0) {
                                    updateProvider(p.id, { models: models.map((m) => m.id) })
                                  }
                                }}
                                className="text-[11px] px-2 py-1 rounded-md bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                              >
                                <RefreshCw size={10} />
                                Fetch Models
                              </button>
                              <button
                                onClick={() => handleTestProvider(p.id)}
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

                        {/* Model dropdown if models available */}
                        {p.models && p.models.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[var(--text-muted)]">Model:</span>
                            <select
                              value={p.model}
                              onChange={(e) => updateProvider(p.id, { model: e.target.value })}
                              className="flex-1 text-xs px-2 py-1 rounded-md bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none"
                            >
                              {p.models.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </Tabs.Content>

                {/* MCP Servers */}
                <Tabs.Content value="mcp" className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[var(--text-secondary)]">MCP Servers</span>
                    <button
                      onClick={() => { setShowAddMCP((v) => !v); setViewingTools(null) }}
                      className="text-xs px-3.5 py-2 rounded-lg font-medium transition-all duration-200 bg-[var(--accent)] text-white hover:opacity-90 shadow-sm hover:shadow"
                    >
                      {showAddMCP ? 'Cancel' : '+ Add Server'}
                    </button>
                  </div>

                  {/* Presets */}
                  {!showAddMCP && (
                    <div className="flex flex-wrap gap-2">
                      {([
                        { id: 'filesystem', label: 'Filesystem', icon: FolderOpen },
                        { id: 'github', label: 'GitHub', icon: Globe2 },
                        { id: 'sqlite', label: 'SQLite', icon: Database },
                        { id: 'fetch', label: 'Fetch', icon: Zap },
                        { id: 'puppeteer', label: 'Puppeteer', icon: MousePointer }
                      ] as const).map((preset) => {
                        const Icon = preset.icon
                        return (
                          <button
                            key={preset.id}
                            onClick={() => addPresetMCP(preset.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
                          >
                            <Icon size={12} />
                            {preset.label}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {showAddMCP && (
                    <form onSubmit={handleAddMCP} className="mb-4 p-5 rounded-2xl bg-[var(--bg-content)] border border-[var(--border-strong)] shadow-sm flex flex-col gap-3">
                      <div className="text-sm font-medium">Add MCP Server</div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-[var(--text-muted)]">Name</label>
                        <input
                          type="text"
                          value={mcpName}
                          onChange={(e) => setMcpName(e.target.value)}
                          placeholder="e.g. filesystem"
                          className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-[var(--text-muted)]">Command</label>
                        <div className="flex gap-2">
                          <select
                            value={mcpCommand}
                            onChange={(e) => setMcpCommand(e.target.value)}
                            className="px-3 py-2 rounded-lg text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none"
                          >
                            <option value="npx">npx</option>
                            <option value="python">python</option>
                            <option value="node">node</option>
                            <option value="custom">custom</option>
                          </select>
                          {mcpCommand === 'custom' && (
                            <input
                              type="text"
                              value={mcpCustomCommand}
                              onChange={(e) => setMcpCustomCommand(e.target.value)}
                              placeholder="command"
                              className="flex-1 px-3 py-2 rounded-lg text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                              required
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-[var(--text-muted)]">Args (comma separated)</label>
                        <input
                          type="text"
                          value={mcpArgs}
                          onChange={(e) => setMcpArgs(e.target.value)}
                          placeholder="-y, @modelcontextprotocol/server-filesystem, /path"
                          className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-[var(--text-muted)]">Env (optional, KEY=VALUE per line)</label>
                        <textarea
                          value={mcpEnv}
                          onChange={(e) => setMcpEnv(e.target.value)}
                          placeholder="GITHUB_PERSONAL_ACCESS_TOKEN=xxx"
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] resize-none"
                        />
                      </div>
                      <button
                        type="submit"
                        className="text-xs px-3 py-2 rounded-lg font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
                      >
                        Add Server
                      </button>
                    </form>
                  )}

                  {settings.mcpServers.length === 0 && !showAddMCP && (
                    <EmptyState
                      icon={Server}
                      title="No MCP servers yet"
                      description="Add an MCP server to extend AI capabilities with tools like filesystem access, web search, and more"
                      size="md"
                    />
                  )}

                  <div className="flex flex-col gap-2">
                    {settings.mcpServers.map((s) => {
                      const status = s.status || 'disconnected'
                      const isConnected = status === 'connected'
                      const isError = status === 'error'
                      const isConnecting = status === 'connecting'
                      return (
                        <div
                          key={s.name}
                          className="flex flex-col gap-2 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-content)]"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Server size={14} className={isConnected ? 'text-green-500' : isError ? 'text-red-500' : 'text-[var(--text-muted)]'} />
                              <div>
                                <div className="text-sm font-medium">{s.name}</div>
                                <div className="text-[11px] text-[var(--text-muted)]">{s.command} {s.args.join(' ')}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isConnected ? 'bg-green-100 text-green-700' :
                                isConnecting ? 'bg-yellow-100 text-yellow-700' :
                                isError ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {isConnecting ? 'connecting' : status}
                              </span>
                              <button
                                onClick={() => toggleMCPServer(s.name)}
                                className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                                  s.enabled
                                    ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]'
                                    : 'bg-[var(--bg-sidebar)] border-[var(--border)] text-[var(--text-muted)]'
                                }`}
                              >
                                {s.enabled ? 'On' : 'Off'}
                              </button>
                              <button
                                onClick={() => { setViewingTools(viewingTools === s.name ? null : s.name); refreshMCPTools() }}
                                className="text-[11px] px-2 py-1 rounded-md bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                <Wrench size={10} className="inline mr-1" />
                                Tools
                              </button>
                              <button
                                onClick={() => removeMCPServer(s.name)}
                                className="flex items-center justify-center rounded-lg transition-colors hover:bg-red-50 hover:text-red-600 text-[var(--text-muted)]"
                                style={{ width: 28, height: 28 }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {viewingTools === s.name && (
                            <div className="pt-2 border-t border-[var(--border)]">
                              <div className="text-[11px] font-medium text-[var(--text-muted)] mb-1">Available Tools</div>
                              <div className="flex flex-col gap-1">
                                {mcpTools.filter((t) => t.serverName === s.name).map((tool) => (
                                  <div key={tool.name} className="flex items-center gap-2 px-2 py-1 rounded-md bg-[var(--bg-sidebar)] text-[11px]">
                                    <Wrench size={10} className="text-[var(--text-muted)]" />
                                    <span className="font-medium text-[var(--text-primary)]">{tool.name}</span>
                                    <span className="text-[var(--text-muted)]">{tool.description}</span>
                                  </div>
                                ))}
                                {mcpTools.filter((t) => t.serverName === s.name).length === 0 && (
                                  <div className="text-[11px] text-[var(--text-muted)]">No tools available (server may be disconnected)</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Tabs.Content>

                {/* Workspaces */}
                <Tabs.Content value="workspaces" className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[var(--text-secondary)]">Registered Workspaces</span>
                  </div>
                  {workspaces.length === 0 ? (
                    <EmptyState
                      icon={FolderOpen}
                      title="No workspaces yet"
                      description="Open a folder to create a workspace and start chatting with context"
                      size="md"
                      actions={[
                        { label: 'Open Folder', onClick: () => { /* handled by workspace API */ }, icon: FolderOpen, variant: 'primary' }
                      ]}
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      {workspaces.map((ws) => (
                        <div key={ws.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-content)]">
                          <div className="flex items-center gap-3 min-w-0">
                            <FolderOpen size={16} className="text-[var(--text-muted)] shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{ws.name || ws.folderPath.split('/').pop()}</div>
                              <div className="text-[11px] text-[var(--text-muted)] truncate">{ws.folderPath}</div>
                              <div className="flex items-center gap-1 mt-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  ws.status === 'active' ? 'bg-green-100 text-green-700' :
                                  ws.status === 'missing' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {ws.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                const path = prompt('Enter new folder path:', ws.folderPath)
                                if (path) {
                                  updateWorkspace(ws.id, { folderPath: path, status: 'active' })
                                }
                              }}
                              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                              title="Relink"
                            >
                              <FolderInput size={14} />
                            </button>
                            <button
                              onClick={() => removeWorkspace(ws.id)}
                              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Remove"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Tabs.Content>

                {/* Desktop & Computer Use */}
                <Tabs.Content value="desktop" className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-content)]">
                    <div className="flex items-center gap-3">
                      {settings.desktopEnabled ? <ShieldCheck size={18} className="text-green-500" /> : <Shield size={18} className="text-[var(--text-muted)]" />}
                      <div>
                        <div className="text-sm font-medium">Desktop Control</div>
                        <div className="text-[11px] text-[var(--text-muted)]">Allow AI to control your desktop</div>
                      </div>
                    </div>
                    <button
                      onClick={() => update({ desktopEnabled: !settings.desktopEnabled })}
                      className={`relative w-10 h-6 rounded-full transition-colors ${settings.desktopEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.desktopEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-content)]">
                    <div className="text-sm font-medium mb-2">Permission Status</div>
                    <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                      <ShieldAlert size={14} />
                      <span>Screen recording permission required for desktop capture</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-content)]">
                    <div className="text-sm font-medium mb-2">Whitelist / Blacklist</div>
                    <textarea
                      className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] resize-none"
                      rows={3}
                      placeholder="Enter paths (one per line)..."
                    />
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                    <Cpu size={12} />
                    <span>Emergency stop: Press Esc during streaming to abort</span>
                  </div>
                </Tabs.Content>

                {/* General */}
                <Tabs.Content value="general" className="flex flex-col gap-5">
                  {/* Theme */}
                  <div>
                    <label className="block text-[13px] font-medium mb-2 text-[var(--text-primary)]">Theme</label>
                    <div className="flex gap-2">
                      {([
                        { value: 'light', icon: Sun, label: 'Light' },
                        { value: 'dark', icon: Moon, label: 'Dark' },
                        { value: 'system', icon: Monitor, label: 'System' }
                      ] as const).map((t) => {
                        const Icon = t.icon
                        const isActive = settings.theme === t.value
                        return (
                          <button
                            key={t.value}
                            onClick={() => {
                              update({ theme: t.value })
                              setTheme(t.value)
                            }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
                              isActive
                                ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30 text-[var(--text-primary)] shadow-sm'
                                : 'bg-[var(--bg-sidebar)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <Icon size={14} />
                            {t.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-[13px] font-medium mb-2 text-[var(--text-primary)]">Language</label>
                    <select
                      value={settings.language || 'en'}
                      onChange={(e) => update({ language: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-[13px] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                    >
                      <option value="en">English</option>
                      <option value="zh">中文</option>
                      <option value="ja">日本語</option>
                      <option value="es">Español</option>
                    </select>
                  </div>

                  {/* Startup behavior */}
                  <div>
                    <label className="block text-[13px] font-medium mb-2 text-[var(--text-primary)]">Startup Behavior</label>
                    <div className="flex gap-2">
                      {([
                        { value: 'restore', label: 'Restore' },
                        { value: 'new', label: 'New' },
                        { value: 'tray', label: 'Tray' }
                      ] as const).map((b) => (
                        <button
                          key={b.value}
                          onClick={() => update({ startupBehavior: b.value })}
                          className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 border ${
                            settings.startupBehavior === b.value
                              ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30 text-[var(--text-primary)] shadow-sm'
                              : 'bg-[var(--bg-sidebar)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font size */}
                  <div>
                    <label className="block text-[13px] font-medium mb-2 text-[var(--text-primary)] flex items-center gap-2">
                      <Type size={14} />
                      Font Size
                    </label>
                    <input
                      type="range"
                      min={12}
                      max={20}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-[var(--accent)]"
                    />
                    <div className="text-[11px] text-[var(--text-muted)] mt-1">{fontSize}px</div>
                  </div>
                </Tabs.Content>

                {/* Doctor */}
                <Tabs.Content value="doctor" className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[var(--text-secondary)]">System Diagnostics</span>
                    <button
                      onClick={handleRunDoctor}
                      disabled={runningDoctor}
                      className={`text-xs px-3.5 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm ${
                        runningDoctor
                          ? 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
                          : 'bg-[var(--accent)] text-white hover:opacity-90'
                      }`}
                    >
                      {runningDoctor ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 size={12} className="animate-spin" />
                          Running…
                        </span>
                      ) : (
                        'Run Diagnostics'
                      )}
                    </button>
                  </div>

                  {doctorReport && (
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-content)]">
                      <div className="flex items-center gap-2 mb-3">
                        {statusIcon(doctorReport.overall)}
                        <span className="text-sm font-medium">
                          Overall: {doctorReport.overall.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] ml-auto">
                          {new Date(doctorReport.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {doctorReport.checks.map((check, i) => (
                          <div key={i} className="flex items-start gap-2 text-[12px]">
                            {statusIcon(check.status)}
                            <div className="flex-1">
                              <div className="font-medium text-[var(--text-primary)]">{check.name}</div>
                              <div className="text-[var(--text-secondary)]">{check.message}</div>
                              {check.detail && (
                                <div className="text-[var(--text-muted)] mt-0.5">{check.detail}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {doctorHistory.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">History</div>
                      <div className="flex flex-col gap-1">
                        {doctorHistory.slice(0, 5).map((report, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border)] text-[12px]">
                            {statusIcon(report.overall)}
                            <span className="text-[var(--text-secondary)]">
                              {new Date(report.timestamp).toLocaleString()}
                            </span>
                            <span className="ml-auto text-[var(--text-muted)]">
                              {report.checks.length} checks
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Tabs.Content>

                {/* About */}
                <Tabs.Content value="about" className="flex flex-col gap-5">
                  <div className="text-center py-4">
                    <div className="text-2xl font-bold mb-1 text-[var(--text-primary)]">OpenDesk</div>
                    <div className="text-[13px] text-[var(--text-muted)]">v0.1.0 · Apache 2.0</div>
                  </div>

                  <button
                    onClick={() => {
                      alert('Update check not implemented yet')
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                  >
                    <RefreshCw size={14} />
                    Check for Updates
                  </button>

                  <div className="flex flex-col gap-2">
                    <a
                      href="https://github.com/opendesk/opendesk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] border border-transparent hover:border-[var(--border)] transition-colors"
                    >
                      <ExternalLink size={14} />
                      GitHub Repository
                      <ChevronRight size={12} className="ml-auto text-[var(--text-muted)]" />
                    </a>
                    <a
                      href="#"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] border border-transparent hover:border-[var(--border)] transition-colors"
                    >
                      <FileText size={14} />
                      Documentation
                      <ChevronRight size={12} className="ml-auto text-[var(--text-muted)]" />
                    </a>
                  </div>
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
