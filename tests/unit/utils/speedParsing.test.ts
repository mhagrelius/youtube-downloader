import { describe, it, expect, beforeEach } from 'vitest'
import { parseSpeed, formatEta, SpeedSmoother } from '@/utils/speedParsing'

describe('parseSpeed', () => {
  it('parses bytes per second', () => {
    expect(parseSpeed('100B/s')).toBe(100)
    expect(parseSpeed('1B/s')).toBe(1)
  })

  it('parses kilobytes (decimal KB)', () => {
    expect(parseSpeed('1KB/s')).toBe(1000)
    expect(parseSpeed('1.5KB/s')).toBe(1500)
    expect(parseSpeed('500KB/s')).toBe(500000)
  })

  it('parses kibibytes (binary KiB)', () => {
    expect(parseSpeed('1KiB/s')).toBe(1024)
    expect(parseSpeed('1.5KiB/s')).toBe(1536)
    expect(parseSpeed('10KiB/s')).toBe(10240)
  })

  it('parses megabytes (decimal MB)', () => {
    expect(parseSpeed('1MB/s')).toBe(1000000)
    expect(parseSpeed('2.5MB/s')).toBe(2500000)
  })

  it('parses mebibytes (binary MiB)', () => {
    expect(parseSpeed('1MiB/s')).toBe(1048576)
    expect(parseSpeed('1.5MiB/s')).toBe(1572864)
  })

  it('parses gigabytes (decimal GB)', () => {
    expect(parseSpeed('1GB/s')).toBe(1000000000)
  })

  it('parses gibibytes (binary GiB)', () => {
    expect(parseSpeed('1GiB/s')).toBe(1073741824)
  })

  it('handles spaces between number and unit', () => {
    expect(parseSpeed('1.5 MiB/s')).toBe(1572864)
    expect(parseSpeed('100 KB/s')).toBe(100000)
  })

  it('is case insensitive', () => {
    expect(parseSpeed('1mib/s')).toBe(1048576)
    expect(parseSpeed('1MIB/S')).toBe(1048576)
    expect(parseSpeed('1kb/s')).toBe(1000)
  })

  it('returns 0 for invalid input', () => {
    expect(parseSpeed('')).toBe(0)
    expect(parseSpeed('invalid')).toBe(0)
    expect(parseSpeed('N/A')).toBe(0)
    expect(parseSpeed('unknown')).toBe(0)
  })

  it('returns 0 for malformed speed strings', () => {
    expect(parseSpeed('MiB/s')).toBe(0) // No number
    expect(parseSpeed('1.5')).toBe(0) // No unit
    expect(parseSpeed('1.5 MB')).toBe(0) // Missing /s
  })
})

describe('formatEta', () => {
  it('formats seconds only', () => {
    expect(formatEta(0)).toBe('0s')
    expect(formatEta(1)).toBe('1s')
    expect(formatEta(30)).toBe('30s')
    expect(formatEta(59)).toBe('59s')
  })

  it('formats minutes and seconds', () => {
    expect(formatEta(60)).toBe('1:00')
    expect(formatEta(61)).toBe('1:01')
    expect(formatEta(90)).toBe('1:30')
    expect(formatEta(125)).toBe('2:05')
    expect(formatEta(599)).toBe('9:59')
  })

  it('pads seconds with leading zero', () => {
    expect(formatEta(65)).toBe('1:05')
    expect(formatEta(601)).toBe('10:01')
  })

  it('formats hours, minutes, and seconds', () => {
    expect(formatEta(3600)).toBe('1:00:00')
    expect(formatEta(3660)).toBe('1:01:00')
    expect(formatEta(3720)).toBe('1:02:00')
    expect(formatEta(7200)).toBe('2:00:00')
    expect(formatEta(7260)).toBe('2:01:00')
  })

  it('handles large values', () => {
    expect(formatEta(36000)).toBe('10:00:00')
  })
})

