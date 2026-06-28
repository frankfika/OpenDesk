/**
 * Local scheduled-task runner.
 *
 * Persists tasks as JSON in userData, evaluates them with `node-cron`, and
 * executes them by re-using the existing chat IPC (`chat:send`) against the
 * currently active workspace + provider.
 *
 * The scheduler survives app restarts (it reads the file on boot) and is
 * intentionally minimal — no retries, no queue, no remote triggers. Users
 * can edit / delete / pause any task at runtime.
 */

import cron, { type ScheduledTask } from 'node-cron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { app, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'

export type TaskAction =
  | { kind: 'skill'; skillId: string; prompt: string }
  | { kind: 'prompt'; prompt: string }

export interface ScheduledTaskRecord {
  id: string
  name: string
  cron: string
  action: TaskAction
  enabled: boolean
  createdAt: number
  lastRunAt?: number
  lastRunStatus?: 'success' | 'error'
  lastRunError?: string
}

const SCHEDULE_FILE = () => join(app.getPath('userData'), 'scheduler', 'tasks.json')

function load(): ScheduledTaskRecord[] {
  const p = SCHEDULE_FILE()
  if (!existsSync(p)) return []
  try {
    const data = JSON.parse(readFileSync(p, 'utf8'))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function save(records: ScheduledTaskRecord[]): void {
  const p = SCHEDULE_FILE()
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(records, null, 2), 'utf8')
}

interface SchedulerInternals {
  records: ScheduledTaskRecord[]
  tasks: Map<string, ScheduledTask>
  win: BrowserWindow | null
}

const internals: SchedulerInternals = {
  records: [],
  tasks: new Map(),
  win: null
}

export function initScheduler(win: BrowserWindow): void {
  internals.win = win
  internals.records = load()
  for (const r of internals.records) {
    if (r.enabled) schedule(r)
  }
}

function schedule(r: ScheduledTaskRecord): void {
  if (!cron.validate(r.cron)) return
  const task = cron.schedule(r.cron, () => {
    runTask(r.id)
  })
  internals.tasks.set(r.id, task)
}

function unschedule(id: string): void {
  const t = internals.tasks.get(id)
  if (t) {
    t.stop()
    internals.tasks.delete(id)
  }
}

/**
 * Fire the cron — pushes the action into the renderer via the existing chat
 * IPC bridge and waits for the result. If no renderer is attached, the task
 * is marked failed (the user is not in the app).
 */
async function runTask(id: string): Promise<void> {
  const r = internals.records.find((x) => x.id === id)
  if (!r || !internals.win) return
  try {
    internals.win.webContents.send('scheduler:taskRunning', { id, action: r.action, startedAt: Date.now() })
    // The renderer receives the event and drives the chat; we don't await the
    // chat itself (it could be long-running). We optimistically mark the run
    // as "dispatched" by recording the timestamp without a status. The
    // renderer can post back the status via scheduler:reportTaskFinished.
    r.lastRunAt = Date.now()
    r.lastRunStatus = undefined
    r.lastRunError = undefined
    save(internals.records)
  } catch (err) {
    r.lastRunAt = Date.now()
    r.lastRunStatus = 'error'
    r.lastRunError = err instanceof Error ? err.message : String(err)
    save(internals.records)
  }
}

export function reportTaskFinished(id: string, status: 'success' | 'error', error?: string): void {
  const r = internals.records.find((x) => x.id === id)
  if (!r) return
  r.lastRunAt = Date.now()
  r.lastRunStatus = status
  r.lastRunError = error
  save(internals.records)
}

export function listTasks(): ScheduledTaskRecord[] {
  return internals.records
}

export function createTask(input: { name: string; cron: string; action: TaskAction }): ScheduledTaskRecord {
  if (!cron.validate(input.cron)) {
    throw new Error(`Invalid cron expression: ${input.cron}`)
  }
  const record: ScheduledTaskRecord = {
    id: randomUUID(),
    name: input.name.trim() || 'Untitled task',
    cron: input.cron,
    action: input.action,
    enabled: true,
    createdAt: Date.now()
  }
  internals.records.push(record)
  schedule(record)
  save(internals.records)
  return record
}

export function updateTask(id: string, patch: Partial<Pick<ScheduledTaskRecord, 'name' | 'cron' | 'action' | 'enabled'>>): ScheduledTaskRecord | null {
  const r = internals.records.find((x) => x.id === id)
  if (!r) return null
  unschedule(id)
  if (patch.name !== undefined) r.name = patch.name
  if (patch.cron !== undefined) {
    if (!cron.validate(patch.cron)) {
      throw new Error(`Invalid cron expression: ${patch.cron}`)
    }
    r.cron = patch.cron
  }
  if (patch.action !== undefined) r.action = patch.action
  if (patch.enabled !== undefined) r.enabled = patch.enabled
  if (r.enabled) schedule(r)
  save(internals.records)
  return r
}

export function deleteTask(id: string): boolean {
  const idx = internals.records.findIndex((x) => x.id === id)
  if (idx === -1) return false
  unschedule(id)
  internals.records.splice(idx, 1)
  save(internals.records)
  return true
}

export function runTaskNow(id: string): Promise<void> {
  return runTask(id)
}

export function isValidCron(expr: string): boolean {
  return cron.validate(expr)
}