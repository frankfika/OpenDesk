import { FolderOpen, Trash2, FolderInput, Server, Zap, Database, Globe2, MousePointer, Wrench } from 'lucide-react'
import type { FormEvent, ElementType } from 'react'
import type { Workspace, MCPServerConfig, MCPTool } from '@shared/types'

interface WorkspaceMCPPanelProps {
  workspaces: Workspace[]
  mcpServers: MCPServerConfig[]
  mcpTools: MCPTool[]
  showAddMCP: boolean
  mcpCommand: string
  mcpCustomCommand: string
  mcpName: string
  mcpArgs: string
  mcpEnv: string
  viewingTools: string | null
  onToggleAddMCP: () => void
  onMcpCommandChange: (value: string) => void
  onMcpCustomCommandChange: (value: string) => void
  onMcpNameChange: (value: string) => void
  onMcpArgsChange: (value: string) => void
  onMcpEnvChange: (value: string) => void
  onAddMCP: (e: FormEvent) => void
  onAddWorkspace: () => void
  onRelinkWorkspace: (id: string) => void
  onRemoveWorkspace: (id: string) => void
  onToggleMCPServer: (name: string) => void
  onRemoveMCPServer: (name: string) => void
  onToggleViewTools: (name: string) => void
  onRefreshMCPTools: () => void
  onAddPresetMCP: (preset: 'filesystem' | 'github' | 'sqlite' | 'fetch' | 'puppeteer') => void
}

const MCP_PRESETS: {
  id: 'filesystem' | 'github' | 'sqlite' | 'fetch' | 'puppeteer'
  label: string
  icon: ElementType
}[] = [
  { id: 'filesystem', label: 'Filesystem', icon: FolderOpen },
  { id: 'github', label: 'GitHub', icon: Globe2 },
  { id: 'sqlite', label: 'SQLite', icon: Database },
  { id: 'fetch', label: 'Fetch', icon: Zap },
  { id: 'puppeteer', label: 'Puppeteer', icon: MousePointer }
]

