import { Music } from 'lucide-react'

interface AudioOnlyToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled: boolean
}

export function AudioOnlyToggle({ enabled, onChange, disabled }: AudioOnlyToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          enabled ? 'bg-primary' : 'bg-surface-hover'
        }`}
        data-testid="audio-toggle"
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span
        className="flex items-center gap-1.5 text-text-secondary text-sm"
        data-testid="audio-toggle-label"
      >
        <Music className="w-4 h-4" />
        Audio Only
      </span>
    </div>
  )
}
