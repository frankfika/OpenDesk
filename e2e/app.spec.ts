import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'

test('electron app launches', async () => {
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '../out/main/index.js')]
  })
  const window = await electronApp.firstWindow()
  await expect(window).toHaveTitle(/OpenDesk/)
  await electronApp.close()
})
