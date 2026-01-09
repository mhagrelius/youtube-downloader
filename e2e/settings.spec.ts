import { test, expect } from './fixtures/electron'

test.describe('Phase 5: Settings & Audio', () => {
  test('Settings button opens modal @smoke', async ({ page }) => {
    const settingsButton = page.locator('[data-testid="settings-button"]')
    await expect(settingsButton).toBeVisible()

    await settingsButton.click()

    const modal = page.locator('[data-testid="settings-modal"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
  })

  test('Settings modal can be closed with X button', async ({ page }) => {
    await page.locator('[data-testid="settings-button"]').click()
    await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible()

    await page.locator('[data-testid="settings-close-button"]').click()
    await expect(page.locator('[data-testid="settings-modal"]')).not.toBeVisible({ timeout: 5000 })
  })

  test('Settings modal can be closed with Done button', async ({ page }) => {
    await page.locator('[data-testid="settings-button"]').click()
    await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible()

    await page.locator('[data-testid="settings-done-button"]').click()
    await expect(page.locator('[data-testid="settings-modal"]')).not.toBeVisible({ timeout: 5000 })
  })

  test('Settings modal can be closed by clicking backdrop', async ({ page }) => {
    await page.locator('[data-testid="settings-button"]').click()
    await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible()

    // Click on the backdrop (outside the modal)
    await page.locator('[data-testid="settings-modal-backdrop"]').click({ position: { x: 10, y: 10 } })
    await expect(page.locator('[data-testid="settings-modal"]')).not.toBeVisible({ timeout: 5000 })
  })

  test('Save location picker exists and is clickable', async ({ page }) => {
    await page.locator('[data-testid="settings-button"]').click()

    const browseButton = page.locator('[data-testid="settings-browse-button"]')
    await expect(browseButton).toBeVisible()
    await expect(browseButton).toBeEnabled()

    // Verify download path field exists
    const downloadPath = page.locator('[data-testid="settings-download-path"]')
    await expect(downloadPath).toBeVisible()
  })

  test('Quality preference selector works', async ({ page }) => {
    await page.locator('[data-testid="settings-button"]').click()

    const qualitySelect = page.locator('[data-testid="settings-quality-select"]')
    await expect(qualitySelect).toBeVisible()

    // Change quality to 720p
    await qualitySelect.selectOption('720p')
    await expect(qualitySelect).toHaveValue('720p')
  })

  test('Quality preference saves and persists', async ({ page }) => {
    // Open settings and change quality
    await page.locator('[data-testid="settings-button"]').click()
    const qualitySelect = page.locator('[data-testid="settings-quality-select"]')
    await qualitySelect.selectOption('720p')

    // Close modal
    await page.locator('[data-testid="settings-done-button"]').click()
    await expect(page.locator('[data-testid="settings-modal"]')).not.toBeVisible()

    // Reopen and verify setting persisted
    await page.locator('[data-testid="settings-button"]').click()
    await expect(qualitySelect).toHaveValue('720p')
  })

  test('Audio format selector works', async ({ page }) => {
    await page.locator('[data-testid="settings-button"]').click()

    const audioFormatSelect = page.locator('[data-testid="settings-audio-format-select"]')
    await expect(audioFormatSelect).toBeVisible()

    // Change format to m4a
    await audioFormatSelect.selectOption('m4a')
    await expect(audioFormatSelect).toHaveValue('m4a')
  })

  test('Audio format preference saves and persists', async ({ page }) => {
    // Open settings and change audio format
    await page.locator('[data-testid="settings-button"]').click()
    const audioFormatSelect = page.locator('[data-testid="settings-audio-format-select"]')
    await audioFormatSelect.selectOption('m4a')

    // Close modal
    await page.locator('[data-testid="settings-done-button"]').click()
    await expect(page.locator('[data-testid="settings-modal"]')).not.toBeVisible()

    // Reopen and verify setting persisted
    await page.locator('[data-testid="settings-button"]').click()
    await expect(audioFormatSelect).toHaveValue('m4a')
  })

  test('Audio download with audio-only toggle produces file @smoke', async ({ page }) => {
    // Set timeout for download test
    test.setTimeout(120000)

    // Load a short test video
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await fetchButton.click()
    await page.locator('[data-testid="video-title"]').waitFor({ timeout: 60000 })

    // Enable audio only toggle
    const audioToggle = page.locator('[data-testid="audio-toggle"]')
    await audioToggle.click()

    // Start download
    const downloadButton = page.locator('[data-testid="download-button"]')
    await downloadButton.click()

    // Wait for download to complete
    const status = page.locator('[data-testid="queue-item-status"]')
    await expect(status).toContainText('Complete', { timeout: 60000 })
  })

  test('Best audio format option can be selected', async ({ page }) => {
    await page.locator('[data-testid="settings-button"]').click()

    const audioFormatSelect = page.locator('[data-testid="settings-audio-format-select"]')
    await expect(audioFormatSelect).toBeVisible()

    // Select "Best Available" option
    await audioFormatSelect.selectOption('best')
    await expect(audioFormatSelect).toHaveValue('best')
  })

  test('Best audio format hides quality selector when audio-only enabled', async ({ page }) => {
    // Set audio format to "best" in settings
    await page.locator('[data-testid="settings-button"]').click()
    const audioFormatSelect = page.locator('[data-testid="settings-audio-format-select"]')
    await audioFormatSelect.selectOption('best')
    await page.locator('[data-testid="settings-done-button"]').click()
    await expect(page.locator('[data-testid="settings-modal"]')).not.toBeVisible()

    // Load a video
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await fetchButton.click()
    await page.locator('[data-testid="video-title"]').waitFor({ timeout: 60000 })

    // Wait for formats to load (quality selector or loading indicator should be visible)
    // Use flexible locator that matches either state
    const qualitySelectorOrLoading = page.locator('[data-testid^="quality-selector"]')
    await expect(qualitySelectorOrLoading).toBeVisible({ timeout: 30000 })

    // Wait for actual selector (not loading state)
    const qualitySelector = page.locator('[data-testid="quality-selector"]')
    await expect(qualitySelector).toBeVisible({ timeout: 30000 })

    // Enable audio only toggle
    const audioToggle = page.locator('[data-testid="audio-toggle"]')
    await audioToggle.click()

    // Quality selector should be hidden when audio-only + best format
    await expect(qualitySelector).not.toBeVisible({ timeout: 5000 })
  })

  test('Best audio format persists across settings reopen', async ({ page }) => {
    // Open settings and select "best"
    await page.locator('[data-testid="settings-button"]').click()
    const audioFormatSelect = page.locator('[data-testid="settings-audio-format-select"]')
    await audioFormatSelect.selectOption('best')

    // Close modal
    await page.locator('[data-testid="settings-done-button"]').click()
    await expect(page.locator('[data-testid="settings-modal"]')).not.toBeVisible()

    // Reopen and verify setting persisted
    await page.locator('[data-testid="settings-button"]').click()
    await expect(audioFormatSelect).toHaveValue('best')
  })

  test('Switching from best to specific format shows quality selector again', async ({ page }) => {
    // Set audio format to "best" in settings
    await page.locator('[data-testid="settings-button"]').click()
    const audioFormatSelect = page.locator('[data-testid="settings-audio-format-select"]')
    await audioFormatSelect.selectOption('best')
    await page.locator('[data-testid="settings-done-button"]').click()

    // Load a video
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await fetchButton.click()
    await page.locator('[data-testid="video-title"]').waitFor({ timeout: 60000 })

    // Wait for formats to load first
    const qualitySelectorOrLoading = page.locator('[data-testid^="quality-selector"]')
    await expect(qualitySelectorOrLoading).toBeVisible({ timeout: 30000 })
    const qualitySelector = page.locator('[data-testid="quality-selector"]')
    await expect(qualitySelector).toBeVisible({ timeout: 30000 })

    // Enable audio only - quality selector should be hidden
    const audioToggle = page.locator('[data-testid="audio-toggle"]')
    await audioToggle.click()
    await expect(qualitySelector).not.toBeVisible({ timeout: 5000 })

    // Change audio format to "mp3" in settings
    await page.locator('[data-testid="settings-button"]').click()
    await audioFormatSelect.selectOption('mp3')
    await page.locator('[data-testid="settings-done-button"]').click()

    // Quality selector should now be visible again (might need to wait for re-render)
    await expect(qualitySelector).toBeVisible({ timeout: 10000 })
  })
})
