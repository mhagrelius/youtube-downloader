import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { registerDownloadIPC } from './ipc/download.ipc'
import { registerSettingsIPC } from './ipc/settings.ipc'
import { registerBinaryIPC } from './ipc/binary.ipc'
import { registerTranscriptionIPC } from './ipc/transcription.ipc'
import { getDatabase, closeDatabase } from './services/database.service'
import { setElectronPathResolver } from './services/binary-manager.service'
import { getElectronPathResolver } from './services/electron-paths'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

function initializeApp() {
  // Initialize binary manager with Electron paths (must be before any IPC handlers)
  setElectronPathResolver(getElectronPathResolver())

  // Initialize database
  getDatabase()

  // Register IPC handlers
  registerDownloadIPC()
  registerSettingsIPC()
  registerBinaryIPC()
  registerTranscriptionIPC()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 700,
    minWidth: 560,
    minHeight: 480,
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
  })

  mainWindow.setTitle('YouTube Downloader')

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  initializeApp()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('will-quit', () => {
  closeDatabase()
})
