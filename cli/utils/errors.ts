/**
 * Exit codes for the CLI.
 * These codes help AI agents and scripts understand what went wrong.
 */
export enum ExitCode {
  Success = 0,
  GeneralError = 1,
  InvalidArguments = 2,
  NetworkError = 3,
  TranscriptionError = 4,
  BinaryNotFound = 5,
}

/**
 * CLI-specific error class with exit code.
 */
export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: ExitCode,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'CliError'
  }
}

/**
 * Handle errors and exit with appropriate code.
 */
export function handleError(error: unknown): never {
  if (error instanceof CliError) {
    console.error(`Error: ${error.message}`)
    if (process.env.DEBUG && error.cause) {
      console.error('Caused by:', error.cause)
    }
    process.exit(error.exitCode)
  }

  if (error instanceof Error) {
    // Categorize common errors
    if (
      error.message.includes('Whisper binary not found') ||
      error.message.includes('whisper-cpp')
    ) {
      console.error(`Error: ${error.message}`)
      console.error('Run: yt-transcribe --setup')
      process.exit(ExitCode.BinaryNotFound)
    }

    if (
      error.message.includes('yt-dlp') &&
      (error.message.includes('not found') || error.message.includes('ENOENT'))
    ) {
      console.error('Error: yt-dlp binary not found.')
      console.error('Run: yt-transcribe --setup')
      process.exit(ExitCode.BinaryNotFound)
    }

    if (
      error.message.includes('network') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('fetch')
    ) {
      console.error(`Network error: ${error.message}`)
      process.exit(ExitCode.NetworkError)
    }

    if (
      error.message.includes('transcri') ||
      error.message.includes('whisper') ||
      error.message.includes('audio')
    ) {
      console.error(`Transcription error: ${error.message}`)
      process.exit(ExitCode.TranscriptionError)
    }

    console.error(`Error: ${error.message}`)
    if (process.env.DEBUG) {
      console.error(error.stack)
    }
    process.exit(ExitCode.GeneralError)
  }

  console.error('Unknown error occurred')
  process.exit(ExitCode.GeneralError)
}
