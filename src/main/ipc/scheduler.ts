import { ipcMain } from 'electron'
import {
  createTask,
  updateTask,
  deleteTask,
  listTasks,
  runTaskNow,
  isValidCron,
  reportTaskFinished,
  type TaskAction
} from '../scheduler/scheduler'

const channels = [
  'scheduler:list',
  'scheduler:create',
  'scheduler:update',
  'scheduler:delete',
  'scheduler:run',
  'scheduler:validate',
  'scheduler:reportFinished'
]

function removeStaleListeners(): void {
  for (const ch of channels) ipcMain.removeAllListeners(ch)
}

export function registerSchedulerHandlers(): void {
  removeStaleListeners()
  ipcMain.handle('scheduler:list', () => listTasks())
  ipcMain.handle(
    'scheduler:create',
    (_e, input: { name: string; cron: string; action: TaskAction }) => createTask(input)
  )
  ipcMain.handle(
    'scheduler:update',
    (
      _e,
      id: string,
      patch: Partial<{ name: string; cron: string; action: TaskAction; enabled: boolean }>
    ) => updateTask(id, patch)
  )
  ipcMain.handle('scheduler:delete', (_e, id: string) => deleteTask(id))
  ipcMain.handle('scheduler:run', (_e, id: string) => runTaskNow(id))
  ipcMain.handle('scheduler:validate', (_e, expr: string) => isValidCron(expr))
  ipcMain.handle(
    'scheduler:reportFinished',
    (_e, id: string, status: 'success' | 'error', error?: string) => reportTaskFinished(id, status, error)
  )
}