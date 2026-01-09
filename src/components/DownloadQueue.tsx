import { Download } from 'lucide-react'
import { useDownloadStore } from '../stores/downloadStore'
import { QueueItem } from './QueueItem'

interface DownloadQueueProps {
  className?: string
}

export function DownloadQueue({ className }: DownloadQueueProps) {
  const downloads = useDownloadStore((state) => state.downloads)

  if (downloads.length === 0) {
    return (
      <div className={className} data-testid="download-queue-empty">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Downloads</h2>
        <div className="flex flex-col items-center justify-center py-8 text-text-muted">
          <Download className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm">No downloads yet</p>
          <p className="text-xs mt-1">Paste a YouTube URL above to get started</p>
        </div>
      </div>
    )
  }

  // Sort by createdAt descending (newest first)
  const sortedDownloads = [...downloads].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className={className} data-testid="download-queue">
      <h2 className="text-lg font-semibold text-text-primary mb-4">Downloads</h2>
      <div className="space-y-3">
        {sortedDownloads.map((item) => (
          <QueueItem key={item.id} download={item} />
        ))}
      </div>
    </div>
  )
}
