import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'youtube-downloader.db')
  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')

  // Initialize schema
  initializeSchema(db)

  return db
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      thumbnail TEXT,
      output_path TEXT NOT NULL,
      output_file TEXT,
      format_id TEXT,
      audio_only INTEGER DEFAULT 0,
      audio_format TEXT,
      status TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      completed_at INTEGER
    );
  `)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
