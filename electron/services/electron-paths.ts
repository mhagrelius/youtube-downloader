import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { PathResolver } from '../../shared/services/paths.js'

/**
 * Electron-specific path resolver using app.getPath() and app.isPackaged.
 */
export class ElectronPathResolver implements PathResolver {
  private binDir: string
  private modelsDir: string
  private devMode: boolean

  constructor() {
    this.devMode = !app.isPackaged

    if (this.devMode) {
      // Try multiple possible locations for dev binaries
      const possibleDevPaths = [
        path.join(process.cwd(), 'resources', 'bin'),
        // When running from dist-electron, go up one level
        path.join(app.getAppPath(), '..', 'resources', 'bin'),
        // Fallback to app path based resolution
        path.join(path.dirname(app.getAppPath()), 'resources', 'bin'),
      ]

      // Find the first path that exists
      let foundPath = possibleDevPaths[0]
      for (const devPath of possibleDevPaths) {
        if (fs.existsSync(devPath)) {
          foundPath = devPath
          break
        }
      }
      this.binDir = foundPath
      this.modelsDir = path.join(process.cwd(), 'resources', 'models')
    } else {
      this.binDir = path.join(app.getPath('userData'), 'bin')
      this.modelsDir = path.join(app.getPath('userData'), 'models')
    }
  }

  getBinDir(): string {
    return this.binDir
  }

  getModelsDir(): string {
    return this.modelsDir
  }

  getDefaultDownloadPath(): string {
    return app.getPath('downloads')
  }

  getTempDir(): string {
    return app.getPath('temp')
  }

  isDev(): boolean {
    return this.devMode
  }
}

let instance: ElectronPathResolver | null = null

export function getElectronPathResolver(): ElectronPathResolver {
  if (!instance) {
    instance = new ElectronPathResolver()
  }
  return instance
}
