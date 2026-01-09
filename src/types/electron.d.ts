// Re-export all shared types for use in renderer
export type {
  VideoFormat,
  VideoInfo,
  PartialVideoInfo,
  PlaylistEntry,
  PlaylistInfo,
  AudioFormat,
  DownloadOptions,
  DownloadProgress,
  QualityPreference,
  AppSettings,
  ApiResult,
  BinaryInfo,
  BinaryStatus,
  BinaryDownloadProgress,
  YtDlpUpdateInfo,
  TranscriptionOutputFormat,
  TranscriptionPhase,
  TranscriptionOptions,
  TranscriptionProgress,
  TranscriptionResult,
  WhisperModelStatus,
  WhisperBinaryStatus,
} from '../../shared/types'

import type {
  VideoInfo,
  PartialVideoInfo,
  PlaylistInfo,
  DownloadOptions,
  DownloadProgress,
  AppSettings,
  ApiResult,
  BinaryStatus,
  BinaryDownloadProgress,
  TranscriptionOptions,
  TranscriptionProgress,
  TranscriptionResult,
  WhisperModelStatus,
  WhisperBinaryStatus,
} from '../../shared/types'

declare global {
  interface Window {
    electronAPI: {
      platform: NodeJS.Platform
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
      downloadBinary: (binary: 'yt-dlp' | 'deno') => Promise<ApiResult>
      // yt-dlp updates
      checkYtDlpUpdate: () => Promise<ApiResult<YtDlpUpdateInfo>>
      updateYtDlp: () => Promise<ApiResult>
      // Download progress events
      onDownloadProgress: (
        callback: (downloadId: string, progress: DownloadProgress) => void
      ) => () => void
      onDownloadComplete: (callback: (downloadId: string, outputFile: string) => void) => () => void
      onDownloadError: (callback: (downloadId: string, error: string) => void) => () => void
      onDownloadPaused: (callback: (downloadId: string) => void) => () => void
      onDownloadResumed: (callback: (downloadId: string) => void) => () => void
      onDownloadCancelled: (callback: (downloadId: string) => void) => () => void
      // Binary download progress events
      onBinaryDownloadProgress: (callback: (progress: BinaryDownloadProgress) => void) => () => void
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
