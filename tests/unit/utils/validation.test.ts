import { describe, it, expect } from 'vitest'
import {
  isValidYouTubeUrl,
  isPlaylistUrl,
  extractPlaylistId,
  extractVideoId,
  YOUTUBE_URL_REGEX,
} from '@/utils/validation'

describe('validation utilities', () => {
  describe('YOUTUBE_URL_REGEX', () => {
    it('matches standard watch URLs', () => {
      expect(YOUTUBE_URL_REGEX.test('https://www.youtube.com/watch?v=jNQXAC9IVRw')).toBe(true)
      expect(YOUTUBE_URL_REGEX.test('http://youtube.com/watch?v=jNQXAC9IVRw')).toBe(true)
      expect(YOUTUBE_URL_REGEX.test('youtube.com/watch?v=jNQXAC9IVRw')).toBe(true)
    })

    it('matches short URLs', () => {
      expect(YOUTUBE_URL_REGEX.test('https://youtu.be/jNQXAC9IVRw')).toBe(true)
      expect(YOUTUBE_URL_REGEX.test('youtu.be/jNQXAC9IVRw')).toBe(true)
    })

    it('matches embed URLs', () => {
      expect(YOUTUBE_URL_REGEX.test('https://www.youtube.com/embed/jNQXAC9IVRw')).toBe(true)
    })

    it('matches v/ URLs', () => {
      expect(YOUTUBE_URL_REGEX.test('https://www.youtube.com/v/jNQXAC9IVRw')).toBe(true)
    })

    it('matches shorts URLs', () => {
      expect(YOUTUBE_URL_REGEX.test('https://www.youtube.com/shorts/jNQXAC9IVRw')).toBe(true)
    })
  })

  describe('isValidYouTubeUrl', () => {
    it('validates standard watch URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=jNQXAC9IVRw')).toBe(true)
      expect(isValidYouTubeUrl('http://youtube.com/watch?v=jNQXAC9IVRw')).toBe(true)
      expect(isValidYouTubeUrl('youtube.com/watch?v=jNQXAC9IVRw')).toBe(true)
    })

    it('validates short URLs', () => {
      expect(isValidYouTubeUrl('https://youtu.be/jNQXAC9IVRw')).toBe(true)
    })

    it('validates embed URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/embed/jNQXAC9IVRw')).toBe(true)
    })

    it('validates shorts URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/shorts/jNQXAC9IVRw')).toBe(true)
    })

    it('validates playlist URLs', () => {
      expect(
        isValidYouTubeUrl(
          'https://www.youtube.com/playlist?list=PLFs4vir_WsTyXrrpFstD64Qj95vpy-yo1'
        )
      ).toBe(true)
    })

    it('validates watch URLs with list parameter', () => {
      expect(
        isValidYouTubeUrl(
          'https://www.youtube.com/watch?v=abc123def45&list=PLFs4vir_WsTyXrrpFstD64Qj95vpy-yo1'
        )
      ).toBe(true)
    })

    it('rejects invalid URLs', () => {
      expect(isValidYouTubeUrl('not-a-url')).toBe(false)
      expect(isValidYouTubeUrl('https://vimeo.com/123')).toBe(false)
      expect(isValidYouTubeUrl('')).toBe(false)
      expect(isValidYouTubeUrl('youtube.com')).toBe(false)
      expect(isValidYouTubeUrl('https://youtube.com/invalid')).toBe(false)
    })

    it('handles whitespace', () => {
      expect(isValidYouTubeUrl('  https://youtu.be/jNQXAC9IVRw  ')).toBe(true)
      expect(isValidYouTubeUrl('\thttps://youtu.be/jNQXAC9IVRw\n')).toBe(true)
    })
  })

  describe('isPlaylistUrl', () => {
    it('identifies dedicated playlist URLs', () => {
      expect(
        isPlaylistUrl('https://www.youtube.com/playlist?list=PLFs4vir_WsTyXrrpFstD64Qj95vpy-yo1')
      ).toBe(true)
    })

    it('identifies watch URLs with list parameter', () => {
      expect(
        isPlaylistUrl(
          'https://www.youtube.com/watch?v=abc123def45&list=PLFs4vir_WsTyXrrpFstD64Qj95vpy-yo1'
        )
      ).toBe(true)
      expect(isPlaylistUrl('https://youtube.com/watch?list=PLtest123&v=abc123def45')).toBe(true)
    })

    it('returns false for regular video URLs', () => {
      expect(isPlaylistUrl('https://www.youtube.com/watch?v=jNQXAC9IVRw')).toBe(false)
      expect(isPlaylistUrl('https://youtu.be/jNQXAC9IVRw')).toBe(false)
    })

    it('handles whitespace', () => {
      expect(isPlaylistUrl('  https://www.youtube.com/playlist?list=PLtest  ')).toBe(true)
    })
  })

  describe('extractPlaylistId', () => {
    it('extracts ID from playlist URL', () => {
      expect(
        extractPlaylistId(
          'https://www.youtube.com/playlist?list=PLFs4vir_WsTyXrrpFstD64Qj95vpy-yo1'
        )
      ).toBe('PLFs4vir_WsTyXrrpFstD64Qj95vpy-yo1')
    })

    it('extracts ID from watch URL with list param', () => {
      expect(extractPlaylistId('https://www.youtube.com/watch?v=abc&list=PLtest123')).toBe(
        'PLtest123'
      )
    })

    it('extracts ID when list param is first', () => {
      expect(extractPlaylistId('https://www.youtube.com/watch?list=PLfirst&v=abc')).toBe('PLfirst')
    })

    it('returns null for non-playlist URLs', () => {
      expect(extractPlaylistId('https://www.youtube.com/watch?v=abc')).toBeNull()
      expect(extractPlaylistId('https://youtu.be/abc')).toBeNull()
      expect(extractPlaylistId('not-a-url')).toBeNull()
    })

    it('handles IDs with hyphens and underscores', () => {
      expect(extractPlaylistId('https://www.youtube.com/playlist?list=PL_test-123_abc')).toBe(
        'PL_test-123_abc'
      )
    })
  })

  describe('extractVideoId', () => {
    it('extracts from standard watch URL', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=jNQXAC9IVRw')).toBe('jNQXAC9IVRw')
    })

    it('extracts from short URL', () => {
      expect(extractVideoId('https://youtu.be/jNQXAC9IVRw')).toBe('jNQXAC9IVRw')
      expect(extractVideoId('youtu.be/jNQXAC9IVRw')).toBe('jNQXAC9IVRw')
    })

    it('extracts from embed URL', () => {
      expect(extractVideoId('https://www.youtube.com/embed/jNQXAC9IVRw')).toBe('jNQXAC9IVRw')
    })

    it('extracts from v/ URL', () => {
      expect(extractVideoId('https://www.youtube.com/v/jNQXAC9IVRw')).toBe('jNQXAC9IVRw')
    })

    it('extracts from shorts URL', () => {
      expect(extractVideoId('https://www.youtube.com/shorts/jNQXAC9IVRw')).toBe('jNQXAC9IVRw')
    })

    it('returns null for invalid URL', () => {
      expect(extractVideoId('not-a-url')).toBeNull()
      expect(extractVideoId('')).toBeNull()
      expect(extractVideoId('https://vimeo.com/123456789')).toBeNull()
    })

    it('extracts from watch URL with additional params', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=jNQXAC9IVRw&t=30s')).toBe(
        'jNQXAC9IVRw'
      )
    })

    it('extracts from watch URL when v= is not the first query param', () => {
      expect(extractVideoId('https://www.youtube.com/watch?t=120&v=jNQXAC9IVRw')).toBe(
        'jNQXAC9IVRw'
      )
      expect(extractVideoId('https://www.youtube.com/watch?feature=share&v=jNQXAC9IVRw')).toBe(
        'jNQXAC9IVRw'
      )
      expect(
        extractVideoId('https://www.youtube.com/watch?si=abcd1234&list=PLtest&v=jNQXAC9IVRw')
      ).toBe('jNQXAC9IVRw')
    })

    it('handles IDs with hyphens and underscores', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
      expect(extractVideoId('https://youtu.be/_test-ID_12')).toBe('_test-ID_12')
    })

    it('handles whitespace', () => {
      expect(extractVideoId('  https://youtu.be/jNQXAC9IVRw  ')).toBe('jNQXAC9IVRw')
    })
  })
})
