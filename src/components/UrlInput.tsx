import { useState, useEffect } from 'react'
import { Clipboard, Search, Loader2 } from 'lucide-react'
import { isValidYouTubeUrl } from '../utils/validation'

interface UrlInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (urlOverride?: string) => void
  isLoading: boolean
  error: string | null
}

type FetchPhase = 'fetching' | 'analyzing' | 'slow'

const phaseMessages: Record<FetchPhase, string> = {
  fetching: 'Fetching video info...',
  analyzing: 'Analyzing available formats...',
  slow: 'Taking longer than expected...',
}

export function UrlInput({ value, onChange, onSubmit, isLoading, error }: UrlInputProps) {
  const [fetchPhase, setFetchPhase] = useState<FetchPhase>('fetching')

  // Update fetch phase based on loading duration
  useEffect(() => {
    if (!isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- timer-based phase transitions
      setFetchPhase('fetching')
      return
    }

    // Reset to initial phase when loading starts
    setFetchPhase('fetching')

    // After 3s, show "analyzing" phase
    const analyzeTimer = setTimeout(() => {
      setFetchPhase('analyzing')
    }, 3000)

    // After 10s, show "slow" warning
    const slowTimer = setTimeout(() => {
      setFetchPhase('slow')
    }, 10000)

    return () => {
      clearTimeout(analyzeTimer)
      clearTimeout(slowTimer)
    }
  }, [isLoading])

  const handlePaste = async () => {
    if (isLoading) return
    try {
      const text = await navigator.clipboard.readText()
      onChange(text)
      if (isValidYouTubeUrl(text.trim())) {
        onSubmit(text.trim())
      }
    } catch (err) {
      // Clipboard access may be denied by browser/OS security - log but don't surface to user
      console.debug('[UrlInput] Clipboard access denied:', err)
    }
  }

  const handleNativePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (isLoading) return
    const text = e.clipboardData.getData('text')
    if (text && isValidYouTubeUrl(text.trim())) {
      e.preventDefault()
      onChange(text.trim())
      onSubmit(text.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      onSubmit()
    }
  }

  return (
    <div className="mb-6">
      <div
        className={`bg-surface rounded-lg p-4 flex items-center gap-3 ${
          error ? 'ring-2 ring-primary' : ''
        }`}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handleNativePaste}
          placeholder="Paste YouTube URL here..."
          className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none text-lg"
          data-testid="url-input"
          disabled={isLoading}
        />

        <button
          onClick={handlePaste}
          className="p-2 rounded-lg bg-surface-hover hover:bg-[#3f3f3f] transition-colors"
          data-testid="paste-button"
          title="Paste from clipboard"
          disabled={isLoading}
        >
          <Clipboard className="w-5 h-5 text-text-secondary" />
        </button>

        <button
          onClick={() => onSubmit()}
          disabled={isLoading || !value.trim()}
          className="p-2 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="fetch-button"
          title="Fetch video info"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Status message during fetch */}
      {isLoading && (
        <p
          className={`mt-2 text-sm ${fetchPhase === 'slow' ? 'text-yellow-500' : 'text-text-secondary'}`}
          data-testid="fetch-status"
        >
          {phaseMessages[fetchPhase]}
        </p>
      )}

      {/* Timeout warning - additional emphasis */}
      {isLoading && fetchPhase === 'slow' && (
        <p className="mt-1 text-xs text-text-muted" data-testid="timeout-warning">
          The server might be slow or the video URL may be invalid
        </p>
      )}

      {error && (
        <p className="mt-2 text-primary text-sm" data-testid="url-error">
          {error}
        </p>
      )}
    </div>
  )
}
