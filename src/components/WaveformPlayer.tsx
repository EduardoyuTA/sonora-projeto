import React, { useEffect, useRef, useState } from 'react'
import {
  Pause,
  Play,
  Repeat,
  RotateCcw,
  RotateCw,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { formatDuration } from '../utils/formatters'
import { RangeInput } from './StudioControls'

interface WaveformPlayerProps {
  audioUrl: string
  fileName: string
  format: string
  qualityLabel: string
  duration: number
  peaks: number[]
  onPlayStateChange?: (isPlaying: boolean) => void
}

const RATES = [0.75, 1, 1.25, 1.5, 2]
const SKIP_SECONDS = 5

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  audioUrl,
  fileName,
  format,
  qualityLabel,
  duration,
  peaks,
  onPlayStateChange,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const litRef = useRef<HTMLDivElement | null>(null)
  const hoverRef = useRef<HTMLDivElement | null>(null)
  const timeRef = useRef<HTMLElement | null>(null)
  const isScrubbingRef = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [loadedDuration, setLoadedDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isLooping, setIsLooping] = useState(false)

  const resolvedDuration = loadedDuration > 0 ? loadedDuration : duration || 0
  const bars = peaks.length > 0 ? peaks : Array<number>(64).fill(0.35)

  useEffect(() => {
    onPlayStateChange?.(isPlaying)
  }, [isPlaying, onPlayStateChange])

  useEffect(() => () => onPlayStateChange?.(false), [onPlayStateChange])

  // O progresso anda fora do React para ficar fluido durante a reprodução
  useEffect(() => {
    let frame = 0
    const tick = () => {
      const audio = audioRef.current
      if (audio && resolvedDuration > 0) {
        const ratio = clamp(audio.currentTime / resolvedDuration, 0, 1)
        if (litRef.current) {
          litRef.current.style.clipPath = `inset(0 ${100 - ratio * 100}% 0 0)`
        }
        if (timeRef.current) {
          timeRef.current.textContent = formatDuration(audio.currentTime)
        }
        surfaceRef.current?.setAttribute('aria-valuenow', String(Math.round(audio.currentTime)))
        surfaceRef.current?.setAttribute('aria-valuetext', formatDuration(audio.currentTime))
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [resolvedDuration])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().catch(() => setIsPlaying(false))
    else audio.pause()
  }

  const seekTo = (time: number) => {
    const audio = audioRef.current
    if (audio) audio.currentTime = clamp(time, 0, resolvedDuration)
  }

  const skip = (seconds: number) => {
    const audio = audioRef.current
    if (audio) seekTo(audio.currentTime + seconds)
  }

  const timeAt = (clientX: number) => {
    const box = surfaceRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return 0
    return clamp((clientX - box.left) / box.width, 0, 1) * resolvedDuration
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || resolvedDuration <= 0) return
    isScrubbingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    seekTo(timeAt(event.clientX))
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const time = timeAt(event.clientX)
    const hover = hoverRef.current
    if (hover && resolvedDuration > 0) {
      hover.style.left = `${(time / resolvedDuration) * 100}%`
      hover.dataset.time = formatDuration(time)
    }
    if (isScrubbingRef.current) seekTo(time)
  }

  const stopScrubbing = () => {
    isScrubbingRef.current = false
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      skip(event.shiftKey ? SKIP_SECONDS : 2)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      skip(event.shiftKey ? -SKIP_SECONDS : -2)
    } else if (event.key === 'Home') {
      event.preventDefault()
      seekTo(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      seekTo(resolvedDuration)
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      togglePlay()
    }
  }

  const handleVolumeChange = (percent: number) => {
    const value = percent / 100
    const audio = audioRef.current
    setVolume(value)
    setIsMuted(value === 0)
    if (audio) {
      audio.volume = value
      audio.muted = value === 0
    }
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(playbackRate) + 1) % RATES.length]
    setPlaybackRate(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  const waveBars = (
    <>
      {bars.map((peak, index) => (
        <i key={index} style={{ height: `${Math.max(14, Math.round(peak * 100))}%` }} />
      ))}
    </>
  )

  return (
    <div className="st-player">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        loop={isLooping}
        onLoadStart={() => {
          setIsPlaying(false)
          setLoadedDuration(0)
        }}
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration
          if (Number.isFinite(value) && value > 0) setLoadedDuration(value)
        }}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <div className="st-player__head">
        <p className="text-strong min-w-0 truncate text-sm font-semibold" title={fileName}>
          {fileName}
        </p>
        <span className="st-player__tags">
          <b>{format}</b>
          <span>{qualityLabel}</span>
        </span>
      </div>

      <div className="st-player__main">
        <button
          type="button"
          className="st-transport__play"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
        >
          {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>

        <div
          ref={surfaceRef}
          className="st-player__wave"
          role="slider"
          tabIndex={0}
          aria-label="Posição da reprodução"
          aria-valuemin={0}
          aria-valuemax={Math.round(resolvedDuration)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopScrubbing}
          onPointerCancel={stopScrubbing}
          onKeyDown={handleKeyDown}
        >
          <div className="st-bars st-bars--base" aria-hidden="true">
            {waveBars}
          </div>
          <div ref={litRef} className="st-bars st-bars--lit" aria-hidden="true">
            {waveBars}
          </div>
          <div ref={hoverRef} className="st-hover" aria-hidden="true" />
        </div>
      </div>

      <div className="st-player__controls">
        <span className="st-clock">
          <strong ref={timeRef}>00:00</strong>
          <small>/ {formatDuration(resolvedDuration)}</small>
        </span>

        <div className="st-player__buttons">
          <button
            type="button"
            className="st-icon-btn"
            onClick={() => skip(-SKIP_SECONDS)}
            aria-label="Voltar 5 segundos"
            title="Voltar 5 segundos"
          >
            <RotateCcw aria-hidden="true" />
          </button>
          <button
            type="button"
            className="st-icon-btn"
            onClick={() => skip(SKIP_SECONDS)}
            aria-label="Avançar 5 segundos"
            title="Avançar 5 segundos"
          >
            <RotateCw aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`st-icon-btn ${isLooping ? 'is-active' : ''}`}
            onClick={() => setIsLooping((value) => !value)}
            aria-pressed={isLooping}
            aria-label="Repetir o áudio"
            title="Repetir"
          >
            <Repeat aria-hidden="true" />
          </button>
          <button
            type="button"
            className="st-chip st-chip--rate"
            onClick={cycleRate}
            aria-label={`Velocidade ${playbackRate}x. Clique para alterar`}
            title="Alterar velocidade"
          >
            {playbackRate}x
          </button>
        </div>

        <div className="st-player__volume">
          <button
            type="button"
            className="st-icon-btn"
            onClick={toggleMute}
            aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
          >
            <VolumeIcon aria-hidden="true" />
          </button>
          <RangeInput
            min={0}
            max={100}
            step={5}
            value={isMuted ? 0 : Math.round(volume * 100)}
            aria-label="Volume do player"
            onValueChange={handleVolumeChange}
          />
        </div>
      </div>
    </div>
  )
}
