interface VideoInfo {
  id: string
  title: string
  thumbnail: string
  duration: number
  uploader: string
  uploadDate: string
  viewCount: number
  description: string
  formats: VideoFormat[]
  url: string
}

interface VideoFormat {
  formatId: string
  ext: string
  resolution: string
  filesize?: number
  vcodec: string
  acodec: string
  fps?: number
  tbr?: number
}

interface VideoPreviewProps {
  videoInfo: VideoInfo | null
  isLoading: boolean
  isLoadingFormats?: boolean
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function VideoSkeleton() {
  return (
    <div className="bg-surface rounded-lg p-4 flex gap-4" data-testid="video-skeleton">
      {/* Thumbnail skeleton */}
      <div className="skeleton w-48 rounded-lg flex-shrink-0" style={{ aspectRatio: '16/9' }} />

      {/* Content skeleton */}
      <div className="flex-1 min-w-0">
        {/* Title skeleton - two lines */}
        <div className="skeleton h-5 w-full rounded mb-2" />
        <div className="skeleton h-5 w-3/4 rounded mb-3" />

        {/* Uploader skeleton */}
        <div className="skeleton h-4 w-1/3 rounded mb-2" />

        {/* View count skeleton */}
        <div className="skeleton h-3 w-1/4 rounded" />
      </div>
    </div>
  )
}

export function VideoPreview({ videoInfo, isLoading, isLoadingFormats }: VideoPreviewProps) {
  if (isLoading) {
    return <VideoSkeleton />
  }

  if (!videoInfo) {
    return (
      <div
        className="bg-surface rounded-lg p-6 text-center text-text-secondary"
        data-testid="video-preview"
      >
        <p>Paste a YouTube URL above to get started</p>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-lg p-4 flex gap-4" data-testid="video-preview">
      <div className="relative flex-shrink-0">
        <img
          src={videoInfo.thumbnail}
          alt={videoInfo.title}
          className="w-48 h-27 rounded-lg object-cover"
          style={{ aspectRatio: '16/9' }}
          data-testid="video-thumbnail"
        />
        {videoInfo.duration > 0 ? (
          <span
            className="absolute bottom-2 right-2 bg-background/80 text-text-primary text-xs px-2 py-1 rounded"
            data-testid="video-duration"
          >
            {formatDuration(videoInfo.duration)}
          </span>
        ) : isLoadingFormats ? (
          <span className="absolute bottom-2 right-2 bg-background/80 text-text-muted text-xs px-2 py-1 rounded animate-pulse">
            --:--
          </span>
        ) : null}
      </div>

      <div className="flex-1 min-w-0">
        <h2
          className="text-text-primary font-semibold text-lg truncate"
          data-testid="video-title"
          title={videoInfo.title}
        >
          {videoInfo.title}
        </h2>
        <p className="text-text-secondary text-sm mt-1" data-testid="video-uploader">
          {videoInfo.uploader}
        </p>
        {videoInfo.viewCount > 0 ? (
          <p className="text-text-muted text-xs mt-2">
            {videoInfo.viewCount.toLocaleString()} views
          </p>
        ) : isLoadingFormats ? (
          <p className="text-text-muted text-xs mt-2 animate-pulse">Loading details...</p>
        ) : null}
      </div>
    </div>
  )
}

export type { VideoInfo, VideoFormat }
