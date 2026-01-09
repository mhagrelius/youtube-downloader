#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { createRequire } from 'node:module'
import { transcribeCommand } from './commands/transcribe.js'
import { setupCommand, checkCommand, downloadModelCommand } from './commands/setup.js'
import { handleError, CliError, ExitCode } from './utils/errors.js'
import { isValidYouTubeUrl } from '../shared/utils/youtube.js'

// Read version from package.json
// Path varies depending on execution context:
// - Development (tsx): cli/index.ts -> ../package.json
// - Built (node): cli/dist/cli/index.js -> ../../../package.json
const require = createRequire(import.meta.url)
let VERSION = '1.0.0'
try {
  // Try development path first
  const packageJson = require('../package.json') as { version: string }
  VERSION = packageJson.version
} catch {
  try {
    // Try built path
    const packageJson = require('../../../package.json') as { version: string }
    VERSION = packageJson.version
  } catch {
    // Fallback to hardcoded version
  }
}

const HELP_TEXT = `
yt-transcribe v${VERSION}

Download YouTube videos and transcribe them to text.
Designed for use by AI agents and automation.

USAGE:
    yt-transcribe <URL> [OPTIONS]
    yt-transcribe --setup
    yt-transcribe --help

ARGUMENTS:
    <URL>                          YouTube video URL (required for transcription)

OUTPUT OPTIONS:
    -o, --output <file>            Write transcript to file instead of stdout
    -f, --format <format>          Transcript format: txt, srt, vtt (default: txt)
                                   - txt: Plain text, easy to read and process
                                   - srt: SubRip subtitle format with timestamps
                                   - vtt: WebVTT subtitle format with timestamps
    --stdout                       Force output to stdout even when using -o
                                   (useful for piping while also saving to file)

DOWNLOAD OPTIONS:
    --audio-format <format>        Audio format for download: mp3, m4a, best (default: best)
                                   - best: Keep original format (fastest)
                                   - mp3: Convert to MP3 (most compatible)
                                   - m4a: Keep as M4A if available
    --keep-audio                   Keep the downloaded audio file after transcription
    --audio-output <dir>           Directory to save audio (requires --keep-audio)

TRANSCRIPTION OPTIONS:
    -m, --model <model>            Whisper model size (default: small)
                                   - tiny:   ~75MB,  fastest, least accurate
                                   - base:   ~142MB, fast, basic accuracy
                                   - small:  ~466MB, balanced speed/accuracy
                                   - medium: ~1.5GB, slower, more accurate
    -l, --language <lang>          Language code or 'auto' (default: auto)
                                   Examples: en, es, fr, de, ja, zh, ko
                                   Use 'auto' for automatic language detection

BINARY MANAGEMENT:
    --setup                        Download and setup all required binaries (yt-dlp,
                                   deno, whisper model). Run this first!
    --check                        Check status of all binaries and models
    --download-model <model>       Download a specific whisper model

PROGRESS & OUTPUT:
    -q, --quiet                    Suppress all progress output (stderr)
                                   Only the transcript will be printed to stdout
    -v, --verbose                  Show debug information
    --json                         Output progress as JSON lines to stderr
                                   (useful for parsing in scripts/agents)
    --no-color                     Disable colored output

GENERAL:
    -h, --help                     Show this help message
    --version                      Show version number

EXIT CODES:
    0  Success
    1  General error
    2  Invalid arguments (check your input)
    3  Network error (check connection)
    4  Transcription error (check audio file)
    5  Binary not found (run --setup)

EXAMPLES:
    # First-time setup (downloads ~500MB for binaries + model)
    yt-transcribe --setup

    # Basic transcription (transcript goes to stdout)
    yt-transcribe "https://youtube.com/watch?v=dQw4w9WgXcQ"

    # Save transcript to file
    yt-transcribe "https://youtube.com/watch?v=abc123" -o transcript.txt

    # Use SRT format with timestamps
    yt-transcribe "https://youtube.com/watch?v=abc123" -f srt -o subtitles.srt

    # Fast transcription with tiny model (less accurate)
    yt-transcribe "https://youtube.com/watch?v=abc123" -m tiny -q

    # Transcribe in specific language
    yt-transcribe "https://youtube.com/watch?v=abc123" -l es

    # Keep the audio file
    yt-transcribe "https://youtube.com/watch?v=abc123" --keep-audio --audio-output ./audio

    # Quiet mode for piping (only transcript to stdout)
    yt-transcribe "https://youtube.com/watch?v=abc123" -q | head -100

    # JSON progress for automation
    yt-transcribe "https://youtube.com/watch?v=abc123" --json 2>progress.jsonl

ENVIRONMENT VARIABLES:
    YT_TRANSCRIBE_DATA_DIR         Override data directory for binaries/models
    YT_TRANSCRIBE_OUTPUT_DIR       Default output directory
    DEBUG                          Show debug info on errors

For AI agents: Use -q flag for clean stdout output, parse with --json for progress.
Report issues: https://github.com/mhagrelius/youtube-downloader/issues
`

