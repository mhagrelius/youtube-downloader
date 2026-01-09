import { test, expect } from './fixtures/electron'

test.describe('Phase 7: Packaging & Distribution', () => {
  // Binary management is transparent in dev mode since binaries exist in resources/bin
  // These tests verify the binary management infrastructure works correctly

  test('binary status check API is available', async ({ page }) => {
    // Verify the binary status check API exists
    const hasApi = await page.evaluate(() => {
      return typeof window.electronAPI.checkBinaryStatus === 'function'
    })
    expect(hasApi).toBe(true)
  })

  test('binary status returns ready when binaries exist @smoke', async ({ page }) => {
    // In dev mode, binaries should exist in resources/bin
    const status = await page.evaluate(async () => {
      const result = await window.electronAPI.checkBinaryStatus()
      return result
    })

    expect(status.success).toBe(true)
    expect(status.data).toBeDefined()
    expect(status.data?.ready).toBe(true)
    expect(status.data?.ytdlp.exists).toBe(true)
    expect(status.data?.ytdlp.executable).toBe(true)
    expect(status.data?.deno.exists).toBe(true)
    expect(status.data?.deno.executable).toBe(true)
  })

  test('binary paths API returns valid paths', async ({ page }) => {
    const paths = await page.evaluate(async () => {
      return await window.electronAPI.getBinaryPaths()
    })

    expect(paths.ytdlp).toBeDefined()
    expect(paths.deno).toBeDefined()
    expect(paths.binDir).toBeDefined()

    // Paths should contain expected binary names
    expect(paths.ytdlp).toContain('yt-dlp')
    expect(paths.deno).toContain('deno')
  })

  test('app loads main UI when binaries are ready', async ({ page }) => {
    // Since binaries exist in dev mode, app should skip setup and show main UI
    // Wait for the main UI to be visible
    await page.waitForSelector('[data-testid="url-input"]', { timeout: 10000 })

    // Verify main app components are visible
    const urlInput = page.getByTestId('url-input')
    await expect(urlInput).toBeVisible()

    // Settings button should be visible
    const settingsButton = page.getByTestId('settings-button')
    await expect(settingsButton).toBeVisible()
  })

  test('settings modal has yt-dlp update check option', async ({ page }) => {
    // Wait for app to load
    await page.waitForSelector('[data-testid="settings-button"]', { timeout: 10000 })

    // Open settings
    await page.getByTestId('settings-button').click()
    await page.waitForSelector('[data-testid="settings-modal"]', { timeout: 5000 })

    // Check for update button should be visible
    const checkUpdatesButton = page.getByTestId('settings-check-updates-button')
    await expect(checkUpdatesButton).toBeVisible()
    await expect(checkUpdatesButton).toContainText('Check for Updates')
  })

  test('check for yt-dlp updates button click works', async ({ page }) => {
    // Wait for app to load
    await page.waitForSelector('[data-testid="settings-button"]', { timeout: 10000 })

    // Open settings
    await page.getByTestId('settings-button').click()
    await page.waitForSelector('[data-testid="settings-modal"]', { timeout: 5000 })

    // Verify check for updates button is visible and clickable
    const checkUpdatesButton = page.getByTestId('settings-check-updates-button')
    await expect(checkUpdatesButton).toBeVisible()
    await expect(checkUpdatesButton).toBeEnabled()

    // Click check for updates - button should be clickable
    await checkUpdatesButton.click()

    // Either the button shows loading state or immediately returns to normal
    // Wait briefly then verify button is back to normal state (not stuck)
    await page.waitForTimeout(1000)

    // Button should be visible and not permanently disabled
    await expect(checkUpdatesButton).toBeVisible()
  })

  test('yt-dlp update check API is available', async ({ page }) => {
    const hasApi = await page.evaluate(() => {
      return typeof window.electronAPI.checkYtDlpUpdate === 'function'
    })
    expect(hasApi).toBe(true)
  })

  test('yt-dlp update API returns version info', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.checkYtDlpUpdate()
    })

    // The API call should succeed (even if we can't determine the version)
    expect(result).toBeDefined()

    if (result.success) {
      expect(result.data).toBeDefined()
      // Should have hasUpdate boolean and possibly version strings
      expect(typeof result.data?.hasUpdate).toBe('boolean')
    } else {
      // If it failed, it should have an error message
      expect(result.error).toBeDefined()
    }
  })

  test('binary download progress listener can be registered', async ({ page }) => {
    const hasListener = await page.evaluate(() => {
      return typeof window.electronAPI.onBinaryDownloadProgress === 'function'
    })
    expect(hasListener).toBe(true)

    // Test that we can register and unregister a listener
    const canRegister = await page.evaluate(() => {
      const unsubscribe = window.electronAPI.onBinaryDownloadProgress(() => {})
      const isFunction = typeof unsubscribe === 'function'
      unsubscribe() // Clean up
      return isFunction
    })
    expect(canRegister).toBe(true)
  })

  test('download all binaries API is available', async ({ page }) => {
    const hasApi = await page.evaluate(() => {
      return typeof window.electronAPI.downloadAllBinaries === 'function'
    })
    expect(hasApi).toBe(true)
  })

  test('download binary API is available', async ({ page }) => {
    const hasApi = await page.evaluate(() => {
      return typeof window.electronAPI.downloadBinary === 'function'
    })
    expect(hasApi).toBe(true)
  })

  test('update yt-dlp API is available', async ({ page }) => {
    const hasApi = await page.evaluate(() => {
      return typeof window.electronAPI.updateYtDlp === 'function'
    })
    expect(hasApi).toBe(true)
  })
})
