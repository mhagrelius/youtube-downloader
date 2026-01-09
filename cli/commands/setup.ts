import fs from 'fs'
import {
  createBinaryManager,
  type BinaryStatus,
  type DownloadProgress,
} from '../../electron/services/binary-manager.service.js'
import { getCliPathResolver } from '../utils/paths.js'
import { ProgressReporter, type ProgressOptions } from '../output/progress.js'
import { CliError, ExitCode } from '../utils/errors.js'
import { VALID_WHISPER_MODELS } from '../utils/constants.js'

export interface SetupOptions extends ProgressOptions {
  downloadModel?: string
}

/**
 * Get the CLI binary manager instance.
 */
export function getCliBinaryManager() {
  return createBinaryManager(getCliPathResolver())
}

/**
 * Check and display binary status.
 */
export async function checkCommand(options: ProgressOptions): Promise<void> {
  const reporter = new ProgressReporter(options)
  const binaryManager = getCliBinaryManager()

  reporter.phase('Checking binary status...')

  const status = await binaryManager.checkBinaryStatus()

  if (options.json) {
    // JSON output mode - write to stdout for machine parsing
    console.log(JSON.stringify(status, null, 2))
    return
  }

  // Human-readable output
  console.log('\nBinary Status:')
  console.log('─'.repeat(50))

  printBinaryInfo('yt-dlp', status.ytdlp)
  printBinaryInfo('deno', status.deno)
  printBinaryInfo('whisper', status.whisper)
  printBinaryInfo('ffmpeg', status.ffmpeg)

  console.log('─'.repeat(50))
  console.log(`Overall: ${status.ready ? '✓ Ready' : '✗ Not ready'}`)

  // Check models
  const defaultModel = 'small'
  const modelStatus = await binaryManager.checkWhisperModelStatus(defaultModel)

  console.log(`\nWhisper Model (${defaultModel}):`)
  console.log(
    `  ${modelStatus.ready ? '✓' : '✗'} ${modelStatus.model.path} ${modelStatus.model.size ? `(${formatBytes(modelStatus.model.size)})` : ''}`
  )

  if (!status.ready || !modelStatus.ready) {
    console.log('\nRun: yt-transcribe --setup')
  }
}

function printBinaryInfo(name: string, info: BinaryStatus['ytdlp']): void {
  const status = info.exists && info.executable ? '✓' : '✗'
  const version = info.version ? ` (${info.version})` : ''
  console.log(`  ${status} ${name}${version}`)
  if (info.exists) {
    console.log(`    ${info.path}`)
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * Download and setup required binaries.
 */
export async function setupCommand(options: SetupOptions): Promise<void> {
  const reporter = new ProgressReporter(options)
  const binaryManager = getCliBinaryManager()
  const pathResolver = getCliPathResolver()

  // Ensure directories exist
  const binDir = pathResolver.getBinDir()
  const modelsDir = pathResolver.getModelsDir()

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true })
  }
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true })
  }

  reporter.phase('Checking current status...')
  const status = await binaryManager.checkBinaryStatus()

  // Setup progress handler
  const onProgress = (progress: DownloadProgress) => {
    reporter.binaryProgress(progress.binary, progress.percent)
  }

  binaryManager.on('download-progress', onProgress)

  try {
    // Download yt-dlp if needed
    if (!status.ytdlp.exists || !status.ytdlp.executable) {
      reporter.phase('Downloading yt-dlp...')
      await binaryManager.downloadBinary('yt-dlp')
      reporter.complete('yt-dlp installed')
    } else {
      reporter.info(`yt-dlp already installed: ${status.ytdlp.version || 'unknown version'}`)
    }

    // Download deno if needed
    if (!status.deno.exists || !status.deno.executable) {
      reporter.phase('Downloading deno...')
      await binaryManager.downloadBinary('deno')
      reporter.complete('deno installed')
    } else {
      reporter.info(`deno already installed: ${status.deno.version || 'unknown version'}`)
    }

    // Check whisper
    if (!status.whisper.exists || !status.whisper.executable) {
      if (process.platform === 'win32') {
        reporter.phase('Downloading whisper...')
        await binaryManager.downloadBinary('whisper')
        reporter.complete('whisper installed')
      } else {
        reporter.warn(
          'Whisper not found. Install via: ' +
            (process.platform === 'darwin'
              ? 'brew install whisper-cpp'
              : 'your package manager or build from source')
        )
      }
    } else {
      reporter.info(`whisper already installed: ${status.whisper.version || 'found'}`)
    }

    // Download whisper model
    const modelName = options.downloadModel || 'small'
    const modelStatus = await binaryManager.checkWhisperModelStatus(modelName)

    if (!modelStatus.ready) {
      reporter.phase(`Downloading whisper model (${modelName})...`)
      await binaryManager.downloadWhisperModel(modelName, onProgress)
      reporter.complete(`Whisper model '${modelName}' installed`)
    } else {
      reporter.info(`Whisper model '${modelName}' already downloaded`)
    }

    reporter.complete('Setup complete! Ready to transcribe.')
  } finally {
    binaryManager.removeListener('download-progress', onProgress)
  }
}

/**
 * Download a specific whisper model.
 */
export async function downloadModelCommand(
  modelName: string,
  options: ProgressOptions
): Promise<void> {
  const reporter = new ProgressReporter(options)
  const binaryManager = getCliBinaryManager()

  if (!VALID_WHISPER_MODELS.includes(modelName as any)) {
    throw new CliError(
      `Invalid model: ${modelName}. Valid models: ${VALID_WHISPER_MODELS.join(', ')}`,
      ExitCode.InvalidArguments
    )
  }

  const modelStatus = await binaryManager.checkWhisperModelStatus(modelName)

  if (modelStatus.ready) {
    reporter.info(`Model '${modelName}' already downloaded at ${modelStatus.model.path}`)
    return
  }

  const onProgress = (progress: DownloadProgress) => {
    reporter.binaryProgress(progress.binary, progress.percent)
  }

  reporter.phase(`Downloading whisper model (${modelName})...`)
  await binaryManager.downloadWhisperModel(modelName, onProgress)
  reporter.complete(`Model '${modelName}' installed`)
}
