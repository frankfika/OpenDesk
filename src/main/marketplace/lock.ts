/**
 * Marketplace lock — track installed Skills + their version pinning.
 *
 * Persisted to `userData/marketplace.lock.json`. Survives restarts.
 *
 * Schema:
 *   {
 *     installed: Array<{
 *       id: string                // Marketplace entry id
 *       name: string              // for display
 *       version: string           // pinned version (semver)
 *       installedAt: number
 *       lastCheckedAt: number
 *       latestVersion?: string    // populated after update check
 *       updateAvailable?: boolean
 *       path: string              // local install path
 *     }>
 *   }
 */

import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

export interface InstalledSkillRecord {
  id: string
  name: string
  version: string
  installedAt: number
  lastCheckedAt: number
  latestVersion?: string
  updateAvailable?: boolean
  path: string
}

interface LockFile {
  installed: InstalledSkillRecord[]
}

const LOCK_PATH = (): string => join(app.getPath('userData'), 'marketplace.lock.json')

function read(): LockFile {
  const p = LOCK_PATH()
  if (!existsSync(p)) return { installed: [] }
  try {
    const raw = JSON.parse(readFileSync(p, 'utf8'))
    if (raw && Array.isArray(raw.installed)) return raw as LockFile
  } catch {
    // ignore
  }
  return { installed: [] }
}

function write(lock: LockFile): void {
  const p = LOCK_PATH()
  mkdirSync(dirnameSafe(p), { recursive: true })
  writeFileSync(p, JSON.stringify(lock, null, 2), 'utf8')
}

function dirnameSafe(p: string): string {
  // Tiny helper to avoid importing dirname from 'path' just for one call.
  const i = p.lastIndexOf('/')
  return i === -1 ? p : p.slice(0, i)
}

export function listInstalled(): InstalledSkillRecord[] {
  return read().installed
}

export function recordInstall(rec: Omit<InstalledSkillRecord, 'lastCheckedAt' | 'updateAvailable'>): InstalledSkillRecord {
  const lock = read()
  // Replace any existing record for this id (re-install)
  const idx = lock.installed.findIndex((x) => x.id === rec.id)
  const full: InstalledSkillRecord = {
    ...rec,
    lastCheckedAt: Date.now(),
    updateAvailable: false
  }
  if (idx !== -1) lock.installed[idx] = full
  else lock.installed.push(full)
  write(lock)
  return full
}

export function removeInstalled(id: string): boolean {
  const lock = read()
  const idx = lock.installed.findIndex((x) => x.id === id)
  if (idx === -1) return false
  lock.installed.splice(idx, 1)
  write(lock)
  return true
}

export function updateCheckResult(id: string, latestVersion: string): InstalledSkillRecord | null {
  const lock = read()
  const rec = lock.installed.find((x) => x.id === id)
  if (!rec) return null
  rec.lastCheckedAt = Date.now()
  rec.latestVersion = latestVersion
  rec.updateAvailable = compareVersions(latestVersion, rec.version) > 0
  write(lock)
  return rec
}

export function findInstalled(id: string): InstalledSkillRecord | null {
  return read().installed.find((x) => x.id === id) ?? null
}

/**
 * Compare two semver-ish strings ("1.2.3" / "0.1.0-beta"). Returns:
 *   1 if a > b
 *  -1 if a < b
 *   0 if equal
 * Pre-release tags sort before the matching release ("0.1.0-beta" < "0.1.0").
 */
function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  for (let i = 0; i < Math.max(pa.parts.length, pb.parts.length); i++) {
    const x = pa.parts[i] ?? 0
    const y = pb.parts[i] ?? 0
    if (x !== y) return x > y ? 1 : -1
  }
  // equal numerically; check pre-release tags
  if (pa.pre && !pb.pre) return -1
  if (!pa.pre && pb.pre) return 1
  if (pa.pre && pb.pre) return pa.pre.localeCompare(pb.pre)
  return 0
}

function parseVersion(v: string): { parts: number[]; pre: string | null } {
  const m = /^(\d+(?:\.\d+)*)(?:-(.+))?$/.exec(v.trim())
  if (!m) return { parts: [0], pre: null }
  const parts = m[1].split('.').map((x) => parseInt(x, 10) || 0)
  return { parts, pre: m[2] ?? null }
}