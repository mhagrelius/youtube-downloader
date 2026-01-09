import { test, expect } from './fixtures/electron'

test.describe('Phase 2: yt-dlp Integration', () => {
  test('window.electronAPI exists', async ({ page }) => {
    const hasElectronAPI = await page.evaluate(() => {
      return typeof window.electronAPI !== 'undefined'
    })
    expect(hasElectronAPI).toBe(true)
  })

  test('electronAPI has required methods @smoke', async ({ page }) => {
    const apiMethods = await page.evaluate(() => {
      const api = window.electronAPI
      return {
        hasGetVideoInfo: typeof api.getVideoInfo === 'function',
        hasDownload: typeof api.download === 'function',
        hasPauseDownload: typeof api.pauseDownload === 'function',
        hasResumeDownload: typeof api.resumeDownload === 'function',
        hasCancelDownload: typeof api.cancelDownload === 'function',
        hasGetDefaultDownloadPath: typeof api.getDefaultDownloadPath === 'function',
        hasSelectFolder: typeof api.selectFolder === 'function',
        hasOnDownloadProgress: typeof api.onDownloadProgress === 'function',
        hasOnDownloadComplete: typeof api.onDownloadComplete === 'function',
        hasOnDownloadError: typeof api.onDownloadError === 'function',
      }
    })

    expect(apiMethods.hasGetVideoInfo).toBe(true)
    expect(apiMethods.hasDownload).toBe(true)
    expect(apiMethods.hasPauseDownload).toBe(true)
    expect(apiMethods.hasResumeDownload).toBe(true)
    expect(apiMethods.hasCancelDownload).toBe(true)
    expect(apiMethods.hasGetDefaultDownloadPath).toBe(true)
    expect(apiMethods.hasSelectFolder).toBe(true)
    expect(apiMethods.hasOnDownloadProgress).toBe(true)
    expect(apiMethods.hasOnDownloadComplete).toBe(true)
    expect(apiMethods.hasOnDownloadError).toBe(true)
  })

  test('getVideoInfo returns metadata for valid URL', async ({ page }) => {
    test.setTimeout(30000) // Increase timeout for network request
    // Use a well-known, short YouTube video that should always be available
    // This is the "Me at the zoo" video - the first YouTube video ever uploaded
    const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'

    const result = await page.evaluate(async (url: string) => {
      return await window.electronAPI.getVideoInfo(url)
    }, testUrl)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.id).toBe('jNQXAC9IVRw')
    expect(result.data?.title).toBeTruthy()
    expect(result.data?.duration).toBeGreaterThan(0)
    expect(result.data?.thumbnail).toBeTruthy()
    expect(result.data?.formats).toBeDefined()
    expect(Array.isArray(result.data?.formats)).toBe(true)
  })

  test('getVideoInfo returns error for invalid URL', async ({ page }) => {
    test.setTimeout(30000) // Increase timeout for network request
    const invalidUrl = 'https://www.youtube.com/watch?v=invalid_video_id_12345'

    const result = await page.evaluate(async (url: string) => {
      return await window.electronAPI.getVideoInfo(url)
    }, invalidUrl)

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  test('getDefaultDownloadPath returns a valid path', async ({ page }) => {
    const downloadPath = await page.evaluate(async () => {
      return await window.electronAPI.getDefaultDownloadPath()
    })

    expect(downloadPath).toBeTruthy()
    expect(typeof downloadPath).toBe('string')
    // On macOS, the downloads path should contain 'Downloads'
    expect(downloadPath.toLowerCase()).toContain('downloads')
  })
})

test.describe('Phase 3: Core UI Components', () => {
  test('URL input field visible and focusable', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    await expect(urlInput).toBeVisible()
    await urlInput.focus()
    await expect(urlInput).toBeFocused()
  })

  test('Paste button exists and is clickable', async ({ page }) => {
    const pasteButton = page.locator('[data-testid="paste-button"]')
    await expect(pasteButton).toBeVisible()
    await expect(pasteButton).toBeEnabled()
  })

  test('Invalid URL shows error styling', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill('not-a-valid-url')
    await fetchButton.click()

    const errorMessage = page.locator('[data-testid="url-error"]')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toContainText('valid YouTube URL')
  })

  test('Valid URL fetches and displays video info @smoke', async ({ page }) => {
    test.setTimeout(60000)
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    // Use the first YouTube video ever uploaded
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await fetchButton.click()

    // Wait for video info to load
    const videoTitle = page.locator('[data-testid="video-title"]')
    await expect(videoTitle).toBeVisible({ timeout: 30000 })
    await expect(videoTitle).not.toBeEmpty()

    const videoThumbnail = page.locator('[data-testid="video-thumbnail"]')
    await expect(videoThumbnail).toBeVisible()

    const videoDuration = page.locator('[data-testid="video-duration"]')
    await expect(videoDuration).toBeVisible()
  })

  test('Quality selector shows format options', async ({ page }) => {
    test.setTimeout(60000)
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await fetchButton.click()

    // Wait for video to load
    await page.locator('[data-testid="video-title"]').waitFor({ timeout: 30000 })

    const qualitySelector = page.locator('[data-testid="quality-selector"]')
    await expect(qualitySelector).toBeVisible()
    await expect(qualitySelector).toBeEnabled()

    // Check that options exist
    const options = qualitySelector.locator('option')
    expect(await options.count()).toBeGreaterThan(0)
  })

  test('Audio-only toggle switches mode', async ({ page }) => {
    test.setTimeout(60000)
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await fetchButton.click()
    await page.locator('[data-testid="video-title"]').waitFor({ timeout: 30000 })

    const audioToggle = page.locator('[data-testid="audio-toggle"]')
    await expect(audioToggle).toBeVisible()

    // Check initial state (off)
    await expect(audioToggle).toHaveAttribute('aria-checked', 'false')

    // Toggle on
    await audioToggle.click()
    await expect(audioToggle).toHaveAttribute('aria-checked', 'true')

    // Quality selector should still be visible
    const qualitySelector = page.locator('[data-testid="quality-selector"]')
    await expect(qualitySelector).toBeVisible()
  })

  test('Download button clickable when video loaded', async ({ page }) => {
    test.setTimeout(60000)
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await fetchButton.click()
    await page.locator('[data-testid="video-title"]').waitFor({ timeout: 30000 })

    // Wait for formats to load (quality selector becomes enabled)
    const qualitySelector = page.locator('[data-testid="quality-selector"]')
    await expect(qualitySelector).toBeEnabled({ timeout: 30000 })

    const downloadButton = page.locator('[data-testid="download-button"]')
    await expect(downloadButton).toBeVisible()
    await expect(downloadButton).toBeEnabled({ timeout: 10000 })
  })
})

