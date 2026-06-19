import { app, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { randomUUID } from 'crypto'
import type { Workspace, WorkspaceCreatePayload, WorkspaceUpdatePayload, AgentsMdInfo } from '../shared/types'
import { scanAgentsMd } from './agents-md'

const WORKSPACES_FILE = 'workspaces.json'

function getDataDir(): string {
  const dir = join(app.getPath('userData'), 'opendesk')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getWorkspacesPath(): string {
  return join(getDataDir(), WORKSPACES_FILE)
}

function loadWorkspaces(): Workspace[] {
  const p = getWorkspacesPath()
  if (!existsSync(p)) return []
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as Workspace[]
  } catch {
    return []
  }
}

function saveWorkspaces(workspaces: Workspace[]): void {
  writeFileSync(getWorkspacesPath(), JSON.stringify(workspaces, null, 2), 'utf-8')
}

export function createWorkspace(payload: WorkspaceCreatePayload): Workspace {
  const now = Date.now()
  const workspace: Workspace = {
    id: randomUUID(),
    folderPath: payload.folderPath,
    name: payload.name || payload.folderPath.split(/[/\\]/).pop() || 'Untitled',
    createdAt: now,
    updatedAt: now,
    tags: [],
    status: 'active'
  }
  const workspaces = loadWorkspaces()
  workspaces.push(workspace)
  saveWorkspaces(workspaces)
  return workspace
}

export function listWorkspaces(): Workspace[] {
  const workspaces = loadWorkspaces()

  // Ensure there's always at least a default workspace
  if (workspaces.length === 0) {
    const defaultWorkspace = createDefaultWorkspace()
    workspaces.push(defaultWorkspace)
    saveWorkspaces(workspaces)
  }

  return workspaces
}

function createDefaultWorkspace(): Workspace {
  const now = Date.now()
  const defaultPath = join(app.getPath('userData'), 'opendesk', 'default-workspace')

  // Create the directory if it doesn't exist
  if (!existsSync(defaultPath)) {
    mkdirSync(defaultPath, { recursive: true })
  }

  return {
    id: 'default-workspace',
    folderPath: defaultPath,
    name: 'General',
    createdAt: now,
    updatedAt: now,
    tags: [],
    status: 'active',
    description: 'Default workspace for general conversations'
  }
}

export function updateWorkspace(id: string, patch: WorkspaceUpdatePayload): Workspace | null {
  const workspaces = loadWorkspaces()
  const idx = workspaces.findIndex((w) => w.id === id)
  if (idx === -1) return null
  workspaces[idx] = { ...workspaces[idx], ...patch, updatedAt: Date.now() }
  saveWorkspaces(workspaces)
  return workspaces[idx]
}

export function removeWorkspace(id: string): boolean {
  const workspaces = loadWorkspaces()
  const idx = workspaces.findIndex((w) => w.id === id)
  if (idx === -1) return false
  workspaces.splice(idx, 1)
  saveWorkspaces(workspaces)
  return true
}

export function relinkWorkspace(id: string, newPath: string): Workspace | null {
  const workspaces = loadWorkspaces()
  const idx = workspaces.findIndex((w) => w.id === id)
  if (idx === -1) return null
  workspaces[idx] = {
    ...workspaces[idx],
    folderPath: newPath,
    status: existsSync(newPath) ? 'active' : 'missing',
    updatedAt: Date.now()
  }
  saveWorkspaces(workspaces)
  return workspaces[idx]
}

export function scanWorkspaceAgentsMd(folderPath: string): AgentsMdInfo {
  return scanAgentsMd(folderPath)
}

export function pickFolder(): Promise<string | null> {
  return dialog
    .showOpenDialog({
      properties: ['openDirectory'],
      buttonLabel: 'Select Folder'
    })
    .then((result) => {
      if (result.canceled || result.filePaths.length === 0) return null
      return result.filePaths[0]
    })
}
