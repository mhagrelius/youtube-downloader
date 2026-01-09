import { useEffect, useState } from 'react'
import { X, Folder, Settings, RefreshCw, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import type { AppSettings } from '../types/electron'

interface UpdateCheckState {
  checking: boolean
  updating: boolean
  hasUpdate: boolean | null
  currentVersion?: string
  latestVersion?: string
  error?: string
}

interface WhisperModelState {
  checking: boolean
  downloading: boolean
  exists: boolean | null
  downloadProgress: number
  error?: string
}

export function SettingsModal() {
  const {
    settings,
    isModalOpen,
    closeModal,
    updateSetting,
    selectDownloadFolder,
    loadSettings,
    isLoaded,
  } = useSettingsStore()

  const [updateState, setUpdateState] = useState<UpdateCheckState>({
    checking: false,
    updating: false,
    hasUpdate: null,
  })

  const [whisperState, setWhisperState] = useState<WhisperModelState>({
    checking: false,
    downloading: false,
    exists: null,
    downloadProgress: 0,
  })

  useEffect(() => {
    if (isModalOpen && !isLoaded) {
      loadSettings()
    }
  }, [isModalOpen, isLoaded, loadSettings])

  // Check whisper model status when modal opens
  useEffect(() => {
    if (isModalOpen && whisperState.exists === null) {
      checkWhisperModel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only check once when modal opens and exists is null
  }, [isModalOpen])

  const checkWhisperModel = async () => {
    setWhisperState((prev) => ({ ...prev, checking: true }))
    try {
      const result = await window.electronAPI.getWhisperModelStatus('small')
      if (result.success && result.data) {
        setWhisperState((prev) => ({
          ...prev,
          checking: false,
          exists: result.data!.ready,
        }))
      } else {
        setWhisperState((prev) => ({
          ...prev,
          checking: false,
          exists: false,
        }))
      }
    } catch {
      setWhisperState((prev) => ({
        ...prev,
        checking: false,
        exists: false,
      }))
    }
  }

  const handleDownloadWhisperModel = async () => {
    setWhisperState((prev) => ({
      ...prev,
      downloading: true,
      downloadProgress: 0,
      error: undefined,
    }))

    // Set up progress listener
    const unsubscribe = window.electronAPI.onModelDownloadProgress((progress) => {
      setWhisperState((prev) => ({ ...prev, downloadProgress: progress.percent }))
    })

    try {
      const result = await window.electronAPI.downloadWhisperModel('small')
      if (result.success) {
        setWhisperState((prev) => ({
          ...prev,
          downloading: false,
          exists: true,
          downloadProgress: 100,
        }))
      } else {
        setWhisperState((prev) => ({
          ...prev,
          downloading: false,
          error: result.error || 'Failed to download model',
        }))
      }
    } catch {
      setWhisperState((prev) => ({
        ...prev,
        downloading: false,
        error: 'Failed to download whisper model',
      }))
    } finally {
      unsubscribe()
    }
  }

  if (!isModalOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal()
    }
  }

  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSetting('defaultQuality', e.target.value as AppSettings['defaultQuality'])
  }

  const handleAudioFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSetting('audioFormat', e.target.value as AppSettings['audioFormat'])
  }

  const handleCheckForUpdates = async () => {
    setUpdateState({ checking: true, updating: false, hasUpdate: null })

    try {
      const result = await window.electronAPI.checkYtDlpUpdate()

      if (result.success && result.data) {
        setUpdateState({
          checking: false,
          updating: false,
          hasUpdate: result.data.hasUpdate,
          currentVersion: result.data.currentVersion,
          latestVersion: result.data.latestVersion,
        })
      } else {
        setUpdateState({
          checking: false,
          updating: false,
          hasUpdate: null,
          error: result.error || 'Failed to check for updates',
        })
      }
    } catch {
      setUpdateState({
        checking: false,
        updating: false,
        hasUpdate: null,
        error: 'Failed to check for updates',
      })
    }
  }

  const handleUpdate = async () => {
    setUpdateState((prev) => ({ ...prev, updating: true }))

    try {
      const result = await window.electronAPI.updateYtDlp()

      if (result.success) {
        // Check version again to confirm update
        const checkResult = await window.electronAPI.checkYtDlpUpdate()
        setUpdateState({
          checking: false,
          updating: false,
          hasUpdate: false,
          currentVersion: checkResult.data?.currentVersion,
          latestVersion: checkResult.data?.latestVersion,
        })
      } else {
        setUpdateState((prev) => ({
          ...prev,
          updating: false,
          error: result.error || 'Failed to update',
        }))
      }
    } catch {
      setUpdateState((prev) => ({
        ...prev,
        updating: false,
        error: 'Failed to update yt-dlp',
      }))
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      data-testid="settings-modal-backdrop"
    >
      <div
        className="bg-surface rounded-xl w-full max-w-md mx-4 shadow-xl max-h-[90vh] flex flex-col"
        data-testid="settings-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-hover flex-shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-text-secondary" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <button
            onClick={closeModal}
            className="p-1 hover:bg-surface-hover rounded-lg transition-colors"
            data-testid="settings-close-button"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          {/* Download Location */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Download Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.downloadPath}
                readOnly
                className="flex-1 bg-background text-text-primary border border-surface-hover rounded-lg px-3 py-2 text-sm truncate"
                data-testid="settings-download-path"
              />
              <button
                onClick={selectDownloadFolder}
                className="px-3 py-2 bg-surface-hover hover:bg-primary/20 rounded-lg transition-colors"
                data-testid="settings-browse-button"
              >
                <Folder className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Default Quality */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Default Video Quality
            </label>
            <select
              value={settings.defaultQuality}
              onChange={handleQualityChange}
              className="w-full bg-background text-text-primary border border-surface-hover rounded-lg px-3 py-2"
              data-testid="settings-quality-select"
            >
              <option value="best">Best Available (Skip Selection)</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
              <option value="360p">360p</option>
            </select>
          </div>

          {/* Audio Format */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Audio Format (for Audio Only)
            </label>
            <select
              value={settings.audioFormat}
              onChange={handleAudioFormatChange}
              className="w-full bg-background text-text-primary border border-surface-hover rounded-lg px-3 py-2"
              data-testid="settings-audio-format-select"
            >
              <option value="best">Best Available (Skip Selection)</option>
              <option value="mp3">MP3 (Most Compatible)</option>
              <option value="m4a">M4A (Better Quality)</option>
            </select>
          </div>

          {/* yt-dlp Updates */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              yt-dlp Version
            </label>
            <div className="bg-background border border-surface-hover rounded-lg p-3">
              {/* Current version */}
              {updateState.currentVersion && (
                <p className="text-sm text-text-secondary mb-2">
                  Current:{' '}
                  <span className="text-text-primary font-mono">{updateState.currentVersion}</span>
                </p>
              )}

              {/* Update status */}
              {updateState.hasUpdate === true && (
                <div className="flex items-center gap-2 text-primary mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Update available: {updateState.latestVersion}</span>
                </div>
              )}
              {updateState.hasUpdate === false && updateState.currentVersion && (
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Up to date</span>
                </div>
              )}
              {updateState.error && (
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{updateState.error}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCheckForUpdates}
                  disabled={updateState.checking || updateState.updating}
                  className="flex items-center gap-2 px-3 py-1.5 bg-surface-hover hover:bg-primary/20 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="settings-check-updates-button"
                >
                  <RefreshCw className={`w-4 h-4 ${updateState.checking ? 'animate-spin' : ''}`} />
                  {updateState.checking ? 'Checking...' : 'Check for Updates'}
                </button>

                {updateState.hasUpdate && (
                  <button
                    onClick={handleUpdate}
                    disabled={updateState.updating}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="settings-update-ytdlp-button"
                  >
                    {updateState.updating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Now'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Whisper Model (Transcription) */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Transcription (Whisper Model)
            </label>
            <div className="bg-background border border-surface-hover rounded-lg p-3">
              <p className="text-sm text-text-secondary mb-2">
                The Whisper model is required for audio transcription. Small model (~466 MB).
              </p>

              {/* Model status */}
              {whisperState.checking && (
                <div className="flex items-center gap-2 text-text-secondary mb-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Checking model status...</span>
                </div>
              )}

              {whisperState.exists === true && !whisperState.downloading && (
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Model downloaded and ready</span>
                </div>
              )}

              {whisperState.exists === false && !whisperState.downloading && (
                <div className="flex items-center gap-2 text-yellow-500 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Model not downloaded</span>
                </div>
              )}

              {whisperState.downloading && (
                <div className="mb-2" data-testid="whisper-model-download-progress">
                  <div className="flex items-center gap-2 text-text-secondary mb-1">
                    <Download className="w-4 h-4 animate-pulse" />
                    <span className="text-sm">
                      Downloading model... {whisperState.downloadProgress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${whisperState.downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {whisperState.error && (
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{whisperState.error}</span>
                </div>
              )}

              {/* Action buttons */}
              {whisperState.exists === false && !whisperState.downloading && (
                <button
                  onClick={handleDownloadWhisperModel}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm transition-colors"
                  data-testid="settings-download-whisper-button"
                >
                  <Download className="w-4 h-4" />
                  Download Model
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-hover flex-shrink-0">
          <button
            onClick={closeModal}
            className="w-full py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
            data-testid="settings-done-button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
