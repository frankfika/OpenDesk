import { ipcMain, BrowserWindow } from 'electron'
import { exec } from 'child_process'
import { createReadStream } from 'fs'
import { Parse, type Entry } from 'unzipper'
import {
  readFile as safeReadFile,
  writeFile as safeWriteFile,
  listDirectory as safeListDirectory
} from '../tools/file-tools'
import { validateShellCommand } from '../tools/builtins'

const MAX_STDOUT_BYTES = 100_000
const MAX_STDERR_BYTES = 50_000

/**
 * Quote a single shell argument. Splits on shell-meaningful characters and
 * wraps anything non-trivial in single quotes (with embedded `'` escaped
 * via the standard `'\''` trick). Used when joining the `args[]` array from
 * the legacy IPC signature into a single command string for `validateShellCommand`.
 */
function quoteArg(arg: string): string {
  if (arg === '') return "''"
  // Allow these characters as-is; anything else needs quoting.
  if (/^[\w@./:=+,-]+$/.test(arg)) return arg
  return `'${arg.replace(/'/g, "'\\''")}'`
}

async function executeShellValidated(
  command: string,
  args: string[],
  options?: { timeout?: number; cwd?: string; env?: Record<string, string> }
): Promise<{ success: boolean; stdout?: string; stderr?: string; exitCode?: number; error?: string }> {
  // Re-join into a single string so the same validator used by the tool
  // executor's `shell` tool can check it. This is intentionally simple —
  // the dangerous-pattern checks in `validateShellCommand` (e.g. blocking
  // `;&`$`) prevent the obvious shell escapes.
  const fullCommand = args.length > 0 ? `${command} ${args.map(quoteArg).join(' ')}` : command

  const validation = validateShellCommand(fullCommand)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const timeout = options?.timeout ?? 30_000

  return new Promise((resolve) => {
    let timedOut = false
    const child = exec(
      fullCommand,
      {
        cwd: options?.cwd,
        env: { ...process.env, ...options?.env },
        timeout
      },
      (error, stdout, stderr) => {
        if (timedOut) return // already resolved
        const killed = error?.killed || (error as { signal?: string } | null)?.signal === 'SIGTERM'
        const truncatedStdout =
          stdout && stdout.length > MAX_STDOUT_BYTES
            ? stdout.slice(0, MAX_STDOUT_BYTES) + '\n... (output truncated)'
            : stdout
        const truncatedStderr =
          stderr && stderr.length > MAX_STDERR_BYTES
            ? stderr.slice(0, MAX_STDERR_BYTES) + '\n... (stderr truncated)'
            : stderr
        if (error) {
          resolve({
            success: false,
            stdout: truncatedStdout || undefined,
            stderr: truncatedStderr || undefined,
            exitCode: typeof error.code === 'number' ? error.code : undefined,
            error: killed ? 'Execution timed out' : error.message
          })
          return
        }
        resolve({
          success: true,
          stdout: truncatedStdout || undefined,
          stderr: truncatedStderr || undefined,
          exitCode: 0
        })
      }
    )

    // When the process doesn't exit within `timeout` ms, `exec` will
    // signal SIGTERM and (per its docs) try SIGKILL. The callback may
    // still fire after a brief delay; if we never get the callback we
    // resolve anyway so the IPC reply doesn't hang.
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        timedOut = true
        try { child.kill('SIGKILL') } catch { /* already dead */ }
        resolve({
          success: false,
          error: 'Execution timed out'
        })
      }
    }, timeout + 5_000).unref()
  })
}

async function extractPptxText(filePath: string): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const slides: string[] = []
    await new Promise<void>((resolve, reject) => {
      createReadStream(filePath)
        .pipe(Parse())
        .on('entry', function (entry: Entry) {
          const fileName = entry.path
          if (fileName.startsWith('ppt/slides/') && fileName.endsWith('.xml')) {
            let content = ''
            entry.on('data', (chunk: Buffer) => {
              content += chunk.toString()
            })
            entry.on('end', () => {
              const texts: string[] = []
              const regex = /<a:t>([^<]*)<\/a:t>/g
              let match
              while ((match = regex.exec(content)) !== null) {
                if (match[1].trim()) texts.push(match[1])
              }
              if (texts.length > 0) slides.push(texts.join(' '))
            })
            entry.on('error', (err: Error) => reject(err))
          } else {
            entry.autodrain()
          }
        })
        .on('close', () => resolve())
        .on('error', (err: Error) => reject(err))
    })
    const text = slides.join('\n\n')
    return { success: true, text: text || '(no text content found in presentation)' }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export function registerToolsHandlers(_win: BrowserWindow): void {
  // `workspacePath` (when provided) is the user-selected workspace folder.
  // file-tools's `isSafePath` rejects any path that escapes the base.
  ipcMain.handle('tools:listDirectory', async (_event, path: string, workspacePath?: string) => {
    return safeListDirectory(path, workspacePath)
  })

  ipcMain.handle('tools:readFile', async (_event, path: string, workspacePath?: string) => {
    return safeReadFile(path, undefined, workspacePath)
  })

  ipcMain.handle('tools:writeFile', async (_event, path: string, content: string, workspacePath?: string) => {
    return safeWriteFile(path, content, workspacePath)
  })

  ipcMain.handle('tools:executeShell', async (_event, command: string, args: string[], options?: { timeout?: number; cwd?: string; env?: Record<string, string> }) => {
    return executeShellValidated(command, args, options)
  })

  ipcMain.handle('tools:extractPptxText', async (_event, path: string) => {
    return extractPptxText(path)
  })
}
