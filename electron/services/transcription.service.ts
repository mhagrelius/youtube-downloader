import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { EventEmitter } from 'events'
import { BinaryManager } from './binary-manager.service'

// Debug logger - opt-in by creating ~/.youtube-downloader-debug
const DEBUG_FLAG = path.join(os.homedir(), '.youtube-downloader-debug')
const LOG_FILE = path.join(os.homedir(), 'youtube-downloader-transcription.log')
function log(...args: unknown[]): void {
  if (!fs.existsSync(DEBUG_FLAG)) return
  const timestamp = new Date().toISOString()
  const message = `[${timestamp}] ${args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}\n`
  fs.appendFileSync(LOG_FILE, message)
}

export interface TranscriptionOptions {
  audioFile: string
  outputPath: string
  outputFormat: 'txt' | 'srt' | 'vtt'
  language?: string // 'auto' for auto-detect, or ISO code like 'en', 'es', 'fr'
  modelName?: string // 'tiny' | 'base' | 'small' | 'medium'
}

export interface TranscriptionProgress {
  percent: number
  currentTime?: string
  totalTime?: string
  phase: 'loading' | 'transcribing' | 'saving'
}

export interface TranscriptionResult {
  outputFile: string
  language?: string
  duration?: number
}

export class Transcriber extends EventEmitter {
  private process: ChildProcess | null = null
  private totalDuration: number = 0
  private tempWavFile: string | null = null
  private binaryManager: BinaryManager

  constructor(binaryManager: BinaryManager) {
    super()
    this.binaryManager = binaryManager
  }

