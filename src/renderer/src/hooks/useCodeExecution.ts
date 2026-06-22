import { useState, useCallback } from 'react'

export type ExecutableLanguage = 'python' | 'javascript' | 'typescript' | 'shell'

interface ExecutionResult {
  output: string
  status: 'idle' | 'running' | 'success' | 'error'
  executionTime?: number
}

interface ExecutionOutputs {
  [blockId: string]: ExecutionResult
}

export const LANGUAGE_CONFIG: Record<
  ExecutableLanguage,
  { label: string; runner: string; ext: string }
> = {
  python: { label: 'Python', runner: 'python3', ext: 'py' },
  javascript: { label: 'JavaScript', runner: 'node', ext: 'js' },
  typescript: { label: 'TypeScript', runner: 'tsx', ext: 'ts' },
  shell: { label: 'Shell', runner: 'bash', ext: 'sh' }
}

const MAX_EXECUTION_TIME = 30000 // 30 seconds
const MAX_OUTPUT_LENGTH = 10000

// Map common aliases to our canonical executable languages.
export function normalizeExecutableLanguage(language?: string): ExecutableLanguage | null {
  if (!language) return null
  const lang = language.toLowerCase()
  if (lang === 'python' || lang === 'py') return 'python'
  if (lang === 'javascript' || lang === 'js') return 'javascript'
  if (lang === 'typescript' || lang === 'ts' || lang === 'tsx') return 'typescript'
  if (lang === 'shell' || lang === 'bash' || lang === 'sh' || lang === 'zsh') return 'shell'
  return null
}

export function validateCode(code: string): { valid: boolean; error?: string } {
  const dangerousPatterns = [
    /rm\s+-rf\s+\//,
    /:\(\)\{\s*:\|:\s*\&\s*\};\s*:/, // Fork bomb
    /import\s+os\s*;\s*os\.system/,
    /eval\s*\(/,
    /exec\s*\(/,
    /subprocess\.call\s*\(/,
    /child_process/,
    /require\s*\(\s*['"]fs['"]\)/,
    /require\s*\(\s*['"]child_process['"]\)/,
    /process\.exit/,
    /while\s*\(\s*true\s*\)/,
    /for\s*\(\s*;\s*;\s*\)/
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return { valid: false, error: `Blocked dangerous pattern: ${pattern.source}` }
    }
  }

  return { valid: true }
}

export function useCodeExecution() {
  const [outputs, setOutputs] = useState<ExecutionOutputs>({})

  const setResult = useCallback(
    (blockId: string, result: Partial<ExecutionResult>) => {
      setOutputs((prev) => ({
        ...prev,
        [blockId]: { ...(prev[blockId] ?? { output: '', status: 'idle' }), ...result }
      }))
    },
    []
  )

  const execute = useCallback(
    async (blockId: string, code: string, language: ExecutableLanguage) => {
      const validation = validateCode(code)
      if (!validation.valid) {
        setResult(blockId, { status: 'error', output: `Security Error: ${validation.error}` })
        return
      }

      setResult(blockId, { status: 'running', output: 'Running...' })
      const startTime = Date.now()

      try {
        if (!window.api?.tools) {
          // Browser mode fallback
          await new Promise((r) => setTimeout(r, 500))
          const lines = code.split('\n').filter((l) => l.trim())
          const mockOutput =
            lines.map((l, i) => `[${i + 1}] ${l.trim()}`).join('\n') +
            '\n\nExecution completed (browser mode).'
          setResult(blockId, {
            status: 'success',
            output: mockOutput,
            executionTime: Date.now() - startTime
          })
          return
        }

        const config = LANGUAGE_CONFIG[language]
        const tempFile = `/tmp/opendesk-runner-${blockId}.${config.ext}`

        await window.api.tools.writeFile(tempFile, code)

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Execution timed out after 30s')), MAX_EXECUTION_TIME)
        )

        const execPromise = window.api.tools.executeShell
          ? window.api.tools.executeShell(config.runner, [tempFile], { timeout: MAX_EXECUTION_TIME })
          : Promise.resolve({ stdout: 'Code execution requires shell tools to be enabled.', stderr: '' })

        const result = (await Promise.race([execPromise, timeoutPromise])) as {
          stdout?: string
          stderr?: string
        }

        const output = (result.stdout || '') + (result.stderr ? `\n[stderr]: ${result.stderr}` : '')
        const truncated =
          output.length > MAX_OUTPUT_LENGTH
            ? output.slice(0, MAX_OUTPUT_LENGTH) + '\n... (output truncated)'
            : output

        setResult(blockId, {
          status: 'success',
          output: truncated || '(no output)',
          executionTime: Date.now() - startTime
        })
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e)
        setResult(blockId, {
          status: 'error',
          output: `Error: ${errorMsg}`,
          executionTime: Date.now() - startTime
        })
      }
    },
    [setResult]
  )

  return { outputs, execute }
}
