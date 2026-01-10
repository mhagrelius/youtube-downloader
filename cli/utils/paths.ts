import os from 'os'
import path from 'path'
import type { PathResolver } from '../../shared/services/paths.js'

const APP_NAME = 'yt-transcribe'

/**
 * CLI-specific path resolver using XDG/OS-standard paths.
 * - Linux: ~/.local/share/yt-transcribe (XDG_DATA_HOME)
 * - macOS: ~/Library/Application Support/yt-transcribe
 * - Windows: %APPDATA%/yt-transcribe
 */
export class CliPathResolver implements PathResolver {
  private dataDir: string

  constructor() {
    this.dataDir = process.env.YT_TRANSCRIBE_DATA_DIR || path.join(this.getAppDataDir(), APP_NAME)
  }

  private getAppDataDir(): string {
    if (process.platform === 'darwin') {
      return path.join(os.homedir(), 'Library', 'Application Support')
    }
    if (process.platform === 'win32') {
      return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    }
    // Linux and others: XDG_DATA_HOME or ~/.local/share
    return process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share')
  }

  getBinDir(): string {
    return path.join(this.dataDir, 'bin')
  }

  getModelsDir(): string {
    return path.join(this.dataDir, 'models')
  }

  getDefaultDownloadPath(): string {
    return process.env.YT_TRANSCRIBE_OUTPUT_DIR || os.homedir()
  }

  getTempDir(): string {
    return path.join(os.tmpdir(), APP_NAME)
  }

  isDev(): boolean {
    return process.env.NODE_ENV === 'development'
  }
}

let instance: CliPathResolver | null = null

export function getCliPathResolver(): CliPathResolver {
  if (!instance) {
    instance = new CliPathResolver()
  }
  return instance
}
