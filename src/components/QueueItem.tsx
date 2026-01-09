import { useState, useEffect } from 'react'
import {
  Pause,
  Play,
  X,
  FolderOpen,
  Trash2,
  Clock,
  Download,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  FileText,
  Loader2,
} from 'lucide-react'
import {
  DownloadItem,
  DownloadStatus,
  DownloadPhase,
  useDownloadStore,
} from '../stores/downloadStore'

interface QueueItemProps {
  download: DownloadItem
}

const phaseLabels: Record<DownloadPhase, string> = {
  preparing: 'Preparing...',
  downloading: 'Downloading',
  finalizing: 'Finalizing...',
  transcribing: 'Transcribing...',
}

interface StatusBadgeProps {
  status: DownloadStatus
  phase?: DownloadPhase
}

function StatusBadge({ status, phase }: StatusBadgeProps) {
  const config: Record<DownloadStatus, { text: string; bg: string; Icon: typeof Clock }> = {
    pending: { text: 'Pending', bg: 'bg-gray-500', Icon: Clock },
    downloading: {
      text: phase ? phaseLabels[phase] : 'Downloading',
      bg: 'bg-blue-500',
      Icon: Download,
    },
    paused: { text: 'Paused', bg: 'bg-yellow-500', Icon: Pause },
    completed: { text: 'Complete', bg: 'bg-green-500', Icon: CheckCircle },
    error: { text: 'Failed', bg: 'bg-red-500', Icon: AlertCircle },
  }

  const { text, bg, Icon } = config[status]

  return (
    <span
      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white ${bg}`}
      data-testid="queue-item-status"
    >
      <Icon className="w-3 h-3" />
      <span data-testid="download-phase">{text}</span>
    </span>
  )
}

export function QueueItem({ download }: QueueItemProps) {
  const pauseDownload = useDownloadStore((state) => state.pauseDownload)
  const resumeDownload = useDownloadStore((state) => state.resumeDownload)
  const cancelDownload = useDownloadStore((state) => state.cancelDownload)
  const removeDownload = useDownloadStore((state) => state.removeDownload)
  const retryDownload = useDownloadStore((state) => state.retryDownload)
  const cancelTranscription = useDownloadStore((state) => state.cancelTranscription)
  const retryTranscription = useDownloadStore((state) => state.retryTranscription)

  // Track if we should show the success animation (triggers once on completion)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [prevStatus, setPrevStatus] = useState(download.status)

  useEffect(() => {
    // Detect transition to completed status
    if (prevStatus !== 'completed' && download.status === 'completed') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- animation trigger on status transition
      setShowSuccessAnimation(true)
      // Remove animation class after animation completes
      const timer = setTimeout(() => setShowSuccessAnimation(false), 600)
      return () => clearTimeout(timer)
    }
    setPrevStatus(download.status)
  }, [download.status, prevStatus])

  const handlePauseResume = async () => {
    if (download.status === 'downloading') {
      await pauseDownload(download.id)
    } else if (download.status === 'paused') {
      await resumeDownload(download.id)
    }
  }

  const handleCancel = async () => {
    await cancelDownload(download.id)
  }

  const handleRetry = async () => {
    await retryDownload(download.id)
  }

  const handleCancelTranscription = async () => {
    await cancelTranscription(download.id)
  }

  const handleRetryTranscription = async () => {
    await retryTranscription(download.id)
  }

  const handleOpenTranscript = async () => {
    if (download.transcriptionFile) {
      await window.electronAPI.openFile(download.transcriptionFile)
    }
  }

  const handleOpenFolder = async () => {
    if (download.outputFile) {
      // Get the folder path by removing the filename
      const lastSlash = download.outputFile.lastIndexOf('/')
      const folderPath =
        lastSlash > 0 ? download.outputFile.substring(0, lastSlash) : download.outputPath
      await window.electronAPI.openFolder(folderPath)
    } else {
      await window.electronAPI.openFolder(download.outputPath)
    }
  }

  const handleRemove = () => {
    removeDownload(download.id)
  }

  const showProgress = download.status === 'downloading' || download.status === 'paused'
  const showControls = download.status === 'downloading' || download.status === 'paused'
  const showCompletedActions = download.status === 'completed'
  const showRemove = download.status === 'completed' || download.status === 'error'
  const showRetry = download.status === 'error'
  const isPending = download.status === 'pending'

  // Transcription state
  const isTranscribing = download.transcriptionStatus === 'transcribing'
  const isTranscriptionPending = download.transcriptionStatus === 'pending'
  const isTranscriptionComplete = download.transcriptionStatus === 'completed'
  const isTranscriptionError = download.transcriptionStatus === 'error'
  const showTranscriptionProgress = isTranscribing || isTranscriptionPending

  // Build container classes with conditional animations
  const containerClasses = [
    'bg-surface rounded-lg p-4',
    isPending ? 'animate-pulse-slow' : '',
    showSuccessAnimation ? 'animate-success-glow' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClasses} data-testid="queue-item">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <img
          src={download.thumbnail}
          alt={download.title}
          className="w-16 h-9 rounded object-cover flex-shrink-0"
          data-testid="queue-item-thumbnail"
        />

        <div className="flex-1 min-w-0">
          {/* Title and Status Row */}
          <div className="flex items-center justify-between gap-2">
            <h3
              className="text-text-primary text-sm font-medium truncate"
              data-testid="queue-item-title"
              title={download.title}
            >
              {download.title}
            </h3>
            <StatusBadge status={download.status} phase={download.progress?.phase} />
          </div>

          {/* Progress Bar */}
          {showProgress && (
            <div className="mt-2" data-testid="queue-item-progress">
              <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    download.status === 'paused' ? 'bg-yellow-500' : 'bg-primary'
                  }`}
                  style={{ width: `${download.progress?.percent ?? 0}%` }}
                />
              </div>
              {download.progress && (
                <div className="flex justify-between mt-1 text-text-muted text-xs">
                  <span>{download.progress.speed}</span>
                  <span>{download.progress.percent.toFixed(1)}%</span>
                  <span>ETA: {download.progress.smoothedEta || download.progress.eta}</span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {download.status === 'error' && download.error && (
            <p className="mt-2 text-red-500 text-xs truncate" title={download.error}>
              {download.error}
            </p>
          )}

          {/* Transcription Status */}
          {download.transcribe && download.status === 'completed' && (
            <div className="mt-2">
              {/* Transcription Progress */}
              {showTranscriptionProgress && (
                <div data-testid="transcription-progress">
                  <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>
                      {isTranscriptionPending ? 'Preparing transcription...' : 'Transcribing...'}
                    </span>
                  </div>
                  {download.transcriptionProgress && (
                    <>
                      <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${download.transcriptionProgress.percent ?? 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-text-muted text-xs">
                        <span>{download.transcriptionProgress.phase}</span>
                        <span>{download.transcriptionProgress.percent?.toFixed(0)}%</span>
                        {download.transcriptionProgress.currentTime && (
                          <span>
                            {download.transcriptionProgress.currentTime} /{' '}
                            {download.transcriptionProgress.totalTime}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Transcription Complete */}
              {isTranscriptionComplete && download.transcriptionFile && (
                <div
                  className="flex items-center gap-2 text-green-500 text-xs"
                  data-testid="transcription-complete"
                >
                  <FileText className="w-3 h-3" />
                  <button
                    onClick={handleOpenTranscript}
                    className="hover:underline"
                    title="Open transcript"
                  >
                    Transcript ready
                  </button>
                </div>
              )}

              {/* Transcription Error */}
              {isTranscriptionError && (
                <div
                  className="flex items-center gap-2 text-red-500 text-xs"
                  data-testid="transcription-error"
                >
                  <AlertCircle className="w-3 h-3" />
                  <span
                    className="truncate"
                    title={download.transcriptionError || 'Transcription failed'}
                  >
                    {download.transcriptionError || 'Transcription failed'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center gap-2 mt-2">
            {/* Pause/Resume - only for active downloads */}
            {showControls && (
              <>
                <button
                  onClick={handlePauseResume}
                  className="p-1.5 rounded bg-surface-hover hover:bg-[#3f3f3f] transition-colors text-text-secondary hover:text-text-primary"
                  data-testid="pause-button"
                  title={download.status === 'paused' ? 'Resume' : 'Pause'}
                >
                  {download.status === 'paused' ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  className="p-1.5 rounded bg-surface-hover hover:bg-[#3f3f3f] transition-colors text-text-secondary hover:text-text-primary"
                  data-testid="cancel-button"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Open Folder - only for completed */}
            {showCompletedActions && (
              <button
                onClick={handleOpenFolder}
                className="p-1.5 rounded bg-surface-hover hover:bg-[#3f3f3f] transition-colors text-text-secondary hover:text-text-primary"
                data-testid="open-folder-button"
                title="Open folder"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            )}

            {/* Retry - for error state */}
            {showRetry && (
              <button
                onClick={handleRetry}
                className="p-1.5 rounded bg-surface-hover hover:bg-[#3f3f3f] transition-colors text-text-secondary hover:text-text-primary"
                data-testid="retry-button"
                title="Retry download"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Transcription controls */}
            {isTranscribing && (
              <button
                onClick={handleCancelTranscription}
                className="p-1.5 rounded bg-surface-hover hover:bg-[#3f3f3f] transition-colors text-text-secondary hover:text-text-primary"
                data-testid="cancel-transcription-button"
                title="Cancel transcription"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {isTranscriptionError && (
              <button
                onClick={handleRetryTranscription}
                className="p-1.5 rounded bg-surface-hover hover:bg-[#3f3f3f] transition-colors text-text-secondary hover:text-text-primary"
                data-testid="retry-transcription-button"
                title="Retry transcription"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Remove - for completed or error */}
            {showRemove && (
              <button
                onClick={handleRemove}
                className="p-1.5 rounded bg-surface-hover hover:bg-[#3f3f3f] transition-colors text-text-secondary hover:text-text-primary"
                data-testid="remove-button"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Success animation indicator */}
            {showSuccessAnimation && (
              <span className="animate-success-pop text-green-500" data-testid="success-animation">
                <CheckCircle className="w-5 h-5" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
