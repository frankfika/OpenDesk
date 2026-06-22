import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

// The deepseek API key is only used by tests that need a live model call.
// If it's not provided, the tests that depend on it will be skipped. We
// never fall back to a hardcoded value — even a test-only key leaks into
// the repository history and exposes the account.
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const hasDeepSeekKey = typeof DEEPSEEK_KEY === 'string' && DEEPSEEK_KEY.length > 0

async function launchApp() {
  return electron.launch({
    args: [path.join(__dirname, '../out/main/index.js')]
  })
}

async function seedTwoProviders(window: ReturnType<typeof electron.launch> extends Promise<infer T> ? T : never) {
  // @ts-expect-error Playwright's ElectronWindow doesn't expose window.api in types
  await window.evaluate(
    async ({ key, baseUrl }: { key: string; baseUrl: string }) => {
      const providerA = {
        id: 'prov-ensemble-a',
        name: 'DeepSeek A',
        type: 'openai-compatible' as const,
        model: 'deepseek-chat',
        baseUrl,
        enabled: true
      }
      const providerB = {
        id: 'prov-ensemble-b',
        name: 'DeepSeek B',
        type: 'openai-compatible' as const,
        model: 'deepseek-chat',
        baseUrl,
        enabled: true
      }
      await window.api.settings.set({
        providers: [providerA, providerB],
        activeProviderId: providerA.id,
        ensembleProviderIds: [providerA.id, providerB.id],
        arbitratorProviderId: providerA.id
      })
      await window.api.settings.setApiKey(providerA.id, key)
      await window.api.settings.setApiKey(providerB.id, key)
      window.location.reload()
    },
    { key: DEEPSEEK_KEY, baseUrl: DEEPSEEK_BASE_URL }
  )
}

async function seedSingleProvider(window: ReturnType<typeof electron.launch> extends Promise<infer T> ? T : never) {
  // @ts-expect-error Playwright's ElectronWindow doesn't expose window.api in types
  await window.evaluate(
    async ({ key, baseUrl }: { key: string; baseUrl: string }) => {
      const provider = {
        id: 'prov-chat-a',
        name: 'DeepSeek Chat',
        type: 'openai-compatible' as const,
        model: 'deepseek-chat',
        baseUrl,
        enabled: true
      }
      await window.api.settings.set({
        providers: [provider],
        activeProviderId: provider.id,
        ensembleProviderIds: [provider.id],
        arbitratorProviderId: provider.id
      })
      await window.api.settings.setApiKey(provider.id, key)
      window.location.reload()
    },
    { key: DEEPSEEK_KEY, baseUrl: DEEPSEEK_BASE_URL }
  )
}

test('electron app launches', async () => {
  const electronApp = await launchApp()
  const window = await electronApp.firstWindow()
  await expect(window).toHaveTitle(/OpenDesk/)
  await electronApp.close()
})

test('Agent mode is hidden and only Chat/Ensemble modes are present', async () => {
  test.skip(!hasDeepSeekKey, 'DEEPSEEK_API_KEY is required for this test')

  const electronApp = await launchApp()
  const window = await electronApp.firstWindow()
  await seedTwoProviders(window)

  const reloadedWindow = await electronApp.firstWindow()
  await reloadedWindow.waitForLoadState('domcontentloaded')

  const chatButton = reloadedWindow.locator('button[title="Chat"]')
  const ensembleButton = reloadedWindow.locator('button[title="Ensemble"]')
  const agentButton = reloadedWindow.locator('button[title="Agent"]')
  const removedCompareButton = reloadedWindow.locator('button[title="Compare"]')

  await expect(chatButton).toBeVisible({ timeout: 10_000 })
  await expect(ensembleButton).toBeVisible()
  await expect(agentButton).toHaveCount(0)
  await expect(removedCompareButton).toHaveCount(0)

  await ensembleButton.click()
  await expect(ensembleButton).toHaveClass(/bg-\[var\(--accent\)\]/)

  await electronApp.close()
})

test('Ensemble mode lets user select multiple models and prepares to run', async () => {
  test.skip(!hasDeepSeekKey, 'DEEPSEEK_API_KEY is required for this test')

  const electronApp = await launchApp()
  const window = await electronApp.firstWindow()

  await seedTwoProviders(window)

  const reloadedWindow = await electronApp.firstWindow()
  await reloadedWindow.waitForLoadState('domcontentloaded')

  // Switch to Ensemble mode and explicitly select both models via the picker
  const ensembleButton = reloadedWindow.locator('button[title="Ensemble"]')
  await expect(ensembleButton).toBeVisible({ timeout: 10_000 })
  await ensembleButton.click()

  const modelPickerButton = reloadedWindow.locator('button:has-text("models")')
  await expect(modelPickerButton).toBeVisible()
  await modelPickerButton.click()

  const checkboxA = reloadedWindow.locator('input#em-prov-ensemble-a')
  const checkboxB = reloadedWindow.locator('input#em-prov-ensemble-b')
  await checkboxA.check()
  await checkboxB.check()

  // Close the picker with Escape
  await reloadedWindow.keyboard.press('Escape')

  // Confirm Ensemble mode is active and two models are selected
  await expect(ensembleButton).toHaveClass(/bg-\[var\(--accent\)\]/)
  await expect(modelPickerButton).toContainText('2 models')

  // Type a message and verify the send button is enabled so an ensemble run can start
  const textarea = reloadedWindow.locator('textarea[placeholder*="Message OpenDesk"]')
  await expect(textarea).toBeVisible()
  await textarea.fill('Say a single friendly greeting.')

  const sendButton = reloadedWindow.locator('button[title="Send (⌘↵)"]')
  await expect(sendButton).toBeEnabled()

  await electronApp.close()
})

test('File attachment is embedded into the user message on send', async () => {
  test.skip(!hasDeepSeekKey, 'DEEPSEEK_API_KEY is required for this test')

  const electronApp = await launchApp()
  const window = await electronApp.firstWindow()

  await seedSingleProvider(window)

  const reloadedWindow = await electronApp.firstWindow()
  await reloadedWindow.waitForLoadState('domcontentloaded')

  const textarea = reloadedWindow.locator('textarea[placeholder*="Message OpenDesk"]')
  await expect(textarea).toBeVisible({ timeout: 10_000 })

  // Create a temporary text file
  const tmpFile = path.join(os.tmpdir(), `opendesk-test-${Date.now()}.txt`)
  fs.writeFileSync(tmpFile, 'Hello from attachment test.')

  try {
    // Attach the file via the hidden file input
    const fileInput = reloadedWindow.locator('input[type="file"]')
    await fileInput.setInputFiles(tmpFile)

    // Verify the attachment chip appears
    await expect(reloadedWindow.locator('text=opendesk-test-')).toBeVisible()

    // Type and send
    await textarea.fill('Please summarize this file.')
    const sendButton = reloadedWindow.locator('button[title="Send (⌘↵)"]')
    await expect(sendButton).toBeEnabled()
    await sendButton.click()

    // The assistant should receive the attachment content and reference it in its reply.
    // Wait for the assistant response to mention the attachment content.
    await expect(reloadedWindow.locator('text=Hello from attachment test.')).toBeVisible({ timeout: 15000 })
  } finally {
    fs.unlinkSync(tmpFile)
  }

  await electronApp.close()
})
