import { app, BrowserWindow, shell, globalShortcut } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { registerIpcHandlers } from './ipc/handlers'
import { createTray, destroyTray } from './tray'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const isDark = true // TODO: read from settings
  const backgroundColor = isDark ? '#0f0f0f' : '#ffffff'

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    show: false,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    trafficLightPosition: { x: 12, y: 16 },
    backgroundColor,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Close to tray instead of quitting
  win.on('close', (event) => {
    if (process.platform === 'darwin') {
      // On macOS, hide instead of close to keep dock icon active
      event.preventDefault()
      win.hide()
    } else {
      // On Windows/Linux, minimize to tray
      event.preventDefault()
      win.hide()
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

/* ---------- Ollama Auto-Detect ---------- */

interface AppSettings {
  providers?: Array<{ id: string; type: string; name: string; model: string; baseUrl?: string; enabled: boolean }>
  [key: string]: unknown
}

async function detectOllama(): Promise<{ available: boolean; models: string[] }> {
  try {
    const response = await fetch('http://localhost:11434/v1/models', { signal: AbortSignal.timeout(3000) })
    if (!response.ok) return { available: false, models: [] }
    const data = await response.json() as { data?: Array<{ id: string }> }
    const models = data.data?.map((m) => m.id) || []
    return { available: true, models }
  } catch {
    return { available: false, models: [] }
  }
}

function loadSettings(): AppSettings {
  try {
    const dir = join(app.getPath('userData'), 'opendesk')
    const path = join(dir, 'settings.json')
    if (!existsSync(path)) return {}
    return JSON.parse(readFileSync(path, 'utf-8')) as AppSettings
  } catch {
    return {}
  }
}

function saveSettings(settings: AppSettings): void {
  try {
    const dir = join(app.getPath('userData'), 'opendesk')
    const path = join(dir, 'settings.json')
    writeFileSync(path, JSON.stringify(settings, null, 2))
  } catch {
    // ignore
  }
}

async function autoDetectOllama(): Promise<void> {
  const settings = loadSettings()
  const hasOllama = settings.providers?.some((p) => p.type === 'ollama')
  if (hasOllama) return

  const { available, models } = await detectOllama()
  if (!available) return

  const defaultModel = models.find((m) => m.includes('llama')) || models[0] || 'llama3'
  const ollamaProvider = {
    id: `ollama-auto-${Date.now()}`,
    type: 'ollama',
    name: 'Ollama (Auto-detected)',
    model: defaultModel,
    baseUrl: 'http://localhost:11434/v1',
    enabled: true
  }

  settings.providers = [...(settings.providers || []), ollamaProvider]
  if (!settings.activeProviderId) {
    settings.activeProviderId = ollamaProvider.id
  }
  saveSettings(settings)

  console.log('[Ollama] Auto-detected and added provider:', ollamaProvider.id)
}

app.whenReady().then(async () => {
  mainWindow = createWindow()
  registerIpcHandlers(mainWindow)
  createTray(mainWindow)
  registerShortcuts(mainWindow)

  // Auto-detect Ollama on startup
  await autoDetectOllama()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      registerIpcHandlers(mainWindow)
    } else if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
})

app.on('window-all-closed', () => {
  // Do nothing on macOS; on Windows/Linux we keep tray alive
})

app.on('before-quit', () => {
  // Allow actual quit when user selects Quit from tray/menu
  if (mainWindow) {
    mainWindow.removeAllListeners('close')
    mainWindow.close()
  }
  unregisterShortcuts()
  destroyTray()
})

// Click dock icon to restore window
app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
})
