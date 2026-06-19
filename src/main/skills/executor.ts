import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { dirname } from 'path'
import type { Skill } from '../../shared/types'

export interface SkillToolCall {
  skillId: string
  toolName: string
  arguments: Record<string, unknown>
}

export async function executeSkillTool(
  skill: Skill,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; output?: string; error?: string }> {
  if (!skill.scripts) {
    return {
      success: false,
      error: `Skill '${skill.name}' has no scripts directory`
    }
  }

  const scriptPath = skill.scripts[toolName]
  if (!scriptPath || !existsSync(scriptPath)) {
    return {
      success: false,
      error: `Script '${toolName}' not found in skill '${skill.name}'. Available: ${Object.keys(skill.scripts).join(', ')}`
    }
  }

  const ext = scriptPath.split('.').pop()?.toLowerCase()
  let command: string
  let commandArgs: string[]

  switch (ext) {
    case 'js':
      command = 'node'
      commandArgs = [scriptPath]
      break
    case 'ts':
      // Try tsx first, then ts-node
      command = 'tsx'
      commandArgs = [scriptPath]
      break
    case 'py':
      command = 'python3'
      commandArgs = [scriptPath]
      break
    case 'sh':
      command = 'bash'
      commandArgs = [scriptPath]
      break
    default:
      return {
        success: false,
        error: `Unsupported script extension: .${ext}`
      }
  }

  // Pass arguments as JSON via environment variable
  const env = {
    ...process.env,
    SKILL_TOOL_ARGS: JSON.stringify(args),
    SKILL_TOOL_NAME: toolName,
    SKILL_ID: skill.id
  }

  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      env,
      cwd: dirname(scriptPath),
      timeout: 30000 // 30 seconds
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('error', (err) => {
      // If tsx not found, try ts-node
      if (ext === 'ts' && command === 'tsx') {
        const fallback = spawn('ts-node', [scriptPath], { env, cwd: dirname(scriptPath), timeout: 30000 })
        let fbStdout = ''
        let fbStderr = ''
        fallback.stdout.on('data', (d) => {
          fbStdout += d.toString()
        })
        fallback.stderr.on('data', (d) => {
          fbStderr += d.toString()
        })
        fallback.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, output: fbStdout.trim() })
          } else {
            resolve({ success: false, error: fbStderr.trim() || `Script exited with code ${code}` })
          }
        })
        fallback.on('error', (fbErr) => {
          resolve({ success: false, error: `Failed to run TypeScript script: ${fbErr.message}` })
        })
        return
      }
      resolve({ success: false, error: `Failed to spawn process: ${err.message}` })
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout.trim() })
      } else {
        resolve({
          success: false,
          error: stderr.trim() || `Script exited with code ${code}`,
          output: stdout.trim() || undefined
        })
      }
    })
  })
}

export function getSkillToolAsProviderTool(skill: Skill) {
  if (!skill.tools || skill.tools.length === 0) return []

  return skill.tools.map((t) => ({
    name: `${skill.id.replace(/:/g, '_')}_${t.name}`,
    description: `[Skill: ${skill.name}] ${t.description}`,
    parameters: t.parameters || { type: 'object', properties: {} }
  }))
}
