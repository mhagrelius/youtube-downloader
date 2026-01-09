import { create } from 'zustand'
import { SpeedSmoother } from '../utils/speedParsing'

// Extend the existing DownloadStatus to include 'pending' for queued items
export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'error'

export type DownloadPhase = 'preparing' | 'downloading' | 'finalizing' | 'transcribing'

export type TranscriptionStatus = 'pending' | 'transcribing' | 'completed' | 'error'

export interface TranscriptionProgress {
  percent: number
  currentTime?: string
  totalTime?: string
  phase: 'loading' | 'transcribing' | 'saving'
}

export interface DownloadProgress {
  percent: number
  downloadedBytes: number
  totalBytes: number
  speed: string
  eta: string
  phase: DownloadPhase
  smoothedEta: string
}

// Speed smoother instance for ETA calculations
const speedSmoother = new SpeedSmoother()

function determinePhase(percent: number): DownloadPhase {
  if (percent <= 0) return 'preparing'
  if (percent >= 95) return 'finalizing'
  return 'downloading'
}

export interface DownloadItem {
  id: string
  url: string
  title: string
  thumbnail: string
  status: DownloadStatus
  progress: DownloadProgress | null
  error: string | null
  outputPath: string
  outputFile: string | null
  formatId: string
  audioOnly: boolean
  createdAt: number
  playlistId?: string
  playlistTitle?: string
  // Transcription fields
  transcribe?: boolean
  transcriptionFormat?: 'txt' | 'srt' | 'vtt'
  transcriptionLanguage?: string
  transcriptionStatus?: TranscriptionStatus
  transcriptionProgress?: TranscriptionProgress | null
  transcriptionFile?: string | null
  transcriptionError?: string | null
}

type NewDownloadItem = Omit<
  DownloadItem,
  | 'id'
  | 'status'
  | 'progress'
  | 'error'
  | 'outputFile'
  | 'createdAt'
  | 'transcriptionStatus'
  | 'transcriptionProgress'
  | 'transcriptionFile'
  | 'transcriptionError'
>

// Raw progress from IPC (before enhancement)
type RawDownloadProgress = Omit<DownloadProgress, 'phase' | 'smoothedEta'>

interface DownloadStore {
  downloads: DownloadItem[]

  // Actions
  addDownload: (item: NewDownloadItem) => string
  updateProgress: (id: string, progress: RawDownloadProgress) => void
  setStatus: (id: string, status: DownloadStatus) => void
  setError: (id: string, error: string) => void
  setOutputFile: (id: string, outputFile: string) => void
  removeDownload: (id: string) => void

  // Async actions that call electron API
  pauseDownload: (id: string) => Promise<void>
  resumeDownload: (id: string) => Promise<void>
  cancelDownload: (id: string) => Promise<void>
  retryDownload: (id: string) => Promise<void>

  // Transcription actions
  setTranscriptionStatus: (id: string, status: TranscriptionStatus) => void
  updateTranscriptionProgress: (id: string, progress: TranscriptionProgress) => void
  setTranscriptionFile: (id: string, file: string) => void
  setTranscriptionError: (id: string, error: string) => void
  startTranscription: (id: string) => Promise<void>
  cancelTranscription: (id: string) => Promise<void>
  retryTranscription: (id: string) => Promise<void>

  // Selectors
  getDownloadById: (id: string) => DownloadItem | undefined
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  downloads: [],

  addDownload: (item) => {
    const id = crypto.randomUUID()
    const newItem: DownloadItem = {
      ...item,
      id,
      status: 'pending',
      progress: null,
      error: null,
      outputFile: null,
      createdAt: Date.now(),
    }
    set((state) => ({ downloads: [...state.downloads, newItem] }))
    return id
  },

  updateProgress: (id, rawProgress) => {
    // Enhance progress with phase and smoothed ETA
    const remainingBytes = rawProgress.totalBytes - rawProgress.downloadedBytes
    const phase = determinePhase(rawProgress.percent)
    const smoothedEta = speedSmoother.calculateSmoothedEta(id, rawProgress.speed, remainingBytes)

    const progress: DownloadProgress = {
      ...rawProgress,
      phase,
      smoothedEta,
    }

    set((state) => ({
      downloads: state.downloads.map((d) => (d.id === id ? { ...d, progress } : d)),
    }))
  },