interface CliArgs {
  url?: string
  output?: string
  format: 'txt' | 'srt' | 'vtt'
  audioFormat: 'mp3' | 'm4a' | 'best'
  model: string
  language: string
  keepAudio: boolean
  audioOutput?: string
  stdout: boolean
  setup: boolean
  check: boolean
  downloadModel?: string
  quiet: boolean
  verbose: boolean
  json: boolean
  noColor: boolean
  help: boolean
  version: boolean
}

function parseCliArgs(argv: string[]): CliArgs {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      output: { type: 'string', short: 'o' },
      format: { type: 'string', short: 'f', default: 'txt' },
      'audio-format': { type: 'string', default: 'best' },
      'keep-audio': { type: 'boolean', default: false },
      'audio-output': { type: 'string' },
      model: { type: 'string', short: 'm', default: 'small' },
      language: { type: 'string', short: 'l', default: 'auto' },
      stdout: { type: 'boolean', default: false },
      setup: { type: 'boolean', default: false },
      check: { type: 'boolean', default: false },
      'download-model': { type: 'string' },
      quiet: { type: 'boolean', short: 'q', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
      json: { type: 'boolean', default: false },
      'no-color': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', default: false },
    },
    allowPositionals: true,
    strict: true,
  })

  // Validate format
  const format = values.format as string
  if (!['txt', 'srt', 'vtt'].includes(format)) {
    throw new CliError(
      `Invalid format: ${format}. Valid options: txt, srt, vtt`,
      ExitCode.InvalidArguments
    )
  }

  // Validate audio format
  const audioFormat = values['audio-format'] as string
  if (!['mp3', 'm4a', 'best'].includes(audioFormat)) {
    throw new CliError(
      `Invalid audio format: ${audioFormat}. Valid options: mp3, m4a, best`,
      ExitCode.InvalidArguments
    )
  }

  // Validate model
  const model = values.model as string
  if (!['tiny', 'base', 'small', 'medium'].includes(model)) {
    throw new CliError(
      `Invalid model: ${model}. Valid options: tiny, base, small, medium`,
      ExitCode.InvalidArguments
    )
  }

  return {
    url: positionals[0],
    output: values.output as string | undefined,
    format: format as 'txt' | 'srt' | 'vtt',
    audioFormat: audioFormat as 'mp3' | 'm4a' | 'best',
    model,
    language: values.language as string,
    keepAudio: values['keep-audio'] as boolean,
    audioOutput: values['audio-output'] as string | undefined,
    stdout: values.stdout as boolean,
    setup: values.setup as boolean,
    check: values.check as boolean,
    downloadModel: values['download-model'] as string | undefined,
    quiet: values.quiet as boolean,
    verbose: values.verbose as boolean,
    json: values.json as boolean,
    noColor: values['no-color'] as boolean,
    help: values.help as boolean,
    version: values.version as boolean,
  }
}

async function main(): Promise<void> {
  try {
    const args = parseCliArgs(process.argv.slice(2))

    // Handle --help
    if (args.help) {
      console.log(HELP_TEXT)
      process.exit(ExitCode.Success)
    }

    // Handle --version
    if (args.version) {
      console.log(VERSION)
      process.exit(ExitCode.Success)
    }

    // Progress options shared across commands
    const progressOptions = {
      quiet: args.quiet,
      json: args.json,
      noColor: args.noColor,
      verbose: args.verbose,
    }

    // Handle --setup
    if (args.setup) {
      await setupCommand({
        ...progressOptions,
        downloadModel: args.model,
      })
      process.exit(ExitCode.Success)
    }

    // Handle --check
    if (args.check) {
      await checkCommand(progressOptions)
      process.exit(ExitCode.Success)
    }

    // Handle --download-model
    if (args.downloadModel) {
      await downloadModelCommand(args.downloadModel, progressOptions)
      process.exit(ExitCode.Success)
    }

    // Require URL for transcription
    if (!args.url) {
      console.error('Error: URL is required for transcription')
      console.error('Usage: yt-transcribe <URL> [OPTIONS]')
      console.error('Run: yt-transcribe --help for more information')
      process.exit(ExitCode.InvalidArguments)
    }

    // Validate URL format
    if (!isValidYouTubeUrl(args.url)) {
      throw new CliError(
        'Invalid YouTube URL. Supported formats:\n' +
          '  - https://youtube.com/watch?v=VIDEO_ID\n' +
          '  - https://youtu.be/VIDEO_ID\n' +
          '  - https://youtube.com/shorts/VIDEO_ID\n' +
          '  - https://youtube.com/embed/VIDEO_ID\n' +
          '  - https://youtube.com/v/VIDEO_ID\n' +
          '  - https://youtube.com/playlist?list=PLAYLIST_ID\n' +
          '  - https://youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID',
        ExitCode.InvalidArguments
      )
    }

    // Run transcription
    await transcribeCommand({
      ...progressOptions,
      url: args.url,
      output: args.output,
      format: args.format,
      audioFormat: args.audioFormat,
      model: args.model,
      language: args.language,
      keepAudio: args.keepAudio,
      audioOutput: args.audioOutput,
      stdout: args.stdout,
    })

    process.exit(ExitCode.Success)
  } catch (error) {
    handleError(error)
  }
}

main()
