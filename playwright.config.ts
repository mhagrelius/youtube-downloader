import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 120000, // 2 minutes for real downloads
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Network-dependent tests need retries
  workers: 1, // Serial execution for Electron
  reporter: [['html'], ['list']],
  use: {
    actionTimeout: 30000,
    trace: 'on-first-retry',
  },
  // Only run @smoke tests by default for faster feedback
  // Use --grep-invert @smoke to run all tests
  grep: /@smoke/,
})
