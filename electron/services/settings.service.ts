import { app } from 'electron'
import { getDatabase } from './database.service'

export interface AppSettings {
  downloadPath: string
  defaultQuality: 'best' | '1080p' | '720p' | '480p' | '360p'
  audioFormat: 'mp3' | 'm4a'
  audioQuality: string
}

const DEFAULT_SETTINGS: AppSettings = {
  downloadPath: '',
  defaultQuality: 'best',
  audioFormat: 'mp3',
  audioQuality: '0',
}

export function getSettings(): AppSettings {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string
    value: string
  }[]

  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    downloadPath: app.getPath('downloads'),
  }

  for (const row of rows) {
    if (row.key in settings) {
      ;(settings as unknown as Record<string, string>)[row.key] = row.value
    }
  }

  return settings
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined

  if (row) {
    return row.value as AppSettings[K]
  }

  if (key === 'downloadPath') {
    return app.getPath('downloads') as AppSettings[K]
  }

  return DEFAULT_SETTINGS[key]
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  const db = getDatabase()
  db.prepare(
    `
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, strftime('%s', 'now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `
  ).run(key, String(value))
}

export function setSettings(settings: Partial<AppSettings>): void {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, strftime('%s', 'now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `)

  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        stmt.run(key, String(value))
      }
    }
  })

  transaction()
}