  async transcribe(options: TranscriptionOptions): Promise<TranscriptionResult> {
    log('Starting transcription for:', options.audioFile)

    // Validate audio file exists
    if (!fs.existsSync(options.audioFile)) {
      throw new Error(`Audio file not found: ${options.audioFile}`)
    }

    // Get audio duration for progress calculation (approximate from file size if needed)
    this.totalDuration = await this.getAudioDuration(options.audioFile)
    log('Audio duration:', this.totalDuration, 'seconds')

    // Convert to wav if needed (whisper-cli only supports flac, mp3, ogg, wav)
    const ext = path.extname(options.audioFile).toLowerCase()
    const supportedFormats = ['.flac', '.mp3', '.ogg', '.wav']
    let audioFileToUse = options.audioFile

    log('Audio extension:', ext, 'Supported:', supportedFormats.includes(ext))

    if (!supportedFormats.includes(ext)) {
      log('Converting audio to wav...')
      this.emit('progress', { percent: 0, phase: 'loading' } as TranscriptionProgress)
      audioFileToUse = await this.convertToWav(options.audioFile)
      this.tempWavFile = audioFileToUse
      log('Conversion complete:', audioFileToUse)
    }

    return new Promise((resolve, reject) => {
      const whisperPath = this.binaryManager.getWhisperPath()
      const modelPath = this.binaryManager.getWhisperModelPath(options.modelName)

      log('Whisper path:', whisperPath)
      log('Model path:', modelPath)

      // Verify whisper binary exists
      if (!fs.existsSync(whisperPath)) {
        log('ERROR: Whisper binary not found')
        reject(new Error('Whisper binary not found. Please download it first.'))
        return
      }

      // Verify model exists
      if (!fs.existsSync(modelPath)) {
        log('ERROR: Model not found')
        reject(new Error(`Whisper model not found: ${modelPath}. Please download it first.`))
        return
      }

      log('Binary and model verified')

      // Ensure output directory exists
      if (!fs.existsSync(options.outputPath)) {
        fs.mkdirSync(options.outputPath, { recursive: true })
      }

      // Build output filename based on audio file name
      const audioBasename = path.basename(options.audioFile, path.extname(options.audioFile))
      const outputExt = options.outputFormat === 'txt' ? 'txt' : options.outputFormat
      const outputFile = path.join(options.outputPath, `${audioBasename}.${outputExt}`)

      // Build whisper-cli arguments
      const args = ['-m', modelPath, '-f', audioFileToUse, '--print-progress']

      // Add output format flag
      if (options.outputFormat === 'srt') {
        args.push('--output-srt')
      } else if (options.outputFormat === 'vtt') {
        args.push('--output-vtt')
      } else {
        args.push('--output-txt')
      }

      // Add output file path
      args.push('-of', path.join(options.outputPath, audioBasename))

      // Add language option
      if (options.language && options.language !== 'auto') {
        args.push('-l', options.language)
      }

      this.emit('progress', {
        percent: 0,
        phase: 'loading',
      } as TranscriptionProgress)

      log('Spawning whisper with args:', args)
      this.process = spawn(whisperPath, args)
      log('Process spawned, PID:', this.process.pid)

      let stderr = ''
      let detectedLanguage: string | undefined

      this.process.stdout?.on('data', (data) => {
        const output = data.toString()
        log('stdout:', output)
        this.parseProgress(output)
      })

      this.process.stderr?.on('data', (data) => {
        const output = data.toString()
        log('stderr:', output)
        stderr += output

        // Parse progress from stderr (whisper outputs progress there)
        this.parseProgress(output)

        // Try to detect language from output
        const langMatch = output.match(/auto-detected language: (\w+)/i)
        if (langMatch) {
          detectedLanguage = langMatch[1]
        }
      })

      this.process.on('close', (code) => {
        log('Process closed with code:', code)
        this.process = null

        if (code === 0) {
          // Verify output file was created
          if (fs.existsSync(outputFile)) {
            this.emit('progress', {
              percent: 100,
              phase: 'saving',
            } as TranscriptionProgress)

            const result: TranscriptionResult = {
              outputFile,
              language: detectedLanguage,
              duration: this.totalDuration,
            }

            this.emit('complete', result)
            this.cleanupTempFile()
            resolve(result)
          } else {
            // Sometimes whisper creates files with slightly different names
            // Try to find the output file
            const possibleFiles = fs
              .readdirSync(options.outputPath)
              .filter((f) => f.startsWith(audioBasename) && f.endsWith(`.${outputExt}`))

            if (possibleFiles.length > 0) {
              const actualOutputFile = path.join(options.outputPath, possibleFiles[0])
              const result: TranscriptionResult = {
                outputFile: actualOutputFile,
                language: detectedLanguage,
                duration: this.totalDuration,
              }
              this.emit('complete', result)
              this.cleanupTempFile()
              resolve(result)
            } else {
              const error = new Error('Transcription completed but output file not found')
              this.emit('error', error.message)
              this.cleanupTempFile()
              reject(error)
            }
          }
        } else {
          const error = new Error(stderr || `Transcription failed with code ${code}`)
          this.emit('error', error.message)
          this.cleanupTempFile()
          reject(error)
        }
      })

      this.process.on('error', (error) => {
        log('Process error:', error.message)
        this.process = null
        this.emit('error', error.message)
        this.cleanupTempFile()
        reject(error)
      })
    })
  }

