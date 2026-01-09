import { useEffect } from 'react'
import { useDownloadStore } from '../stores/downloadStore'

/**
 * Start the next pending download in a playlist.
 */
async function startNextPlaylistDownload(completedPlaylistId: string) {
  const downloads = useDownloadStore.getState().downloads
  const setStatus = useDownloadStore.getState().setStatus

  // Find the next pending download in the same playlist
  const nextDownload = downloads.find(
    (d) => d.playlistId === completedPlaylistId && d.status === 'pending'
  )

  if (nextDownload) {
    // Start the next download
    setStatus(nextDownload.id, 'downloading')
    await window.electronAPI.download(nextDownload.id, {
      url: nextDownload.url,
      outputPath: nextDownload.outputPath,
      formatId: nextDownload.formatId,
      audioOnly: nextDownload.audioOnly,
    })
  }
}

/**
 * Hook that sets up global IPC event listeners for download progress.
 * Call this once at the app root level (App.tsx) to wire up events to the store.
 */
export function useDownloadEvents() {
  const updateProgress = useDownloadStore((state) => state.updateProgress)
  const setStatus = useDownloadStore((state) => state.setStatus)
  const setError = useDownloadStore((state) => state.setError)
  const setOutputFile = useDownloadStore((state) => state.setOutputFile)
  const removeDownload = useDownloadStore((state) => state.removeDownload)
  const getDownloadById = useDownloadStore((state) => state.getDownloadById)
  const startTranscription = useDownloadStore((state) => state.startTranscription)
  const setTranscriptionStatus = useDownloadStore((state) => state.setTranscriptionStatus)
  const updateTranscriptionProgress = useDownloadStore((state) => state.updateTranscriptionProgress)
  const setTranscriptionFile = useDownloadStore((state) => state.setTranscriptionFile)
  const setTranscriptionError = useDownloadStore((state) => state.setTranscriptionError)

  useEffect(() => {
    // Progress updates
    const unsubProgress = window.electronAPI.onDownloadProgress((id, progress) => {
      updateProgress(id, progress)
    })

    // Completion - set output file and status, then start transcription or next playlist download
    const unsubComplete = window.electronAPI.onDownloadComplete((id, outputFile) => {
      const completedDownload = getDownloadById(id)
      setOutputFile(id, outputFile)
      setStatus(id, 'completed')

      // If transcription is enabled, start it
      if (completedDownload?.transcribe) {
        startTranscription(id)
      }

      // If this was part of a playlist, start the next pending download
      if (completedDownload?.playlistId) {
        startNextPlaylistDownload(completedDownload.playlistId)
      }
    })

    // Error
    const unsubError = window.electronAPI.onDownloadError((id, error) => {
      setError(id, error)
    })

    // Paused
    const unsubPaused = window.electronAPI.onDownloadPaused((id) => {
      setStatus(id, 'paused')
    })

    // Resumed
    const unsubResumed = window.electronAPI.onDownloadResumed((id) => {
      setStatus(id, 'downloading')
    })

    // Cancelled - remove from queue per requirements
    const unsubCancelled = window.electronAPI.onDownloadCancelled((id) => {
      removeDownload(id)
    })

    // Transcription events
    const unsubTranscriptionProgress = window.electronAPI.onTranscriptionProgress(
      (id, progress) => {
        setTranscriptionStatus(id, 'transcribing')
        updateTranscriptionProgress(id, progress)
      }
    )

    const unsubTranscriptionComplete = window.electronAPI.onTranscriptionComplete((id, result) => {
      setTranscriptionFile(id, result.outputFile)
      setTranscriptionStatus(id, 'completed')
    })

    const unsubTranscriptionError = window.electronAPI.onTranscriptionError((id, error) => {
      setTranscriptionError(id, error)
    })

    const unsubTranscriptionCancelled = window.electronAPI.onTranscriptionCancelled((id) => {
      setTranscriptionStatus(id, 'error')
      setTranscriptionError(id, 'Transcription cancelled')
    })

    return () => {
      unsubProgress()
      unsubComplete()
      unsubError()
      unsubPaused()
      unsubResumed()
      unsubCancelled()
      unsubTranscriptionProgress()
      unsubTranscriptionComplete()
      unsubTranscriptionError()
      unsubTranscriptionCancelled()
    }
  }, [
    updateProgress,
    setStatus,
    setError,
    setOutputFile,
    removeDownload,
    getDownloadById,
    startTranscription,
    setTranscriptionStatus,
    updateTranscriptionProgress,
    setTranscriptionFile,
    setTranscriptionError,
  ])
}
