import type { DownloadProgress, TranscriptionProgress } from '../../shared/types.js'

export interface ProgressOptions {
  quiet: boolean
  json: boolean
  noColor: boolean
  verbose: boolean
}

/**
 * Progress reporter for CLI output.
 * Writes progress to stderr, keeps stdout clean for transcript output.
 */
export class ProgressReporter {
  private isQuiet: boolean
  private isJson: boolean
  private useColor: boolean
  private isVerbose: boolean
  private lastLineLength: number = 0

  constructor(options: ProgressOptions) {
    this.isQuiet = options.quiet
    this.isJson = options.json
    this.useColor = !options.noColor && process.stderr.isTTY === true
    this.isVerbose = options.verbose
  }

  /**
   * Report a phase change (e.g., "Downloading...", "Transcribing...")
   */
  phase(message: string): void {
    if (this.isQuiet) return

    if (this.isJson) {
      this.writeJson({ type: 'phase', message })
    } else {
      this.clearLine()
      this.writeStderr(`${this.color('cyan', '>')} ${message}\n`)
    }
  }

  /**
   * Report download progress.
   */
  downloadProgress(progress: DownloadProgress): void {
    if (this.isQuiet) return

    if (this.isJson) {
      this.writeJson({ type: 'download_progress', ...progress })
    } else {
      const bar = this.progressBar(progress.percent)
      const speedStr = progress.speed || '...'
      const line = `  ${bar} ${progress.percent.toFixed(1).padStart(5)}% | ${speedStr}`
      this.writeInPlace(line)
    }
  }

  /**
   * Report transcription progress.
   */
  transcriptionProgress(progress: TranscriptionProgress): void {
    if (this.isQuiet) return

    if (this.isJson) {
      this.writeJson({ type: 'transcription_progress', ...progress })
    } else {
      const bar = this.progressBar(progress.percent)
      const phaseStr = progress.phase || 'processing'
      const line = `  ${bar} ${progress.percent.toFixed(1).padStart(5)}% | ${phaseStr}`
      this.writeInPlace(line)
    }
  }

  /**
   * Report binary/model download progress.
   */
  binaryProgress(name: string, percent: number): void {
    if (this.isQuiet) return

    if (this.isJson) {
      this.writeJson({ type: 'binary_progress', name, percent })
    } else {
      const bar = this.progressBar(percent)
      const line = `  ${bar} ${percent.toFixed(1).padStart(5)}% | ${name}`
      this.writeInPlace(line)
    }
  }

  /**
   * Report completion.
   */
  complete(message: string): void {
    if (this.isQuiet) return

    if (this.isJson) {
      this.writeJson({ type: 'complete', message })
    } else {
      this.clearLine()
      this.writeStderr(`${this.color('green', '✓')} ${message}\n`)
    }
  }

  /**
   * Report an info message.
   */
  info(message: string): void {
    if (this.isQuiet) return

    if (this.isJson) {
      this.writeJson({ type: 'info', message })
    } else {
      this.writeStderr(`  ${message}\n`)
    }
  }

  /**
   * Report a warning.
   */
  warn(message: string): void {
    if (this.isJson) {
      this.writeJson({ type: 'warning', message })
    } else {
      this.writeStderr(`${this.color('yellow', '!')} ${message}\n`)
    }
  }

  /**
   * Report a debug message (only in verbose mode).
   */
  debug(message: string): void {
    if (!this.isVerbose) return

    if (this.isJson) {
      this.writeJson({ type: 'debug', message })
    } else {
      this.writeStderr(`${this.color('gray', '[debug]')} ${message}\n`)
    }
  }

  /**
   * Clear the current line and move cursor to beginning.
   */
  private clearLine(): void {
    if (process.stderr.isTTY && this.lastLineLength > 0) {
      process.stderr.write('\r' + ' '.repeat(this.lastLineLength) + '\r')
      this.lastLineLength = 0
    }
  }

  /**
   * Write a line in place (overwriting previous).
   */
  private writeInPlace(line: string): void {
    if (process.stderr.isTTY) {
      this.clearLine()
      process.stderr.write(line)
      this.lastLineLength = line.length
    }
  }

  private writeStderr(message: string): void {
    process.stderr.write(message)
  }

  private writeJson(data: object): void {
    process.stderr.write(JSON.stringify(data) + '\n')
  }

  private progressBar(percent: number, width = 20): string {
    const filled = Math.round((width * percent) / 100)
    const empty = width - filled
    return `[${this.color('green', '='.repeat(filled))}${' '.repeat(empty)}]`
  }

  private color(name: string, text: string): string {
    if (!this.useColor) return text
    const codes: Record<string, string> = {
      cyan: '\x1b[36m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      red: '\x1b[31m',
      gray: '\x1b[90m',
      reset: '\x1b[0m',
    }
    return `${codes[name] || ''}${text}${codes.reset}`
  }
}