  cancel(): void {
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
      this.emit('cancelled')
    }
    this.cleanupTempFile()
  }

  private parseProgress(output: string): void {
    // whisper-cli outputs progress like: "whisper_print_progress_callback: progress =   5%"
    // Allow variable whitespace before the % sign
    const progressMatch = output.match(/progress\s*=\s*(\d+)\s*%/i)
    if (progressMatch) {
      const percent = parseInt(progressMatch[1], 10)
      log('Progress parsed:', percent, '%')
      this.emit('progress', {
        percent,
        phase: 'transcribing',
      } as TranscriptionProgress)
      return
    }

    // Also try to parse timestamp-based progress
    // Format: [00:00:00.000 --> 00:00:05.000]
    const timestampMatch = output.match(/\[(\d{2}):(\d{2}):(\d{2})\.\d+\s*-->/g)
    if (timestampMatch && this.totalDuration > 0) {
      const lastTimestamp = timestampMatch[timestampMatch.length - 1]
      const timeMatch = lastTimestamp.match(/\[(\d{2}):(\d{2}):(\d{2})/)
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10)
        const minutes = parseInt(timeMatch[2], 10)
        const seconds = parseInt(timeMatch[3], 10)
        const currentSeconds = hours * 3600 + minutes * 60 + seconds
        const percent = Math.min(99, Math.round((currentSeconds / this.totalDuration) * 100))

        this.emit('progress', {
          percent,
          currentTime: `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`,
          totalTime: this.formatDuration(this.totalDuration),
          phase: 'transcribing',
        } as TranscriptionProgress)
      }
    }
  }

  private async getAudioDuration(audioFile: string): Promise<number> {
    // Try to get duration using ffprobe if available
    // Otherwise estimate based on file size (rough approximation)
    return new Promise((resolve) => {
      const ffprobePath = this.binaryManager.getFFprobePath()
      const ffprobe = spawn(ffprobePath, [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        audioFile,
      ])

      let stdout = ''

      ffprobe.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      ffprobe.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          const duration = parseFloat(stdout.trim())
          if (!isNaN(duration)) {
            resolve(duration)
            return
          }
        }

        // Fallback: estimate duration from file size
        // Approximate: ~128kbps audio = 16KB/s
        try {
          const stats = fs.statSync(audioFile)
          const estimatedDuration = stats.size / (16 * 1024) // Very rough estimate
          resolve(estimatedDuration)
        } catch {
          resolve(300) // Default to 5 minutes if we can't determine
        }
      })

      ffprobe.on('error', () => {
        // ffprobe not available, use file size estimate
        try {
          const stats = fs.statSync(audioFile)
          const estimatedDuration = stats.size / (16 * 1024)
          resolve(estimatedDuration)
        } catch {
          resolve(300)
        }
      })
    })
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  private async convertToWav(audioFile: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create temp wav file path
      const wavFile = audioFile.replace(/\.[^.]+$/, '.wav')
      const ffmpegPath = this.binaryManager.getFFmpegPath()
      log('Converting', audioFile, 'to', wavFile, 'using', ffmpegPath)

      const ffmpeg = spawn(ffmpegPath, [
        '-i',
        audioFile,
        '-ar',
        '16000', // 16kHz sample rate (optimal for whisper)
        '-ac',
        '1', // Mono audio
        '-y', // Overwrite output file
        wavFile,
      ])

      log('ffmpeg spawned, PID:', ffmpeg.pid)

      let stderr = ''

      ffmpeg.stderr?.on('data', (data) => {
        const output = data.toString()
        stderr += output
        // Log progress (ffmpeg outputs to stderr)
        if (output.includes('time=')) {
          const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2})/)
          if (timeMatch) {
            log('ffmpeg progress:', timeMatch[1])
          }
        }
      })

      ffmpeg.on('close', (code) => {
        log('ffmpeg closed with code:', code)
        if (code === 0 && fs.existsSync(wavFile)) {
          log('Conversion successful:', wavFile)
          resolve(wavFile)
        } else {
          log('Conversion failed:', stderr.slice(-500)) // Last 500 chars
          reject(new Error(`Failed to convert audio to wav: ${stderr}`))
        }
      })

      ffmpeg.on('error', (error) => {
        log('ffmpeg error:', error.message)
        reject(
          new Error(
            `ffmpeg not found. Please install ffmpeg to transcribe this audio format: ${error.message}`
          )
        )
      })
    })
  }

  private cleanupTempFile(): void {
    if (this.tempWavFile && fs.existsSync(this.tempWavFile)) {
      try {
        fs.unlinkSync(this.tempWavFile)
      } catch {
        // Ignore cleanup errors
      }
      this.tempWavFile = null
    }
  }
}

export function createTranscriber(binaryManager: BinaryManager): Transcriber {
  return new Transcriber(binaryManager)
}
