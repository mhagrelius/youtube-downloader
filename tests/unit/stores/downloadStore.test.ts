import { describe, it, expect, beforeEach } from 'vitest'
import { useDownloadStore } from '@/stores/downloadStore'

describe('downloadStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useDownloadStore.setState({ downloads: [] })
  })

  describe('addDownload', () => {
    it('creates a download with pending status', () => {
      const store = useDownloadStore.getState()
      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test123',
        title: 'Test Video',
        thumbnail: 'https://example.com/thumb.jpg',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      const download = store.getDownloadById(id)
      expect(download).toBeDefined()
      expect(download?.status).toBe('pending')
      expect(download?.progress).toBeNull()
      expect(download?.error).toBeNull()
      expect(download?.outputFile).toBeNull()
    })

    it('generates unique IDs for each download', () => {
      const id1 = useDownloadStore.getState().addDownload({
        url: 'https://youtube.com/watch?v=video1',
        title: 'Video 1',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      const id2 = useDownloadStore.getState().addDownload({
        url: 'https://youtube.com/watch?v=video2',
        title: 'Video 2',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      expect(id1).not.toBe(id2)
      expect(useDownloadStore.getState().downloads).toHaveLength(2)
    })

    it('sets createdAt timestamp', () => {
      const store = useDownloadStore.getState()
      const before = Date.now()

      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      const after = Date.now()
      const download = store.getDownloadById(id)

      expect(download?.createdAt).toBeGreaterThanOrEqual(before)
      expect(download?.createdAt).toBeLessThanOrEqual(after)
    })

    it('preserves optional fields like playlistId', () => {
      const store = useDownloadStore.getState()

      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Playlist Video',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
        playlistId: 'PLtest123',
        playlistTitle: 'My Playlist',
      })

      const download = store.getDownloadById(id)
      expect(download?.playlistId).toBe('PLtest123')
      expect(download?.playlistTitle).toBe('My Playlist')
    })

    it('preserves transcription options', () => {
      const store = useDownloadStore.getState()

      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Video with Transcription',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: true,
        transcribe: true,
        transcriptionFormat: 'srt',
        transcriptionLanguage: 'en',
      })

      const download = store.getDownloadById(id)
      expect(download?.transcribe).toBe(true)
      expect(download?.transcriptionFormat).toBe('srt')
      expect(download?.transcriptionLanguage).toBe('en')
    })
  })

  describe('updateProgress', () => {
    it('updates download progress', () => {
      const store = useDownloadStore.getState()
      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test Video',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      store.updateProgress(id, {
        percent: 50,
        downloadedBytes: 50000,
        totalBytes: 100000,
        speed: '1MiB/s',
        eta: '5s',
      })

      const download = store.getDownloadById(id)
      expect(download?.progress).toBeDefined()
      expect(download?.progress?.percent).toBe(50)
      expect(download?.progress?.downloadedBytes).toBe(50000)
      expect(download?.progress?.totalBytes).toBe(100000)
    })

    it('calculates preparing phase for 0%', () => {
      const store = useDownloadStore.getState()
      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      store.updateProgress(id, {
        percent: 0,
        downloadedBytes: 0,
        totalBytes: 100000,
        speed: '0B/s',
        eta: '',
      })

      expect(store.getDownloadById(id)?.progress?.phase).toBe('preparing')
    })

    it('calculates downloading phase for progress between 1-94%', () => {
      const store = useDownloadStore.getState()
      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      store.updateProgress(id, {
        percent: 50,
        downloadedBytes: 50000,
        totalBytes: 100000,
        speed: '1MiB/s',
        eta: '5s',
      })

      expect(store.getDownloadById(id)?.progress?.phase).toBe('downloading')
    })

    it('calculates finalizing phase for 95%+', () => {
      const store = useDownloadStore.getState()
      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      store.updateProgress(id, {
        percent: 98,
        downloadedBytes: 98000,
        totalBytes: 100000,
        speed: '1MiB/s',
        eta: '1s',
      })

      expect(store.getDownloadById(id)?.progress?.phase).toBe('finalizing')
    })

    it('calculates smoothed ETA', () => {
      const store = useDownloadStore.getState()
      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      store.updateProgress(id, {
        percent: 50,
        downloadedBytes: 500000,
        totalBytes: 1000000,
        speed: '100KiB/s',
        eta: '5s',
      })

      const download = store.getDownloadById(id)
      expect(download?.progress?.smoothedEta).toBeDefined()
      expect(download?.progress?.smoothedEta).not.toBe('')
    })
  })

  describe('setStatus', () => {
    it('updates download status', () => {
      const store = useDownloadStore.getState()
      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      store.setStatus(id, 'downloading')
      expect(store.getDownloadById(id)?.status).toBe('downloading')

      store.setStatus(id, 'paused')
      expect(store.getDownloadById(id)?.status).toBe('paused')

      store.setStatus(id, 'completed')
      expect(store.getDownloadById(id)?.status).toBe('completed')
    })

    it('does not affect other downloads', () => {
      const store = useDownloadStore.getState()

      const id1 = store.addDownload({
        url: 'https://youtube.com/watch?v=video1',
        title: 'Video 1',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      const id2 = store.addDownload({
        url: 'https://youtube.com/watch?v=video2',
        title: 'Video 2',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      store.setStatus(id1, 'downloading')

      expect(store.getDownloadById(id1)?.status).toBe('downloading')
      expect(store.getDownloadById(id2)?.status).toBe('pending')
    })
  })

  describe('setError', () => {
    it('sets error message and changes status to error', () => {
      const store = useDownloadStore.getState()
      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      store.setError(id, 'Download failed: network error')

      const download = store.getDownloadById(id)
      expect(download?.error).toBe('Download failed: network error')
      expect(download?.status).toBe('error')
    })
  })

  describe('setOutputFile', () => {
    it('sets the output file path', () => {
      const store = useDownloadStore.getState()
      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      store.setOutputFile(id, '/downloads/test-video.mp4')

      expect(store.getDownloadById(id)?.outputFile).toBe('/downloads/test-video.mp4')
    })
  })

  describe('removeDownload', () => {
    it('removes download from list', () => {
      const id = useDownloadStore.getState().addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      expect(useDownloadStore.getState().downloads).toHaveLength(1)
      useDownloadStore.getState().removeDownload(id)
      expect(useDownloadStore.getState().downloads).toHaveLength(0)
      expect(useDownloadStore.getState().getDownloadById(id)).toBeUndefined()
    })

    it('only removes the specified download', () => {
      const id1 = useDownloadStore.getState().addDownload({
        url: 'https://youtube.com/watch?v=video1',
        title: 'Video 1',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      const id2 = useDownloadStore.getState().addDownload({
        url: 'https://youtube.com/watch?v=video2',
        title: 'Video 2',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      useDownloadStore.getState().removeDownload(id1)

      expect(useDownloadStore.getState().downloads).toHaveLength(1)
      expect(useDownloadStore.getState().getDownloadById(id1)).toBeUndefined()
      expect(useDownloadStore.getState().getDownloadById(id2)).toBeDefined()
    })
  })

  describe('getDownloadById', () => {
    it('returns the download with matching id', () => {
      const store = useDownloadStore.getState()

      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test Video',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: false,
      })

      const download = store.getDownloadById(id)
      expect(download?.title).toBe('Test Video')
    })

    it('returns undefined for non-existent id', () => {
      const store = useDownloadStore.getState()
      expect(store.getDownloadById('non-existent-id')).toBeUndefined()
    })
  })

  describe('transcription actions', () => {
    it('setTranscriptionStatus updates status', () => {
      const store = useDownloadStore.getState()
      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: true,
        transcribe: true,
      })

      store.setTranscriptionStatus(id, 'transcribing')
      expect(store.getDownloadById(id)?.transcriptionStatus).toBe('transcribing')

      store.setTranscriptionStatus(id, 'completed')
      expect(store.getDownloadById(id)?.transcriptionStatus).toBe('completed')
    })

    it('updateTranscriptionProgress updates progress', () => {
      const store = useDownloadStore.getState()
      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: true,
        transcribe: true,
      })

      store.updateTranscriptionProgress(id, {
        percent: 50,
        currentTime: '1:30',
        totalTime: '3:00',
        phase: 'transcribing',
      })

      const download = store.getDownloadById(id)
      expect(download?.transcriptionProgress?.percent).toBe(50)
      expect(download?.transcriptionProgress?.phase).toBe('transcribing')
    })

    it('setTranscriptionFile sets the file path', () => {
      const store = useDownloadStore.getState()
      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: true,
        transcribe: true,
      })

      store.setTranscriptionFile(id, '/downloads/test.srt')
      expect(store.getDownloadById(id)?.transcriptionFile).toBe('/downloads/test.srt')
    })

    it('setTranscriptionError sets error and status', () => {
      const store = useDownloadStore.getState()
      const id = store.addDownload({
        url: 'https://youtube.com/watch?v=test',
        title: 'Test',
        thumbnail: '',
        outputPath: '/downloads',
        formatId: 'best',
        audioOnly: true,
        transcribe: true,
      })

      store.setTranscriptionError(id, 'Transcription failed')

      const download = store.getDownloadById(id)
      expect(download?.transcriptionError).toBe('Transcription failed')
      expect(download?.transcriptionStatus).toBe('error')
    })
  })
})
