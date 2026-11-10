import React from 'react'
import type { MascotMood } from '../types/sonora'

type Eyes = 'dot' | 'happy' | 'wide' | 'look' | 'focus'
type Mouth = 'smile' | 'open' | 'grin' | 'flat'
type Extra = 'phones' | 'glass' | 'notes' | 'spark' | 'sweat' | 'heart' | 'drop'

interface Face {
  eyes: Eyes
  mouth: Mouth
  extras: Extra[]
  cheek: number
  motion: string
}

// Expressão e movimento de cada humor
const FACES: Record<MascotMood, Face> = {
  idle: { eyes: 'dot', mouth: 'smile', extras: [], cheek: 0.45, motion: 'capy-float' },
  loaded: { eyes: 'dot', mouth: 'smile', extras: [], cheek: 0.55, motion: 'capy-float' },
  dragging: { eyes: 'wide', mouth: 'open', extras: ['drop'], cheek: 0.45, motion: 'capy-bounce' },
  validating: { eyes: 'look', mouth: 'smile', extras: ['glass'], cheek: 0.45, motion: 'capy-inspect' },
  tuning: { eyes: 'dot', mouth: 'smile', extras: ['phones'], cheek: 0.45, motion: 'capy-sway' },
  trimming: { eyes: 'focus', mouth: 'smile', extras: [], cheek: 0.45, motion: 'capy-inspect' },
  converting: { eyes: 'focus', mouth: 'smile', extras: ['phones'], cheek: 0.45, motion: 'capy-sway' },
  grooving: { eyes: 'happy', mouth: 'grin', extras: ['phones', 'notes'], cheek: 0.6, motion: 'capy-bounce' },
  success: { eyes: 'happy', mouth: 'grin', extras: ['spark'], cheek: 0.7, motion: 'capy-hop' },
  error: { eyes: 'wide', mouth: 'flat', extras: ['sweat'], cheek: 0.3, motion: 'capy-shake' },
  petted: { eyes: 'happy', mouth: 'smile', extras: ['heart'], cheek: 0.85, motion: 'capy-hop' },
}

const INK = '#24170D'

interface CapybaraProps {
  mood?: MascotMood
  size?: number
  /** Desliga o movimento do corpo (o piscar continua, se o sistema permitir) */
  still?: boolean
  className?: string
  title?: string
}

