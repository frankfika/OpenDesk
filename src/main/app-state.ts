import type { AppSettings, MCPServerConfig, ProviderConfig } from '../shared/types'

export const defaultSettings: AppSettings = {
  activeProviderId: null,
  activeWorkspaceId: null,
  activeThreadId: null,
  providers: [] as ProviderConfig[],
  mcpServers: [] as MCPServerConfig[],
  theme: 'dark',
  language: 'en',
  startupBehavior: 'restore',
  autoUpdate: false,
  desktopEnabled: false,
  approvalMode: 'auto-edits',
  showThinking: false
}

export let settings: AppSettings = { ...defaultSettings }

export function setSettings(next: AppSettings): void {
  settings = next
}

export function patchSettings(patch: Partial<AppSettings>): void {
  settings = { ...settings, ...patch }
}
