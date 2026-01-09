import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import { EventEmitter } from 'events'
import { BinaryManager } from './binary-manager.service'
import type {
  VideoFormat,
  VideoInfo,
  PlaylistEntry,
  PlaylistInfo,
  DownloadOptions,
  DownloadProgress,
  PartialVideoInfo,
} from '../../shared/types'

// Re-export types for consumers
export type {
  VideoFormat,
  VideoInfo,
  PlaylistEntry,
  PlaylistInfo,
  DownloadOptions,
  DownloadProgress,
  PartialVideoInfo,
}

function extractVideoId(url: string): string | null {
  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([\w-]{11})/)
  if (shortMatch) return shortMatch[1]

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([\w-]{11})/)
  if (watchMatch) return watchMatch[1]

  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([\w-]{11})/)
  if (embedMatch) return embedMatch[1]

  // youtube.com/shorts/VIDEO_ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([\w-]{11})/)
  if (shortsMatch) return shortsMatch[1]

  // youtube.com/v/VIDEO_ID
  const vMatch = url.match(/youtube\.com\/v\/([\w-]{11})/)
  if (vMatch) return vMatch[1]

  return null
}

export async function getVideoPreview(url: string): Promise<PartialVideoInfo> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw new Error('Could not extract video ID from URL')
  }

  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`

  const response = await fetch(oembedUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch video preview: ${response.status}`)
  }

  const data = (await response.json()) as { title: string; author_name: string }

  return {
    id: videoId,
    title: data.title,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    uploader: data.author_name,
    url,
  }
}

export async function getVideoInfo(url: string, binaryManager: BinaryManager): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const ytdlpPath = binaryManager.getYtDlpPath()
    const denoPath = binaryManager.getDenoPath()

    const args = ['--dump-json', '--no-playlist', url]

    const env = {
      ...process.env,
      PATH: `${path.dirname(denoPath)}:${process.env.PATH}`,
    }

    const proc = spawn(ytdlpPath, args, { env })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `yt-dlp exited with code ${code}`))
        return
      }

      try {
        const json = JSON.parse(stdout)

        const formats: VideoFormat[] = (json.formats || [])
          .filter((f: any) => f.vcodec !== 'none' || f.acodec !== 'none')
          .map((f: any) => ({
            formatId: f.format_id,
            ext: f.ext,
            resolution: f.resolution || `${f.width || 0}x${f.height || 0}`,
            filesize: f.filesize || f.filesize_approx,
            vcodec: f.vcodec,
            acodec: f.acodec,
            fps: f.fps,
            tbr: f.tbr,
          }))

        const videoInfo: VideoInfo = {
          id: json.id,
          title: json.title,
          thumbnail: json.thumbnail,
          duration: json.duration,
          uploader: json.uploader || json.channel,
          uploadDate: json.upload_date,
          viewCount: json.view_count,
          description: json.description,
          formats,
          url,
        }

        resolve(videoInfo)
      } catch (parseError) {
        reject(new Error(`Failed to parse video info: ${parseError}`))
      }
    })

    proc.on('error', (error) => {
      reject(new Error(`Failed to start yt-dlp: ${error.message}`))
    })
  })
}

export async function getPlaylistInfo(
  url: string,
  binaryManager: BinaryManager
): Promise<PlaylistInfo> {
  return new Promise((resolve, reject) => {
    const ytdlpPath = binaryManager.getYtDlpPath()
    const denoPath = binaryManager.getDenoPath()

    const args = ['--dump-single-json', '--flat-playlist', url]

    const env = {
      ...process.env,
      PATH: `${path.dirname(denoPath)}:${process.env.PATH}`,
    }

    const proc = spawn(ytdlpPath, args, { env })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `yt-dlp exited with code ${code}`))
        return
      }

      try {
        const json = JSON.parse(stdout)

        // Map entries to our PlaylistEntry format
        const entries: PlaylistEntry[] = (json.entries || []).map((entry: any, idx: number) => ({
          id: entry.id,
          title: entry.title || `Video ${idx + 1}`,
          duration: entry.duration || 0,
          index: idx + 1,
          url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
          thumbnail: entry.thumbnail || entry.thumbnails?.[0]?.url,
        }))

        const playlistInfo: PlaylistInfo = {
          id: json.id,
          title: json.title,
          thumbnail: json.thumbnail || json.thumbnails?.[0]?.url || entries[0]?.thumbnail || '',
          uploader: json.uploader || json.channel || json.uploader_id || '',
          entryCount: json.playlist_count || entries.length,
          entries,
          url,
        }

        resolve(playlistInfo)
      } catch (parseError) {
        reject(new Error(`Failed to parse playlist info: ${parseError}`))
      }
    })

    proc.on('error', (error) => {
      reject(new Error(`Failed to start yt-dlp: ${error.message}`))
    })
  })
}

export class Downloader extends EventEmitter {
  private process: ChildProcess | null = null
  private isPaused = false
  private binaryManager: BinaryManager

  constructor(binaryManager: BinaryManager) {
    super()
    this.binaryManager = binaryManager
  }

