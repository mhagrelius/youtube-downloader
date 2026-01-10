import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { createWriteStream } from 'fs'
import { spawn } from 'child_process'
import { EventEmitter } from 'events'
import type { PathResolver } from '../../shared/services/paths.js'

export interface BinaryInfo {
  name: string
  version?: string
  path: string
  exists: boolean
  executable: boolean
}

export interface DownloadProgress {
  binary: string
  percent: number
  downloadedBytes: number
  totalBytes: number
}

export interface BinaryStatus {
  ytdlp: BinaryInfo
  deno: BinaryInfo
  whisper: BinaryInfo
  ffmpeg: BinaryInfo
  ready: boolean
}

export interface ModelInfo {
  name: string
  path: string
  exists: boolean
  size?: number
}

export interface WhisperModelStatus {
  model: ModelInfo
  ready: boolean
}

type PlatformKey = 'darwin' | 'win32' | 'linux'
type ArchKey = 'x64' | 'arm64'

const BINARY_URLS: Record<string, Record<PlatformKey, Record<ArchKey, string>>> = {
  'yt-dlp': {
    darwin: {
      x64: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
      arm64: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
    },
    win32: {
      x64: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
      arm64: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    },
    linux: {
      x64: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux',
      arm64: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64',
    },
  },
  deno: {
    darwin: {
      x64: 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-apple-darwin.zip',
      arm64:
        'https://github.com/denoland/deno/releases/latest/download/deno-aarch64-apple-darwin.zip',
    },
    win32: {
      x64: 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip',
      arm64:
        'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip',
    },
    linux: {
      x64: 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip',
      arm64:
        'https://github.com/denoland/deno/releases/latest/download/deno-aarch64-unknown-linux-gnu.zip',
    },
  },
  whisper: {
    darwin: {
      // No pre-built binaries for macOS - use system-installed whisper-cpp (via Homebrew)
      x64: '',
      arm64: '',
    },
    win32: {
      x64: 'https://github.com/ggerganov/whisper.cpp/releases/latest/download/whisper-bin-x64.zip',
      arm64:
        'https://github.com/ggerganov/whisper.cpp/releases/latest/download/whisper-bin-x64.zip',
    },
    linux: {
      // No pre-built binaries for Linux - use system-installed whisper-cpp
      x64: '',
      arm64: '',
    },
  },
  ffmpeg: {
    darwin: {
      // No pre-built binaries for macOS - use system-installed ffmpeg (via Homebrew)
      x64: '',
      arm64: '',
    },
    win32: {
      x64: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
      arm64:
        'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    },
    linux: {
      // No pre-built binaries for Linux - use system package manager
      x64: '',
      arm64: '',
    },
  },
}

const WHISPER_MODEL_URLS: Record<string, string> = {
  tiny: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
  base: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
  small: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
  medium: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
}

class BinaryManager extends EventEmitter {
  private binDir: string
  private pathResolver: PathResolver
  private downloadInProgress: Promise<void> | null = null

  constructor(pathResolver: PathResolver) {
    super()
    this.pathResolver = pathResolver
    this.binDir = pathResolver.getBinDir()
  }

  getBinDir(): string {
    return this.binDir
  }

  getYtDlpPath(): string {
    const filename = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
    return path.join(this.binDir, filename)
  }

  getDenoPath(): string {
    const filename = process.platform === 'win32' ? 'deno.exe' : 'deno'
    return path.join(this.binDir, filename)
  }

  getWhisperPath(): string {
    // On Windows, use the downloaded binary
    if (process.platform === 'win32') {
      return path.join(this.binDir, 'whisper-cli.exe')
    }

    // On macOS/Linux, first check for system-installed whisper-cpp (via Homebrew or package manager)
    const systemPaths = [
      '/opt/homebrew/bin/whisper-cli', // Homebrew on Apple Silicon (actual binary name)
      '/usr/local/bin/whisper-cli', // Homebrew on Intel Mac (actual binary name)
      '/opt/homebrew/bin/whisper-cpp',
      '/usr/local/bin/whisper-cpp',
      '/usr/bin/whisper-cpp',
      '/opt/homebrew/bin/whisper',
      '/usr/local/bin/whisper',
      '/usr/bin/whisper',
    ]

    for (const systemPath of systemPaths) {
      if (fs.existsSync(systemPath)) {
        return systemPath
      }
    }

    // Fall back to the bin directory (may need manual installation)
    return path.join(this.binDir, 'whisper-cli')
  }

  getFFmpegPath(): string {
    // On Windows, use the downloaded binary
    if (process.platform === 'win32') {
      return path.join(this.binDir, 'ffmpeg.exe')
    }

    // On macOS/Linux, first check for system-installed ffmpeg
    const systemPaths = [
      '/opt/homebrew/bin/ffmpeg', // Homebrew on Apple Silicon
      '/usr/local/bin/ffmpeg', // Homebrew on Intel Mac
      '/usr/bin/ffmpeg', // System install
      '/opt/local/bin/ffmpeg', // MacPorts
    ]

    for (const systemPath of systemPaths) {
      if (fs.existsSync(systemPath)) {
        return systemPath
      }
    }

    // Fall back to ffmpeg command (relies on PATH)
    return 'ffmpeg'
  }

  getFFprobePath(): string {
    // On Windows, use the downloaded binary
    if (process.platform === 'win32') {
      return path.join(this.binDir, 'ffprobe.exe')
    }

    // On macOS/Linux, first check for system-installed ffprobe
    const systemPaths = [
      '/opt/homebrew/bin/ffprobe', // Homebrew on Apple Silicon
      '/usr/local/bin/ffprobe', // Homebrew on Intel Mac
      '/usr/bin/ffprobe', // System install
      '/opt/local/bin/ffprobe', // MacPorts
    ]

    for (const systemPath of systemPaths) {
      if (fs.existsSync(systemPath)) {
        return systemPath
      }
    }

    // Fall back to ffprobe command (relies on PATH)
    return 'ffprobe'
  }

  getModelsDir(): string {
    return this.pathResolver.getModelsDir()
  }

  getWhisperModelPath(modelName: string = 'small'): string {
    return path.join(this.getModelsDir(), `ggml-${modelName}.bin`)
  }

  async checkBinaryStatus(): Promise<BinaryStatus> {
    const ytdlpPath = this.getYtDlpPath()
    const denoPath = this.getDenoPath()
    const whisperPath = this.getWhisperPath()
    const ffmpegPath = this.getFFmpegPath()

    const ytdlpInfo = await this.checkBinary('yt-dlp', ytdlpPath)
    const denoInfo = await this.checkBinary('deno', denoPath)
    const whisperInfo = await this.checkBinary('whisper', whisperPath)
    const ffmpegInfo = await this.checkBinary('ffmpeg', ffmpegPath)

    return {
      ytdlp: ytdlpInfo,
      deno: denoInfo,
      whisper: whisperInfo,
      ffmpeg: ffmpegInfo,
      // whisper and ffmpeg are optional - only ytdlp and deno are required for basic functionality
      ready: ytdlpInfo.exists && ytdlpInfo.executable && denoInfo.exists && denoInfo.executable,
    }
  }

  async checkWhisperModelStatus(modelName: string = 'small'): Promise<WhisperModelStatus> {
    const modelPath = this.getWhisperModelPath(modelName)
    const exists = fs.existsSync(modelPath)
    let size: number | undefined

    if (exists) {
      try {
        const stats = fs.statSync(modelPath)
        size = stats.size
      } catch {
        // Ignore stat errors
      }
    }

    return {
      model: {
        name: modelName,
        path: modelPath,
        exists,
        size,
      },
      ready: exists,
    }
  }

  private async checkBinary(name: string, binaryPath: string): Promise<BinaryInfo> {
    const exists = fs.existsSync(binaryPath)
    let executable = false
    let version: string | undefined

    if (exists) {
      try {
        // Check if file has execute permission bits
        const stats = fs.statSync(binaryPath)
        // Check if any execute bit is set (user, group, or other)
        const hasExecuteBit = (stats.mode & 0o111) !== 0

        if (hasExecuteBit) {
          executable = true
          // Optionally try to get version (but don't fail if it doesn't work)
          try {
            version = await this.getBinaryVersion(name, binaryPath)
          } catch {
            // Version check failed, but file is still executable
            version = undefined
          }
        }
      } catch {
        executable = false
      }
    }

    return {
      name,
      version,
      path: binaryPath,
      exists,
      executable,
    }
  }

  private async getBinaryVersion(name: string, binaryPath: string): Promise<string | undefined> {
    return new Promise((resolve) => {
      const proc = spawn(binaryPath, ['--version'], { timeout: 5000 })
      let output = ''

      proc.stdout?.on('data', (data: Buffer) => {
        output += data.toString()
      })

      proc.on('close', () => {
        const firstLine = output.split('\n')[0]?.trim()
        resolve(firstLine || undefined)
      })

      proc.on('error', () => {
        resolve(undefined)
      })
    })
  }

  async ensureBinDir(): Promise<void> {
    if (!fs.existsSync(this.binDir)) {
      fs.mkdirSync(this.binDir, { recursive: true })
    }
  }

  async downloadBinary(name: 'yt-dlp' | 'deno' | 'whisper' | 'ffmpeg'): Promise<void> {
    await this.ensureBinDir()

    const platform = process.platform as PlatformKey
    const arch = process.arch as ArchKey

    const urls = BINARY_URLS[name]
    if (!urls || !urls[platform] || !urls[platform][arch]) {
      throw new Error(`No binary URL available for ${name} on ${platform}/${arch}`)
    }

    const url = urls[platform][arch]

    // Handle platforms without pre-built binaries (e.g., whisper on macOS/Linux)
    if (!url) {
      if (name === 'whisper') {
        const installInstructions =
          platform === 'darwin'
            ? 'Install whisper-cpp via Homebrew: brew install whisper-cpp'
            : 'Install whisper-cpp via your package manager or build from source: https://github.com/ggerganov/whisper.cpp'
        throw new Error(
          `No pre-built whisper binary available for ${platform}. ${installInstructions}`
        )
      }
      if (name === 'ffmpeg') {
        const installInstructions =
          platform === 'darwin'
            ? 'Install ffmpeg via Homebrew: brew install ffmpeg'
            : 'Install ffmpeg via your package manager: sudo apt install ffmpeg'
        throw new Error(
          `No pre-built ffmpeg binary available for ${platform}. ${installInstructions}`
        )
      }
      throw new Error(`No binary URL available for ${name} on ${platform}/${arch}`)
    }
    const isZip = url.endsWith('.zip')

    let targetPath: string
    if (name === 'yt-dlp') {
      targetPath = this.getYtDlpPath()
    } else if (name === 'deno') {
      targetPath = this.getDenoPath()
    } else if (name === 'ffmpeg') {
      targetPath = this.getFFmpegPath()
    } else {
      targetPath = this.getWhisperPath()
    }
    const tempPath = targetPath + '.tmp'

    try {
      // Download the file
      await this.downloadFile(name, url, isZip ? tempPath + '.zip' : tempPath)

      if (isZip) {
        // Extract zip file
        await this.extractZip(tempPath + '.zip', this.binDir, name)
        // Clean up zip
        fs.unlinkSync(tempPath + '.zip')

        // Handle FFmpeg's nested directory structure
        if (name === 'ffmpeg') {
          await this.moveFFmpegBinaries()
        }
      } else {
        // Move temp file to final location
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath)
        }
        fs.renameSync(tempPath, targetPath)
      }

      // Make executable on Unix
      if (process.platform !== 'win32') {
        fs.chmodSync(targetPath, 0o755)
      }

      this.emit('binary-ready', { name, path: targetPath })
    } catch (error) {
      // Clean up temp files on error
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
      if (fs.existsSync(tempPath + '.zip')) fs.unlinkSync(tempPath + '.zip')
      throw error
    }
  }

  private async downloadFile(name: string, url: string, destPath: string): Promise<void> {
    const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes timeout

    return new Promise((resolve, reject) => {
      let resolved = false

      const cleanup = (err?: Error) => {
        if (resolved) return
        resolved = true
        if (err) {
          fs.unlink(destPath, () => {})
          reject(err)
        } else {
          resolve()
        }
      }

      const followRedirect = (currentUrl: string, redirectCount = 0): void => {
        if (resolved) return

        if (redirectCount > 5) {
          cleanup(new Error('Too many redirects'))
          return
        }

        const protocol = currentUrl.startsWith('https') ? https : http
        const req = protocol.get(currentUrl, { timeout: DOWNLOAD_TIMEOUT_MS }, (response) => {
          // Handle redirects
          if (
            response.statusCode &&
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            followRedirect(response.headers.location, redirectCount + 1)
            return
          }

          if (response.statusCode !== 200) {
            cleanup(new Error(`Failed to download: HTTP ${response.statusCode}`))
            return
          }

          const totalBytes = parseInt(response.headers['content-length'] || '0', 10)
          let downloadedBytes = 0

          const file = createWriteStream(destPath)

          response.on('data', (chunk: Buffer) => {
            downloadedBytes += chunk.length
            const percent = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0
            this.emit('download-progress', {
              binary: name,
              percent,
              downloadedBytes,
              totalBytes,
            } as DownloadProgress)
          })

          // Handle errors on response stream (connection drops, etc.)
          response.on('error', (err) => {
            file.destroy()
            cleanup(err)
          })

          response.pipe(file)

          file.on('finish', () => {
            file.close(() => {
              // Verify download completed successfully
              if (totalBytes > 0 && downloadedBytes < totalBytes) {
                cleanup(new Error(`Download incomplete: got ${downloadedBytes} of ${totalBytes} bytes`))
                return
              }
              cleanup()
            })
          })

          file.on('error', (err) => {
            cleanup(err)
          })
        })

        req.on('error', (err) => {
          cleanup(err)
        })

        req.on('timeout', () => {
          req.destroy()
          cleanup(new Error(`Download timed out after ${DOWNLOAD_TIMEOUT_MS / 1000} seconds`))
        })
      }

      followRedirect(url)
    })
  }

  private async extractZip(zipPath: string, destDir: string, _binaryName: string): Promise<void> {
    // Use the yauzl package if available, otherwise fall back to unzip command
    // For simplicity, we'll use Node's built-in capabilities via child_process
    return new Promise((resolve, reject) => {
      if (process.platform === 'win32') {
        // Use PowerShell on Windows
        const proc = spawn('powershell', [
          '-Command',
          `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`,
        ])
        proc.on('close', (code: number) => {
          if (code === 0) resolve()
          else reject(new Error(`Unzip failed with code ${code}`))
        })
        proc.on('error', reject)
      } else {
        // Use unzip on Unix
        const proc = spawn('unzip', ['-o', zipPath, '-d', destDir])
        proc.on('close', (code: number) => {
          if (code === 0) resolve()
          else reject(new Error(`Unzip failed with code ${code}`))
        })
        proc.on('error', reject)
      }
    })
  }

  private async moveFFmpegBinaries(): Promise<void> {
    // FFmpeg ZIP from BtbN has structure: ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe
    // Find the extracted directory and move binaries to binDir
    const entries = fs.readdirSync(this.binDir)
    const ffmpegDir = entries.find(
      (e) => e.startsWith('ffmpeg-') && fs.statSync(path.join(this.binDir, e)).isDirectory()
    )

    if (ffmpegDir) {
      const binPath = path.join(this.binDir, ffmpegDir, 'bin')
      if (fs.existsSync(binPath)) {
        // Move ffmpeg.exe and ffprobe.exe to binDir
        const binaries = ['ffmpeg.exe', 'ffprobe.exe']
        for (const binary of binaries) {
          const src = path.join(binPath, binary)
          const dest = path.join(this.binDir, binary)
          if (fs.existsSync(src)) {
            if (fs.existsSync(dest)) {
              fs.unlinkSync(dest)
            }
            fs.renameSync(src, dest)
          }
        }
      }
      // Clean up the extracted directory
      fs.rmSync(path.join(this.binDir, ffmpegDir), { recursive: true, force: true })
    }
  }

  async downloadAllBinaries(onProgress?: (progress: DownloadProgress) => void): Promise<void> {
    // Prevent concurrent downloads - if one is in progress, wait for it
    if (this.downloadInProgress) {
      return this.downloadInProgress
    }

    const doDownload = async (): Promise<void> => {
      const status = await this.checkBinaryStatus()

      if (onProgress) {
        this.on('download-progress', onProgress)
      }

      try {
        if (!status.ytdlp.exists || !status.ytdlp.executable) {
          await this.downloadBinary('yt-dlp')
        }

        if (!status.deno.exists || !status.deno.executable) {
          await this.downloadBinary('deno')
        }
      } finally {
        if (onProgress) {
          this.removeListener('download-progress', onProgress)
        }
        this.downloadInProgress = null
      }
    }

    this.downloadInProgress = doDownload()
    return this.downloadInProgress
  }

  async checkForYtDlpUpdate(): Promise<{
    hasUpdate: boolean
    currentVersion?: string
    latestVersion?: string
  }> {
    const ytdlpPath = this.getYtDlpPath()
    const currentVersion = await this.getBinaryVersion('yt-dlp', ytdlpPath)

    if (!currentVersion) {
      return { hasUpdate: false }
    }

    try {
      const latestVersion = await this.getLatestYtDlpVersion()
      const hasUpdate = latestVersion !== undefined && currentVersion !== latestVersion
      return { hasUpdate, currentVersion, latestVersion }
    } catch {
      return { hasUpdate: false, currentVersion }
    }
  }

  private async getLatestYtDlpVersion(): Promise<string | undefined> {
    return new Promise((resolve) => {
      https
        .get(
          'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest',
          { headers: { 'User-Agent': 'YouTube-Downloader-App' } },
          (response) => {
            let data = ''
            response.on('data', (chunk) => (data += chunk))
            response.on('end', () => {
              try {
                const json = JSON.parse(data)
                resolve(json.tag_name || undefined)
              } catch {
                resolve(undefined)
              }
            })
          }
        )
        .on('error', () => resolve(undefined))
    })
  }

  async updateYtDlp(): Promise<void> {
    const ytdlpPath = this.getYtDlpPath()
    // Remove existing binary
    if (fs.existsSync(ytdlpPath)) {
      fs.unlinkSync(ytdlpPath)
    }
    // Download fresh
    await this.downloadBinary('yt-dlp')
  }

  async ensureModelsDir(): Promise<void> {
    const modelsDir = this.getModelsDir()
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true })
    }
  }

  async downloadWhisperModel(
    modelName: string = 'small',
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    await this.ensureModelsDir()

    const url = WHISPER_MODEL_URLS[modelName]
    if (!url) {
      throw new Error(
        `Unknown whisper model: ${modelName}. Available: ${Object.keys(WHISPER_MODEL_URLS).join(', ')}`
      )
    }

    const modelPath = this.getWhisperModelPath(modelName)
    const tempPath = modelPath + '.tmp'

    if (onProgress) {
      this.on('download-progress', onProgress)
    }

    try {
      await this.downloadFile(`model-${modelName}`, url, tempPath)

      // Move temp file to final location
      if (fs.existsSync(modelPath)) {
        fs.unlinkSync(modelPath)
      }
      fs.renameSync(tempPath, modelPath)

      this.emit('model-ready', { name: modelName, path: modelPath })
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
      throw error
    } finally {
      if (onProgress) {
        this.removeListener('download-progress', onProgress)
      }
    }
  }

  async ensureWhisperReady(
    modelName: string = 'small'
  ): Promise<{ binaryPath: string; modelPath: string }> {
    const binaryPath = this.getWhisperPath()

    // Check if whisper binary exists (either downloaded or system-installed)
    const binaryExists = fs.existsSync(binaryPath)

    if (!binaryExists) {
      // Try to download only on Windows (where pre-built binaries are available)
      if (process.platform === 'win32') {
        await this.downloadBinary('whisper')
      } else {
        // On macOS/Linux, provide helpful error message
        const installInstructions =
          process.platform === 'darwin'
            ? 'Install whisper-cpp via Homebrew: brew install whisper-cpp'
            : 'Install whisper-cpp via your package manager or build from source: https://github.com/ggerganov/whisper.cpp'
        throw new Error(`Whisper binary not found. ${installInstructions}`)
      }
    }

    // Check and download model if needed
    const modelStatus = await this.checkWhisperModelStatus(modelName)
    if (!modelStatus.ready) {
      await this.downloadWhisperModel(modelName)
    }

    return {
      binaryPath: this.getWhisperPath(),
      modelPath: this.getWhisperModelPath(modelName),
    }
  }
}

/**
 * Create a BinaryManager instance with a path resolver.
 *
 * @example
 * // In Electron main.ts
 * const binaryManager = createBinaryManager(getElectronPathResolver())
 *
 * // In CLI code
 * const binaryManager = createBinaryManager(getCliPathResolver())
 */
export function createBinaryManager(pathResolver: PathResolver): BinaryManager {
  return new BinaryManager(pathResolver)
}

export { BinaryManager }
