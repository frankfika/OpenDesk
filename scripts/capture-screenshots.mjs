#!/usr/bin/env node
/**
 * Capture real screenshots from the running OpenDesk Electron app.
 *
 * Why this script:
 * - README screenshots MUST come from a real running app — never mocked HTML
 *   or AI-generated images. This script launches the built Electron app
 *   via Playwright's _electron driver and walks through several states,
 *   saving PNGs to docs/assets/.
 *
 * Usage:
 *   1. npm run build           # populates out/main/index.js
 *   2. node scripts/capture-screenshots.mjs
 */

import { _electron as electron } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import url from 'node:url'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const ASSETS = path.join(ROOT, 'docs', 'assets')
const MAIN_ENTRY = path.join(ROOT, 'out', 'main', 'index.js')

const VIEWPORT = { width: 1440, height: 900 }

const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms))

async function ensureAssets() {
  if (!fs.existsSync(ASSETS)) fs.mkdirSync(ASSETS, { recursive: true })
}

async function snap(window, name, { wait = 1000 } = {}) {
  await SLEEP(wait)
  const file = path.join(ASSETS, `${name}.png`)
  await window.screenshot({ path: file })
  console.log(`  ✓ ${name}.png`)
  return file
}

async function setScenario(window, scenario) {
  if (scenario === 'chat') {
    // 'chat' is only set on first mount — reset via store directly.
    // @ts-expect-error - Playwright's ElectronWindow type does not surface window.api
    await window.evaluate(() => {
      // Easiest path: reload (the workbench sets scenario='chat' on mount when null)
      window.location.reload()
    })
    await window.waitForLoadState('domcontentloaded')
    return
  }
  // @ts-expect-error - Playwright's ElectronWindow type does not surface window.__store
  await window.evaluate((s) => {
    const btn = document.querySelector(`button[data-scenario="${s}"]`)
    if (btn) btn.click()
  }, scenario)
  await SLEEP(700)
}

async function run() {
  await ensureAssets()
  if (!fs.existsSync(MAIN_ENTRY)) {
    console.error(`✘ Missing build output at ${MAIN_ENTRY}. Run "npm run build" first.`)
    process.exit(1)
  }

  console.log('\n📸 Capturing OpenDesk v0.5.0 screenshots\n')

  const app = await electron.launch({
    args: [MAIN_ENTRY],
    env: { ...process.env, NODE_ENV: 'production' }
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')
  await window.setViewportSize(VIEWPORT)

  // 1. Onboarding / first-launch
  await window.evaluate(async () => {
    // @ts-expect-error - window.api not in Playwright's ElectronWindow types
    await window.api.settings.set({ providers: [], onboarded: false, theme: 'dark' })
    // Reload so OnboardingModal mounts
    window.location.reload()
  })
  await window.waitForLoadState('domcontentloaded')
  await snap(window, '01-onboarding', { wait: 1500 })

  // 2. Default Web3 Workbench home (PortfolioView with sample address)
  await window.evaluate(async () => {
    // @ts-expect-error - window.api not in Playwright's ElectronWindow types
    await window.api.settings.set({
      providers: [],
      onboarded: true,
      theme: 'dark'
    })
    window.location.reload()
  })
  await window.waitForLoadState('domcontentloaded')
  await snap(window, '02-home', { wait: 2000 })

  // 3. Intel scenario
  await setScenario(window, 'intel')
  await snap(window, '03-intel')

  // 4. Trade scenario
  await setScenario(window, 'trade')
  await snap(window, '04-trade')

  // 5. Doctor (Wallet Doctor — approvals audit) scenario
  await setScenario(window, 'doctor')
  await snap(window, '05-doctor')

  // 6. Settings modal
  // Reset to home so Settings button is reliably visible
  await setScenario(window, 'chat')
  await SLEEP(400)
  const settingsBtn = window.locator('button[title^="Settings"]').first()
  if (await settingsBtn.count()) {
    await settingsBtn.click().catch(() => {})
    await SLEEP(900)
    await snap(window, '06-settings', { wait: 600 })
  } else {
    console.log('  ! settings button not found — skipping 06-settings')
  }

  // 7. Skills panel (shows the new 14 built-in Skills)
  // Close settings modal first
  await window.keyboard.press('Escape')
  await SLEEP(400)
  await window.evaluate(() => {
    // OpenSkillsPanel listens to a custom event in Web3Shell
    window.dispatchEvent(new CustomEvent('opendesk:open-skills'))
  })
  await SLEEP(1200)
  await snap(window, '07-skills-panel', { wait: 800 })

  console.log(`\n✨ Done. ${fs.readdirSync(ASSETS).length} files in docs/assets/\n`)
  await app.close()
}

run().catch((err) => {
  console.error('✘ Capture failed:', err)
  process.exit(1)
})
