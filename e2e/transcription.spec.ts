import { test, expect } from './fixtures/electron'

test.describe('Phase 9: Transcription', () => {
  // UI Tests - Transcribe Toggle
  test('Transcribe toggle is not visible when Audio Only is disabled', async ({ page }) => {
    // Enter a valid URL first
    const urlInput = page.locator('[data-testid="url-input"]')
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await page.locator('[data-testid="fetch-button"]').click()

    // Wait for video info to load
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible({ timeout: 30000 })

    // Audio Only should be visible but transcribe toggle should not
    await expect(page.locator('[data-testid="audio-toggle"]')).toBeVisible()
    await expect(page.locator('[data-testid="transcribe-toggle"]')).not.toBeVisible()
  })

  test('Transcribe toggle appears when Audio Only is enabled @smoke', async ({ page }) => {
    // Enter a valid URL first
    const urlInput = page.locator('[data-testid="url-input"]')
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await page.locator('[data-testid="fetch-button"]').click()

    // Wait for video info to load
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible({ timeout: 30000 })

    // Enable Audio Only
    await page.locator('[data-testid="audio-toggle"]').click()

    // Now transcribe toggle should be visible
    await expect(page.locator('[data-testid="transcribe-toggle"]')).toBeVisible()
  })

  test('Transcribe toggle is disabled when Audio Only is off', async ({ page }) => {
    // Enter a valid URL first
    const urlInput = page.locator('[data-testid="url-input"]')
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await page.locator('[data-testid="fetch-button"]').click()

    // Wait for video info to load
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible({ timeout: 30000 })

    // Enable Audio Only to show transcribe toggle
    await page.locator('[data-testid="audio-toggle"]').click()
    await expect(page.locator('[data-testid="transcribe-toggle"]')).toBeVisible()

    // Disable Audio Only - transcribe toggle should disappear
    await page.locator('[data-testid="audio-toggle"]').click()
    await expect(page.locator('[data-testid="transcribe-toggle"]')).not.toBeVisible()
  })

  // UI Tests - Transcription Options
  test('Format selector appears when Transcribe is enabled', async ({ page }) => {
    // Enter a valid URL first
    const urlInput = page.locator('[data-testid="url-input"]')
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await page.locator('[data-testid="fetch-button"]').click()

    // Wait for video info to load
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible({ timeout: 30000 })

    // Enable Audio Only
    await page.locator('[data-testid="audio-toggle"]').click()
    await expect(page.locator('[data-testid="transcribe-toggle"]')).toBeVisible()

    // Format selector should not be visible yet
    await expect(page.locator('[data-testid="transcription-format-select"]')).not.toBeVisible()

    // Enable Transcribe
    await page.locator('[data-testid="transcribe-toggle"]').click()

    // Format selector should now be visible
    await expect(page.locator('[data-testid="transcription-format-select"]')).toBeVisible()
  })

  test('Language selector appears when Transcribe is enabled', async ({ page }) => {
    // Enter a valid URL first
    const urlInput = page.locator('[data-testid="url-input"]')
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await page.locator('[data-testid="fetch-button"]').click()

    // Wait for video info to load
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible({ timeout: 30000 })

    // Enable Audio Only
    await page.locator('[data-testid="audio-toggle"]').click()

    // Enable Transcribe
    await page.locator('[data-testid="transcribe-toggle"]').click()

    // Language selector should be visible
    await expect(page.locator('[data-testid="transcription-language-select"]')).toBeVisible()
  })

  test('Format selector has correct options', async ({ page }) => {
    // Enter a valid URL first
    const urlInput = page.locator('[data-testid="url-input"]')
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await page.locator('[data-testid="fetch-button"]').click()

    // Wait for video info to load
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible({ timeout: 30000 })

    // Enable Audio Only and Transcribe
    await page.locator('[data-testid="audio-toggle"]').click()
    await page.locator('[data-testid="transcribe-toggle"]').click()

    const formatSelect = page.locator('[data-testid="transcription-format-select"]')

    // Check options exist
    await expect(formatSelect.locator('option[value="txt"]')).toBeAttached()
    await expect(formatSelect.locator('option[value="srt"]')).toBeAttached()
    await expect(formatSelect.locator('option[value="vtt"]')).toBeAttached()
  })

  test('Format can be changed', async ({ page }) => {
    // Enter a valid URL first
    const urlInput = page.locator('[data-testid="url-input"]')
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await page.locator('[data-testid="fetch-button"]').click()

    // Wait for video info to load
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible({ timeout: 30000 })

    // Enable Audio Only and Transcribe
    await page.locator('[data-testid="audio-toggle"]').click()
    await page.locator('[data-testid="transcribe-toggle"]').click()

    const formatSelect = page.locator('[data-testid="transcription-format-select"]')

    // Change to txt
    await formatSelect.selectOption('txt')
    await expect(formatSelect).toHaveValue('txt')

    // Change to vtt
    await formatSelect.selectOption('vtt')
    await expect(formatSelect).toHaveValue('vtt')
  })

  // Settings Tests
  test('Settings modal shows Whisper model section', async ({ page }) => {
    await page.locator('[data-testid="settings-button"]').click()
    await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible()

    // Check for transcription section text
    await expect(page.locator('text=Transcription (Whisper Model)')).toBeVisible()
    await expect(page.locator('text=Base model')).toBeVisible()
  })

  // API Tests
  test('transcription APIs are available', async ({ page }) => {
    const hasAPIs = await page.evaluate(() => {
      return (
        typeof window.electronAPI.getWhisperModelStatus === 'function' &&
        typeof window.electronAPI.downloadWhisperModel === 'function' &&
        typeof window.electronAPI.startTranscription === 'function' &&
        typeof window.electronAPI.cancelTranscription === 'function' &&
        typeof window.electronAPI.onTranscriptionProgress === 'function' &&
        typeof window.electronAPI.onTranscriptionComplete === 'function' &&
        typeof window.electronAPI.onTranscriptionError === 'function'
      )
    })
    expect(hasAPIs).toBe(true)
  })

  test('getWhisperModelStatus returns a result', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return await window.electronAPI.getWhisperModelStatus('small')
    })
    expect(result).toBeDefined()
    expect(typeof result.success).toBe('boolean')
  })

  test('onTranscriptionProgress listener can be registered', async ({ page }) => {
    const canRegister = await page.evaluate(() => {
      const unsubscribe = window.electronAPI.onTranscriptionProgress(() => {})
      const isFunction = typeof unsubscribe === 'function'
      unsubscribe()
      return isFunction
    })
    expect(canRegister).toBe(true)
  })

  test('onTranscriptionComplete listener can be registered', async ({ page }) => {
    const canRegister = await page.evaluate(() => {
      const unsubscribe = window.electronAPI.onTranscriptionComplete(() => {})
      const isFunction = typeof unsubscribe === 'function'
      unsubscribe()
      return isFunction
    })
    expect(canRegister).toBe(true)
  })

  test('onTranscriptionError listener can be registered', async ({ page }) => {
    const canRegister = await page.evaluate(() => {
      const unsubscribe = window.electronAPI.onTranscriptionError(() => {})
      const isFunction = typeof unsubscribe === 'function'
      unsubscribe()
      return isFunction
    })
    expect(canRegister).toBe(true)
  })

  // Workflow tests
  test('Full transcription workflow: enable audio + transcribe, verify button updates', async ({ page }) => {
    test.setTimeout(60000)
    // Enter a valid URL first
    const urlInput = page.locator('[data-testid="url-input"]')
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await page.locator('[data-testid="fetch-button"]').click()

    // Wait for video info to load
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible({ timeout: 30000 })

    // Wait for formats to load (quality selector becomes enabled)
    const qualitySelector = page.locator('[data-testid="quality-selector"]')
    await expect(qualitySelector).toBeEnabled({ timeout: 30000 })

    // Get the download button
    const downloadButton = page.locator('[data-testid="download-button"]')

    // Enable Audio Only
    await page.locator('[data-testid="audio-toggle"]').click()

    // Enable Transcribe
    await page.locator('[data-testid="transcribe-toggle"]').click()

    // Set transcription format
    const formatSelect = page.locator('[data-testid="transcription-format-select"]')
    await formatSelect.selectOption('txt')

    // The download button should indicate transcription
    // (either the text changes or there's a visual indicator)
    await expect(downloadButton).toBeVisible()
    await expect(downloadButton).toBeEnabled({ timeout: 10000 })

    // Verify the button can be clicked (don't actually download to avoid network dependency)
    const isClickable = await downloadButton.isEnabled()
    expect(isClickable).toBe(true)
  })

  test('Transcription options reset when toggling off', async ({ page }) => {
    // Enter a valid URL first
    const urlInput = page.locator('[data-testid="url-input"]')
    await urlInput.fill('https://www.youtube.com/watch?v=jNQXAC9IVRw')
    await page.locator('[data-testid="fetch-button"]').click()

    // Wait for video info to load
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible({ timeout: 30000 })

    // Enable Audio Only
    await page.locator('[data-testid="audio-toggle"]').click()

    // Enable Transcribe
    await page.locator('[data-testid="transcribe-toggle"]').click()
    await expect(page.locator('[data-testid="transcription-format-select"]')).toBeVisible()

    // Disable Transcribe
    await page.locator('[data-testid="transcribe-toggle"]').click()

    // Options should disappear
    await expect(page.locator('[data-testid="transcription-format-select"]')).not.toBeVisible()

    // Re-enable should show options again
    await page.locator('[data-testid="transcribe-toggle"]').click()
    await expect(page.locator('[data-testid="transcription-format-select"]')).toBeVisible()
  })
})