  async download(options: DownloadOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const ytdlpPath = this.binaryManager.getYtDlpPath()
      const denoPath = this.binaryManager.getDenoPath()

      // Ensure output directory exists (for playlist subfolders)
      if (!fs.existsSync(options.outputPath)) {
        fs.mkdirSync(options.outputPath, { recursive: true })
      }

      const args = [
        '-o',
        path.join(options.outputPath, '%(title)s.%(ext)s'),
        '--newline',
        '--progress',
        '--progress-template',
        '%(progress._percent_str)s|%(progress._downloaded_bytes_str)s|%(progress._total_bytes_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
      ]

      if (options.audioOnly) {
        // Handle audio format based on setting
        const audioFormat = options.audioFormat || 'best'

        if (audioFormat === 'best') {
          // Download best audio as-is, no conversion
          args.push('-f', 'bestaudio')
        } else if (audioFormat === 'mp3') {
          // Download best audio and convert to MP3
          args.push('-f', 'bestaudio')
          args.push('-x', '--audio-format', 'mp3')
        } else if (audioFormat === 'm4a') {
          // Prefer native m4a to avoid conversion, fall back to best audio
          args.push('-f', 'bestaudio[ext=m4a]/bestaudio')
        }
      } else if (options.formatId) {
        args.push('-f', options.formatId)
      }

      args.push(options.url)

      const env = {
        ...process.env,
        PATH: `${path.dirname(denoPath)}:${process.env.PATH}`,
      }

      this.process = spawn(ytdlpPath, args, { env })

      let outputFile = ''

      this.process.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n')

        for (const line of lines) {
          // Check for progress line
          if (line.includes('|')) {
            const parts = line.trim().split('|')
            if (parts.length >= 5) {
              const progress: DownloadProgress = {
                percent: parseFloat(parts[0].replace('%', '')) || 0,
                downloadedBytes: this.parseBytes(parts[1]),
                totalBytes: this.parseBytes(parts[2]),
                speed: parts[3] || 'N/A',
                eta: parts[4] || 'N/A',
              }
              this.emit('progress', progress)
            }
          }

          // Check for destination file
          if (line.includes('[download] Destination:')) {
            outputFile = line.replace('[download] Destination:', '').trim()
          }

          // Check for already downloaded
          if (line.includes('has already been downloaded')) {
            const match = line.match(/\[download\] (.+) has already been downloaded/)
            if (match) {
              outputFile = match[1]
            }
          }
        }
      })

      this.process.stderr?.on('data', (data) => {
        const message = data.toString()
        // yt-dlp often outputs non-critical info to stderr
        if (message.includes('ERROR')) {
          this.emit('error', message)
        }
      })

      this.process.on('close', (code) => {
        this.process = null

        if (code === 0) {
          this.emit('complete', outputFile)
          resolve(outputFile)
        } else {
          const error = new Error(`Download failed with code ${code}`)
          this.emit('error', error.message)
          reject(error)
        }
      })

      this.process.on('error', (error) => {
        this.process = null
        this.emit('error', error.message)
        reject(error)
      })
    })
  }

  pause(): void {
    if (this.process && !this.isPaused) {
      this.process.kill('SIGSTOP')
      this.isPaused = true
      this.emit('paused')
    }
  }

  resume(): void {
    if (this.process && this.isPaused) {
      this.process.kill('SIGCONT')
      this.isPaused = false
      this.emit('resumed')
    }
  }

  cancel(): void {
    if (this.process) {
      const proc = this.process
      const pid = proc.pid

      // First try graceful termination with SIGTERM
      proc.kill('SIGTERM')

      // Set up SIGKILL escalation after 5 seconds if process doesn't terminate
      const killTimeout = setTimeout(() => {
        try {
          // Check if process is still running and force kill
          if (pid) {
            process.kill(pid, 0) // Throws if process doesn't exist
            console.warn(`[Download] Process ${pid} did not respond to SIGTERM, sending SIGKILL`)
            process.kill(pid, 'SIGKILL')
          }
        } catch {
          // Process already terminated, ignore
        }
      }, 5000)

      // Clean up timeout if process exits normally
      proc.once('exit', () => {
        clearTimeout(killTimeout)
      })

      this.process = null
      this.isPaused = false
      this.emit('cancelled')
    }
  }

  private parseBytes(str: string): number {
    if (!str) return 0
    const cleaned = str.trim().toUpperCase()
    const match = cleaned.match(/^([\d.]+)\s*([KMGT]?I?B)?$/)
    if (!match) return 0

    const num = parseFloat(match[1])
    const unit = match[2] || 'B'

    const multipliers: Record<string, number> = {
      B: 1,
      KB: 1024,
      KIB: 1024,
      MB: 1024 * 1024,
      MIB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
      GIB: 1024 * 1024 * 1024,
      TB: 1024 * 1024 * 1024 * 1024,
      TIB: 1024 * 1024 * 1024 * 1024,
    }

    return num * (multipliers[unit] || 1)
  }
}

// Factory function for creating Downloader instances
export function createDownloader(binaryManager: BinaryManager): Downloader {
  return new Downloader(binaryManager)
}