export const Capybara: React.FC<CapybaraProps> = ({
  mood = 'idle',
  size = 64,
  still = false,
  className = '',
  title,
}) => {
  const face = FACES[mood] ?? FACES.idle
  const has = (extra: Extra) => face.extras.includes(extra)
  const blinks = face.eyes === 'dot' || face.eyes === 'look'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={`capy ${still ? '' : face.motion} ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      // A chave reinicia a animação quando o humor muda
      key={mood}
    >
      {/* corpo */}
      <rect x="20" y="80" width="80" height="50" rx="26" fill="#9F6E45" />
      <ellipse cx="60" cy="108" rx="22" ry="13" fill="#C19468" />

      {/* orelhas */}
      <g className={mood === 'petted' || mood === 'dragging' ? 'capy-ears' : undefined}>
        <ellipse cx="27" cy="31" rx="7" ry="6" fill="#7E5232" />
        <ellipse cx="93" cy="31" rx="7" ry="6" fill="#7E5232" />
        <ellipse cx="27" cy="32" rx="3.2" ry="2.6" fill="#5E3B22" />
        <ellipse cx="93" cy="32" rx="3.2" ry="2.6" fill="#5E3B22" />
      </g>

      {/* cabeça */}
      <rect x="12" y="30" width="96" height="60" rx="27" fill="#B07D52" />

      {has('phones') && (
        <g>
          <path
            d="M14 60 C14 12, 106 12, 106 60"
            stroke="#C5F04A"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="4" y="50" width="15" height="24" rx="7" fill="#C5F04A" />
          <rect x="101" y="50" width="15" height="24" rx="7" fill="#C5F04A" />
        </g>
      )}

      {/* bochechas */}
      <ellipse cx="25" cy="68" rx="6" ry="4" fill="#E59A7A" opacity={face.cheek} />
      <ellipse cx="95" cy="68" rx="6" ry="4" fill="#E59A7A" opacity={face.cheek} />

      {/* focinho e nariz */}
      <rect x="33" y="54" width="54" height="34" rx="17" fill="#8E5F3A" />
      <rect x="45" y="58" width="30" height="11" rx="5.5" fill="#3E2716" />

      {/* olhos */}
      <g className={blinks ? 'capy-blink' : undefined}>
        {face.eyes === 'dot' && (
          <>
            <circle cx="34" cy="46" r="5" fill={INK} />
            <circle cx="86" cy="46" r="5" fill={INK} />
            <circle cx="35.6" cy="44.4" r="1.6" fill="#fff" />
            <circle cx="87.6" cy="44.4" r="1.6" fill="#fff" />
          </>
        )}
        {face.eyes === 'look' && (
          <>
            <circle cx="37" cy="44" r="5" fill={INK} />
            <circle cx="89" cy="44" r="5" fill={INK} />
            <circle cx="38.4" cy="42.6" r="1.5" fill="#fff" />
            <circle cx="90.4" cy="42.6" r="1.5" fill="#fff" />
          </>
        )}
      </g>
      {face.eyes === 'happy' && (
        <g stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round">
          <path d="M28 48 Q34 40 40 48" />
          <path d="M80 48 Q86 40 92 48" />
        </g>
      )}
      {face.eyes === 'wide' && (
        <>
          <circle cx="34" cy="45" r="7.5" fill="#fff" />
          <circle cx="86" cy="45" r="7.5" fill="#fff" />
          <circle cx="34" cy="45" r="4" fill={INK} />
          <circle cx="86" cy="45" r="4" fill={INK} />
        </>
      )}
      {face.eyes === 'focus' && (
        <g fill={INK}>
          <rect x="28" y="44" width="12" height="5" rx="2.5" />
          <rect x="80" y="44" width="12" height="5" rx="2.5" />
        </g>
      )}

      {/* boca */}
      {face.mouth === 'smile' && (
        <path
          d="M52 76 Q60 83 68 76"
          stroke="#3E2716"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {face.mouth === 'open' && <ellipse cx="60" cy="78" rx="4.5" ry="5.5" fill="#4A1F15" />}
      {face.mouth === 'grin' && (
        <g>
          <path d="M49 74 Q60 89 71 74 Z" fill="#4A1F15" />
          <ellipse cx="60" cy="81" rx="5" ry="3" fill="#E07A6A" />
        </g>
      )}
      {face.mouth === 'flat' && (
        <path
          d="M51 78 Q55.5 74.5 60 78 T69 78"
          stroke="#3E2716"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* acessórios */}
      {has('glass') && (
        <g className="capy-pop-in">
          <circle cx="96" cy="92" r="11" fill="rgba(255,255,255,0.18)" stroke="#C5F04A" strokeWidth="4" />
          <path d="M104 100 L113 109" stroke="#C5F04A" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}
      {has('notes') && (
        <g fill="#C5F04A" className="capy-notes">
          <ellipse cx="104" cy="30" rx="4.5" ry="3.5" />
          <rect x="107" y="12" width="2.5" height="18" rx="1" />
          <ellipse cx="14" cy="22" rx="3.5" ry="2.8" />
          <rect x="16.2" y="8" width="2" height="14" rx="1" />
        </g>
      )}
      {has('spark') && (
        <path
          className="capy-pop-in"
          d="M104 6 L107 15 L116 18 L107 21 L104 30 L101 21 L92 18 L101 15 Z"
          fill="#C5F04A"
        />
      )}
      {has('sweat') && (
        <path className="capy-pop-in" d="M101 24 C96 32 96 37 101 38 C106 37 106 32 101 24 Z" fill="#7DD3FC" />
      )}
      {has('heart') && (
        <path className="capy-pop-in" d="M104 32 C94 25 96 14 104 19 C112 14 114 25 104 32 Z" fill="#F472B6" />
      )}
      {has('drop') && (
        <path
          className="capy-notes"
          d="M60 4 L60 18 M53 11 L60 18 L67 11"
          stroke="#C5F04A"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
