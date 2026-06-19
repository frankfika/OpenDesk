import { desktopCapturer, screen } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function captureScreenshot(_region?: string): Promise<string> {
  const primaryDisplay = screen.getPrimaryDisplay()
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: primaryDisplay.size
  })
  const primarySource = sources.find((s) => s.display_id === String(primaryDisplay.id)) || sources[0]
  if (!primarySource) throw new Error('No screen source found')
  return primarySource.thumbnail.toPNG().toString('base64')
}

export async function desktopClick(x: number, y: number, button?: string, double?: boolean): Promise<string> {
  const action = double ? 'double click' : 'click'
  const script = `
    tell application "System Events"
      ${action} at {${x}, ${y}}
    end tell
  `
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)
  return `${double ? 'Double-clicked' : 'Clicked'} at (${x}, ${y}) with ${button || 'left'} button`
}

export async function desktopType(text: string): Promise<string> {
  const script = `
    tell application "System Events"
      keystroke "${text.replace(/"/g, '\\"')}"
    end tell
  `
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)
  return `Typed: ${text}`
}

export async function desktopKey(key: string, modifiers?: string[]): Promise<string> {
  const modStr = modifiers && modifiers.length > 0 ? ` using {${modifiers.map((m) => `${m} down`).join(', ')}}` : ''
  const script = `
    tell application "System Events"
      keystroke "${key.replace(/"/g, '\\"')}"${modStr}
    end tell
  `
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)
  return `Pressed key: ${key}${modifiers ? ` with ${modifiers.join('+')}` : ''}`
}

export async function desktopWindows(): Promise<string> {
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 0, height: 0 }
  })
  const windows = sources.map((s) => ({
    id: s.id,
    name: s.name
  }))
  return JSON.stringify(windows, null, 2)
}

export async function desktopActivate(title: string): Promise<string> {
  const script = `
    tell application "System Events"
      tell process "${title.replace(/"/g, '\\"')}"
        set frontmost to true
      end tell
    end tell
  `
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)
  return `Activated window: ${title}`
}
