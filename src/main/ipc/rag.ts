import { ipcMain, BrowserWindow } from 'electron'
import { initRAGService, getRAGService } from '../rag'
import { getWorkspacePath } from './workspace'

export function registerRAGHandlers(_win: BrowserWindow): void {
  ipcMain.handle('rag:init', async (_event, workspaceId: string) => {
    const workspacePath = getWorkspacePath(workspaceId)
    if (!workspacePath) {
      return { success: false, error: 'Workspace not found' }
    }

    try {
      const service = await initRAGService({
        workspaceDataDir: workspacePath
      })
      return { success: true, adapterName: service.adapter.name, status: service.adapter.status }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('rag:indexFile', async (_event, workspaceId: string, filePath: string) => {
    try {
      const service = getRAGService()
      const source = await service.indexFile(workspaceId, filePath)
      return { success: true, source }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('rag:search', async (_event, workspaceId: string, query: string, topK?: number) => {
    try {
      const service = getRAGService()
      const results = await service.search(workspaceId, query, topK)
      return { success: true, results }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('rag:listSources', async (_event, workspaceId: string) => {
    try {
      const service = getRAGService()
      const sources = await service.listSources(workspaceId)
      return { success: true, sources }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('rag:deleteSource', async (_event, workspaceId: string, sourceId: string) => {
    try {
      const service = getRAGService()
      await service.deleteSource(workspaceId, sourceId)
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('rag:health', async () => {
    try {
      const service = getRAGService()
      const healthy = await service.adapter.health()
      return { success: true, healthy, status: service.adapter.status, name: service.adapter.name }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  })
}
