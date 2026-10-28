import React from 'react'

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
          className={`${avatarSize} overflow-hidden border-2 border-[#B8F238] bg-white shrink-0 shadow-[0_0_16px_rgba(184,242,56,0.22)]`}
        >
          <img
            src="/mascote.png"
            alt="Logotipo Capivara SONORA"
            className="h-full w-full object-cover object-[50%_20%]"
            draggable={false}
          />
        </div>

        <div className="flex flex-col items-start text-left">
          <div className="flex items-center gap-2">
            <span
              className={`font-bold tracking-tight leading-none text-[#F7F8F8] ${titleSize}`}
            >
              SONORA
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-md font-semibold bg-[#1B2616] text-[#B8F238] border border-[#B8F238]/35">
              STUDIO
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#9CA5B2] leading-tight mt-1">
            VÍDEO PARA ÁUDIO
          </span>
        </div>
      </div>
    )
  }
)

SonoraBrandMark.displayName = 'SonoraBrandMark'
