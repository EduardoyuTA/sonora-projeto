import React from 'react'
import { AudioWaveform } from 'lucide-react'

interface SonoraBrandMarkProps {
  size?: 'sm' | 'md' | 'lg'
  centered?: boolean
  withBackdrop?: boolean
  className?: string
}

export const SonoraBrandMark: React.FC<SonoraBrandMarkProps> = React.memo(
  ({
    size = 'md',
    centered = false,
    withBackdrop = false,
    className = '',
  }) => {
    const avatarSize =
      size === 'lg'
        ? 'w-12 h-12 rounded-2xl'
        : size === 'sm'
          ? 'w-9 h-9 rounded-xl'
          : 'w-10 h-10 sm:w-11 sm:h-11 rounded-xl'

    const titleSize =
      size === 'lg'
        ? 'text-xl sm:text-2xl'
        : size === 'sm'
          ? 'text-base'
          : 'text-lg sm:text-[19px]'

    return (
      <div
        className={`inline-flex items-center gap-3 select-none ${
          centered ? 'justify-center' : ''
        } ${
          withBackdrop
            ? 'drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]'
            : ''
        } ${className}`}
      >
        <div
          className={`${avatarSize} shrink-0 flex items-center justify-center bg-[#C5F04A] text-[#0A0C0B]`}
        >
          <AudioWaveform className="w-1/2 h-1/2" strokeWidth={2.4} aria-hidden="true" />
        </div>

        <div className="flex flex-col items-start text-left">
          <span
            className={`font-display font-bold leading-none tracking-[0.04em] text-(--lg-text) ${titleSize}`}
          >
            SONORA
          </span>
          <span className="text-xs text-(--lg-muted) leading-tight mt-1">
            Vídeo para áudio
          </span>
        </div>
      </div>
    )
  }
)

SonoraBrandMark.displayName = 'SonoraBrandMark'
