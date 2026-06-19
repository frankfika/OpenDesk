# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> electron app launches
- Location: e2e/app.spec.ts:4:5

# Error details

```
Error: electron.launch: Electron failed to install correctly. Please delete `node_modules/electron` and run "npx install-electron --no" manually.
```

# Test source

```ts
  1  | import { test, expect, _electron as electron } from '@playwright/test'
  2  | import path from 'path'
  3  | 
  4  | test('electron app launches', async () => {
> 5  |   const electronApp = await electron.launch({
     |                       ^ Error: electron.launch: Electron failed to install correctly. Please delete `node_modules/electron` and run "npx install-electron --no" manually.
  6  |     args: [path.join(__dirname, '../out/main/index.js')]
  7  |   })
  8  |   const window = await electronApp.firstWindow()
  9  |   await expect(window).toHaveTitle(/OpenDesk/)
  10 |   await electronApp.close()
  11 | })
  12 | 
```