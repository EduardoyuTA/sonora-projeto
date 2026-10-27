import React, { useEffect, useRef, useState } from 'react'
import {
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { formatDuration } from '../utils/formatters'

interface WaveformPlayerProps {
  audioUrl: string
  fileName: string
  format: string
  qualityLabel: string
  duration: number
  peaks: number[]
  theme: 'light' | 'dark'
  onPlayStateChange?: (isPlaying: boolean) => void
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  audioUrl,
  fileName,
  format,
  qualityLabel,
  duration,
  peaks,
  theme,
  onPlayStateChange,
}) => {
  const isDark = theme === 'dark'
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveformContainerRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [resolvedDuration, setResolvedDuration] = useState(duration || 0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState<number>(1)

  const rates = [0.75, 1, 1.25, 1.5, 2]

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setResolvedDuration(duration || 0)
    onPlayStateChange?.(false)
  }, [audioUrl, duration, onPlayStateChange])

  useEffect(() => {
    onPlayStateChange?.(isPlaying)
  }, [isPlaying, onPlayStateChange])

  useEffect(() => {
    return () => {
      onPlayStateChange?.(false)
    }
  }, [onPlayStateChange])

  const togglePlay = async () => {
    const el = audioRef.current
    if (!el) return
    try {
      if (el.paused) {
        await el.play()
        setIsPlaying(true)
      } else {
        el.pause()
        setIsPlaying(false)
      }
    } catch {
      setIsPlaying(false)
    }
  }

  const handleRestart = () => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = 0
    setCurrentTime(0)
  }

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current
    const container = waveformContainerRef.current
    if (!el || !container || resolvedDuration <= 0) return

    const rect = container.getBoundingClientRect()
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const ratio = clickX / rect.width
    const newTime = ratio * resolvedDuration
    el.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleKeyDownSeek = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = audioRef.current
    if (!el || resolvedDuration <= 0) return

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const next = Math.min(resolvedDuration, el.currentTime + 2)
      el.currentTime = next
      setCurrentTime(next)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prev = Math.max(0, el.currentTime - 2)
      el.currentTime = prev
      setCurrentTime(prev)
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      togglePlay()
    }
  }

  const handleVolumeChange = (val: number) => {
    const el = audioRef.current
    setVolume(val)
    setIsMuted(val === 0)
    if (el) {
      el.volume = val
      el.muted = val === 0
    }
  }

  const toggleMute = () => {
    const el = audioRef.current
    if (!el) return
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    el.muted = nextMuted
  }

  const cyclePlaybackRate = () => {
    const el = audioRef.current
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length
    const nextRate = rates[nextIndex]
    setPlaybackRate(nextRate)
    if (el) {
      el.playbackRate = nextRate
    }
  }

  const progressRatio =
    resolvedDuration > 0
      ? Math.max(0, Math.min(1, currentTime / resolvedDuration))
      : 0

  const barList = peaks && peaks.length > 0 ? peaks : Array(64).fill(0.35)

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
        isDark
          ? 'bg-[#111316] border-[#24282E] text-[#F3F4F6]'
          : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111315]'
      }`}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration
          if (Number.isFinite(dur) && dur > 0) {
            setResolvedDuration(dur)
          }
        }}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* Top Row: File Name & Format/Quality Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying
                  ? 'bg-[#A3E635] animate-ping'
                  : isDark
                    ? 'bg-[#374151]'
                    : 'bg-[#CBD5E1]'
              }`}
            />
            <p className="font-semibold text-sm truncate" title={fileName}>
              {fileName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono shrink-0">
          <span className="px-2 py-0.5 rounded-md font-bold uppercase bg-[#BCEE45] text-[#111315]">
            {format}
          </span>
          <span
            className={`px-2 py-0.5 rounded-md border ${
              isDark
                ? 'bg-[#1C1F24] border-[#2D323B] text-[#9CA3AF]'
                : 'bg-white border-[#E5E7EB] text-[#525866]'
            }`}
          >
            {qualityLabel}
          </span>
        </div>
      </div>

      {/* Center Row: Play/Pause + Real Interactive Waveform + Time */}
      <div className="flex items-center gap-3.5 sm:gap-4">
        <button
          type="button"
          onClick={togglePlay}
          className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-[#BCEE45] hover:bg-[#A3E635] active:scale-95 text-[#111315] shadow-xs transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635]"
          aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Interactive Waveform Bars */}
        <div className="flex-1 min-w-0">
          <div
            ref={waveformContainerRef}
            onClick={handleSeekClick}
            onKeyDown={handleKeyDownSeek}
            tabIndex={0}
            role="slider"
            aria-label="Posição da reprodução na forma de onda"
            aria-valuemin={0}
            aria-valuemax={Math.round(resolvedDuration)}
            aria-valuenow={Math.round(currentTime)}
            className="h-14 flex items-center justify-between gap-[2px] sm:gap-[3px] cursor-pointer select-none py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] rounded-lg px-1"
          >
            {barList.map((peak, idx) => {
              const barProgress = idx / barList.length
              const isPlayed = barProgress <= progressRatio
              const heightPercent = Math.max(14, Math.round(peak * 100))

              return (
                <div
                  key={idx}
                  className="flex-1 h-full flex items-center justify-center"
                >
                  <div
                    className={`w-full rounded-full transition-all duration-150 ${
                      isPlayed
                        ? isDark
                          ? 'bg-[#BCEE45]'
                          : 'bg-[#65A30D]'
                        : isDark
                          ? 'bg-[#2D323B] hover:bg-[#3E4552]'
                          : 'bg-[#D1D5DB] hover:bg-[#9CA3AF]'
                    }`}
                    style={{
                      height: `${heightPercent}%`,
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Controls Row: Time, Restart, Playback Speed, Volume */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-[#E5E7EB] dark:border-[#24282E] text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono font-medium">
            <strong className={isDark ? 'text-white' : 'text-[#111315]'}>
              {formatDuration(currentTime)}
            </strong>{' '}
            <span className={isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'}>
              / {formatDuration(resolvedDuration)}
            </span>
          </span>

          <button
            type="button"
            onClick={handleRestart}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'border-[#2D323B] text-[#9CA3AF] hover:text-white'
                : 'border-[#E5E7EB] text-[#525866] hover:text-[#111315]'
            }`}
            title="Voltar ao início"
            aria-label="Voltar ao início do áudio"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={cyclePlaybackRate}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border font-mono font-medium transition-colors cursor-pointer ${
              isDark
                ? 'border-[#2D323B] text-[#9CA3AF] hover:text-white'
                : 'border-[#E5E7EB] text-[#525866] hover:text-[#111315]'
            }`}
            title="Alterar velocidade de reprodução"
            aria-label={`Velocidade de reprodução ${playbackRate}x`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>{playbackRate}x</span>
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark
                ? 'text-[#9CA3AF] hover:text-white'
                : 'text-[#525866] hover:text-[#111315]'
            }`}
            aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-500" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            aria-label="Controle de volume do player"
            className="w-20 sm:w-24 h-1.5 rounded-lg bg-gray-300 dark:bg-gray-700"
          />
        </div>
      </div>
    </div>
  )
}
