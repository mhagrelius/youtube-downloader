import { test, expect } from './fixtures/electron'

// Helper to load a video before testing download functionality
async function loadTestVideo(page: import('@playwright/test').Page) {
  const urlInput = page.locator('[data-testid="url-input"]')
  const fetchButton = page.locator('[data-testid="fetch-button"]')

  // Use "Me at the zoo" - first YouTube video, only 19 seconds
  await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
  await fetchButton.click()

  // Wait for video info to load (longer timeout for network variability)
  await page.locator('[data-testid="video-title"]').waitFor({ timeout: 60000 })
}

test.describe('Phase 4: Download Queue', () => {
  // Set timeout for network-dependent tests
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    testInfo.setTimeout(120000) // 2 minutes per test
  })

  test('Download starts and appears in queue @smoke', async ({ page }) => {
    await loadTestVideo(page)

    const downloadButton = page.locator('[data-testid="download-button"]')
    await downloadButton.click()

    // Queue should appear with the download item
    const queueItem = page.locator('[data-testid="queue-item"]')
    await expect(queueItem).toBeVisible({ timeout: 10000 })

    // Title should be displayed
    const title = page.locator('[data-testid="queue-item-title"]')
    await expect(title).not.toBeEmpty()

    // Status should show downloading
    const status = page.locator('[data-testid="queue-item-status"]')
    await expect(status).toBeVisible()
  })

  test('Progress bar shows during download or completes', async ({ page }) => {
    await loadTestVideo(page)

    const downloadButton = page.locator('[data-testid="download-button"]')
    await downloadButton.click()

    // Wait for queue item with longer timeout (matches other tests in file)
    await page.locator('[data-testid="queue-item"]').waitFor({ timeout: 30000 })

    // Wait for either Downloading or Complete status first
    const status = page.locator('[data-testid="queue-item-status"]')
    await expect(status).toContainText(/Downloading|Complete/, { timeout: 30000 })

    // If still downloading, verify progress bar is visible
    const statusText = await status.textContent()
    if (statusText?.includes('Downloading')) {
      const progressBar = page.locator('[data-testid="queue-item-progress"]')
      await expect(progressBar).toBeVisible({ timeout: 10000 })
    }
    // If Complete, test passes (short video downloaded quickly)
  })

  test('Pause button pauses download', async ({ page }) => {
    await loadTestVideo(page)

    const downloadButton = page.locator('[data-testid="download-button"]')
    await downloadButton.click()

    // Wait for download to start and progress bar to appear
    await page.locator('[data-testid="queue-item-progress"]').waitFor({ timeout: 30000 })

    // Click pause button
    const pauseButton = page.locator('[data-testid="pause-button"]')
    await expect(pauseButton).toBeVisible()
    await pauseButton.click()

    // Status should change to Paused
    const status = page.locator('[data-testid="queue-item-status"]')
    await expect(status).toContainText('Paused', { timeout: 10000 })
  })

  test('Resume button resumes download', async ({ page }) => {
    await loadTestVideo(page)

    const downloadButton = page.locator('[data-testid="download-button"]')
    await downloadButton.click()

    // Wait for download to start
    await page.locator('[data-testid="queue-item-progress"]').waitFor({ timeout: 30000 })

    // Pause first
    const pauseButton = page.locator('[data-testid="pause-button"]')
    await pauseButton.click()
    await expect(page.locator('[data-testid="queue-item-status"]')).toContainText('Paused', { timeout: 10000 })

    // Now resume (same button, now shows play icon)
    await pauseButton.click()

    // Status should change back to Downloading
    const status = page.locator('[data-testid="queue-item-status"]')
    await expect(status).toContainText('Downloading', { timeout: 10000 })
  })

  test('Cancel removes from queue', async ({ page }) => {
    await loadTestVideo(page)

    const downloadButton = page.locator('[data-testid="download-button"]')
    await downloadButton.click()

    // Wait for queue item to appear
    const queueItem = page.locator('[data-testid="queue-item"]')
    await expect(queueItem).toBeVisible({ timeout: 10000 })

    // Click cancel button
    const cancelButton = page.locator('[data-testid="cancel-button"]')
    await expect(cancelButton).toBeVisible()
    await cancelButton.click()

    // Queue item should be removed
    await expect(queueItem).not.toBeVisible({ timeout: 10000 })
  })

  test('Completed shows success state @smoke', async ({ page }) => {
    await loadTestVideo(page)

    const downloadButton = page.locator('[data-testid="download-button"]')
    await downloadButton.click()

    // Wait for download to complete - this video is only 19 seconds
    const status = page.locator('[data-testid="queue-item-status"]')
    await expect(status).toContainText('Complete', { timeout: 60000 })
  })

  test('Open folder button exists on completed download', async ({ page }) => {
    await loadTestVideo(page)

    const downloadButton = page.locator('[data-testid="download-button"]')
    await downloadButton.click()

    // Wait for completion
    await expect(page.locator('[data-testid="queue-item-status"]')).toContainText('Complete', { timeout: 60000 })

    // Open folder button should be visible
    const openFolderButton = page.locator('[data-testid="open-folder-button"]')
    await expect(openFolderButton).toBeVisible()
  })
})
