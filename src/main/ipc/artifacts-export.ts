import { ipcMain, dialog, BrowserWindow } from 'electron'
import { exportArtifact, type ExportFormat } from '../artifacts/exporter'

const FORMATS: Record<ExportFormat, { ext: string; filterName: string }> = {
  docx: { ext: 'docx', filterName: 'Word Document' },
  xlsx: { ext: 'xlsx', filterName: 'Excel Spreadsheet' },
  pptx: { ext: 'pptx', filterName: 'PowerPoint' },
  md: { ext: 'md', filterName: 'Markdown' }
}

export function registerArtifactExportHandlers(win: BrowserWindow): void {
  ipcMain.removeAllListeners('artifact:export')

  ipcMain.handle(
    'artifact:export',
    async (_event, args: { format: ExportFormat; title?: string; content: string }): Promise<{ ok: true; path: string } | { ok: false; cancelled?: boolean; error?: string }> => {
      const meta = FORMATS[args.format]
      const defaultName = `${(args.title ?? 'OpenDesk Export').replace(/[^a-zA-Z0-9-_ ]/g, '_').slice(0, 60)}.${meta.ext}`
      const result = await dialog.showSaveDialog(win, {
        title: `Export as ${meta.filterName}`,
        defaultPath: defaultName,
        filters: [{ name: meta.filterName, extensions: [meta.ext] }]
      })
      if (result.canceled || !result.filePath) return { ok: false, cancelled: true }
      try {
        const path = await exportArtifact({
          format: args.format,
          title: args.title,
          content: args.content,
          outputPath: result.filePath
        })
        return { ok: true, path }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )
}