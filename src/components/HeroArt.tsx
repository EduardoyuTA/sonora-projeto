import React, { useId } from 'react'
import { ArrowRight, Film, Music, Music2 } from 'lucide-react'

interface HeroArtProps {
  variant: 'desktop' | 'mobile'
}

// Thin flowing lines that read as a glowing sound wave
const WAVE_PATHS = Array.from({ length: 9 }, (_, i) => {
  const offset = i * 5
  return `M -20 ${120 + offset} C 120 ${40 + offset * 1.6}, 220 ${210 - offset}, 360 ${
    110 + offset * 0.6
  } S 560 ${20 + offset * 1.4}, 720 ${90 + offset}`
})

const SoundWaves: React.FC<{ className?: string }> = ({ className = '' }) => {
  // Unique ids: both layouts may be in the DOM (one hidden by CSS)
  const uid = useId().replace(/:/g, '')
  const gradientId = `sonora-wave-${uid}`
  const glowId = `sonora-wave-glow-${uid}`
  return (
  <svg
    aria-hidden="true"
    viewBox="0 0 700 240"
    preserveAspectRatio="none"
    className={`pointer-events-none ${className}`}
  >
    <defs>
      <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#BCEE45" stopOpacity="0" />
        <stop offset="0.35" stopColor="#BCEE45" stopOpacity="0.85" />
        <stop offset="0.75" stopColor="#D9FF7A" stopOpacity="0.6" />
        <stop offset="1" stopColor="#BCEE45" stopOpacity="0" />
      </linearGradient>
      <filter id={glowId} x="-10%" y="-40%" width="120%" height="180%">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g className="wave-drift" filter={`url(#${glowId})`}>
      {WAVE_PATHS.map((d, i) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={i === 4 ? 2 : 0.8}
          strokeOpacity={i === 4 ? 1 : 0.55}
        />
      ))}
    </g>
  </svg>
  )
}

const Sparkles: React.FC = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0">
    {[
      ['8%', '30%', '0s'],
      ['92%', '18%', '0.6s'],
      ['85%', '78%', '1.2s'],
      ['22%', '82%', '1.8s'],
      ['60%', '6%', '0.9s'],
    ].map(([left, top, delay]) => (
      <span
        key={`${left}-${top}`}
        className="sparkle absolute h-1 w-1 rounded-full bg-[#D9FF7A] shadow-[0_0_8px_#BCEE45]"
        style={{ left, top, animationDelay: delay }}
      />
    ))}
  </div>
)

export const HeroArt: React.FC<HeroArtProps> = ({ variant }) => {
  if (variant === 'mobile') {
    return (
      <div className="relative mx-auto flex h-44 w-full items-center justify-center">
        <SoundWaves className="absolute -inset-x-10 top-2 h-40 w-[calc(100%+5rem)]" />
        <Music2
          aria-hidden="true"
          className="absolute left-6 bottom-6 h-7 w-7 text-[#BCEE45]/70 -rotate-12"
        />
        <Music2
          aria-hidden="true"
          className="absolute right-8 top-2 h-7 w-7 text-[#BCEE45]/70 rotate-12"
        />
        <div className="glass relative flex items-center gap-3 rounded-[28px] p-3">
          <div className="tile-3d tile-glass h-[4.5rem] w-[4.5rem]">
            <Film className="h-8 w-8" strokeWidth={1.8} />
          </div>
          <ArrowRight className="h-5 w-5 text-[#BCEE45]" strokeWidth={2.4} />
          <div className="tile-3d tile-lime h-[4.5rem] w-[4.5rem]">
            <Music className="h-9 w-9" strokeWidth={2.4} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-56 w-full">
      <SoundWaves className="absolute -left-10 -right-6 top-0 h-full w-[calc(100%+4rem)]" />
      <Sparkles />
      <div className="absolute inset-0 flex items-center justify-center gap-4">
        <div className="tile-3d tile-glass h-28 w-28 [transform:perspective(600px)_rotateY(14deg)_rotate(-6deg)]">
          <Film className="h-12 w-12" strokeWidth={1.7} />
        </div>
        <ArrowRight className="h-6 w-6 text-[#BCEE45]" strokeWidth={2.4} />
        <div className="tile-3d tile-lime h-32 w-32 translate-y-4 [transform:perspective(600px)_rotateY(-12deg)_rotate(5deg)]">
          <Music className="h-14 w-14" strokeWidth={2.4} />
        </div>
      </div>
    </div>
  )
}
