import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.electronAPI for renderer tests
const mockElectronAPI = {
  platform: 'darwin' as NodeJS.Platform,
  getVideoInfo: vi.fn(),
  getVideoPreview: vi.fn(),
  getPlaylistInfo: vi.fn(),
  download: vi.fn(),
  pauseDownload: vi.fn(),
  resumeDownload: vi.fn(),
  cancelDownload: vi.fn(),
  getDefaultDownloadPath: vi.fn().mockResolvedValue('/Users/test/Downloads'),
  selectFolder: vi.fn(),
  openFolder: vi.fn(),
  openFile: vi.fn(),
  getSettings: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
  setSettings: vi.fn(),
  selectDownloadFolder: vi.fn(),
  // Binary management
  checkBinaryStatus: vi.fn(),
  downloadAllBinaries: vi.fn(),
  downloadBinary: vi.fn(),
  checkYtDlpUpdate: vi.fn(),
  updateYtDlp: vi.fn(),
  // Download events (return unsubscribe functions)
  onDownloadProgress: vi.fn(() => vi.fn()),
  onDownloadComplete: vi.fn(() => vi.fn()),
  onDownloadError: vi.fn(() => vi.fn()),
  onDownloadPaused: vi.fn(() => vi.fn()),
  onDownloadResumed: vi.fn(() => vi.fn()),
  onDownloadCancelled: vi.fn(() => vi.fn()),
  onBinaryDownloadProgress: vi.fn(() => vi.fn()),
  // Transcription APIs
  getWhisperModelStatus: vi.fn(),
  getWhisperBinaryStatus: vi.fn(),
  downloadWhisperBinary: vi.fn(),
  downloadWhisperModel: vi.fn(),
  ensureWhisperReady: vi.fn(),
  startTranscription: vi.fn(),
  cancelTranscription: vi.fn(),
  // Transcription events
  onTranscriptionProgress: vi.fn(() => vi.fn()),
  onTranscriptionComplete: vi.fn(() => vi.fn()),
  onTranscriptionError: vi.fn(() => vi.fn()),
  onTranscriptionCancelled: vi.fn(() => vi.fn()),
  onWhisperDownloadProgress: vi.fn(() => vi.fn()),
  onModelDownloadProgress: vi.fn(() => vi.fn()),
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

// Mock crypto.randomUUID for Zustand stores
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
})

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
