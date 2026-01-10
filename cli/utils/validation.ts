import path from 'path'
import os from 'os'

/**
 * Validates that a file path is within allowed base directories.
 * Prevents path traversal attacks (e.g., ../../etc/passwd).
 *
 * @param filePath - The path to validate
 * @param allowedBasePaths - Array of allowed base directories
 * @returns true if path is within allowed directories
 */
export function isPathWithinAllowed(filePath: string, allowedBasePaths: string[]): boolean {
  const normalizedPath = path.normalize(path.resolve(filePath))

  return allowedBasePaths.some((basePath) => {
    const normalizedBase = path.normalize(path.resolve(basePath))
    return normalizedPath.startsWith(normalizedBase + path.sep) || normalizedPath === normalizedBase
  })
}

/**
 * Gets safe paths for CLI file operations.
 * Includes common user directories where file writes are expected.
 */
export function getCliSafePaths(): string[] {
  const home = os.homedir()
  const paths = [home, os.tmpdir(), process.cwd()]

  // Add platform-specific paths
  if (process.platform === 'darwin') {
    paths.push(path.join(home, 'Downloads'))
    paths.push(path.join(home, 'Documents'))
    paths.push(path.join(home, 'Desktop'))
  } else if (process.platform === 'win32') {
    paths.push(path.join(home, 'Downloads'))
    paths.push(path.join(home, 'Documents'))
    paths.push(path.join(home, 'Desktop'))
    // Windows may have paths on different drives
    if (process.env.USERPROFILE) {
      paths.push(process.env.USERPROFILE)
    }
  } else {
    // Linux and others
    paths.push(path.join(home, 'Downloads'))
    paths.push(path.join(home, 'Documents'))
  }

  return paths
}

/**
 * Validates an output path for security.
 * Throws an error if the path is outside allowed directories.
 *
 * @param outputPath - The output path to validate
 * @param description - Description of the path for error messages (e.g., "output file")
 * @throws Error if path is not allowed
 */
export function validateOutputPath(outputPath: string, description: string = 'output path'): void {
  // Check for directory traversal patterns in the ORIGINAL input
  // This catches attempts to use .. even if they would resolve to a valid path
  if (outputPath.includes('..')) {
    throw new Error(`Invalid ${description}: path contains directory traversal (..)`)
  }

  const resolvedPath = path.resolve(outputPath)
  const safePaths = getCliSafePaths()

  if (!isPathWithinAllowed(resolvedPath, safePaths)) {
    throw new Error(
      `Invalid ${description}: "${outputPath}" is outside allowed directories.\n` +
        `Allowed directories: ${safePaths.slice(0, 3).join(', ')}...`
    )
  }
}
