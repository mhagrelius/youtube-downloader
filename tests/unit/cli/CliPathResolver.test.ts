import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import path from 'path'
import os from 'os'

describe('CliPathResolver', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('getBinDir', () => {
    it('should return bin directory under data dir', async () => {
      const { CliPathResolver } = await import('../../../cli/utils/paths')
      const resolver = new CliPathResolver()
      const binDir = resolver.getBinDir()

      expect(binDir).toContain('bin')
      expect(binDir).toContain('yt-transcribe')
      expect(path.isAbsolute(binDir)).toBe(true)
    })

    it('should respect YT_TRANSCRIBE_DATA_DIR environment variable', async () => {
      const customDataDir = path.join(os.tmpdir(), 'custom-data-dir')
      process.env.YT_TRANSCRIBE_DATA_DIR = customDataDir

      const { CliPathResolver } = await import('../../../cli/utils/paths')
      const resolver = new CliPathResolver()

      expect(resolver.getBinDir()).toBe(path.join(customDataDir, 'bin'))
    })
  })

  describe('getModelsDir', () => {
    it('should return models directory under data dir', async () => {
      const { CliPathResolver } = await import('../../../cli/utils/paths')
      const resolver = new CliPathResolver()
      const modelsDir = resolver.getModelsDir()

      expect(modelsDir).toContain('models')
      expect(modelsDir).toContain('yt-transcribe')
      expect(path.isAbsolute(modelsDir)).toBe(true)
    })

    it('should respect YT_TRANSCRIBE_DATA_DIR environment variable', async () => {
      const customDataDir = path.join(os.tmpdir(), 'custom-data-dir')
      process.env.YT_TRANSCRIBE_DATA_DIR = customDataDir

      const { CliPathResolver } = await import('../../../cli/utils/paths')
      const resolver = new CliPathResolver()

      expect(resolver.getModelsDir()).toBe(path.join(customDataDir, 'models'))
    })
  })

  describe('getDefaultDownloadPath', () => {
    it('should return home directory by default', async () => {
      delete process.env.YT_TRANSCRIBE_OUTPUT_DIR

      const { CliPathResolver } = await import('../../../cli/utils/paths')
      const resolver = new CliPathResolver()

      expect(resolver.getDefaultDownloadPath()).toBe(os.homedir())
    })

    it('should respect YT_TRANSCRIBE_OUTPUT_DIR environment variable', async () => {
      const customOutput = path.join(os.tmpdir(), 'custom-output')
      process.env.YT_TRANSCRIBE_OUTPUT_DIR = customOutput

      const { CliPathResolver } = await import('../../../cli/utils/paths')
      const resolver = new CliPathResolver()

      expect(resolver.getDefaultDownloadPath()).toBe(customOutput)
    })
  })

  describe('getTempDir', () => {
    it('should return temp directory with app name', async () => {
      const { CliPathResolver } = await import('../../../cli/utils/paths')
      const resolver = new CliPathResolver()
      const tempDir = resolver.getTempDir()

      expect(tempDir).toBe(path.join(os.tmpdir(), 'yt-transcribe'))
    })
  })

  describe('isDev', () => {
    it('should return false when NODE_ENV is not development', async () => {
      delete process.env.NODE_ENV

      const { CliPathResolver } = await import('../../../cli/utils/paths')
      const resolver = new CliPathResolver()

      expect(resolver.isDev()).toBe(false)
    })

    it('should return true when NODE_ENV is development', async () => {
      process.env.NODE_ENV = 'development'

      const { CliPathResolver } = await import('../../../cli/utils/paths')
      const resolver = new CliPathResolver()

      expect(resolver.isDev()).toBe(true)
    })
  })

  describe('platform-specific paths', () => {
    it('should return paths appropriate for the current platform', async () => {
      const { CliPathResolver } = await import('../../../cli/utils/paths')
      const resolver = new CliPathResolver()

      const binDir = resolver.getBinDir()
      const modelsDir = resolver.getModelsDir()

      // Paths should be absolute
      expect(path.isAbsolute(binDir)).toBe(true)
      expect(path.isAbsolute(modelsDir)).toBe(true)

      // Paths should contain yt-transcribe app name
      expect(binDir).toContain('yt-transcribe')
      expect(modelsDir).toContain('yt-transcribe')

      // Paths should end with bin or models respectively
      expect(path.basename(binDir)).toBe('bin')
      expect(path.basename(modelsDir)).toBe('models')
    })
  })
})
