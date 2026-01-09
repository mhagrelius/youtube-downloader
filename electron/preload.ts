import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type {
  VideoInfo,
  VideoFormat,
  PartialVideoInfo,
  PlaylistInfo,
  PlaylistEntry,
  DownloadOptions,
  DownloadProgress,
  AppSettings,
  ApiResult,
  BinaryInfo,
  BinaryStatus,
  BinaryDownloadProgress,
  TranscriptionOptions,
  TranscriptionProgress,
  TranscriptionResult,
  WhisperModelStatus,
  WhisperBinaryStatus,
} from '../shared/types'

// Re-export types for consumers
export type {
  VideoInfo,
  VideoFormat,
  PartialVideoInfo,
  PlaylistInfo,
  PlaylistEntry,
  DownloadOptions,
  DownloadProgress,
  AppSettings,
  ApiResult,
  BinaryInfo,
  BinaryStatus,
  BinaryDownloadProgress,
  TranscriptionOptions,
  TranscriptionProgress,
  TranscriptionResult,
  WhisperModelStatus,
  WhisperBinaryStatus,
}

// Helper to create event subscription functions (reduces boilerplate)
function createEventSubscription<T extends unknown[]>(channel: string) {
  return (callback: (...args: T) => void) => {
    const handler = (_event: IpcRendererEvent, ...args: T) => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Video info
  getVideoInfo: (url: string): Promise<ApiResult<VideoInfo>> =>
    ipcRenderer.invoke('ytdlp:getVideoInfo', url),

  // Fast video preview (using YouTube oEmbed API)
  getVideoPreview: (url: string): Promise<ApiResult<PartialVideoInfo>> =>
    ipcRenderer.invoke('ytdlp:getVideoPreview', url),

  // Playlist info
  getPlaylistInfo: (url: string): Promise<ApiResult<PlaylistInfo>> =>
    ipcRenderer.invoke('ytdlp:getPlaylistInfo', url),

  // Download management
  download: (downloadId: string, options: DownloadOptions): Promise<ApiResult> =>
    ipcRenderer.invoke('ytdlp:download', downloadId, options),

  pauseDownload: (downloadId: string): Promise<ApiResult> =>
    ipcRenderer.invoke('ytdlp:pause', downloadId),

  resumeDownload: (downloadId: string): Promise<ApiResult> =>
    ipcRenderer.invoke('ytdlp:resume', downloadId),

  cancelDownload: (downloadId: string): Promise<ApiResult> =>
    ipcRenderer.invoke('ytdlp:cancel', downloadId),

  // File system
  getDefaultDownloadPath: (): Promise<string> => ipcRenderer.invoke('ytdlp:getDefaultDownloadPath'),

  selectFolder: (): Promise<ApiResult & { path?: string }> =>
    ipcRenderer.invoke('ytdlp:selectFolder'),

  openFolder: (folderPath: string): Promise<ApiResult> =>
    ipcRenderer.invoke('ytdlp:openFolder', folderPath),

  openFile: (filePath: string): Promise<ApiResult> =>
    ipcRenderer.invoke('ytdlp:openFile', filePath),

  // Settings
  getSettings: (): Promise<ApiResult<AppSettings>> => ipcRenderer.invoke('settings:getAll'),

  getSetting: (key: keyof AppSettings): Promise<ApiResult<string>> =>
    ipcRenderer.invoke('settings:get', key),

  setSetting: (key: keyof AppSettings, value: string): Promise<ApiResult> =>
    ipcRenderer.invoke('settings:set', key, value),

  setSettings: (settings: Partial<AppSettings>): Promise<ApiResult> =>
    ipcRenderer.invoke('settings:setAll', settings),

  selectDownloadFolder: (): Promise<ApiResult & { path?: string }> =>
    ipcRenderer.invoke('settings:selectDownloadFolder'),

  // Binary management
  checkBinaryStatus: (): Promise<ApiResult<BinaryStatus>> =>
    ipcRenderer.invoke('binary:checkStatus'),

  downloadAllBinaries: (): Promise<ApiResult> => ipcRenderer.invoke('binary:downloadAll'),

  downloadBinary: (name: 'yt-dlp' | 'deno'): Promise<ApiResult> =>
    ipcRenderer.invoke('binary:download', name),

  checkYtDlpUpdate: (): Promise<
    ApiResult<{ hasUpdate: boolean; currentVersion?: string; latestVersion?: string }>
  > => ipcRenderer.invoke('binary:checkYtDlpUpdate'),

  updateYtDlp: (): Promise<ApiResult> => ipcRenderer.invoke('binary:updateYtDlp'),

  getBinaryPaths: (): Promise<{ ytdlp: string; deno: string; binDir: string }> =>
    ipcRenderer.invoke('binary:getPaths'),

  // Event listeners (using helper to reduce boilerplate)
  onBinaryDownloadProgress:
    createEventSubscription<[BinaryDownloadProgress]>('binary:downloadProgress'),
  onDownloadProgress: createEventSubscription<[string, DownloadProgress]>('ytdlp:progress'),
  onDownloadComplete: createEventSubscription<[string, string]>('ytdlp:complete'),
  onDownloadError: createEventSubscription<[string, string]>('ytdlp:error'),
  onDownloadPaused: createEventSubscription<[string]>('ytdlp:paused'),
  onDownloadResumed: createEventSubscription<[string]>('ytdlp:resumed'),
  onDownloadCancelled: createEventSubscription<[string]>('ytdlp:cancelled'),

  // Transcription APIs
  getWhisperModelStatus: (modelName?: string): Promise<ApiResult<WhisperModelStatus>> =>
    ipcRenderer.invoke('transcription:getModelStatus', modelName),

  getWhisperBinaryStatus: (): Promise<ApiResult<WhisperBinaryStatus>> =>
    ipcRenderer.invoke('transcription:getBinaryStatus'),

  downloadWhisperBinary: (): Promise<ApiResult> =>
    ipcRenderer.invoke('transcription:downloadBinary'),

  downloadWhisperModel: (modelName?: string): Promise<ApiResult> =>
    ipcRenderer.invoke('transcription:downloadModel', modelName),

  ensureWhisperReady: (
    modelName?: string
  ): Promise<ApiResult<{ binaryPath: string; modelPath: string }>> =>
    ipcRenderer.invoke('transcription:ensureReady', modelName),

  startTranscription: (
    transcriptionId: string,
    options: TranscriptionOptions
  ): Promise<ApiResult> => ipcRenderer.invoke('transcription:start', transcriptionId, options),

  cancelTranscription: (transcriptionId: string): Promise<ApiResult> =>
    ipcRenderer.invoke('transcription:cancel', transcriptionId),

  // Transcription event listeners
  onTranscriptionProgress:
    createEventSubscription<[string, TranscriptionProgress]>('transcription:progress'),
  onTranscriptionComplete:
    createEventSubscription<[string, TranscriptionResult]>('transcription:complete'),
  onTranscriptionError: createEventSubscription<[string, string]>('transcription:error'),
  onTranscriptionCancelled: createEventSubscription<[string]>('transcription:cancelled'),
  onWhisperDownloadProgress: createEventSubscription<[BinaryDownloadProgress]>(
    'transcription:downloadProgress'
  ),
  onModelDownloadProgress: createEventSubscription<[BinaryDownloadProgress]>(
    'transcription:modelDownloadProgress'
  ),
})

