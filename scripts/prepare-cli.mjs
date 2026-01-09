#!/usr/bin/env node

/**
 * Prepare CLI package for npm publishing.
 * Copies compiled files from dist-cli to cli/dist and fixes imports.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distCliDir = path.join(rootDir, 'dist-cli')
const cliDir = path.join(rootDir, 'cli')
const cliDistDir = path.join(cliDir, 'dist')

// Clean and create cli/dist directory
if (fs.existsSync(cliDistDir)) {
  fs.rmSync(cliDistDir, { recursive: true })
}
fs.mkdirSync(cliDistDir, { recursive: true })

/**
 * Fix ESM imports to include .js extensions.
 * Node.js ESM requires explicit file extensions.
 */
function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')

  // Known JavaScript file extensions that shouldn't have .js appended
  const jsExtensions = /\.(js|mjs|cjs|json)$/

  // Fix relative imports that don't have .js extension
  // Matches: from './something' or from '../something' or import('./something')
  const importRegex = /(from\s+['"])(\.\.?\/[^'"]+)(['"])/g
  const dynamicImportRegex = /(import\s*\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\))/g

  content = content.replace(importRegex, (match, prefix, importPath, suffix) => {
    // Don't add .js if already has a known JS extension
    if (jsExtensions.test(importPath)) {
      return match
    }
    return `${prefix}${importPath}.js${suffix}`
  })

  content = content.replace(dynamicImportRegex, (match, prefix, importPath, suffix) => {
    if (jsExtensions.test(importPath)) {
      return match
    }
    return `${prefix}${importPath}.js${suffix}`
  })

  fs.writeFileSync(filePath, content)
}

// Copy compiled files
function copyRecursive(src, dest, fixJs = false) {
  const stat = fs.statSync(src)

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file), fixJs)
    }
  } else {
    fs.copyFileSync(src, dest)
    // Fix imports in .js files
    if (fixJs && dest.endsWith('.js')) {
      fixImports(dest)
    }
  }
}

// Copy all compiled files from dist-cli to cli/dist (with import fixes)
if (fs.existsSync(distCliDir)) {
  copyRecursive(distCliDir, cliDistDir, true)
  console.log('Copied dist-cli/ to cli/dist/ (with ESM import fixes)')
} else {
  console.error('Error: dist-cli/ not found. Run tsc -p tsconfig.cli.json first.')
  process.exit(1)
}

// Make the CLI entry point executable
const entryPoint = path.join(cliDistDir, 'cli', 'index.js')
if (fs.existsSync(entryPoint)) {
  // Add shebang if not present
  let content = fs.readFileSync(entryPoint, 'utf-8')
  if (!content.startsWith('#!')) {
    content = '#!/usr/bin/env node\n' + content
    fs.writeFileSync(entryPoint, content)
  }
  fs.chmodSync(entryPoint, 0o755)
  console.log('Made cli/dist/cli/index.js executable')
}

// Create a simple README for the CLI package
const readmeContent = `# yt-transcribe

Download YouTube videos and transcribe them to text.
Designed for AI agents and automation.

## Installation

\`\`\`bash
npm install -g yt-transcribe
\`\`\`

## Quick Start

\`\`\`bash
# First-time setup (downloads required binaries)
yt-transcribe --setup

# Transcribe a video
yt-transcribe "https://youtube.com/watch?v=VIDEO_ID"
\`\`\`

## Usage

\`\`\`bash
yt-transcribe <URL> [OPTIONS]

# Save to file
yt-transcribe "https://..." -o transcript.txt

# Use SRT format
yt-transcribe "https://..." -f srt -o subtitles.srt

# Quiet mode (only output transcript)
yt-transcribe "https://..." -q

# See all options
yt-transcribe --help
\`\`\`

## For AI Agents

Use the \`-q\` flag for clean stdout output:
\`\`\`bash
transcript=$(yt-transcribe "https://..." -q)
\`\`\`

Use \`--json\` for machine-readable progress:
\`\`\`bash
yt-transcribe "https://..." --json 2>progress.jsonl
\`\`\`

## License

MIT
`

fs.writeFileSync(path.join(cliDir, 'README.md'), readmeContent)
console.log('Created cli/README.md')

console.log('\nCLI package prepared. To publish:')
console.log('  cd cli && npm publish')
