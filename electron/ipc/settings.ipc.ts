import { ipcMain, dialog, BrowserWindow } from 'electron'
import {
  getSettings,
  setSettings,
  getSetting,
  setSetting,
  AppSettings,
} from '../services/settings.service'

export function registerSettingsIPC(): void {
  // Get all settings
  ipcMain.handle('settings:getAll', async () => {
    try {
      const settings = getSettings()
      return { success: true, data: settings }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Get single setting
  ipcMain.handle('settings:get', async (_event, key: keyof AppSettings) => {
    try {
      const value = getSetting(key)
      return { success: true, data: value }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Set single setting
  ipcMain.handle('settings:set', async (_event, key: keyof AppSettings, value: string) => {
    try {
      setSetting(key, value as AppSettings[typeof key])
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Set multiple settings
  ipcMain.handle('settings:setAll', async (_event, settings: Partial<AppSettings>) => {
    try {
      setSettings(settings)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Select download folder
  ipcMain.handle('settings:selectDownloadFolder', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { success: false, error: 'No window found' }

    const currentPath = getSetting('downloadPath')

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Default Download Folder',
      defaultPath: currentPath,
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelled' }
    }

    const newPath = result.filePaths[0]
    setSetting('downloadPath', newPath)
    return { success: true, path: newPath }
  })
}
