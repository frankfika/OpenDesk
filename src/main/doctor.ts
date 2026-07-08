import { app } from 'electron'
import { execSync } from 'child_process'
import { freemem, totalmem } from 'os'
import { existsSync } from 'fs'
import { join } from 'path'
import type { DoctorReport, DoctorCheck } from '../shared/types'
import { listWorkspaces } from './workspace'

function checkNodeVersion(): DoctorCheck {
  const version = process.version
  const major = parseInt(version.slice(1).split('.')[0], 10)
  if (major >= 20) {
    return { name: 'Node.js Version', status: 'pass', message: `Node.js ${version}` }
  }
  return { name: 'Node.js Version', status: 'warn', message: `Node.js ${version} (recommended >= 20)` }
}

function checkElectronVersion(): DoctorCheck {
  const version = process.versions.electron || 'unknown'
  return { name: 'Electron Version', status: 'pass', message: `Electron ${version}` }
}

function checkProviders(): DoctorCheck {
  const settingsPath = join(app.getPath('userData'), 'settings.json')
  if (!existsSync(settingsPath)) {
    return { name: 'Provider Config', status: 'warn', message: 'No settings file found' }
  }
  try {
    const { readFileSync } = require('fs')
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
    const providers = settings.providers || []
    const enabled = providers.filter((p: { enabled?: boolean }) => p.enabled)
    if (enabled.length === 0) {
      return { name: 'Provider Config', status: 'warn', message: 'No enabled providers configured' }
    }
    return { name: 'Provider Config', status: 'pass', message: `${enabled.length} provider(s) enabled` }
  } catch {
    return { name: 'Provider Config', status: 'fail', message: 'Failed to read settings' }
  }
}

function checkWorkspaces(): DoctorCheck {
  try {
    const workspaces = listWorkspaces()
    if (workspaces.length === 0) {
      return { name: 'Workspaces', status: 'warn', message: 'No workspaces configured' }
    }
    const active = workspaces.filter((w) => w.status === 'active').length
    return { name: 'Workspaces', status: 'pass', message: `${active}/${workspaces.length} active workspaces` }
  } catch {
    return { name: 'Workspaces', status: 'fail', message: 'Failed to read workspaces' }
  }
}

function checkDiskSpace(): DoctorCheck {
  try {
    const free = freemem()
    const total = totalmem()
    const freeGB = (free / 1024 / 1024 / 1024).toFixed(2)
    const totalGB = (total / 1024 / 1024 / 1024).toFixed(2)
    if (free < 512 * 1024 * 1024) {
      return { name: 'Disk/Memory Space', status: 'warn', message: `Low memory: ${freeGB}GB free / ${totalGB}GB total` }
    }
    return { name: 'Disk/Memory Space', status: 'pass', message: `${freeGB}GB free / ${totalGB}GB total` }
  } catch {
    return { name: 'Disk/Memory Space', status: 'warn', message: 'Unable to check memory' }
  }
}

function checkNetwork(): DoctorCheck {
  try {
    // Try a quick DNS resolution / ping-like check using curl or nc
    if (process.platform === 'win32') {
      execSync('ping -n 1 -w 3000 api.openai.com', { stdio: 'ignore' })
    } else {
      execSync('curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://api.openai.com', { stdio: 'ignore' })
    }
    return { name: 'Network Connection', status: 'pass', message: 'Can reach api.openai.com' }
  } catch {
    return {
      name: 'Network Connection',
      status: 'warn',
      message: 'Cannot reach api.openai.com (may be blocked or offline)'
    }
  }
}

export function runDoctor(): DoctorReport {
  const checks: DoctorCheck[] = [
    checkNodeVersion(),
    checkElectronVersion(),
    checkProviders(),
    checkWorkspaces(),
    checkDiskSpace(),
    checkNetwork()
  ]

  const hasFail = checks.some((c) => c.status === 'fail')
  const hasWarn = checks.some((c) => c.status === 'warn')
  const overall: DoctorReport['overall'] = hasFail ? 'fail' : hasWarn ? 'warn' : 'pass'

  return {
    timestamp: Date.now(),
    checks,
    overall
  }
}
