import { test as base, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type ElectronFixtures = {
  electronApp: ElectronApplication
  page: Page
}

export const test = base.extend<ElectronFixtures>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    // Launch Electron app
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist-electron/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(electronApp)

    // Close the app after the test
    await electronApp.close()
  },

  page: async ({ electronApp }, use) => {
    // Wait for the first window to open
    const page = await electronApp.firstWindow()

    // Wait for the app to be ready
    await page.waitForLoadState('domcontentloaded')

    // Wait for React app to complete async initialization
    await page.waitForSelector('[data-testid="app-ready"]', { timeout: 30000 })

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page)
  },
})

export { expect } from '@playwright/test'
