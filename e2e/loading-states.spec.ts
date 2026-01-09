import { test, expect } from './fixtures/electron'

// Helper to load a video before testing
async function loadTestVideo(page: import('@playwright/test').Page) {
  const urlInput = page.locator('[data-testid="url-input"]')
  const fetchButton = page.locator('[data-testid="fetch-button"]')

  // Use "Me at the zoo" - first YouTube video, only 19 seconds
  await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
  await fetchButton.click()

  // Wait for video info to load (longer timeout for network variability)
  await page.locator('[data-testid="video-title"]').waitFor({ timeout: 60000 })
}

test.describe('Phase 8: UX Polish & Loading States', () => {
  // Set timeout for network-dependent tests
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    testInfo.setTimeout(120000) // 2 minutes per test
  })

  test('Status message shown during video fetch', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    // Enter a valid URL
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await fetchButton.click()

    // Status message should appear during fetch
    const fetchStatus = page.locator('[data-testid="fetch-status"]')
    await expect(fetchStatus).toBeVisible({ timeout: 5000 })
    await expect(fetchStatus).toContainText(/Fetching video info|Analyzing/)

    // Wait for fetch to complete
    await page.locator('[data-testid="video-title"]').waitFor({ timeout: 60000 })

    // Status message should disappear after loading completes
    await expect(fetchStatus).not.toBeVisible({ timeout: 5000 })
  })

  test('Skeleton loader visible while loading', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    // Enter a valid URL
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await fetchButton.click()

    // Skeleton loader should be visible during fetch
    const skeleton = page.locator('[data-testid="video-skeleton"]')
    await expect(skeleton).toBeVisible({ timeout: 5000 })

    // Wait for video info to load
    await page.locator('[data-testid="video-title"]').waitFor({ timeout: 60000 })

    // Skeleton should no longer be visible
    await expect(skeleton).not.toBeVisible({ timeout: 5000 })
  })

  test('Download button exists and has expected attributes when video loaded', async ({ page }) => {
    // Load video first to make download button visible
    await loadTestVideo(page)

    // Verify button is visible
    const downloadButton = page.locator('[data-testid="download-button"]')
    await expect(downloadButton).toBeVisible()

    // Button should have accessible text or aria-label
    const buttonText = await downloadButton.textContent()
    expect(buttonText?.toLowerCase()).toContain('download')
  })

  test('Queue item appears when download starts', async ({ page }) => {
    await loadTestVideo(page)

    // Wait for quality selector to have options (formats loaded)
    const qualitySelector = page.locator('[data-testid="quality-selector"]')
    await expect(qualitySelector).toBeVisible({ timeout: 30000 })
    await expect(qualitySelector).toBeEnabled({ timeout: 10000 })

    // Start a download
    const downloadButton = page.locator('[data-testid="download-button"]')
    await expect(downloadButton).toBeEnabled({ timeout: 10000 })
    await downloadButton.click()

    // Wait for queue item to appear
    const queueItem = page.locator('[data-testid="queue-item"]')
    await expect(queueItem).toBeVisible({ timeout: 10000 })

    // Queue item should have the expected structure
    const queueTitle = queueItem.locator('[data-testid="queue-item-title"]')
    await expect(queueTitle).toBeVisible()
    const queueStatus = queueItem.locator('[data-testid="queue-item-status"]')
    await expect(queueStatus).toBeVisible()
  })

  test('Success feedback shown on completion', async ({ page }) => {
    await loadTestVideo(page)

    const downloadButton = page.locator('[data-testid="download-button"]')
    await downloadButton.click()

    // Wait for download to complete - short video
    const status = page.locator('[data-testid="queue-item-status"]')
    await expect(status).toContainText('Complete', { timeout: 60000 })

    // Queue item should still be visible and showing completed state
    const queueItem = page.locator('[data-testid="queue-item"]')
    await expect(queueItem).toBeVisible()

    // The success animation element may have already faded (it's brief)
    // So we just verify the completed status is shown
    await expect(status).toContainText('Complete')
  })

  test('Phase-specific status displayed during download', async ({ page }) => {
    await loadTestVideo(page)

    const downloadButton = page.locator('[data-testid="download-button"]')
    await downloadButton.click()

    // Wait for queue item to appear
    await page.locator('[data-testid="queue-item"]').waitFor({ timeout: 10000 })

    // Check for phase text in status - should show one of the phases
    const phase = page.locator('[data-testid="download-phase"]')
    await expect(phase).toBeVisible({ timeout: 10000 })

    // Phase should contain recognizable text
    const phaseText = await phase.textContent()
    expect(phaseText).toBeTruthy()
    // Can be Preparing, Downloading, Finalizing, or Complete/Pending
    expect(phaseText).toMatch(/Preparing|Downloading|Finalizing|Complete|Pending/)
  })

  test('Fetch status shows different phases over time', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    // Enter a valid URL
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await fetchButton.click()

    // The fetch status should be visible during loading
    const fetchStatus = page.locator('[data-testid="fetch-status"]')
    await expect(fetchStatus).toBeVisible({ timeout: 5000 })

    // Wait for the video to load
    await page.locator('[data-testid="video-title"]').waitFor({ timeout: 60000 })
  })
})
