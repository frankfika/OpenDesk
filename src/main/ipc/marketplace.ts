import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { MARKETPLACE_BUNDLED, MARKETPLACE_REGISTRY_URL, type MarketplaceEntry } from '../marketplace/registry'
import { importSkillFromGitHub } from '../skills'

const channels = ['marketplace:list', 'marketplace:install']

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
    // Merge bundled + remote; remote wins on conflict (newer versions)
    const remote = await fetchRemoteRegistry()
    const map = new Map<string, MarketplaceEntry>()
    for (const e of MARKETPLACE_BUNDLED) map.set(e.id, e)
    for (const e of remote) map.set(e.id, e)
    return Array.from(map.values())
  })
  ipcMain.handle(
    'marketplace:install',
    async (_e, entry: MarketplaceEntry): Promise<{ ok: boolean; skillId?: string; error?: string; traceId: string }> => {
      const traceId = randomUUID()
      try {
        const result = await importSkillFromGitHub(entry.githubPath, entry.skillSubpath)
        return { ok: true, skillId: result?.skill?.id, traceId }
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          traceId
        }
      }
    }
  )
}