import fs from 'fs'
import path from 'path'
import { createBinaryManager } from '../../electron/services/binary-manager.service.js'
import { getVideoPreview, Downloader } from '../../electron/services/ytdlp.service.js'
import { Transcriber } from '../../electron/services/transcription.service.js'
import { getCliPathResolver } from '../utils/paths.js'
import { validateOutputPath } from '../utils/validation.js'
import { ProgressReporter, type ProgressOptions } from '../output/progress.js'
import { CliError, ExitCode } from '../utils/errors.js'
import { VALID_WHISPER_MODELS } from '../utils/constants.js'
import type { DownloadProgress } from '../../shared/types.js'
import type { TranscriptionProgress } from '../../electron/services/transcription.service.js'

export interface TranscribeOptions extends ProgressOptions {
  url: string
  output?: string
  format: 'txt' | 'srt' | 'vtt'
  audioFormat: 'mp3' | 'm4a' | 'best'
  model: string
  language: string
  keepAudio: boolean
  audioOutput?: string
  stdout: boolean
}

/**
 * Main transcription workflow:
 * 1. Initialize binary manager with CLI paths
 * 2. Download audio from URL
 * 3. Transcribe audio to text
 * 4. Output transcript
 */
export async function transcribeCommand(options: TranscribeOptions): Promise<void> {
  const reporter = new ProgressReporter(options)
  const pathResolver = getCliPathResolver()

  // Validate output paths before doing any work
  if (options.output) {
    try {
      validateOutputPath(options.output, 'output file')
    } catch (error) {
      throw new CliError(
        error instanceof Error ? error.message : 'Invalid output path',
        ExitCode.InvalidArguments
      )
    }
  }

  if (options.audioOutput) {
    try {
      validateOutputPath(options.audioOutput, 'audio output directory')
    } catch (error) {
      throw new CliError(
        error instanceof Error ? error.message : 'Invalid audio output path',
        ExitCode.InvalidArguments
      )
    }
  }

  // Create binary manager with CLI paths
  const binaryManager = createBinaryManager(pathResolver)

  // Ensure binaries are ready
  reporter.phase('Checking binaries...')
  const status = await binaryManager.checkBinaryStatus()

  if (!status.ytdlp.exists || !status.ytdlp.executable) {
    throw new CliError(
      'yt-dlp not found. Run: yt-transcribe --setup',
      ExitCode.BinaryNotFound
    )
  }

  if (!status.deno.exists || !status.deno.executable) {
    throw new CliError(
      'deno not found. Run: yt-transcribe --setup',
      ExitCode.BinaryNotFound
    )
  }

  // Validate model name against allowlist
  if (!VALID_WHISPER_MODELS.includes(options.model as any)) {
    throw new CliError(
      `Invalid model: ${options.model}. Valid models: ${VALID_WHISPER_MODELS.join(', ')}`,
      ExitCode.InvalidArguments
    )
  }

  // Check whisper and model
  try {
    reporter.debug(`Ensuring whisper model '${options.model}' is ready...`)
    await binaryManager.ensureWhisperReady(options.model)
  } catch (error) {
    if (error instanceof Error) {
      throw new CliError(error.message, ExitCode.BinaryNotFound, error)
    }
    throw error
  }

  // Get video info for title
  reporter.phase('Fetching video info...')
  let videoTitle = 'video'
  try {
    const preview = await getVideoPreview(options.url)
    videoTitle = preview.title
    reporter.debug(`Video: ${videoTitle}`)
  } catch {
    reporter.warn('Could not fetch video preview, continuing with download...')
  }

  // Create temp directory for intermediate files
  const baseTempDir = pathResolver.getTempDir()
  if (!fs.existsSync(baseTempDir)) {
    fs.mkdirSync(baseTempDir, { recursive: true })
  }
  const tempDir = fs.mkdtempSync(path.join(baseTempDir, 'transcribe-'))
  reporter.debug(`Temp directory: ${tempDir}`)

  let audioFile: string | null = null
  let transcriptFile: string | null = null

  try {
    // Download audio
    reporter.phase('Downloading audio...')
    const downloader = new Downloader(binaryManager)

    downloader.on('progress', (progress: DownloadProgress) => {
      reporter.downloadProgress(progress)
    })

    audioFile = await downloader.download({
      url: options.url,
      outputPath: tempDir,
      audioOnly: true,
      audioFormat: options.audioFormat,
    })

    reporter.complete(`Downloaded: ${path.basename(audioFile)}`)
    reporter.debug(`Audio file: ${audioFile}`)

    // Transcribe
    reporter.phase('Transcribing...')
    const transcriber = new Transcriber(binaryManager)

    transcriber.on('progress', (progress: TranscriptionProgress) => {
      reporter.transcriptionProgress(progress)
    })

    const result = await transcriber.transcribe({
      audioFile,
      outputPath: tempDir,
      outputFormat: options.format,
      language: options.language === 'auto' ? undefined : options.language,
      modelName: options.model,
    })

    transcriptFile = result.outputFile
    reporter.complete('Transcription complete')
    reporter.debug(`Transcript file: ${transcriptFile}`)

    // Read transcript
    const transcript = fs.readFileSync(transcriptFile, 'utf-8')

    // Output transcript
    if (options.output) {
      // Ensure output directory exists
      const outputDir = path.dirname(options.output)
      if (outputDir && !fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }
      fs.writeFileSync(options.output, transcript)
      reporter.complete(`Saved to: ${options.output}`)
    }

    // Output to stdout (always if no output file, or if --stdout flag)
    if (!options.output || options.stdout) {
      // Ensure we're on a new line before outputting transcript
      if (!options.quiet && !options.json) {
        process.stderr.write('\n')
      }
      process.stdout.write(transcript)
      // Ensure transcript ends with newline
      if (!transcript.endsWith('\n')) {
        process.stdout.write('\n')
      }
    }

    // Keep audio if requested
    if (options.keepAudio && audioFile) {
      const audioOutputDir = options.audioOutput || process.cwd()
      const destAudioPath = path.join(audioOutputDir, path.basename(audioFile))

      if (!fs.existsSync(audioOutputDir)) {
        fs.mkdirSync(audioOutputDir, { recursive: true })
      }

      fs.copyFileSync(audioFile, destAudioPath)
      reporter.info(`Audio saved to: ${destAudioPath}`)
    }
  } finally {
    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  }
}
