import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSettingsStore } from '@/stores/settingsStore'

describe('settingsStore integration', () => {
  beforeEach(() => {
    // Reset store state
    useSettingsStore.setState({
      settings: {
        downloadPath: '',
        defaultQuality: 'best',
        audioFormat: 'mp3',
        audioQuality: '0',
      },
      isLoaded: false,
      isModalOpen: false,
    })
  })

  describe('loadSettings', () => {
    it('loads settings from electron API', async () => {
      const mockSettings = {
        downloadPath: '/Users/test/Downloads',
        defaultQuality: '720p' as const,
        audioFormat: 'm4a' as const,
        audioQuality: '128',
      }

      window.electronAPI.getSettings = vi.fn().mockResolvedValue({
        success: true,
        data: mockSettings,
      })

      const store = useSettingsStore.getState()
      await store.loadSettings()

      expect(window.electronAPI.getSettings).toHaveBeenCalled()
      expect(useSettingsStore.getState().settings).toEqual(mockSettings)
      expect(useSettingsStore.getState().isLoaded).toBe(true)
    })

    it('keeps defaults when API fails', async () => {
      window.electronAPI.getSettings = vi.fn().mockResolvedValue({
        success: false,
        error: 'Database error',
      })

      const store = useSettingsStore.getState()
      await store.loadSettings()

      // Should remain at defaults and not set isLoaded
      expect(useSettingsStore.getState().isLoaded).toBe(false)
      expect(useSettingsStore.getState().settings.defaultQuality).toBe('best')
    })

    it('keeps defaults when API returns no data', async () => {
      window.electronAPI.getSettings = vi.fn().mockResolvedValue({
        success: true,
        data: null,
      })

      const store = useSettingsStore.getState()
      await store.loadSettings()

      expect(useSettingsStore.getState().isLoaded).toBe(false)
    })
  })

  describe('updateSetting', () => {
    it('updates single setting via API', async () => {
      window.electronAPI.setSetting = vi.fn().mockResolvedValue({ success: true })

      const store = useSettingsStore.getState()
      await store.updateSetting('defaultQuality', '1080p')

      expect(window.electronAPI.setSetting).toHaveBeenCalledWith('defaultQuality', '1080p')
      expect(useSettingsStore.getState().settings.defaultQuality).toBe('1080p')
    })

    it('updates audio format', async () => {
      window.electronAPI.setSetting = vi.fn().mockResolvedValue({ success: true })

      const store = useSettingsStore.getState()
      await store.updateSetting('audioFormat', 'm4a')

      expect(window.electronAPI.setSetting).toHaveBeenCalledWith('audioFormat', 'm4a')
      expect(useSettingsStore.getState().settings.audioFormat).toBe('m4a')
    })

    it('does not update state when API fails', async () => {
      window.electronAPI.setSetting = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed to save',
      })

      const store = useSettingsStore.getState()
      await store.updateSetting('defaultQuality', '1080p')

      // Should remain at original value
      expect(useSettingsStore.getState().settings.defaultQuality).toBe('best')
    })

    it('preserves other settings when updating one', async () => {
      // Set initial state with multiple settings
      useSettingsStore.setState({
        settings: {
          downloadPath: '/downloads',
          defaultQuality: '720p',
          audioFormat: 'mp3',
          audioQuality: '192',
        },
        isLoaded: true,
        isModalOpen: false,
      })

      window.electronAPI.setSetting = vi.fn().mockResolvedValue({ success: true })

      const store = useSettingsStore.getState()
      await store.updateSetting('audioFormat', 'm4a')

      const settings = useSettingsStore.getState().settings
      expect(settings.audioFormat).toBe('m4a')
      expect(settings.downloadPath).toBe('/downloads')
      expect(settings.defaultQuality).toBe('720p')
      expect(settings.audioQuality).toBe('192')
    })
  })

  describe('updateSettings', () => {
    it('updates multiple settings at once', async () => {
      window.electronAPI.setSettings = vi.fn().mockResolvedValue({ success: true })

      const store = useSettingsStore.getState()
      await store.updateSettings({
        defaultQuality: '1080p',
        audioFormat: 'opus',
      })

      expect(window.electronAPI.setSettings).toHaveBeenCalledWith({
        defaultQuality: '1080p',
        audioFormat: 'opus',
      })

      const settings = useSettingsStore.getState().settings
      expect(settings.defaultQuality).toBe('1080p')
      expect(settings.audioFormat).toBe('opus')
    })

    it('does not update state when API fails', async () => {
      window.electronAPI.setSettings = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed',
      })

      const store = useSettingsStore.getState()
      await store.updateSettings({
        defaultQuality: '1080p',
      })

      expect(useSettingsStore.getState().settings.defaultQuality).toBe('best')
    })
  })

  describe('selectDownloadFolder', () => {
    it('updates download path when folder is selected', async () => {
      window.electronAPI.selectDownloadFolder = vi.fn().mockResolvedValue({
        success: true,
        path: '/Users/test/Videos',
      })

      const store = useSettingsStore.getState()
      const result = await store.selectDownloadFolder()

      expect(result).toBe('/Users/test/Videos')
      expect(useSettingsStore.getState().settings.downloadPath).toBe('/Users/test/Videos')
    })

    it('returns null when selection is cancelled', async () => {
      window.electronAPI.selectDownloadFolder = vi.fn().mockResolvedValue({
        success: false,
      })

      const store = useSettingsStore.getState()
      const result = await store.selectDownloadFolder()

      expect(result).toBeNull()
      expect(useSettingsStore.getState().settings.downloadPath).toBe('')
    })

    it('returns null when API succeeds but no path', async () => {
      window.electronAPI.selectDownloadFolder = vi.fn().mockResolvedValue({
        success: true,
        // No path property
      })

      const store = useSettingsStore.getState()
      const result = await store.selectDownloadFolder()

      expect(result).toBeNull()
    })
  })

  describe('modal state', () => {
    it('opens modal', () => {
      const store = useSettingsStore.getState()

      expect(useSettingsStore.getState().isModalOpen).toBe(false)

      store.openModal()
      expect(useSettingsStore.getState().isModalOpen).toBe(true)
    })

    it('closes modal', () => {
      useSettingsStore.setState({ isModalOpen: true })

      const store = useSettingsStore.getState()
      store.closeModal()

      expect(useSettingsStore.getState().isModalOpen).toBe(false)
    })

    it('toggles modal state', () => {
      const store = useSettingsStore.getState()

      store.openModal()
      expect(useSettingsStore.getState().isModalOpen).toBe(true)

      store.closeModal()
      expect(useSettingsStore.getState().isModalOpen).toBe(false)

      store.openModal()
      expect(useSettingsStore.getState().isModalOpen).toBe(true)
    })
  })
})
