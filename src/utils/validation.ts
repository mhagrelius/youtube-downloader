export const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)[\w-]{11}/

// Matches playlist URLs like youtube.com/playlist?list=PLxxxxx
export const YOUTUBE_PLAYLIST_REGEX = /^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w-]+/

// Matches &list= parameter in watch URLs like youtube.com/watch?v=xxx&list=PLxxxxx
const LIST_PARAM_REGEX = /[?&]list=([\w-]+)/

export function isValidYouTubeUrl(url: string): boolean {
  return YOUTUBE_URL_REGEX.test(url.trim()) || isPlaylistUrl(url)
}

export function isPlaylistUrl(url: string): boolean {
  const trimmed = url.trim()
  // Either a dedicated playlist URL or a watch URL with list parameter
  return YOUTUBE_PLAYLIST_REGEX.test(trimmed) || LIST_PARAM_REGEX.test(trimmed)
}

export function extractPlaylistId(url: string): string | null {
  const trimmed = url.trim()
  const match = trimmed.match(LIST_PARAM_REGEX)
  return match ? match[1] : null
}

export function extractVideoId(url: string): string | null {
  const trimmed = url.trim()

  // youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([\w-]{11})/)
  if (shortMatch) return shortMatch[1]

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/youtube\.com\/watch\?v=([\w-]{11})/)
  if (watchMatch) return watchMatch[1]

  // youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([\w-]{11})/)
  if (embedMatch) return embedMatch[1]

  // youtube.com/v/VIDEO_ID
  const vMatch = trimmed.match(/youtube\.com\/v\/([\w-]{11})/)
  if (vMatch) return vMatch[1]

  // youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([\w-]{11})/)
  if (shortsMatch) return shortsMatch[1]

  return null
}
