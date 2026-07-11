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

// Single source of truth for the in-process AppSettings instance. Replaces
// the previous `export let settings` pattern, which made the reference
// dangerous to capture (callers could pin a stale snapshot before
// `setSettings` reassigned the binding). Use `getSettings()` to read the
// current value; the returned reference is stable until the next set/patch.
let _settings: AppSettings = { ...defaultSettings }

export function getSettings(): AppSettings {
  return _settings
}

export function setSettings(next: AppSettings): void {
  _settings = next
}

export function patchSettings(patch: Partial<AppSettings>): void {
  _settings = { ..._settings, ...patch }
}
