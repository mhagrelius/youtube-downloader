/**
 * Shared type definitions for YouTube Downloader
 * Single source of truth for types used across Electron main, preload, and renderer
 */

// Video & Format Types
export interface VideoFormat {
  formatId: string
  ext: string
  resolution: string
  filesize?: number
  vcodec: string
  acodec: string
  fps?: number
  tbr?: number
}

export interface VideoInfo {
  id: string
  title: string
  thumbnail: string
  duration: number
  uploader: string
  uploadDate: string
  viewCount: number
  description: string
  formats: VideoFormat[]
  url: string
}

export interface PartialVideoInfo {
  id: string
  title: string
  thumbnail: string
  uploader: string
  url: string
}

// Playlist Types
export interface PlaylistEntry {
  id: string
  title: string
  duration: number
  index: number
  url: string
  thumbnail?: string
}

export interface PlaylistInfo {
  id: string
  title: string
  thumbnail: string
  uploader: string
  entryCount: number
  entries: PlaylistEntry[]
  url: string
}

// Download Types
export type AudioFormat = 'mp3' | 'm4a' | 'best'

export interface DownloadOptions {
  url: string
  outputPath: string
  formatId?: string
  audioOnly?: boolean
  audioFormat?: AudioFormat
  audioQuality?: string
}

export interface DownloadProgress {
  percent: number
  downloadedBytes: number
  totalBytes: number
  speed: string
  eta: string
}

// Settings Types
export type QualityPreference = 'best' | '1080p' | '720p' | '480p' | '360p'

export interface AppSettings {
  downloadPath: string
  defaultQuality: QualityPreference
  audioFormat: AudioFormat
  audioQuality: string
}

// API Result Type
export interface ApiResult<T = void> {
  success: boolean
  data?: T
  error?: string
  path?: string
}

// Binary Management Types
export interface BinaryInfo {
  name?: string
  version?: string
  path: string
  exists: boolean
  executable: boolean
}

export interface BinaryStatus {
  ytdlp: BinaryInfo
  deno: BinaryInfo
  whisper: BinaryInfo
  ffmpeg: BinaryInfo
  ready: boolean
}

export interface BinaryDownloadProgress {
  binary: string
  percent: number
  downloadedBytes: number
  totalBytes: number
  status?: 'downloading' | 'extracting' | 'complete' | 'error'
  error?: string
}

export interface YtDlpUpdateInfo {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
}

// Transcription Types
export type TranscriptionOutputFormat = 'txt' | 'srt' | 'vtt'
export type TranscriptionPhase = 'loading' | 'transcribing' | 'saving'

export interface TranscriptionOptions {
  audioFile: string
  outputPath: string
  outputFormat: TranscriptionOutputFormat
  language?: string
  modelName?: string
}

export interface TranscriptionProgress {
  percent: number
  currentTime?: string
  totalTime?: string
  phase: TranscriptionPhase
}

export interface TranscriptionResult {
  outputFile: string
  language?: string
  duration?: number
}

export interface WhisperModelStatus {
  model: {
    name: string
    path: string
    exists: boolean
    size?: number
  }
  ready: boolean
}

export interface WhisperBinaryStatus {
  exists: boolean
  executable: boolean
  version?: string
  path: string
}
