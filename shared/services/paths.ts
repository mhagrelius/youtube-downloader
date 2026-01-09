/**
 * Path resolution abstraction to support both Electron and CLI environments.
 * Electron uses app.getPath(), CLI uses XDG/OS-standard paths.
 */
export interface PathResolver {
  /** Directory containing yt-dlp, deno, whisper binaries */
  getBinDir(): string

  /** Directory containing whisper model files */
  getModelsDir(): string

  /** Default download directory for audio/video files */
  getDefaultDownloadPath(): string

  /** Temporary directory for intermediate files */
  getTempDir(): string

  /** Whether running in development mode */
  isDev(): boolean
}
