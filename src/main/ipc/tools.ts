import { ipcMain, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import { join, resolve } from 'path'
import { spawn } from 'child_process'

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  mtime: number
}

// Whitelist of safe executables for CodeRunner
const SAFE_EXECUTORS = new Set([
  'python3', 'python', 'node', 'node.exe', 'bash', 'sh', 'zsh',
  '/usr/bin/python3', '/usr/bin/node', '/bin/bash', '/bin/sh'
])

function isSafeCommand(command: string): boolean {
  const base = command.split('/').pop() || command
  return SAFE_EXECUTORS.has(command) || SAFE_EXECUTORS.has(base)
}

function isWithinWorkspace(filePath: string, workspacePath: string): boolean {
  const resolvedFile = resolve(filePath)
  const resolvedWorkspace = resolve(workspacePath)
  return resolvedFile === resolvedWorkspace || resolvedFile.startsWith(resolvedWorkspace + '/')
}

async function executeShell(
  command: string,
  args: string[],
  options?: { timeout?: number; cwd?: string; env?: Record<string, string> }
): Promise<{ success: boolean; stdout?: string; stderr?: string; exitCode?: number; error?: string }> {
  if (!isSafeCommand(command)) {
    return { success: false, error: `Command not allowed: ${command}. Allowed: python3, node, bash, sh` }
  }

  const timeout = options?.timeout ?? 30000
  const cwd = options?.cwd

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...options?.env },
      shell: false
    })

    let stdout = ''
    let stderr = ''
    let killed = false

    const timer = setTimeout(() => {
      killed = true
      child.kill('SIGTERM')
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL')
      }, 2000)
    }, timeout)

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
      if (stdout.length > 100000) {
        stdout = stdout.slice(0, 100000) + '\n... (output truncated)'
        child.kill('SIGTERM')
      }
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
      if (stderr.length > 50000) {
        stderr = stderr.slice(0, 50000) + '\n... (stderr truncated)'
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ success: false, error: err.message })
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      if (killed && code === null) {
        resolve({ success: true, stdout, stderr: stderr || undefined, exitCode: -1, error: 'Execution timed out' })
      } else {
        resolve({ success: true, stdout, stderr: stderr || undefined, exitCode: code ?? undefined })
      }
    })
  })
}

async function listDirectory(dirPath: string): Promise<{ success: boolean; entries?: FileEntry[]; error?: string }> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const result: FileEntry[] = []
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)
      let size = 0
      let mtime = 0
      try {
        const stat = await fs.stat(fullPath)
        size = stat.size
        mtime = stat.mtimeMs
      } catch {
        // ignore stat errors
      }
      result.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        size,
        mtime
      })
    }
    return { success: true, entries: result }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function readFile(filePath: string): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return { success: true, content }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function writeFile(
  filePath: string,
  content: string,
  workspacePath?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (workspacePath && !isWithinWorkspace(filePath, workspacePath)) {
      return { success: false, error: 'Path is outside the workspace' }
    }
    await fs.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export function registerToolsHandlers(_win: BrowserWindow): void {
  ipcMain.handle('tools:listDirectory', async (_event, dirPath: string) => {
    return listDirectory(dirPath)
  })

  ipcMain.handle('tools:readFile', async (_event, filePath: string) => {
    return readFile(filePath)
  })

  ipcMain.handle('tools:writeFile', async (_event, filePath: string, content: string, workspacePath?: string) => {
    return writeFile(filePath, content, workspacePath)
  })

  ipcMain.handle('tools:executeShell', async (_event, command: string, args: string[], options?: { timeout?: number; cwd?: string; env?: Record<string, string> }) => {
    return executeShell(command, args, options)
  })
}
