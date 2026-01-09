/**
 * Parse speed strings like "1.5MiB/s", "1.5 MiB/s", "500KB/s", etc.
 * Returns speed in bytes per second.
 */
export function parseSpeed(speed: string): number {
  if (!speed) return 0
  const cleaned = speed.trim().toUpperCase()
  // Handle both binary (KiB) and decimal (KB) units
  const match = cleaned.match(/^([\d.]+)\s*(K|M|G)?(I)?B\/S$/)
  if (!match) return 0
  const value = parseFloat(match[1])
  const prefix = match[2] // K, M, G, or undefined
  const isBinary = match[3] === 'I' // true for KiB/MiB/GiB

  const base = isBinary ? 1024 : 1000
  switch (prefix) {
    case 'G':
      return value * base * base * base
    case 'M':
      return value * base * base
    case 'K':
      return value * base
    default:
      return value
  }
}

/**
 * Format ETA in seconds to a human-readable string.
 * Returns formats like "30s", "1:30", "1:05:00"
 */
export function formatEta(etaSeconds: number): string {
  if (etaSeconds < 60) return `${etaSeconds}s`
  if (etaSeconds < 3600) {
    const mins = Math.floor(etaSeconds / 60)
    const secs = etaSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  const hrs = Math.floor(etaSeconds / 3600)
  const mins = Math.floor((etaSeconds % 3600) / 60)
  return `${hrs}:${mins.toString().padStart(2, '0')}:00`
}

// Rolling average calculator for smoothed ETA
const SPEED_SAMPLE_SIZE = 10

export class SpeedSmoother {
  private samples: Map<string, number[]> = new Map()

  /**
   * Calculate a smoothed ETA based on rolling average of speed samples.
   */
  calculateSmoothedEta(downloadId: string, currentSpeed: string, remainingBytes: number): string {
    const speedBps = parseSpeed(currentSpeed)
    if (speedBps === 0) return 'calculating...'

    // Get or create samples array
    let samples = this.samples.get(downloadId)
    if (!samples) {
      samples = []
      this.samples.set(downloadId, samples)
    }

    // Add new sample
    samples.push(speedBps)
    if (samples.length > SPEED_SAMPLE_SIZE) {
      samples.shift()
    }

    // Calculate average
    const avgSpeed = samples.reduce((a, b) => a + b, 0) / samples.length
    if (avgSpeed <= 0) return 'calculating...'

    // Calculate ETA in seconds
    const etaSeconds = Math.ceil(remainingBytes / avgSpeed)

    return formatEta(etaSeconds)
  }

  /**
   * Clear speed samples for a download (call when download completes or errors).
   */
  clear(downloadId: string): void {
    this.samples.delete(downloadId)
  }

  /**
   * Clear all samples.
   */
  clearAll(): void {
    this.samples.clear()
  }
}
