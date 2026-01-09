import { Loader2, CheckSquare, Square } from 'lucide-react'

interface PlaylistEntry {
  id: string
  title: string
  duration: number
  index: number
  url: string
  thumbnail?: string
}

interface PlaylistInfo {
  id: string
  title: string
  thumbnail: string
  uploader: string
  entryCount: number
  entries: PlaylistEntry[]
  url: string
}

interface PlaylistPreviewProps {
  playlist: PlaylistInfo | null
  isLoading: boolean
  selectedVideos: Set<string>
  onSelectionChange: (videoId: string, selected: boolean) => void
  onSelectAll: () => void
  onDeselectAll: () => void
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--'

  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function PlaylistPreview({
  playlist,
  isLoading,
  selectedVideos,
  onSelectionChange,
  onSelectAll,
  onDeselectAll,
}: PlaylistPreviewProps) {
  if (isLoading) {
    return (
      <div
        className="bg-surface rounded-lg p-6 flex items-center justify-center"
        data-testid="playlist-preview"
      >
        <Loader2 className="w-8 h-8 text-text-secondary animate-spin" />
      </div>
    )
  }

  if (!playlist) {
    return (
      <div
        className="bg-surface rounded-lg p-6 text-center text-text-secondary"
        data-testid="playlist-preview"
      >
        <p>Paste a YouTube playlist URL above to get started</p>
      </div>
    )
  }

  const allSelected = playlist.entries.every((entry) => selectedVideos.has(entry.id))
  const noneSelected = playlist.entries.every((entry) => !selectedVideos.has(entry.id))
  const selectedCount = playlist.entries.filter((entry) => selectedVideos.has(entry.id)).length

  return (
    <div className="bg-surface rounded-lg p-4" data-testid="playlist-preview">
      {/* Playlist header */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-shrink-0">
          <img
            src={playlist.thumbnail}
            alt={playlist.title}
            className="w-32 h-18 rounded-lg object-cover"
            style={{ aspectRatio: '16/9' }}
            data-testid="playlist-thumbnail"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h2
            className="text-text-primary font-semibold text-lg truncate"
            data-testid="playlist-title"
            title={playlist.title}
          >
            {playlist.title}
          </h2>
          <p className="text-text-secondary text-sm mt-1" data-testid="playlist-uploader">
            {playlist.uploader}
          </p>
          <p className="text-text-muted text-xs mt-2" data-testid="playlist-video-count">
            {playlist.entryCount} videos
          </p>
        </div>
      </div>

      {/* Selection controls */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-text-secondary text-sm" data-testid="playlist-selection-count">
          {selectedCount} of {playlist.entries.length} selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            disabled={allSelected}
            className="text-sm text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="select-all-button"
          >
            Select All
          </button>
          <span className="text-text-muted">|</span>
          <button
            onClick={onDeselectAll}
            disabled={noneSelected}
            className="text-sm text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="deselect-all-button"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Video list */}
      <div className="max-h-64 overflow-y-auto space-y-2" data-testid="playlist-video-list">
        {playlist.entries.map((entry) => {
          const isSelected = selectedVideos.has(entry.id)
          return (
            <div
              key={entry.id}
              onClick={() => onSelectionChange(entry.id, !isSelected)}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                isSelected ? 'bg-surface-hover' : 'hover:bg-surface-hover/50'
              }`}
              data-testid="playlist-video-item"
            >
              {/* Checkbox */}
              <div className="flex-shrink-0" data-testid="video-checkbox">
                {isSelected ? (
                  <CheckSquare className="w-5 h-5 text-primary" />
                ) : (
                  <Square className="w-5 h-5 text-text-muted" />
                )}
              </div>

              {/* Index */}
              <span className="text-text-muted text-sm w-6 text-right flex-shrink-0">
                {entry.index}
              </span>

              {/* Thumbnail */}
              {entry.thumbnail && (
                <img
                  src={entry.thumbnail}
                  alt={entry.title}
                  className="w-16 h-9 rounded object-cover flex-shrink-0"
                  style={{ aspectRatio: '16/9' }}
                />
              )}

              {/* Title and duration */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-text-primary text-sm truncate"
                  title={entry.title}
                  data-testid="video-item-title"
                >
                  {entry.title}
                </p>
              </div>

              {/* Duration */}
              <span className="text-text-muted text-xs flex-shrink-0">
                {formatDuration(entry.duration)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type { PlaylistInfo, PlaylistEntry }
