import { useState, useEffect, useCallback } from 'react'
import { Download, Settings } from 'lucide-react'
import { UrlInput } from './components/UrlInput'
import { VideoPreview, VideoInfo } from './components/VideoPreview'
import { PlaylistPreview, PlaylistInfo } from './components/PlaylistPreview'
import {
  QualitySelector,
  BestAvailableIndicator,
  processFormats,
} from './components/QualitySelector'
import { AudioOnlyToggle } from './components/AudioOnlyToggle'
import { TranscribeToggle } from './components/TranscribeToggle'
import { TranscriptionOptions } from './components/TranscriptionOptions'
import { DownloadButton } from './components/DownloadButton'
import { DownloadQueue } from './components/DownloadQueue'
import { SettingsModal } from './components/SettingsModal'
import { SetupScreen } from './components/SetupScreen'
import { useDownloadStore } from './stores/downloadStore'
import { useSettingsStore } from './stores/settingsStore'
import { useDownloadEvents } from './hooks/useDownloadEvents'
import { isValidYouTubeUrl, isPlaylistUrl } from './utils/validation'

function App() {
  // Binary readiness state
  const [binariesReady, setBinariesReady] = useState<boolean | null>(null)
  // Set up global download event listeners
  useDownloadEvents()

  // URL and validation state
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)

  // Video info state
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [isLoadingInfo, setIsLoadingInfo] = useState(false)
  const [isLoadingFormats, setIsLoadingFormats] = useState(false)

  // Playlist state
  const [isPlaylist, setIsPlaylist] = useState(false)
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null)
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())

  // Download options state
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null)
  const [audioOnly, setAudioOnly] = useState(false)

  // Transcription options state
  const [transcribe, setTranscribe] = useState(false)
  const [transcriptionFormat, setTranscriptionFormat] = useState<'txt' | 'srt' | 'vtt'>('txt')
  const [transcriptionLanguage, setTranscriptionLanguage] = useState('auto')

  // Get store actions
  const addDownload = useDownloadStore((state) => state.addDownload)
  const setStatus = useDownloadStore((state) => state.setStatus)
  const downloads = useDownloadStore((state) => state.downloads)

  // Settings store
  const settings = useSettingsStore((state) => state.settings)
  const loadSettings = useSettingsStore((state) => state.loadSettings)
  const openSettingsModal = useSettingsStore((state) => state.openModal)

  // Check binary status on mount
  useEffect(() => {
    const checkBinaries = async () => {
      try {
        const status = await window.electronAPI.checkBinaryStatus()
        setBinariesReady(status.success && status.data?.ready === true)
      } catch {
        setBinariesReady(false)
      }
    }
    checkBinaries()
  }, [])

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Check if any download is in progress (for disabling controls)
  const hasActiveDownload = downloads.some(
    (d) => d.status === 'downloading' || d.status === 'pending'
  )

  // Check if we should skip format selection (Best Available setting for either mode)
  const skipFormatSelection =
    (audioOnly && settings.audioFormat === 'best') ||
    (!audioOnly && settings.defaultQuality === 'best')

  // Reset format selection when audioOnly changes
  useEffect(() => {
    if (videoInfo) {
      if (skipFormatSelection) {
        // Use yt-dlp format strings to auto-select best quality
        // eslint-disable-next-line react-hooks/set-state-in-effect -- derived state from video formats
        setSelectedFormatId(audioOnly ? 'bestaudio' : 'bestvideo+bestaudio/best')
      } else {
        const formats = processFormats(videoInfo.formats, audioOnly)
        if (formats.length > 0) {
          setSelectedFormatId(formats[0].formatId)
        } else {
          setSelectedFormatId(null)
        }
      }
    }
  }, [audioOnly, videoInfo, skipFormatSelection])

  const handleFetchVideo = async (urlOverride?: string) => {
    const trimmedUrl = (urlOverride ?? url).trim()

    if (!trimmedUrl) {
      setUrlError('Please enter a YouTube URL')
      return
    }

    if (!isValidYouTubeUrl(trimmedUrl)) {
      setUrlError('Please enter a valid YouTube URL')
      return
    }

    setUrlError(null)
    setIsLoadingInfo(true)
    setVideoInfo(null)
    setPlaylistInfo(null)
    setIsPlaylist(false)
    setSelectedVideos(new Set())

    try {
      // Check if it's a playlist URL
      if (isPlaylistUrl(trimmedUrl)) {
        const result = await window.electronAPI.getPlaylistInfo(trimmedUrl)

        if (result.success && result.data) {
          setPlaylistInfo(result.data)
          setIsPlaylist(true)
          // Select all videos by default
          setSelectedVideos(new Set(result.data.entries.map((e: { id: string }) => e.id)))
        } else {
          setUrlError(result.error || 'Failed to fetch playlist info')
        }
        setIsLoadingInfo(false)
      } else {
        // Single video - use two-phase loading for faster perceived speed
        // Phase 1: Get fast preview using oEmbed API
        const previewResult = await window.electronAPI.getVideoPreview(trimmedUrl)

        if (previewResult.success && previewResult.data) {
          // Show preview immediately with partial data
          const partialInfo: VideoInfo = {
            id: previewResult.data.id,
            title: previewResult.data.title,
            thumbnail: previewResult.data.thumbnail,
            uploader: previewResult.data.uploader,
            url: previewResult.data.url,
            duration: 0,
            uploadDate: '',
            viewCount: 0,
            description: '',
            formats: [],
          }
          setVideoInfo(partialInfo)
          setIsLoadingInfo(false) // Stop showing skeleton
          setIsLoadingFormats(true) // Start showing format loading state

          // Phase 2: Fetch full info with formats in background
          const fullResult = await window.electronAPI.getVideoInfo(trimmedUrl)

          if (fullResult.success && fullResult.data) {
            setVideoInfo(fullResult.data)
            // Auto-select best format
            const formats = processFormats(fullResult.data.formats, audioOnly)
            if (formats.length > 0) {
              setSelectedFormatId(formats[0].formatId)
            }
          } else {
            setUrlError(fullResult.error || 'Failed to fetch video formats')
          }
          setIsLoadingFormats(false)
        } else {
          // Fallback: If preview fails, use full fetch
          const result = await window.electronAPI.getVideoInfo(trimmedUrl)

          if (result.success && result.data) {
            setVideoInfo(result.data)
            const formats = processFormats(result.data.formats, audioOnly)
            if (formats.length > 0) {
              setSelectedFormatId(formats[0].formatId)
            }
          } else {
            setUrlError(result.error || 'Failed to fetch video info')
          }
          setIsLoadingInfo(false)
        }
      }
    } catch (err) {
      console.error('[App] Failed to fetch video info:', err)
      setUrlError('Failed to fetch video info')
      setIsLoadingInfo(false)
      setIsLoadingFormats(false)
    }
  }

  const handleDownload = async () => {
    if (!videoInfo || !selectedFormatId) return

    try {
      // Use settings download path, or fall back to default
      const downloadPath =
        settings.downloadPath || (await window.electronAPI.getDefaultDownloadPath())

      // Add to the download queue with transcription options
      const downloadId = addDownload({
        url: videoInfo.url,
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        outputPath: downloadPath,
        formatId: selectedFormatId,
        audioOnly,
        transcribe,
        transcriptionFormat: transcribe ? transcriptionFormat : undefined,
        transcriptionLanguage: transcribe ? transcriptionLanguage : undefined,
      })

      // Update status to downloading
      setStatus(downloadId, 'downloading')

      // Start the actual download
      await window.electronAPI.download(downloadId, {
        url: videoInfo.url,
        outputPath: downloadPath,
        formatId: selectedFormatId,
        audioOnly,
      })
    } catch (err) {
      console.error('Failed to start download:', err)
    }
  }

  // Playlist selection handlers
  const handleSelectionChange = useCallback((videoId: string, selected: boolean) => {
    setSelectedVideos((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(videoId)
      } else {
        next.delete(videoId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (playlistInfo) {
      setSelectedVideos(new Set(playlistInfo.entries.map((e) => e.id)))
    }
  }, [playlistInfo])

  const handleDeselectAll = useCallback(() => {
    setSelectedVideos(new Set())
  }, [])

  // Sanitize folder name for filesystem
  const sanitizeFolderName = (name: string): string => {
    return name
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim()
      .slice(0, 100) // Limit length
  }

  const handlePlaylistDownload = async () => {
    if (!playlistInfo || selectedVideos.size === 0) return

    try {
      // Use settings download path, or fall back to default
      const basePath = settings.downloadPath || (await window.electronAPI.getDefaultDownloadPath())

      // Create subfolder path for playlist
      const playlistFolder = sanitizeFolderName(playlistInfo.title)
      const downloadPath = `${basePath}/${playlistFolder}`

      // Get selected entries in order
      const selectedEntries = playlistInfo.entries.filter((entry) => selectedVideos.has(entry.id))

      // Add all selected videos to the queue
      const downloadIds: string[] = []
      for (const entry of selectedEntries) {
        const downloadId = addDownload({
          url: entry.url,
          title: entry.title,
          thumbnail: entry.thumbnail || playlistInfo.thumbnail,
          outputPath: downloadPath,
          formatId: 'best', // Use best format for playlists
          audioOnly,
          playlistId: playlistInfo.id,
          playlistTitle: playlistInfo.title,
          transcribe,
          transcriptionFormat: transcribe ? transcriptionFormat : undefined,
          transcriptionLanguage: transcribe ? transcriptionLanguage : undefined,
        })
        downloadIds.push(downloadId)
      }

      // Start the first download
      if (downloadIds.length > 0) {
        const firstEntry = selectedEntries[0]
        setStatus(downloadIds[0], 'downloading')
        await window.electronAPI.download(downloadIds[0], {
          url: firstEntry.url,
          outputPath: downloadPath,
          formatId: 'best',
          audioOnly,
        })
      }
    } catch (err) {
      console.error('Failed to start playlist download:', err)
    }
  }

  // Show setup screen if binaries are not ready
  if (binariesReady === null) {
    // Still checking - show loading state
    return (
      <div className="min-h-screen bg-background text-text-primary flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading...</div>
      </div>
    )
  }

  if (!binariesReady) {
    return (
      <div data-testid="app-ready">
        <SetupScreen onComplete={() => setBinariesReady(true)} />
      </div>
    )
  }

  return (
    <div
      data-testid="app-ready"
      className="h-screen bg-background text-text-primary flex flex-col overflow-hidden"
    >
      {/* Draggable title bar area for macOS */}
      <div className="h-12 w-full app-drag flex-shrink-0" />

      {/* Main content */}
      <div className="px-6 pb-6 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Download className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold">YouTube Downloader</h1>
          </div>
          <button
            onClick={openSettingsModal}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            data-testid="settings-button"
          >
            <Settings className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* URL Input */}
        <UrlInput
          value={url}
          onChange={setUrl}
          onSubmit={handleFetchVideo}
          isLoading={isLoadingInfo}
          error={urlError}
        />

        {/* Video or Playlist Preview */}
        {isPlaylist ? (
          <PlaylistPreview
            playlist={playlistInfo}
            isLoading={isLoadingInfo}
            selectedVideos={selectedVideos}
            onSelectionChange={handleSelectionChange}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        ) : (
          <VideoPreview
            videoInfo={videoInfo}
            isLoading={isLoadingInfo}
            isLoadingFormats={isLoadingFormats}
          />
        )}

        {/* Download Options - show for single video */}
        {videoInfo && !isPlaylist && (
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center gap-4 flex-wrap">
              {skipFormatSelection ? (
                <BestAvailableIndicator />
              ) : (
                <QualitySelector
                  formats={videoInfo.formats}
                  selectedFormatId={selectedFormatId}
                  onChange={setSelectedFormatId}
                  disabled={hasActiveDownload}
                  audioOnly={audioOnly}
                  loading={isLoadingFormats}
                />
              )}

              <AudioOnlyToggle
                enabled={audioOnly}
                onChange={setAudioOnly}
                disabled={hasActiveDownload}
              />

              <TranscribeToggle
                enabled={transcribe}
                onChange={setTranscribe}
                disabled={hasActiveDownload}
              />

              <DownloadButton
                onClick={handleDownload}
                disabled={!videoInfo || !selectedFormatId}
                isDownloading={hasActiveDownload}
                disabledReason={
                  !videoInfo
                    ? 'Enter a YouTube URL first'
                    : !selectedFormatId
                      ? 'Select a quality format'
                      : undefined
                }
                label={transcribe ? 'Download & Transcribe' : 'Download'}
              />
            </div>

            {transcribe && (
              <TranscriptionOptions
                format={transcriptionFormat}
                language={transcriptionLanguage}
                onFormatChange={setTranscriptionFormat}
                onLanguageChange={setTranscriptionLanguage}
                disabled={hasActiveDownload}
              />
            )}
          </div>
        )}

        {/* Download Options - show for playlist */}
        {playlistInfo && isPlaylist && (
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center gap-4 flex-wrap">
              <AudioOnlyToggle
                enabled={audioOnly}
                onChange={setAudioOnly}
                disabled={hasActiveDownload}
              />

              <TranscribeToggle
                enabled={transcribe}
                onChange={setTranscribe}
                disabled={hasActiveDownload}
              />

              <DownloadButton
                onClick={handlePlaylistDownload}
                disabled={selectedVideos.size === 0}
                isDownloading={hasActiveDownload}
                label={`Download ${selectedVideos.size} Video${selectedVideos.size !== 1 ? 's' : ''}`}
                disabledReason={selectedVideos.size === 0 ? 'Select at least one video' : undefined}
              />
            </div>

            {transcribe && (
              <TranscriptionOptions
                format={transcriptionFormat}
                language={transcriptionLanguage}
                onFormatChange={setTranscriptionFormat}
                onLanguageChange={setTranscriptionLanguage}
                disabled={hasActiveDownload}
              />
            )}
          </div>
        )}

        {/* Download Queue */}
        <DownloadQueue className="mt-6" />
      </div>

      {/* Settings Modal */}
      <SettingsModal />
    </div>
  )
}

export default App
