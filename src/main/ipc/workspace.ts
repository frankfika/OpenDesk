import { ipcMain, BrowserWindow } from 'electron'
import { resolve, sep } from 'path'
import type { WorkspaceUpdatePayload } from '../../shared/types'
import {
  createWorkspace,
  listWorkspaces,
  updateWorkspace,
  removeWorkspace,
  relinkWorkspace,
  scanWorkspaceAgentsMd,
  pickFolder
} from '../workspace'

const channels = [
  'workspace:list',
  'workspace:add',
  'workspace:remove',
  'workspace:update',
  'workspace:relink',
  'workspace:scanAgentsMd'
]

function removeStaleListeners(): void {
  for (const ch of channels) {
    ipcMain.removeAllListeners(ch)
  }
}

export function getWorkspacePath(workspaceId?: string): string | null {
  if (!workspaceId) return null
  const workspaces = listWorkspaces()
  const ws = workspaces.find((w) => w.id === workspaceId)
  return ws?.folderPath ?? null
}

export function isPathAllowed(filePath: string, workspacePath: string | null): boolean {
  if (!workspacePath) return false
  const resolvedFile = resolve(filePath)
  const resolvedWorkspace = resolve(workspacePath)
  return resolvedFile === resolvedWorkspace || resolvedFile.startsWith(resolvedWorkspace + sep)
}

export function registerWorkspaceHandlers(_win: BrowserWindow): void {
  removeStaleListeners()

  ipcMain.handle('workspace:list', () => listWorkspaces())

  ipcMain.handle('workspace:add', async () => {
    const folderPath = await pickFolder()
    if (!folderPath) return null
    const existing = listWorkspaces().find((w) => w.folderPath === folderPath)
    if (existing) return existing
    return createWorkspace({ folderPath })
  })

  ipcMain.handle('workspace:remove', (_e, id: string) => removeWorkspace(id))

  ipcMain.handle('workspace:update', (_e, id: string, patch: WorkspaceUpdatePayload) => updateWorkspace(id, patch))

  ipcMain.handle('workspace:relink', async (_e, id: string, newPath?: string) => {
    const path = newPath || (await pickFolder())
    if (!path) return null
    return relinkWorkspace(id, path)
  })

  ipcMain.handle('workspace:scanAgentsMd', (_e, folderPath: string) => {
    return scanWorkspaceAgentsMd(folderPath)
  })
}
