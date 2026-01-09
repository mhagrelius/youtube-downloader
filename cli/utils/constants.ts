/**
 * Shared constants for the CLI.
 */

/**
 * Valid whisper model names that can be downloaded and used.
 */
export const VALID_WHISPER_MODELS = ['tiny', 'base', 'small', 'medium'] as const

export type WhisperModel = (typeof VALID_WHISPER_MODELS)[number]

/**
 * Type guard to check if a string is a valid whisper model.
 */
export function isValidWhisperModel(model: string): model is WhisperModel {
  return (VALID_WHISPER_MODELS as readonly string[]).includes(model)
}
