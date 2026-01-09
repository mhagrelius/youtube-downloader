interface DownloadProgress {
  percent: number
  downloadedBytes: number
  totalBytes: number
  speed: string
  eta: string
}

type DownloadStatus = 'idle' | 'downloading' | 'paused' | 'completed' | 'error'

interface ProgressBarProps {
  progress: DownloadProgress | null
  status: DownloadStatus
  errorMessage?: string
}

export function ProgressBar({ progress, status, errorMessage }: ProgressBarProps) {
  if (status === 'idle') {
    return null
  }

  const percent = progress?.percent ?? 0

  return (
    <div className="bg-surface rounded-lg p-4 mt-4" data-testid="progress-bar">
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-primary text-sm font-medium">
          {status === 'downloading' && 'Downloading...'}
          {status === 'paused' && 'Paused'}
          {status === 'completed' && 'Download Complete'}
          {status === 'error' && 'Download Failed'}
        </span>
        <span className="text-text-secondary text-sm" data-testid="progress-percent">
          {percent.toFixed(1)}%
        </span>
      </div>

      <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            status === 'error'
              ? 'bg-red-600'
              : status === 'completed'
                ? 'bg-green-500'
                : 'bg-primary'
          }`}
          style={{ width: `${percent}%` }}
          data-testid="progress-fill"
        />
      </div>

      {progress && status === 'downloading' && (
        <div className="flex justify-between mt-2 text-text-muted text-xs">
          <span data-testid="progress-speed">{progress.speed}</span>
          <span data-testid="progress-eta">ETA: {progress.eta}</span>
        </div>
      )}

      {status === 'error' && errorMessage && (
        <p className="mt-2 text-red-500 text-sm">{errorMessage}</p>
      )}
    </div>
  )
}

export type { DownloadProgress, DownloadStatus }
