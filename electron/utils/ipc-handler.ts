/**
 * IPC Handler utilities for reducing boilerplate and improving error handling
 */

import path from 'path'
import { app } from 'electron'
import type { ApiResult } from '../../shared/types'

/**
 * Wraps an async function with standardized error handling and logging.
 * Automatically converts successful results to ApiResult format and catches errors.
 *
 * @example
 * ipcMain.handle('myChannel', ipcHandler(async (arg1, arg2) => {
 *   const result = await someAsyncOperation(arg1, arg2)
 *   return result // Wrapped in { success: true, data: result }
 * }))
 */
export function ipcHandler<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  options?: { channel?: string }
): (...args: Args) => Promise<ApiResult<T>> {
  return async (...args: Args): Promise<ApiResult<T>> => {
    try {
      const data = await fn(...args)
      return { success: true, data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[IPC Error]${options?.channel ? ` ${options.channel}:` : ''} ${errorMessage}`)
      return { success: false, error: errorMessage }
    }
  }
}

/**
 * Wraps a sync function with standardized error handling and logging.
 *
 * @example
 * ipcMain.handle('syncChannel', ipcHandlerSync(() => {
 *   return getSomeValue()
 * }))
 */
export function ipcHandlerSync<T, Args extends unknown[]>(
  fn: (...args: Args) => T,
  options?: { channel?: string }
): (...args: Args) => ApiResult<T> {
  return (...args: Args): ApiResult<T> => {
    try {
      const data = fn(...args)
      return { success: true, data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[IPC Error]${options?.channel ? ` ${options.channel}:` : ''} ${errorMessage}`)
      return { success: false, error: errorMessage }
    }
  }
}

/**
 * Validates that a file path is within an allowed base directory.
 * Prevents path traversal attacks.
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
 * Gets the list of safe paths for file operations (downloads directory, app data).
 */
export function getSafePaths(): string[] {
  return [app.getPath('downloads'), app.getPath('userData'), app.getPath('temp')]
}