export default function WorkspaceMCPPanel({
  workspaces,
  mcpServers,
  mcpTools,
  showAddMCP,
  mcpCommand,
  mcpCustomCommand,
  mcpName,
  mcpArgs,
  mcpEnv,
  viewingTools,
  onToggleAddMCP,
  onMcpCommandChange,
  onMcpCustomCommandChange,
  onMcpNameChange,
  onMcpArgsChange,
  onMcpEnvChange,
  onAddMCP,
  onAddWorkspace,
  onRelinkWorkspace,
  onRemoveWorkspace,
  onToggleMCPServer,
  onRemoveMCPServer,
  onToggleViewTools,
  onRefreshMCPTools,
  onAddPresetMCP
}: WorkspaceMCPPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium">Workspaces</span>
          <button
            onClick={onAddWorkspace}
            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
          >
            + Add Folder
          </button>
        </div>
        {workspaces.length === 0 ? (
          <div className="text-[12px] text-[var(--text-muted)] py-2">
            No workspaces yet. Add a folder to get started.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-content)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FolderOpen size={15} className="text-[var(--text-muted)] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{ws.name || ws.folderPath.split('/').pop()}</div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate">{ws.folderPath}</div>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                      ws.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : ws.status === 'missing'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-[var(--border)] text-[var(--text-muted)]'
                    }`}
                  >
                    {ws.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onRelinkWorkspace(ws.id)}
                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
                    title="Relink folder"
                  >
                    <FolderInput size={14} />
                  </button>
                  <button
                    onClick={() => onRemoveWorkspace(ws.id)}
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
      </section>

      <section className="border-t border-[var(--border)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium">MCP Servers</span>
          <button
            onClick={onToggleAddMCP}
            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
          >
            {showAddMCP ? 'Cancel' : '+ Add Server'}
          </button>
        </div>

        {!showAddMCP && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {MCP_PRESETS.map((p) => {
              const Icon = p.icon
              return (
                <button
                  key={p.id}
                  onClick={() => onAddPresetMCP(p.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
                >
                  <Icon size={11} />
                  {p.label}
                </button>
              )
            })}
          </div>
        )}

        {showAddMCP && (
          <form
            onSubmit={onAddMCP}
            className="mb-3 p-4 rounded-xl bg-[var(--bg-content)] border border-[var(--border-strong)] flex flex-col gap-3"
          >
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[11px] text-[var(--text-muted)]">Name</label>
                <input
                  type="text"
                  value={mcpName}
                  onChange={(e) => onMcpNameChange(e.target.value)}
                  placeholder="e.g. filesystem"
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[var(--text-muted)]">Command</label>
                <select
                  value={mcpCommand}
                  onChange={(e) => onMcpCommandChange(e.target.value)}
                  className="px-3 py-2 rounded-lg text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none"
                >
                  <option value="npx">npx</option>
                  <option value="python">python</option>
                  <option value="node">node</option>
                  <option value="custom">custom…</option>
                </select>
              </div>
            </div>
            {mcpCommand === 'custom' && (
              <input
                type="text"
                value={mcpCustomCommand}
                onChange={(e) => onMcpCustomCommandChange(e.target.value)}
                placeholder="full command"
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
                required
              />
            )}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--text-muted)]">Args (comma-separated)</label>
              <input
                type="text"
                value={mcpArgs}
                onChange={(e) => onMcpArgsChange(e.target.value)}
                placeholder="-y, @modelcontextprotocol/server-filesystem, /path"
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[var(--text-muted)]">Env vars (KEY=VALUE, one per line)</label>
              <textarea
                value={mcpEnv}
                onChange={(e) => onMcpEnvChange(e.target.value)}
                placeholder="GITHUB_PERSONAL_ACCESS_TOKEN=xxx"
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] resize-none"
              />
            </div>
            <button
              type="submit"
              className="text-xs px-3 py-2 rounded-lg font-medium bg-[var(--accent)] text-white hover:opacity-90 self-end"
            >
              Add Server
            </button>
          </form>
        )}

        {mcpServers.length === 0 && !showAddMCP && (
          <div className="text-[12px] text-[var(--text-muted)] py-2">
            No MCP servers. Add one above or use a preset.
          </div>
        )}
        <div className="flex flex-col gap-2">
          {mcpServers.map((s) => {
            const status = s.status || 'disconnected'
            const isConnected = status === 'connected'
            const isError = status === 'error'
            return (
              <div
                key={s.name}
                className="flex flex-col gap-2 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-content)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server
                      size={13}
                      className={isConnected ? 'text-green-500' : isError ? 'text-red-500' : 'text-[var(--text-muted)]'}
                    />
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)] font-mono">
                        {s.command} {s.args.slice(0, 3).join(' ')}
                        {s.args.length > 3 ? '…' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        isConnected
                          ? 'bg-green-100 text-green-700'
                          : isError
                            ? 'bg-red-100 text-red-700'
                            : 'bg-[var(--border)] text-[var(--text-muted)]'
                      }`}
                    >
                      {status}
                    </span>
                    <button
                      onClick={() => onToggleMCPServer(s.name)}
                      className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                        s.enabled
                          ? 'bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)]'
                          : 'bg-[var(--bg-sidebar)] border-[var(--border)] text-[var(--text-muted)]'
                      }`}
                    >
                      {s.enabled ? 'On' : 'Off'}
                    </button>
                    <button
                      onClick={() => {
                        onToggleViewTools(s.name)
                        onRefreshMCPTools()
                      }}
                      className="text-[11px] px-2 py-1 rounded-md bg-[var(--bg-sidebar)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <Wrench size={10} className="inline mr-1" />
                      Tools
                    </button>
                    <button
                      onClick={() => onRemoveMCPServer(s.name)}
                      className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {viewingTools === s.name && (
                  <div className="pt-2 border-t border-[var(--border)]">
                    {mcpTools.filter((t) => t.serverName === s.name).length === 0 ? (
                      <div className="text-[11px] text-[var(--text-muted)]">No tools (server may be disconnected)</div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {mcpTools
                          .filter((t) => t.serverName === s.name)
                          .map((tool) => (
                            <div
                              key={tool.name}
                              className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-[var(--bg-sidebar)] text-[11px]"
                            >
                              <Wrench size={10} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                              <div>
                                <span className="font-medium text-[var(--text-primary)]">{tool.name}</span>
                                {tool.description && (
                                  <span className="text-[var(--text-muted)] ml-2">{tool.description}</span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
