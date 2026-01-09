import { ipcMain, BrowserWindow } from 'electron'
import {
  getBinaryManager,
  BinaryStatus,
  DownloadProgress,
} from '../services/binary-manager.service'

export function registerBinaryIPC(): void {
  const binaryManager = getBinaryManager()

  // Check binary status
  ipcMain.handle(
    'binary:checkStatus',
    async (): Promise<{ success: boolean; data?: BinaryStatus; error?: string }> => {
      try {
        const status = await binaryManager.checkBinaryStatus()
        return { success: true, data: status }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Download all required binaries
  ipcMain.handle('binary:downloadAll', async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const windows = BrowserWindow.getAllWindows()
      const mainWindow = windows[0]

      await binaryManager.downloadAllBinaries((progress: DownloadProgress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('binary:downloadProgress', progress)
        }
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Download a specific binary
  ipcMain.handle(
    'binary:download',
    async (_event, name: 'yt-dlp' | 'deno'): Promise<{ success: boolean; error?: string }> => {
      try {
        const windows = BrowserWindow.getAllWindows()
        const mainWindow = windows[0]

        const progressHandler = (progress: DownloadProgress) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('binary:downloadProgress', progress)
          }
        }

        binaryManager.on('download-progress', progressHandler)

        try {
          await binaryManager.downloadBinary(name)
          return { success: true }
        } finally {
          binaryManager.removeListener('download-progress', progressHandler)
        }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Check for yt-dlp updates
  ipcMain.handle(
    'binary:checkYtDlpUpdate',
    async (): Promise<{
      success: boolean
      data?: { hasUpdate: boolean; currentVersion?: string; latestVersion?: string }
      error?: string
    }> => {
      try {
        const result = await binaryManager.checkForYtDlpUpdate()
        return { success: true, data: result }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  )

  // Update yt-dlp
  ipcMain.handle('binary:updateYtDlp', async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const windows = BrowserWindow.getAllWindows()
      const mainWindow = windows[0]

      const progressHandler = (progress: DownloadProgress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('binary:downloadProgress', progress)
        }
      }

      binaryManager.on('download-progress', progressHandler)

      try {
        await binaryManager.updateYtDlp()
        return { success: true }
      } finally {
        binaryManager.removeListener('download-progress', progressHandler)
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Get binary paths
  ipcMain.handle('binary:getPaths', (): { ytdlp: string; deno: string; binDir: string } => {
    return {
      ytdlp: binaryManager.getYtDlpPath(),
      deno: binaryManager.getDenoPath(),
      binDir: binaryManager.getBinDir(),
    }
  })
}