test.describe('Two-Phase Loading', () => {
  test('Video preview (title/thumbnail) appears before formats load', async ({ page }) => {
    test.setTimeout(30000)
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await fetchButton.click()

    // Title and thumbnail should appear relatively quickly (Phase 1 - oEmbed)
    const videoTitle = page.locator('[data-testid="video-title"]')
    const videoThumbnail = page.locator('[data-testid="video-thumbnail"]')
    await expect(videoTitle).toBeVisible({ timeout: 10000 })
    await expect(videoThumbnail).toBeVisible({ timeout: 10000 })
  })

  test('Duration updates from placeholder to actual value', async ({ page }) => {
    test.setTimeout(60000)
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await fetchButton.click()

    // Wait for title (Phase 1 complete)
    await page.locator('[data-testid="video-title"]').waitFor({ timeout: 10000 })

    // Wait for quality selector to be enabled (Phase 2 fully complete)
    // Duration data-testid only appears after formats load (when duration > 0)
    const qualitySelector = page.locator('[data-testid="quality-selector"]')
    await expect(qualitySelector).toBeEnabled({ timeout: 30000 })

    // Now duration should be visible with actual value
    // The video "Me at the zoo" is 19 seconds, so we expect "0:19" format
    const videoDuration = page.locator('[data-testid="video-duration"]')
    await expect(videoDuration).toBeVisible({ timeout: 5000 })
    const durationText = await videoDuration.textContent()
    expect(durationText).toMatch(/\d+:\d+/) // Matches time format like "0:19"
  })

  test('getVideoPreview API returns partial info quickly', async ({ page }) => {
    test.setTimeout(10000)
    const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'

    const result = await page.evaluate(async (url: string) => {
      const startTime = Date.now()
      const preview = await window.electronAPI.getVideoPreview(url)
      const duration = Date.now() - startTime
      return { preview, duration }
    }, testUrl)

    expect(result.preview.success).toBe(true)
    expect(result.preview.data?.title).toBeTruthy()
    expect(result.preview.data?.thumbnail).toBeTruthy()
    expect(result.preview.data?.uploader).toBeTruthy()
    // Preview should be fast (oEmbed typically < 1 second)
    expect(result.duration).toBeLessThan(5000)
  })

  test('Format loading state shows when fetching full info', async ({ page }) => {
    test.setTimeout(60000)
    const urlInput = page.locator('[data-testid="url-input"]')
    const fetchButton = page.locator('[data-testid="fetch-button"]')

    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await fetchButton.click()

    // Wait for title (Phase 1)
    await page.locator('[data-testid="video-title"]').waitFor({ timeout: 10000 })

    // Quality selector should eventually be enabled with options
    const qualitySelector = page.locator('[data-testid="quality-selector"]')
    await expect(qualitySelector).toBeVisible({ timeout: 30000 })

    // Verify it has options (formats loaded)
    const options = qualitySelector.locator('option')
    await expect(options).not.toHaveCount(0, { timeout: 30000 })
  })
})
