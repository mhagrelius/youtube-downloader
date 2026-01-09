import { test, expect } from './fixtures/electron'

// Use a short public YouTube playlist for testing
// This is "Programming Tutorials" playlist with only a few short videos
const TEST_PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLFs4vir_WsTyXrrpFstD64Qj95vpy-yo1'

test.describe('Phase 6: Playlist Support', () => {
  // Set longer timeout for all tests due to network variability
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    testInfo.setTimeout(180000) // 3 minutes per test
  })

  test('window.electronAPI has getPlaylistInfo method', async ({ page }) => {
    const hasMethod = await page.evaluate(() => {
      return typeof window.electronAPI.getPlaylistInfo === 'function'
    })
    expect(hasMethod).toBe(true)
  })

  test('getPlaylistInfo returns metadata for valid playlist URL', async ({ page }) => {
    test.setTimeout(60000)
    const result = await page.evaluate(async (url: string) => {
      return await window.electronAPI.getPlaylistInfo(url)
    }, TEST_PLAYLIST_URL)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.id).toBeTruthy()
    expect(result.data?.title).toBeTruthy()
    expect(result.data?.entries).toBeDefined()
    expect(Array.isArray(result.data?.entries)).toBe(true)
    expect(result.data?.entryCount).toBeGreaterThan(0)
  })

  test('Playlist URL detected correctly @smoke', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill(TEST_PLAYLIST_URL)
    await fetchButton.click()

    // Wait for playlist preview to appear
    const playlistPreview = page.locator('[data-testid="playlist-preview"]')
    await expect(playlistPreview).toBeVisible({ timeout: 60000 })
  })

  test('Playlist preview shows video count', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill(TEST_PLAYLIST_URL)
    await fetchButton.click()

    // Wait for playlist preview to load
    await page.locator('[data-testid="playlist-preview"]').waitFor({ timeout: 60000 })

    // Check video count is displayed
    const videoCount = page.locator('[data-testid="playlist-video-count"]')
    await expect(videoCount).toBeVisible()
    await expect(videoCount).toContainText('videos')
  })

  test('Video titles listed', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill(TEST_PLAYLIST_URL)
    await fetchButton.click()

    // Wait for playlist preview to load
    await page.locator('[data-testid="playlist-preview"]').waitFor({ timeout: 60000 })

    // Check that video list exists and has items
    const videoList = page.locator('[data-testid="playlist-video-list"]')
    await expect(videoList).toBeVisible()

    // Check that at least one video item exists with a title
    const videoItems = page.locator('[data-testid="playlist-video-item"]')
    expect(await videoItems.count()).toBeGreaterThan(0)

    const firstVideoTitle = page.locator('[data-testid="video-item-title"]').first()
    await expect(firstVideoTitle).not.toBeEmpty()
  })

  test('Can select/deselect videos', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill(TEST_PLAYLIST_URL)
    await fetchButton.click()

    // Wait for playlist preview to load
    await page.locator('[data-testid="playlist-preview"]').waitFor({ timeout: 60000 })

    // By default all videos should be selected
    const selectionCount = page.locator('[data-testid="playlist-selection-count"]')
    const initialText = await selectionCount.textContent()
    expect(initialText).toMatch(/\d+ of \d+ selected/)

    // Click deselect all
    const deselectAllButton = page.locator('[data-testid="deselect-all-button"]')
    await deselectAllButton.click()

    // Check that selection count updated
    await expect(selectionCount).toContainText('0 of')

    // Click select all
    const selectAllButton = page.locator('[data-testid="select-all-button"]')
    await selectAllButton.click()

    // Check that all are selected again
    const finalText = await selectionCount.textContent()
    const match = finalText?.match(/(\d+) of (\d+) selected/)
    expect(match).toBeTruthy()
    if (match) {
      expect(match[1]).toBe(match[2]) // Selected count equals total count
    }
  })

  test('Can toggle individual video selection', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill(TEST_PLAYLIST_URL)
    await fetchButton.click()

    // Wait for playlist preview to load
    await page.locator('[data-testid="playlist-preview"]').waitFor({ timeout: 60000 })

    // Get initial selection count
    const selectionCount = page.locator('[data-testid="playlist-selection-count"]')
    const initialText = await selectionCount.textContent()
    const initialMatch = initialText?.match(/(\d+) of/)
    const initialCount = parseInt(initialMatch?.[1] || '0')

    // Click first video item to deselect it
    const firstVideoItem = page.locator('[data-testid="playlist-video-item"]').first()
    await firstVideoItem.click()

    // Selection count should decrease by 1
    const afterDeselectText = await selectionCount.textContent()
    const afterMatch = afterDeselectText?.match(/(\d+) of/)
    const afterCount = parseInt(afterMatch?.[1] || '0')
    expect(afterCount).toBe(initialCount - 1)

    // Click again to reselect
    await firstVideoItem.click()

    // Selection count should be back to initial
    const finalText = await selectionCount.textContent()
    const finalMatch = finalText?.match(/(\d+) of/)
    const finalCount = parseInt(finalMatch?.[1] || '0')
    expect(finalCount).toBe(initialCount)
  })

  test('Download button shows selected video count', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill(TEST_PLAYLIST_URL)
    await fetchButton.click()

    // Wait for playlist preview to load
    await page.locator('[data-testid="playlist-preview"]').waitFor({ timeout: 60000 })

    // Check download button shows video count
    const downloadButton = page.locator('[data-testid="download-button"]')
    await expect(downloadButton).toBeVisible()
    await expect(downloadButton).toContainText(/Download \d+ Videos?/)
  })

  test('Download button disabled when no videos selected', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill(TEST_PLAYLIST_URL)
    await fetchButton.click()

    // Wait for playlist preview to load
    await page.locator('[data-testid="playlist-preview"]').waitFor({ timeout: 60000 })

    // Deselect all videos
    const deselectAllButton = page.locator('[data-testid="deselect-all-button"]')
    await deselectAllButton.click()

    // Download button should be disabled
    const downloadButton = page.locator('[data-testid="download-button"]')
    await expect(downloadButton).toBeDisabled()
  })

  test('Downloads queue multiple items from playlist', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill(TEST_PLAYLIST_URL)
    await fetchButton.click()

    // Wait for playlist preview to load
    await page.locator('[data-testid="playlist-preview"]').waitFor({ timeout: 60000 })

    // Deselect all then select first 2 videos only (to keep test fast)
    await page.locator('[data-testid="deselect-all-button"]').click()

    const videoItems = page.locator('[data-testid="playlist-video-item"]')
    await videoItems.nth(0).click()
    await videoItems.nth(1).click()

    // Click download button
    const downloadButton = page.locator('[data-testid="download-button"]')
    await downloadButton.click()

    // Should have 2 queue items
    const queueItems = page.locator('[data-testid="queue-item"]')
    await expect(queueItems).toHaveCount(2, { timeout: 10000 })
  })
})
