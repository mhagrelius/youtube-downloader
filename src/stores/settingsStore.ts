import { create } from 'zustand'
import type { AppSettings } from '../types/electron'

interface SettingsStore {
  settings: AppSettings
  isLoaded: boolean
  isModalOpen: boolean

  // Actions
  loadSettings: () => Promise<void>
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  selectDownloadFolder: () => Promise<string | null>
  openModal: () => void
  closeModal: () => void
}

const DEFAULT_SETTINGS: AppSettings = {
  downloadPath: '',
  defaultQuality: 'best',
  audioFormat: 'mp3',
  audioQuality: '0',
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,
  isModalOpen: false,

  loadSettings: async () => {
    const result = await window.electronAPI.getSettings()
    if (result.success && result.data) {
      set({ settings: result.data, isLoaded: true })
    }
  },

  updateSetting: async (key, value) => {
    const result = await window.electronAPI.setSetting(key, String(value))
    if (result.success) {
      set((state) => ({
        settings: { ...state.settings, [key]: value },
      }))
    }
  },

  updateSettings: async (newSettings) => {
    const result = await window.electronAPI.setSettings(newSettings)
    if (result.success) {
      set((state) => ({
        settings: { ...state.settings, ...newSettings },
      }))
    }
  },

  selectDownloadFolder: async () => {
    const result = await window.electronAPI.selectDownloadFolder()
    if (result.success && result.path) {
      set((state) => ({
        settings: { ...state.settings, downloadPath: result.path! },
      }))
      return result.path
    }
    return null
  },

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
}))
