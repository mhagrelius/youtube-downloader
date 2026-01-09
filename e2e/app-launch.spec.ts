import { test, expect } from './fixtures/electron'

test.describe('Phase 1: App Launch', () => {
  test('app launches successfully @smoke', async ({ electronApp, page: _page }) => {
    // The fact that we have a page means a window opened
    // Check that the app has at least one window
    const windows = electronApp.windows()
    expect(windows.length).toBeGreaterThan(0)
  })

  test('window has correct title', async ({ page }) => {
    const title = await page.title()
    expect(title).toBe('YouTube Downloader')
  })

  test('window renders React content @smoke', async ({ page }) => {
    // Check that the root element exists and has content
    const root = page.locator('#root')
    await expect(root).toBeVisible()

    // Check for the app header
    const header = page.locator('h1')
    await expect(header).toContainText('YouTube Downloader')
  })

  test('window has dark theme background', async ({ page }) => {
    // Check the background color of the main container
    const body = page.locator('body')
    const backgroundColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor
    })

    // #0f0f0f converts to rgb(15, 15, 15)
    expect(backgroundColor).toBe('rgb(15, 15, 15)')
  })

  test('URL input field exists @smoke', async ({ page }) => {
    const urlInput = page.locator('[data-testid="url-input"]')
    await expect(urlInput).toBeVisible()
    await expect(urlInput).toHaveAttribute('placeholder', 'Paste YouTube URL here...')
  })
})
