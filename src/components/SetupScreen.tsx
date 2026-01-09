import { useState, useEffect } from 'react'
import { Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface BinaryDownloadProgress {
  binary: string
  percent: number
  downloadedBytes: number
  totalBytes: number
}

interface SetupScreenProps {
  onComplete: () => void
}

type SetupPhase = 'checking' | 'downloading' | 'complete' | 'error'

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [phase, setPhase] = useState<SetupPhase>('checking')
  const [currentBinary, setCurrentBinary] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [ytdlpReady, setYtdlpReady] = useState(false)
  const [denoReady, setDenoReady] = useState(false)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const runSetup = async () => {
      try {
        // Check current binary status
        const status = await window.electronAPI.checkBinaryStatus()

        if (status.success && status.data?.ready) {
          // All binaries already present
          setYtdlpReady(true)
          setDenoReady(true)
          setPhase('complete')
          // Brief delay before transitioning to main app
          setTimeout(onComplete, 500)
          return
        }

        // Need to download binaries
        setPhase('downloading')
        setYtdlpReady((status.data?.ytdlp?.exists && status.data?.ytdlp?.executable) || false)
        setDenoReady((status.data?.deno?.exists && status.data?.deno?.executable) || false)

        // Set up progress listener
        unsubscribe = window.electronAPI.onBinaryDownloadProgress(
          (prog: BinaryDownloadProgress) => {
            setCurrentBinary(prog.binary)
            setProgress(prog.percent)
          }
        )

        // Download all binaries
        const downloadResult = await window.electronAPI.downloadAllBinaries()

        if (!downloadResult.success) {
          throw new Error(downloadResult.error || 'Failed to download binaries')
        }

        // Verify status after download
        const finalStatus = await window.electronAPI.checkBinaryStatus()

        if (finalStatus.success && finalStatus.data?.ready) {
          setYtdlpReady(true)
          setDenoReady(true)
          setPhase('complete')
          setTimeout(onComplete, 1000)
        } else {
          throw new Error('Binaries downloaded but verification failed')
        }
      } catch (err) {
        setError((err as Error).message)
        setPhase('error')
      }
    }

    runSetup()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [onComplete])

  const handleRetry = () => {
    setPhase('checking')
    setError(null)
    setProgress(0)
    // Trigger useEffect again by remounting... simplest is to reload
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-primary rounded-2xl mb-4">
            <Download className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold">YouTube Downloader</h1>
          <p className="text-text-secondary mt-2 text-center">
            {phase === 'checking' && 'Checking dependencies...'}
            {phase === 'downloading' && 'Setting up for first use...'}
            {phase === 'complete' && 'Ready to go!'}
            {phase === 'error' && 'Setup failed'}
          </p>
        </div>

        {/* Status Cards */}
        <div className="space-y-3 mb-8">
          <BinaryStatusCard
            name="yt-dlp"
            description="Downloads videos from YouTube"
            isReady={ytdlpReady}
            isDownloading={phase === 'downloading' && currentBinary === 'yt-dlp'}
            progress={currentBinary === 'yt-dlp' ? progress : 0}
          />
          <BinaryStatusCard
            name="Deno"
            description="JavaScript runtime for yt-dlp"
            isReady={denoReady}
            isDownloading={phase === 'downloading' && currentBinary === 'deno'}
            progress={currentBinary === 'deno' ? progress : 0}
          />
        </div>

        {/* Progress indicator */}
        {phase === 'downloading' && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-text-secondary mb-2">
              <span>Downloading {currentBinary}...</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error state */}
        {phase === 'error' && (
          <div className="mb-6">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">Setup Error</p>
                  <p className="text-sm text-red-400/80 mt-1">{error}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="w-full mt-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
            >
              Retry Setup
            </button>
          </div>
        )}

        {/* Checking spinner */}
        {phase === 'checking' && (
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Complete state */}
        {phase === 'complete' && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-6 h-6" />
              <span className="font-medium">Setup complete!</span>
            </div>
          </div>
        )}

        {/* Footer info */}
        <p className="text-center text-xs text-text-secondary mt-8">
          Dependencies are stored locally and only downloaded once.
        </p>
      </div>
    </div>
  )
}

interface BinaryStatusCardProps {
  name: string
  description: string
  isReady: boolean
  isDownloading: boolean
  progress: number
}

function BinaryStatusCard({
  name,
  description,
  isReady,
  isDownloading,
  progress,
}: BinaryStatusCardProps) {
  return (
    <div
      className={`p-4 rounded-lg border transition-colors ${
        isReady
          ? 'bg-green-500/10 border-green-500/20'
          : isDownloading
            ? 'bg-primary/10 border-primary/20'
            : 'bg-surface border-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{name}</h3>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
        <div className="flex-shrink-0">
          {isReady ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : isDownloading ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-text-secondary" />
          )}
        </div>
      </div>
      {isDownloading && progress > 0 && (
        <div className="mt-3 w-full h-1 bg-surface-hover rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
