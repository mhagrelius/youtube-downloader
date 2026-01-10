import { ipcMain, BrowserWindow, app, dialog } from 'electron'
import {
  getVideoInfo,
  getVideoPreview,
  getPlaylistInfo,
  createDownloader,
  Downloader,
} from '../services/ytdlp.service'
import { BinaryManager } from '../services/binary-manager.service'
import type { DownloadOptions, DownloadProgress } from '../../shared/types'
import { getSetting } from '../services/settings.service'
import { ipcHandler, isPathWithinAllowed, getSafePaths } from '../utils/ipc-handler'

// Store active downloaders by ID, with associated window for cleanup
const activeDownloads = new Map<string, { downloader: Downloader; windowId: number }>()

// Clean up downloads when window closes
function cleanupDownloadsForWindow(windowId: number): void {
  for (const [downloadId, { downloader, windowId: downloadWindowId }] of activeDownloads) {
    if (downloadWindowId === windowId) {
      console.log(`[Download] Cleaning up download ${downloadId} for closed window ${windowId}`)
      downloader.cancel()
      activeDownloads.delete(downloadId)
    }
  }
}

export function registerDownloadIPC(binaryManager: BinaryManager): void {
  // Register window cleanup on close
  app.on('browser-window-created', (_event, window) => {
    window.on('closed', () => {
      cleanupDownloadsForWindow(window.id)
    })
  })

  // Get video info from URL
  ipcMain.handle(
    'ytdlp:getVideoInfo',
    ipcHandler(async (_event: unknown, url: string) => getVideoInfo(url, binaryManager), {
      channel: 'ytdlp:getVideoInfo',
    })
  )

  // Get fast video preview (using YouTube oEmbed API)
  ipcMain.handle(
    'ytdlp:getVideoPreview',
    ipcHandler(async (_event: unknown, url: string) => getVideoPreview(url), {
      channel: 'ytdlp:getVideoPreview',
    })
  )

  // Get playlist info from URL
  ipcMain.handle(
    'ytdlp:getPlaylistInfo',
    ipcHandler(async (_event: unknown, url: string) => getPlaylistInfo(url, binaryManager), {
      channel: 'ytdlp:getPlaylistInfo',
    })
  )

  // Start a download
  ipcMain.handle('ytdlp:download', async (event, downloadId: string, options: DownloadOptions) => {
    try {
      // Apply settings defaults for audio options
      const mergedOptions: DownloadOptions = {
        ...options,
        audioFormat: options.audioFormat || getSetting('audioFormat'),
        audioQuality: options.audioQuality || getSetting('audioQuality'),
      }

      const downloader = createDownloader(binaryManager)
      const window = BrowserWindow.fromWebContents(event.sender)
      const windowId = window?.id ?? -1

      activeDownloads.set(downloadId, { downloader, windowId })

      // Forward progress events to renderer
      downloader.on('progress', (progress: DownloadProgress) => {
        window?.webContents.send('ytdlp:progress', downloadId, progress)
      })

      downloader.on('complete', (outputFile: string) => {
        window?.webContents.send('ytdlp:complete', downloadId, outputFile)
        activeDownloads.delete(downloadId)
      })

      downloader.on('error', (error: string) => {
        console.error(`[Download] Error for ${downloadId}: ${error}`)
        window?.webContents.send('ytdlp:error', downloadId, error)
        activeDownloads.delete(downloadId)
      })

      downloader.on('paused', () => {
        window?.webContents.send('ytdlp:paused', downloadId)
      })

      downloader.on('resumed', () => {
        window?.webContents.send('ytdlp:resumed', downloadId)
      })

      downloader.on('cancelled', () => {
        window?.webContents.send('ytdlp:cancelled', downloadId)
        activeDownloads.delete(downloadId)
      })

      // Start download (don't await - it runs in background)
      downloader.download(mergedOptions).catch((err) => {
        console.error(`[Download] Uncaught error for ${downloadId}:`, err)
      })

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Download] Failed to start ${downloadId}:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  // Pause download
  ipcMain.handle('ytdlp:pause', async (_event, downloadId: string) => {
    const download = activeDownloads.get(downloadId)
    if (download) {
      download.downloader.pause()
      return { success: true }
    }
    return { success: false, error: 'Download not found' }
  })

  // Resume download
  ipcMain.handle('ytdlp:resume', async (_event, downloadId: string) => {
    const download = activeDownloads.get(downloadId)
    if (download) {
      download.downloader.resume()
      return { success: true }
    }
    return { success: false, error: 'Download not found' }
  })

  // Cancel download
  ipcMain.handle('ytdlp:cancel', async (_event, downloadId: string) => {
    const download = activeDownloads.get(downloadId)
    if (download) {
      download.downloader.cancel()
      return { success: true }
    }
    return { success: false, error: 'Download not found' }
  })

  // Get default download path
  ipcMain.handle('ytdlp:getDefaultDownloadPath', async () => {
    return app.getPath('downloads')
  })

  // Show folder picker dialog
  ipcMain.handle('ytdlp:selectFolder', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { success: false, error: 'No window found' }

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Download Folder',
      defaultPath: app.getPath('downloads'),
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelled' }
    }

    return { success: true, path: result.filePaths[0] }
  })

  // Open folder in file explorer (with path validation)
  ipcMain.handle('ytdlp:openFolder', async (_event, folderPath: string) => {
    // Validate path is within allowed directories
    const safePaths = getSafePaths()
    if (!isPathWithinAllowed(folderPath, safePaths)) {
      console.error(
        `[Security] Blocked openFolder request for path outside allowed directories: ${folderPath}`
      )
      return { success: false, error: 'Path not allowed' }
    }

    const { shell } = await import('electron')
    await shell.openPath(folderPath)
    return { success: true }
  })

  // Open file in default application (with path validation)
  ipcMain.handle('ytdlp:openFile', async (_event, filePath: string) => {
    // Validate path is within allowed directories
    const safePaths = getSafePaths()
    if (!isPathWithinAllowed(filePath, safePaths)) {
      console.error(
        `[Security] Blocked openFile request for path outside allowed directories: ${filePath}`
      )
      return { success: false, error: 'Path not allowed' }
    }

    const { shell } = await import('electron')
    await shell.openPath(filePath)
    return { success: true }
  })
}