describe('SpeedSmoother', () => {
  let smoother: SpeedSmoother

  beforeEach(() => {
    smoother = new SpeedSmoother()
  })

  describe('calculateSmoothedEta', () => {
    it('returns calculating for zero speed', () => {
      expect(smoother.calculateSmoothedEta('download1', '0B/s', 1000000)).toBe('calculating...')
      expect(smoother.calculateSmoothedEta('download1', '', 1000000)).toBe('calculating...')
    })

    it('calculates ETA based on speed and remaining bytes', () => {
      // 1 MiB/s with 10 MiB remaining = 10 seconds
      const eta = smoother.calculateSmoothedEta('download1', '1MiB/s', 10 * 1024 * 1024)
      expect(eta).toBe('10s')
    })

    it('uses rolling average for smoothing', () => {
      // First sample: 1 MiB/s
      smoother.calculateSmoothedEta('download1', '1MiB/s', 10 * 1024 * 1024)

      // Second sample: 2 MiB/s, average should be 1.5 MiB/s
      // 10 MiB / 1.5 MiB/s = ~6.67 seconds, rounds to 7
      const eta = smoother.calculateSmoothedEta('download1', '2MiB/s', 10 * 1024 * 1024)
      expect(eta).toBe('7s')
    })

    it('maintains separate samples per download', () => {
      // Fast download
      smoother.calculateSmoothedEta('fast', '10MiB/s', 10 * 1024 * 1024)

      // Slow download
      smoother.calculateSmoothedEta('slow', '1MiB/s', 10 * 1024 * 1024)

      // Fast download continues fast
      const fastEta = smoother.calculateSmoothedEta('fast', '10MiB/s', 10 * 1024 * 1024)
      // Slow download continues slow
      const slowEta = smoother.calculateSmoothedEta('slow', '1MiB/s', 10 * 1024 * 1024)

      // Fast: 10 MiB / 10 MiB/s = 1s
      expect(fastEta).toBe('1s')
      // Slow: 10 MiB / 1 MiB/s = 10s
      expect(slowEta).toBe('10s')
    })

    it('formats ETA in minutes for longer times', () => {
      // 100 KiB/s with 10 MiB remaining = ~105 seconds
      const eta = smoother.calculateSmoothedEta('download1', '100KiB/s', 10 * 1024 * 1024)
      expect(eta).toMatch(/^\d+:\d{2}$/) // Format: M:SS
    })
  })

  describe('clear', () => {
    it('clears samples for a specific download', () => {
      // Build up some samples
      smoother.calculateSmoothedEta('download1', '1MiB/s', 1000000)
      smoother.calculateSmoothedEta('download1', '2MiB/s', 1000000)

      // Clear samples
      smoother.clear('download1')

      // Next calculation should start fresh (not use old samples)
      // With 1 MiB/s and 1MB remaining, should be ~1s
      const eta = smoother.calculateSmoothedEta('download1', '1MiB/s', 1 * 1024 * 1024)
      expect(eta).toBe('1s')
    })

    it('does not affect other downloads', () => {
      smoother.calculateSmoothedEta('download1', '1MiB/s', 1000000)
      smoother.calculateSmoothedEta('download2', '2MiB/s', 1000000)

      smoother.clear('download1')

      // download2 should still have its samples
      const eta = smoother.calculateSmoothedEta('download2', '2MiB/s', 2 * 1024 * 1024)
      // Average of 2MiB/s twice = 2MiB/s, 2MB / 2MiB/s = 1s
      expect(eta).toBe('1s')
    })
  })

  describe('clearAll', () => {
    it('clears all samples', () => {
      smoother.calculateSmoothedEta('download1', '1MiB/s', 1000000)
      smoother.calculateSmoothedEta('download2', '2MiB/s', 1000000)

      smoother.clearAll()

      // Both should start fresh
      expect(smoother.calculateSmoothedEta('download1', '1MiB/s', 1 * 1024 * 1024)).toBe('1s')
      expect(smoother.calculateSmoothedEta('download2', '1MiB/s', 1 * 1024 * 1024)).toBe('1s')
    })
  })
})
