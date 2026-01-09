import { ipcMain, BrowserWindow } from 'electron'
import {
  createTranscriber,
  Transcriber,
  TranscriptionOptions,
  TranscriptionProgress,
  TranscriptionResult,
} from '../services/transcription.service'
import { getBinaryManager } from '../services/binary-manager.service'

// Store active transcriptions by ID
const activeTranscriptions = new Map<string, Transcriber>()

export function registerTranscriptionIPC(): void {
  // Check whisper model status
  ipcMain.handle('transcription:getModelStatus', async (_event, modelName: string = 'small') => {
    try {
      const status = await getBinaryManager().checkWhisperModelStatus(modelName)
      return { success: true, data: status }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Check whisper binary status
  ipcMain.handle('transcription:getBinaryStatus', async () => {
    try {
      const status = await getBinaryManager().checkBinaryStatus()
      return {
        success: true,
        data: {
          exists: status.whisper.exists,
          executable: status.whisper.executable,
          version: status.whisper.version,
          path: status.whisper.path,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Download whisper binary
  ipcMain.handle('transcription:downloadBinary', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      const binaryManager = getBinaryManager()

      // Set up progress listener
      const progressHandler = (progress: {
        binary: string
        percent: number
        downloadedBytes: number
        totalBytes: number
      }) => {
        window?.webContents.send('transcription:binaryDownloadProgress', progress)
      }

      binaryManager.on('download-progress', progressHandler)

      try {
        await binaryManager.downloadBinary('whisper')
        return { success: true }
      } finally {
        binaryManager.removeListener('download-progress', progressHandler)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Download whisper model
  ipcMain.handle('transcription:downloadModel', async (event, modelName: string = 'small') => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      const binaryManager = getBinaryManager()

      // Set up progress listener
      const progressHandler = (progress: {
        binary: string
        percent: number
        downloadedBytes: number
        totalBytes: number
      }) => {
        window?.webContents.send('transcription:modelDownloadProgress', progress)
      }

      binaryManager.on('download-progress', progressHandler)

      try {
        await binaryManager.downloadWhisperModel(modelName)
        return { success: true }
      } finally {
        binaryManager.removeListener('download-progress', progressHandler)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Ensure whisper is ready (downloads binary and model if needed)
  ipcMain.handle('transcription:ensureReady', async (event, modelName: string = 'small') => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      const binaryManager = getBinaryManager()

      // Set up progress listener
      const progressHandler = (progress: {
        binary: string
        percent: number
        downloadedBytes: number
        totalBytes: number
      }) => {
        window?.webContents.send('transcription:downloadProgress', progress)
      }

      binaryManager.on('download-progress', progressHandler)

      try {
        const result = await binaryManager.ensureWhisperReady(modelName)
        return { success: true, data: result }
      } finally {
        binaryManager.removeListener('download-progress', progressHandler)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  // Start a transcription
  ipcMain.handle(
    'transcription:start',
    async (event, transcriptionId: string, options: TranscriptionOptions) => {
      try {
        const transcriber = createTranscriber()
        activeTranscriptions.set(transcriptionId, transcriber)

        const window = BrowserWindow.fromWebContents(event.sender)

        // Forward progress events to renderer
        transcriber.on('progress', (progress: TranscriptionProgress) => {
          window?.webContents.send('transcription:progress', transcriptionId, progress)
        })

        transcriber.on('complete', (result: TranscriptionResult) => {
          window?.webContents.send('transcription:complete', transcriptionId, result)
          activeTranscriptions.delete(transcriptionId)
        })

        transcriber.on('error', (error: string) => {
          window?.webContents.send('transcription:error', transcriptionId, error)
          activeTranscriptions.delete(transcriptionId)
        })

        transcriber.on('cancelled', () => {
          window?.webContents.send('transcription:cancelled', transcriptionId)
          activeTranscriptions.delete(transcriptionId)
        })

        // Start transcription (don't await - it runs in background)
        transcriber.transcribe(options).catch(() => {
          // Errors are handled via events
        })

        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  // Cancel transcription
  ipcMain.handle('transcription:cancel', async (_event, transcriptionId: string) => {
    const transcriber = activeTranscriptions.get(transcriptionId)
    if (transcriber) {
      transcriber.cancel()
      return { success: true }
    }
    return { success: false, error: 'Transcription not found' }
  })
}
