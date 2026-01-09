interface TranscriptionOptionsProps {
  format: 'txt' | 'srt' | 'vtt'
  language: string
  onFormatChange: (format: 'txt' | 'srt' | 'vtt') => void
  onLanguageChange: (language: string) => void
  disabled: boolean
}

const LANGUAGES = [
  { code: 'auto', label: 'Auto-detect' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
]

export function TranscriptionOptions({
  format,
  language,
  onFormatChange,
  onLanguageChange,
  disabled,
}: TranscriptionOptionsProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label htmlFor="transcription-format" className="text-text-secondary text-sm">
          Format:
        </label>
        <select
          id="transcription-format"
          value={format}
          onChange={(e) => onFormatChange(e.target.value as 'txt' | 'srt' | 'vtt')}
          disabled={disabled}
          className="bg-surface text-text-primary border border-surface-hover rounded px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="transcription-format-select"
        >
          <option value="txt">Plain Text (.txt)</option>
          <option value="srt">Subtitles (.srt)</option>
          <option value="vtt">WebVTT (.vtt)</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="transcription-language" className="text-text-secondary text-sm">
          Language:
        </label>
        <select
          id="transcription-language"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={disabled}
          className="bg-surface text-text-primary border border-surface-hover rounded px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="transcription-language-select"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