// Type declaration for the exposed API
declare global {
  interface Window {
    electronAPI: {
      platform: string
      getVideoInfo: (url: string) => Promise<ApiResult<VideoInfo>>
      getVideoPreview: (url: string) => Promise<ApiResult<PartialVideoInfo>>
      getPlaylistInfo: (url: string) => Promise<ApiResult<PlaylistInfo>>
      download: (downloadId: string, options: DownloadOptions) => Promise<ApiResult>
      pauseDownload: (downloadId: string) => Promise<ApiResult>
      resumeDownload: (downloadId: string) => Promise<ApiResult>
      cancelDownload: (downloadId: string) => Promise<ApiResult>
      getDefaultDownloadPath: () => Promise<string>
      selectFolder: () => Promise<ApiResult & { path?: string }>
      openFolder: (folderPath: string) => Promise<ApiResult>
      openFile: (filePath: string) => Promise<ApiResult>
      getSettings: () => Promise<ApiResult<AppSettings>>
      getSetting: (key: keyof AppSettings) => Promise<ApiResult<string>>
      setSetting: (key: keyof AppSettings, value: string) => Promise<ApiResult>
      setSettings: (settings: Partial<AppSettings>) => Promise<ApiResult>
      selectDownloadFolder: () => Promise<ApiResult & { path?: string }>
      // Binary management
      checkBinaryStatus: () => Promise<ApiResult<BinaryStatus>>
      downloadAllBinaries: () => Promise<ApiResult>
      downloadBinary: (name: 'yt-dlp' | 'deno') => Promise<ApiResult>
      checkYtDlpUpdate: () => Promise<
        ApiResult<{ hasUpdate: boolean; currentVersion?: string; latestVersion?: string }>
      >
      updateYtDlp: () => Promise<ApiResult>
      getBinaryPaths: () => Promise<{ ytdlp: string; deno: string; binDir: string }>
      onBinaryDownloadProgress: (callback: (progress: BinaryDownloadProgress) => void) => () => void
      // Download events
      onDownloadProgress: (
        callback: (downloadId: string, progress: DownloadProgress) => void
      ) => () => void
      onDownloadComplete: (callback: (downloadId: string, outputFile: string) => void) => () => void
      onDownloadError: (callback: (downloadId: string, error: string) => void) => () => void
      onDownloadPaused: (callback: (downloadId: string) => void) => () => void
      onDownloadResumed: (callback: (downloadId: string) => void) => () => void
      onDownloadCancelled: (callback: (downloadId: string) => void) => () => void
      // Transcription APIs
      getWhisperModelStatus: (modelName?: string) => Promise<ApiResult<WhisperModelStatus>>
      getWhisperBinaryStatus: () => Promise<ApiResult<WhisperBinaryStatus>>
      downloadWhisperBinary: () => Promise<ApiResult>
      downloadWhisperModel: (modelName?: string) => Promise<ApiResult>
      ensureWhisperReady: (
        modelName?: string
      ) => Promise<ApiResult<{ binaryPath: string; modelPath: string }>>
      startTranscription: (
        transcriptionId: string,
        options: TranscriptionOptions
      ) => Promise<ApiResult>
      cancelTranscription: (transcriptionId: string) => Promise<ApiResult>
      // Transcription events
      onTranscriptionProgress: (
        callback: (transcriptionId: string, progress: TranscriptionProgress) => void
      ) => () => void
      onTranscriptionComplete: (
        callback: (transcriptionId: string, result: TranscriptionResult) => void
      ) => () => void
      onTranscriptionError: (
        callback: (transcriptionId: string, error: string) => void
      ) => () => void
      onTranscriptionCancelled: (callback: (transcriptionId: string) => void) => () => void
      onWhisperDownloadProgress: (
        callback: (progress: BinaryDownloadProgress) => void
      ) => () => void
      onModelDownloadProgress: (callback: (progress: BinaryDownloadProgress) => void) => () => void
    }
  }
}
