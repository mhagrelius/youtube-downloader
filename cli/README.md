# yt-transcribe

Download YouTube videos and transcribe them to text.
Designed for AI agents and automation.

## Installation

```bash
npm install -g yt-transcribe
```

## Quick Start

```bash
# First-time setup (downloads required binaries)
yt-transcribe --setup

# Transcribe a video
yt-transcribe "https://youtube.com/watch?v=VIDEO_ID"
```

## Usage

```bash
yt-transcribe <URL> [OPTIONS]

# Save to file
yt-transcribe "https://..." -o transcript.txt

# Use SRT format
yt-transcribe "https://..." -f srt -o subtitles.srt

# Quiet mode (only output transcript)
yt-transcribe "https://..." -q

# See all options
yt-transcribe --help
```

## For AI Agents

Use the `-q` flag for clean stdout output:
```bash
transcript=$(yt-transcribe "https://..." -q)
```

Use `--json` for machine-readable progress:
```bash
yt-transcribe "https://..." --json 2>progress.jsonl
```

## License

MIT
