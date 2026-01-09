/**
 * Re-export YouTube URL validation utilities from shared.
 * This file maintains backwards compatibility for existing imports.
 */
export {
  YOUTUBE_URL_REGEX,
  YOUTUBE_PLAYLIST_REGEX,
  isValidYouTubeUrl,
  isPlaylistUrl,
  extractPlaylistId,
  extractVideoId,
} from '../../shared/utils/youtube'