  setStatus: (id, status) => {
    // Clean up speed samples when download completes or errors
    if (status === 'completed' || status === 'error') {
      speedSmoother.clear(id)
    }
    set((state) => ({
      downloads: state.downloads.map((d) => (d.id === id ? { ...d, status } : d)),
    }))
  },

  setError: (id, error) => {
    set((state) => ({
      downloads: state.downloads.map((d) => (d.id === id ? { ...d, error, status: 'error' } : d)),
    }))
  },

  setOutputFile: (id, outputFile) => {
    set((state) => ({
      downloads: state.downloads.map((d) => (d.id === id ? { ...d, outputFile } : d)),
    }))
  },

  removeDownload: (id) => {
    speedSmoother.clear(id)
    set((state) => ({
      downloads: state.downloads.filter((d) => d.id !== id),
    }))
  },

  pauseDownload: async (id) => {
    const result = await window.electronAPI.pauseDownload(id)
    if (!result.success) {
      console.error('Failed to pause download:', result.error)
    }
    // Status will be updated via event listener when pause is confirmed
  },

  resumeDownload: async (id) => {
    const result = await window.electronAPI.resumeDownload(id)
    if (!result.success) {
      console.error('Failed to resume download:', result.error)
    }
    // Status will be updated via event listener when resume is confirmed
  },

  cancelDownload: async (id) => {
    const result = await window.electronAPI.cancelDownload(id)
    if (!result.success) {
      console.error('Failed to cancel download:', result.error)
    }
    // Item will be removed via event listener when cancel is confirmed
  },

  retryDownload: async (id) => {
    const download = get().getDownloadById(id)
    if (!download || download.status !== 'error') return

    // Reset error and status
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, error: null, status: 'downloading' as const, progress: null } : d
      ),
    }))

    // Start the download again
    await window.electronAPI.download(id, {
      url: download.url,
      outputPath: download.outputPath,
      formatId: download.formatId,
      audioOnly: download.audioOnly,
    })
  },

  // Transcription actions
  setTranscriptionStatus: (id, status) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, transcriptionStatus: status } : d
      ),
    }))
  },

  updateTranscriptionProgress: (id, progress) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, transcriptionProgress: progress } : d
      ),
    }))
  },

  setTranscriptionFile: (id, file) => {
    set((state) => ({
      downloads: state.downloads.map((d) => (d.id === id ? { ...d, transcriptionFile: file } : d)),
    }))
  },

  setTranscriptionError: (id, error) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, transcriptionError: error, transcriptionStatus: 'error' as const } : d
      ),
    }))
  },

  startTranscription: async (id) => {
    const download = get().getDownloadById(id)
    if (!download || !download.outputFile || !download.transcribe) return

    // Set status to pending
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id
          ? {
              ...d,
              transcriptionStatus: 'pending' as const,
              transcriptionProgress: null,
              transcriptionError: null,
            }
          : d
      ),
    }))

    // Ensure whisper is ready
    const readyResult = await window.electronAPI.ensureWhisperReady()
    if (!readyResult.success) {
      set((state) => ({
        downloads: state.downloads.map((d) =>
          d.id === id
            ? {
                ...d,
                transcriptionStatus: 'error' as const,
                transcriptionError: readyResult.error || 'Failed to prepare whisper',
              }
            : d
        ),
      }))
      return
    }

    // Start transcription
    const result = await window.electronAPI.startTranscription(id, {
      audioFile: download.outputFile,
      outputPath: download.outputPath,
      outputFormat: download.transcriptionFormat || 'txt',
      language: download.transcriptionLanguage,
    })

    if (!result.success) {
      set((state) => ({
        downloads: state.downloads.map((d) =>
          d.id === id
            ? {
                ...d,
                transcriptionStatus: 'error' as const,
                transcriptionError: result.error || 'Failed to start transcription',
              }
            : d
        ),
      }))
    }
  },

  cancelTranscription: async (id) => {
    const result = await window.electronAPI.cancelTranscription(id)
    if (!result.success) {
      console.error('Failed to cancel transcription:', result.error)
    }
  },

  retryTranscription: async (id) => {
    const download = get().getDownloadById(id)
    if (!download || download.transcriptionStatus !== 'error') return

    // Reset transcription state and start again
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id
          ? {
              ...d,
              transcriptionError: null,
              transcriptionStatus: 'pending' as const,
              transcriptionProgress: null,
            }
          : d
      ),
    }))

    await get().startTranscription(id)
  },

  getDownloadById: (id) => {
    return get().downloads.find((d) => d.id === id)
  },
}))
