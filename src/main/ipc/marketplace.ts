import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { MARKETPLACE_BUNDLED, MARKETPLACE_REGISTRY_URL, type MarketplaceEntry } from '../marketplace/registry'
import { importSkillFromGitHub } from '../skills'
import {
  listInstalled,
  recordInstall,
  removeInstalled,
  findInstalled,
  updateCheckResult,
  type InstalledSkillRecord
} from '../marketplace/lock'

const channels = [
  'marketplace:list',
  'marketplace:install',
  'marketplace:installed',
  'marketplace:uninstall',
  'marketplace:checkUpdates',
  'marketplace:findInstalled'
]

function removeStaleListeners(): void {
  for (const ch of channels) ipcMain.removeAllListeners(ch)
}

async function fetchRemoteRegistry(): Promise<MarketplaceEntry[]> {
  try {
    const res = await fetch(MARKETPLACE_REGISTRY_URL, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`registry fetch ${res.status}`)
    const data = (await res.json()) as { entries?: MarketplaceEntry[] }
    return Array.isArray(data.entries) ? data.entries : []
  } catch {
    return []
  }
}

export function registerMarketplaceHandlers(): void {
  removeStaleListeners()

  ipcMain.handle('marketplace:list', async () => {
    const remote = await fetchRemoteRegistry()
    const map = new Map<string, MarketplaceEntry>()
    for (const e of MARKETPLACE_BUNDLED) map.set(e.id, e)
    for (const e of remote) map.set(e.id, e)
    return Array.from(map.values())
  })

  ipcMain.handle(
    'marketplace:install',
    async (
      _e,
      entry: MarketplaceEntry
    ): Promise<{ ok: boolean; skillId?: string; error?: string; traceId: string; record?: InstalledSkillRecord }> => {
      const traceId = randomUUID()
      try {
        const result = await importSkillFromGitHub(entry.githubPath, entry.skillSubpath)
        const rec = recordInstall({
          id: entry.id,
          name: entry.name,
          version: entry.version ?? '0.0.0',
          installedAt: Date.now(),
          path: result?.skill?.path ?? ''
        })
        return { ok: true, skillId: result?.skill?.id, traceId, record: rec }
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          traceId
        }
      }
    }
  )

  ipcMain.handle('marketplace:installed', () => listInstalled())

  ipcMain.handle('marketplace:uninstall', (_e, id: string) => removeInstalled(id))

  ipcMain.handle(
    'marketplace:checkUpdates',
    async (): Promise<Array<InstalledSkillRecord>> => {
      const installed = listInstalled()
      const remote = await fetchRemoteRegistry()
      const remoteMap = new Map(remote.map((e) => [e.id, e]))
      const updates: InstalledSkillRecord[] = []
      for (const rec of installed) {
        const entry = remoteMap.get(rec.id)
        if (!entry?.version) continue
        const updated = updateCheckResult(rec.id, entry.version)
        if (updated) updates.push(updated)
      }
      return updates
    }
  )

  // Allow UI to query a single installed record for the "Update / Re-install" button
  ipcMain.handle('marketplace:findInstalled', (_e, id: string) => findInstalled(id))
}