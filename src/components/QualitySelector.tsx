import { Sparkles } from 'lucide-react'
import type { VideoFormat } from '../../shared/types'

export function BestAvailableIndicator() {
  return (
    <div
      className="bg-surface text-text-primary border border-surface-hover rounded-lg px-4 py-2 flex items-center gap-2"
      data-testid="best-available-indicator"
    >
      <Sparkles className="w-4 h-4 text-primary" />
      <span>Best Available</span>
    </div>
  )
}

interface QualitySelectorProps {
  formats: VideoFormat[]
  selectedFormatId: string | null
  onChange: (formatId: string) => void
  disabled: boolean
  audioOnly: boolean
  loading?: boolean
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function processFormats(formats: VideoFormat[], audioOnly: boolean): VideoFormat[] {
  if (audioOnly) {
    // Filter for audio-only formats
    return formats
      .filter((f) => f.vcodec === 'none' && f.acodec !== 'none')
      .sort((a, b) => (b.tbr || 0) - (a.tbr || 0))
  }

  // Filter for video formats with audio, or best video-only + audio combination
  const videoWithAudio = formats.filter(
    (f) => f.vcodec !== 'none' && f.acodec !== 'none' && f.resolution
  )

  // Sort by resolution (descending)
  return videoWithAudio.sort((a, b) => {
    const aRes = parseInt(a.resolution) || 0
    const bRes = parseInt(b.resolution) || 0
    return bRes - aRes
  })
}

export function QualitySelector({
  formats,
  selectedFormatId,
  onChange,
  disabled,
  audioOnly,
  loading,
}: QualitySelectorProps) {
  const processedFormats = processFormats(formats, audioOnly)

  if (loading) {
    return (
      <div
        className="bg-surface text-text-muted border border-surface-hover rounded-lg px-4 py-2 flex items-center gap-2 animate-pulse"
        data-testid="quality-selector-loading"
      >
        <span>Loading formats...</span>
      </div>
    )
  }

  return (
    <select
      value={selectedFormatId || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || processedFormats.length === 0}
      className="bg-surface text-text-primary border border-surface-hover rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
      data-testid="quality-selector"
    >
      {processedFormats.length === 0 ? (
        <option value="">No formats available</option>
      ) : (
        processedFormats.map((format) => (
          <option key={format.formatId} value={format.formatId}>
            {audioOnly
              ? `${format.acodec} - ${format.ext.toUpperCase()}${
                  format.tbr ? ` (${format.tbr}kbps)` : ''
                }${format.filesize ? ` - ${formatFileSize(format.filesize)}` : ''}`
              : `${format.resolution} - ${format.ext.toUpperCase()}${
                  format.filesize ? ` - ${formatFileSize(format.filesize)}` : ''
                }`}
          </option>
        ))
      )}
    </select>
  )
}

export { processFormats }
