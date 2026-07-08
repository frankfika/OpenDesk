import { app, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import type { AppSettings } from '../../shared/types'
import { buildProviderById } from './builder'

interface HealthRecord {
  result: boolean
  timestamp: number
}

const healthRecords = new Map<string, HealthRecord>()
let intervalId: NodeJS.Timeout | null = null

function getConfigDir(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getKeysPath(): string {
  return join(getConfigDir(), 'keys.bin')
}

function loadKeys(): Record<string, string> {
  const p = getKeysPath()
  if (!existsSync(p)) return {}
  try {
    const buf = readFileSync(p)
    const decrypted = safeStorage.decryptString(buf)
    return JSON.parse(decrypted) as Record<string, string>
  } catch {
    return {}
  }
}

async function testProvider(providerId: string, settings: AppSettings): Promise<boolean> {
  const keys = loadKeys()
  const apiKey = keys[providerId] ?? ''
  const provider = buildProviderById(settings.providers, providerId, apiKey)
  if (!provider) return false
  try {
    return await provider.test()
  } catch {
    return false
  }
}

export function startHealthChecks(
  getSettings: () => AppSettings,
  onResult: (providerId: string, result: boolean) => void
): () => void {
  // Clear any existing interval
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }

  async function checkAll() {
    const settings = getSettings()
    for (const provider of settings.providers) {
      if (!provider.enabled) continue
      const result = await testProvider(provider.id, settings)
      healthRecords.set(provider.id, { result, timestamp: Date.now() })
      onResult(provider.id, result)
    }
  }

  // Run immediately
  checkAll()

  // Schedule every 5 minutes
  intervalId = setInterval(checkAll, 5 * 60 * 1000)

  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
}

export function getHealthRecord(providerId: string): HealthRecord | undefined {
  return healthRecords.get(providerId)
}
