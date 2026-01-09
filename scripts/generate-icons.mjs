#!/usr/bin/env node
/* global console, process */

/**
 * Generate app icons for all platforms from SVG source
 *
 * Creates:
 * - build/icon.png (512x512 for Linux)
 * - build/icon.icns (macOS app icon)
 * - build/icon.ico (Windows app icon)
 */

import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.join(__dirname, '..')
const buildDir = path.join(projectRoot, 'build')
const svgPath = path.join(buildDir, 'icon.svg')

// Icon sizes needed for macOS iconset
const ICONSET_SIZES = [16, 32, 64, 128, 256, 512]

async function generatePng(size, outputPath) {
  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(outputPath)
  console.log(`  Created ${path.basename(outputPath)} (${size}x${size})`)
}

async function generateIcons() {
  console.log('Generating app icons from SVG...\n')

  // Ensure build directory exists
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true })
  }

  // Check SVG exists
  if (!fs.existsSync(svgPath)) {
    console.error('Error: build/icon.svg not found')
    process.exit(1)
  }

  // 1. Generate main PNG for Linux (512x512)
  console.log('1. Generating Linux icon (icon.png)...')
  const pngPath = path.join(buildDir, 'icon.png')
  await generatePng(512, pngPath)

  // 2. Generate macOS iconset and icns
  console.log('\n2. Generating macOS icon (icon.icns)...')
  const iconsetPath = path.join(buildDir, 'icon.iconset')

  // Create iconset directory
  if (fs.existsSync(iconsetPath)) {
    fs.rmSync(iconsetPath, { recursive: true })
  }
  fs.mkdirSync(iconsetPath)

  // Generate all required sizes for iconset
  for (const size of ICONSET_SIZES) {
    await generatePng(size, path.join(iconsetPath, `icon_${size}x${size}.png`))
    // Also generate @2x versions (except for 512 which would be 1024)
    if (size <= 512) {
      await generatePng(size * 2, path.join(iconsetPath, `icon_${size}x${size}@2x.png`))
    }
  }

  // Convert iconset to icns using iconutil (macOS only)
  try {
    const icnsPath = path.join(buildDir, 'icon.icns')
    execSync(`iconutil -c icns "${iconsetPath}" -o "${icnsPath}"`, { stdio: 'inherit' })
    console.log('  Created icon.icns')

    // Clean up iconset directory
    fs.rmSync(iconsetPath, { recursive: true })
  } catch {
    console.log('  Note: iconutil not available (macOS only). Skipping .icns generation.')
    console.log('  The iconset directory is preserved for manual conversion.')
  }

  // 3. Generate Windows ico
  console.log('\n3. Generating Windows icon (icon.ico)...')

  // Generate multiple sizes for ico
  const icoSizes = [16, 32, 48, 64, 128, 256]
  const icoPngs = []
  const tempDir = path.join(buildDir, 'temp-ico')

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }

  for (const size of icoSizes) {
    const tempPng = path.join(tempDir, `icon-${size}.png`)
    await generatePng(size, tempPng)
    icoPngs.push(tempPng)
  }

  // Convert to ico
  try {
    const icoBuffer = await pngToIco(icoPngs)
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer)
    console.log('  Created icon.ico')
  } catch (error) {
    console.error('  Error creating ico:', error.message)
  }

  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true })

  console.log('\nDone! Icons generated in build/ directory.')
}

generateIcons().catch(console.error)
