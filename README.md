# YouTube Downloader

A modern desktop application for downloading YouTube videos with a beautiful UI.

## Features

- Download videos in multiple quality options
- Audio-only extraction
- AI-powered transcription (via Whisper)
- Download history with search
- Automatic yt-dlp updates

## Platform Support

- **Windows (x64)** - untested
- macOS (Intel & Apple Silicon) - Primary, Apple Silicon tested
- Linux (x64, arm64) - Untested

## Installation

Download the latest release from [Releases](../../releases).

### Requirements

- **FFmpeg** (optional): Required for transcription feature
  - Windows: [Download from ffmpeg.org](https://ffmpeg.org/download.html)
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`

## Development

```bash
npm install
npm run electron:dev
```

## Building

```bash
npm run build        # Full build
npm run build:win    # Windows installer
npm run build:mac    # macOS DMG
npm run build:linux  # Linux AppImage
```

## Testing

```bash
npm run test         # Unit and integration tests
npm run test:e2e     # End-to-end tests
npm run check        # Full check (types, lint, format, tests)
```

## Tech Stack

- Electron 28 + React 18 + TypeScript
- Vite, Tailwind CSS v4, Zustand
- yt-dlp + Deno runtime
- SQLite for persistence
- Whisper.cpp for transcription

## License

MIT
