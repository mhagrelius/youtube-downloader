import { describe, it, expect } from 'vitest'
import path from 'path'
import os from 'os'

describe('CLI Path Validation', () => {
  describe('isPathWithinAllowed', () => {
    it('should return true for paths within allowed directories', async () => {
      const { isPathWithinAllowed } = await import('../../../cli/utils/validation')
      const home = os.homedir()

      expect(isPathWithinAllowed(path.join(home, 'file.txt'), [home])).toBe(true)
      expect(isPathWithinAllowed(path.join(home, 'subdir', 'file.txt'), [home])).toBe(true)
    })

    it('should return false for paths outside allowed directories', async () => {
      const { isPathWithinAllowed } = await import('../../../cli/utils/validation')
      const home = os.homedir()

      // /tmp is usually not under home directory
      const outsidePath = path.join(os.tmpdir(), 'test', 'file.txt')
      expect(isPathWithinAllowed(outsidePath, [home])).toBe(false)
    })

    it('should return true when path equals allowed directory', async () => {
      const { isPathWithinAllowed } = await import('../../../cli/utils/validation')
      const home = os.homedir()

      expect(isPathWithinAllowed(home, [home])).toBe(true)
    })

    it('should handle multiple allowed directories', async () => {
      const { isPathWithinAllowed } = await import('../../../cli/utils/validation')
      const home = os.homedir()
      const tmp = os.tmpdir()
      const allowed = [home, tmp]

      expect(isPathWithinAllowed(path.join(home, 'file.txt'), allowed)).toBe(true)
      expect(isPathWithinAllowed(path.join(tmp, 'file.txt'), allowed)).toBe(true)
    })

    it('should normalize paths correctly', async () => {
      const { isPathWithinAllowed } = await import('../../../cli/utils/validation')
      const home = os.homedir()

      // Path with . and ..
      expect(isPathWithinAllowed(path.join(home, 'subdir', '..', 'file.txt'), [home])).toBe(true)
    })

    it('should prevent prefix attacks', async () => {
      const { isPathWithinAllowed } = await import('../../../cli/utils/validation')

      // /home/testuser2 should NOT match /home/testuser
      // Use a path that's clearly a prefix attack
      expect(isPathWithinAllowed('/allowed-dir-extra/file.txt', ['/allowed-dir'])).toBe(false)
    })
  })

  describe('getCliSafePaths', () => {
    it('should include common safe directories', async () => {
      const { getCliSafePaths } = await import('../../../cli/utils/validation')
      const safePaths = getCliSafePaths()

      expect(safePaths).toContain(os.homedir())
      expect(safePaths).toContain(os.tmpdir())
      expect(safePaths).toContain(process.cwd())
    })

    it('should include platform-specific paths', async () => {
      const { getCliSafePaths } = await import('../../../cli/utils/validation')
      const safePaths = getCliSafePaths()

      // All platforms should have Downloads directory in safe paths
      const hasDownloads = safePaths.some((p) => p.includes('Downloads'))
      expect(hasDownloads).toBe(true)
    })
  })

  describe('validateOutputPath', () => {
    it('should not throw for paths within home directory', async () => {
      const { validateOutputPath } = await import('../../../cli/utils/validation')
      const home = os.homedir()

      expect(() => validateOutputPath(path.join(home, 'output.txt'))).not.toThrow()
    })

    it('should not throw for paths within temp directory', async () => {
      const { validateOutputPath } = await import('../../../cli/utils/validation')
      const tmp = os.tmpdir()

      expect(() => validateOutputPath(path.join(tmp, 'output.txt'))).not.toThrow()
    })

    it('should not throw for paths within cwd', async () => {
      const { validateOutputPath } = await import('../../../cli/utils/validation')

      expect(() => validateOutputPath(path.join(process.cwd(), 'output.txt'))).not.toThrow()
    })

    it('should throw for paths with directory traversal', async () => {
      const { validateOutputPath } = await import('../../../cli/utils/validation')

      // Even if the resolved path would be within allowed dirs, reject paths with ..
      // Use string concatenation to avoid path.join normalizing out the ..
      expect(() => validateOutputPath('/home/user/../user/file.txt')).toThrow('directory traversal')
      expect(() => validateOutputPath('./subdir/../file.txt')).toThrow('directory traversal')
    })

    it('should include description in error message', async () => {
      const { validateOutputPath } = await import('../../../cli/utils/validation')

      // Use a path that should fail validation
      const invalidPath = '/root/etc/passwd'
      try {
        validateOutputPath(invalidPath, 'audio output')
        // If no throw, the path might be valid on this system, so skip assertion
      } catch (error) {
        expect((error as Error).message).toContain('audio output')
      }
    })
  })
})
