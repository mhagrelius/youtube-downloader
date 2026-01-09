import { Download, Loader2 } from 'lucide-react'

interface DownloadButtonProps {
  onClick: () => void
  disabled: boolean
  isDownloading: boolean
  label?: string
  disabledReason?: string
}

function getTooltip(
  disabled: boolean,
  isDownloading: boolean,
  disabledReason?: string
): string | undefined {
  if (isDownloading) return 'Download in progress...'
  if (disabled && disabledReason) return disabledReason
  if (disabled) return 'Cannot download right now'
  return 'Start download'
}

export function DownloadButton({
  onClick,
  disabled,
  isDownloading,
  label,
  disabledReason,
}: DownloadButtonProps) {
  const tooltip = getTooltip(disabled, isDownloading, disabledReason)

  return (
    <button
      onClick={onClick}
      disabled={disabled || isDownloading}
      className="bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
      data-testid="download-button"
      title={tooltip}
    >
      {isDownloading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Downloading...
        </>
      ) : (
        <>
          <Download className="w-5 h-5" />
          {label || 'Download'}
        </>
      )}
    </button>
  )
}
