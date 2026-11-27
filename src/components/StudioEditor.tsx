import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Drum,
  Flag,
  FlagOff,
  Keyboard,
  Pause,
  Play,
  Redo2,
  Repeat,
  RotateCcw,
  Sparkles,
  Square,
  Undo2,
  Volume2,
} from 'lucide-react'
import type {
  AudioFormat,
  BitrateKbps,
  ConversionConfig,
  ProcessingMode,
  QualityTier,
  VideoMetadata,
} from '../types/sonora'
import {
  estimateOutputSizeBytes,
  formatBytes,
  formatDuration,
  formatPreciseTime,
} from '../utils/formatters'
import { INTRO_BEATS_SECONDS } from '../services/audioConversionEngine'
import { extractVideoWaveform } from '../services/waveformService'
import { MIN_CUT_SECONDS, TrimTimeline } from './TrimTimeline'
import { RangeInput, SwitchRow } from './StudioControls'

interface StudioEditorProps {
  video: VideoMetadata
  config: ConversionConfig
  onChangeConfig: (next: ConversionConfig) => void
  onStartConversion: () => void
  processingMode: ProcessingMode
  onPlayStateChange?: (isPlaying: boolean) => void
}

const FORMATS: { id: AudioFormat; hint: string; needsServer?: boolean }[] = [
  { id: 'mp3', hint: 'Toca em qualquer lugar' },
  { id: 'wav', hint: 'Sem compressão, ideal para editar' },
  { id: 'm4a', hint: 'Leve, ótimo para Apple', needsServer: true },
  { id: 'aac', hint: 'Compacto para players modernos', needsServer: true },
]

const BITRATES: { kbps: BitrateKbps; tier: QualityTier; label: string }[] = [
  { kbps: 128, tier: 'economica', label: 'Econômica' },
  { kbps: 192, tier: 'padrao', label: 'Padrão' },
  { kbps: 256, tier: 'personalizada', label: 'Personalizada' },
  { kbps: 320, tier: 'alta', label: 'Alta' },
]

const SHORTCUTS = [
  ['Espaço', 'Tocar ou pausar'],
  ['I', 'Marcar início'],
  ['O', 'Marcar fim'],
  ['L', 'Repetir o trecho'],
  ['← →', 'Andar 1 segundo'],
  ['Ctrl + Z', 'Desfazer'],
  ['Ctrl + Y', 'Refazer'],
]

const HISTORY_LIMIT = 50
const HISTORY_GROUP_MS = 500
const QUICK_CUT_SECONDS = 30

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const parseTime = (text: string) => {
  const match = /^(?:(\d+):)?(\d+(?:[.,]\d+)?)$/.exec(text.trim())
  if (!match) return null
  return Number(match[1] ?? 0) * 60 + Number(match[2].replace(',', '.'))
}

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

const TimeField: React.FC<{
  label: string
  value: number
  onCommit: (value: number) => void
}> = ({ label, value, onCommit }) => {
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    if (draft === null) return
    const parsed = parseTime(draft)
    if (parsed !== null) onCommit(parsed)
    setDraft(null)
  }

  return (
    <label className="st-time-field">
      <span>{label}</span>
      <input
        inputMode="decimal"
        value={draft ?? formatPreciseTime(value)}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setDraft(null)
            event.currentTarget.blur()
          }
        }}
      />
    </label>
  )
}

export const StudioEditor: React.FC<StudioEditorProps> = ({
  video,
  config,
  onChangeConfig,
  onStartConversion,
  processingMode,
  onPlayStateChange,
}) => {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loopSelection, setLoopSelection] = useState(true)
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [isLoadingPeaks, setIsLoadingPeaks] = useState(true)
  const [isPreviewingBeats, setIsPreviewingBeats] = useState(false)
  const [past, setPast] = useState<ConversionConfig[]>([])
  const [future, setFuture] = useState<ConversionConfig[]>([])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastEditAtRef = useRef(0)
  const timeLabelRef = useRef<HTMLSpanElement | null>(null)
  const meterRef = useRef<HTMLDivElement | null>(null)
  const beatsAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioGraphRef = useRef<{
    context: AudioContext
    gain: GainNode
    analyser: AnalyserNode
  } | null>(null)

  const attachVideo = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element
    setVideoElement(element)
  }, [])

  const duration = video.duration
  const start = config.startTime
  const end = Math.min(config.endTime > 0 ? config.endTime : duration, duration)
  const previewGain = config.preserveOriginal ? 1 : config.volume / 100

  const liveRef = useRef({ start, end, loopSelection, previewGain })
  useEffect(() => {
    liveRef.current = { start, end, loopSelection, previewGain }
  }, [start, end, loopSelection, previewGain])

  useEffect(() => {
    let active = true
    extractVideoWaveform(video).then((result) => {
      if (!active) return
      setPeaks(result)
      setIsLoadingPeaks(false)
    })
    return () => {
      active = false
    }
  }, [video])

  useEffect(() => {
    const graph = audioGraphRef.current
    graph?.gain.gain.setTargetAtTime(previewGain, graph.context.currentTime, 0.03)
  }, [previewGain])

  useEffect(() => {
    return () => {
      audioGraphRef.current?.context.close().catch(() => {})
      audioGraphRef.current = null
      beatsAudioRef.current?.pause()
      onPlayStateChange?.(false)
    }
  }, [onPlayStateChange])

  // Mantém a prévia dentro do trecho e atualiza relógio e medidor de nível
  useEffect(() => {
    const element = videoRef.current
    if (!videoElement || !element) return
    let frame = 0
    let level = 0
    const samples = new Float32Array(1024)

    const tick = () => {
      const live = liveRef.current
      if (!element.paused && element.currentTime >= live.end - 0.03) {
        if (live.loopSelection) {
          element.currentTime = live.start
        } else {
          element.pause()
          element.currentTime = live.end
        }
      }

      if (timeLabelRef.current) {
        timeLabelRef.current.textContent = formatPreciseTime(element.currentTime)
      }

      const graph = audioGraphRef.current
      let peak = 0
      if (graph && !element.paused) {
        graph.analyser.getFloatTimeDomainData(samples)
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
      }
      level = Math.max(peak, level * 0.9)
      if (meterRef.current) {
        meterRef.current.style.setProperty('--level', Math.min(1, level).toFixed(3))
        meterRef.current.classList.toggle('is-clipping', level >= 0.99)
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [videoElement])

  const updateConfig = useCallback(
    (patch: Partial<ConversionConfig>) => {
      const now = Date.now()
      // Ajustes seguidos, como arrastar uma alça, viram um único passo de desfazer
      if (now - lastEditAtRef.current > HISTORY_GROUP_MS) {
        setPast((items) => [...items.slice(-(HISTORY_LIMIT - 1)), config])
        setFuture([])
      }
      lastEditAtRef.current = now
      onChangeConfig({ ...config, ...patch })
    },
    [config, onChangeConfig]
  )

  const undo = useCallback(() => {
    const previous = past[past.length - 1]
    if (!previous) return
    setPast(past.slice(0, -1))
    setFuture((items) => [config, ...items])
    lastEditAtRef.current = 0
    onChangeConfig(previous)
  }, [config, onChangeConfig, past])

  const redo = useCallback(() => {
    const [next, ...rest] = future
    if (!next) return
    setFuture(rest)
    setPast((items) => [...items, config])
    lastEditAtRef.current = 0
    onChangeConfig(next)
  }, [config, future, onChangeConfig])

  const seek = useCallback(
    (time: number) => {
      if (videoRef.current) videoRef.current.currentTime = clamp(time, 0, duration)
    },
    [duration]
  )

  const ensureAudioGraph = useCallback(() => {
    const element = videoRef.current
    if (!element) return
    if (audioGraphRef.current) {
      audioGraphRef.current.context.resume().catch(() => {})
      return
    }
    try {
      const context = new AudioContext()
      const source = context.createMediaElementSource(element)
      const gain = context.createGain()
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      gain.gain.value = liveRef.current.previewGain
      source.connect(gain)
      gain.connect(analyser)
      analyser.connect(context.destination)
      audioGraphRef.current = { context, gain, analyser }
    } catch {
      // Sem o grafo de áudio, a prévia toca no volume original do vídeo
    }
  }, [])

  const togglePlay = useCallback(() => {
    const element = videoRef.current
    if (!element) return
    if (!element.paused) {
      element.pause()
      return
    }
    ensureAudioGraph()
    const { currentTime } = element
    if (currentTime < start || currentTime >= end - 0.05) {
      element.currentTime = start
    }
    element.play().catch(() => setIsPlaying(false))
  }, [end, ensureAudioGraph, start])

  const markStart = useCallback(() => {
    if (!videoRef.current) return
    const time = Math.round(videoRef.current.currentTime * 10) / 10
    updateConfig({ startTime: clamp(time, 0, end - MIN_CUT_SECONDS) })
  }, [end, updateConfig])

  const markEnd = useCallback(() => {
    if (!videoRef.current) return
    const time = Math.round(videoRef.current.currentTime * 10) / 10
    updateConfig({ endTime: clamp(time, start + MIN_CUT_SECONDS, duration) })
  }, [duration, start, updateConfig])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const target = event.target as HTMLElement
      const key = event.key.toLowerCase()
      const hasCommand = event.ctrlKey || event.metaKey

      if (hasCommand && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (hasCommand && key === 'y') {
        event.preventDefault()
        redo()
        return
      }
      if (hasCommand || event.altKey) return

      if (key === ' ' && target.tagName !== 'BUTTON' && target.tagName !== 'SUMMARY') {
        event.preventDefault()
        togglePlay()
      } else if (key === 'i') {
        markStart()
      } else if (key === 'o') {
        markEnd()
      } else if (key === 'l') {
        setLoopSelection((value) => !value)
      } else if (
        (key === 'arrowleft' || key === 'arrowright') &&
        target.getAttribute('role') !== 'slider' &&
        videoRef.current
      ) {
        event.preventDefault()
        seek(videoRef.current.currentTime + (key === 'arrowleft' ? -1 : 1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [markEnd, markStart, redo, seek, togglePlay, undo])

  const toggleBeatsPreview = () => {
    if (!beatsAudioRef.current) {
      const audio = new Audio('/audio/batida-inicial.mp3')
      audio.addEventListener('ended', () => setIsPreviewingBeats(false))
      beatsAudioRef.current = audio
    }
    const audio = beatsAudioRef.current
    audio.currentTime = 0
    if (isPreviewingBeats) {
      audio.pause()
      setIsPreviewingBeats(false)
      return
    }
    audio.play().then(
      () => setIsPreviewingBeats(true),
      () => setIsPreviewingBeats(false)
    )
  }

  const selectedDuration =
    Math.max(MIN_CUT_SECONDS, end - start) +
    (config.introBeats ? INTRO_BEATS_SECONDS : 0)
  const estimatedSize = estimateOutputSizeBytes(
    selectedDuration,
    config.format,
    config.bitrate
  )
  const bitrateIndex = Math.max(
    0,
    BITRATES.findIndex((item) => item.kbps === config.bitrate)
  )
  const hasFullRange = start <= 0 && end >= duration - 0.05
  const canQuickCut = duration > QUICK_CUT_SECONDS

  return (
    <section className="st-editor" aria-label="Editor de áudio">
      <div className="st-editor__main">
        <div className="st-monitor">
          <video
            ref={attachVideo}
            src={video.objectUrl}
            playsInline
            preload="metadata"
            onClick={togglePlay}
            onPlay={() => {
              setIsPlaying(true)
              onPlayStateChange?.(true)
            }}
            onPause={() => {
              setIsPlaying(false)
              onPlayStateChange?.(false)
            }}
            onLoadedMetadata={(event) => {
              event.currentTarget.currentTime = start
            }}
          />
          {!isPlaying && (
            <button
              type="button"
              className="st-monitor__play"
              onClick={togglePlay}
              aria-label="Tocar o trecho selecionado"
            >
              <Play aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="st-transport">
          <button
            type="button"
            className="st-transport__play"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pausar a prévia' : 'Tocar a prévia'}
            title="Tocar ou pausar (Espaço)"
          >
            {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <button
            type="button"
            className={`st-icon-btn ${loopSelection ? 'is-active' : ''}`}
            onClick={() => setLoopSelection((value) => !value)}
            aria-pressed={loopSelection}
            aria-label="Repetir o trecho selecionado"
            title="Repetir o trecho (L)"
          >
            <Repeat aria-hidden="true" />
          </button>
          <p className="st-clock">
            <span ref={timeLabelRef}>{formatPreciseTime(start)}</span>
            <small>/ {formatDuration(duration)}</small>
          </p>
          <div ref={meterRef} className="st-level" role="img" aria-label="Nível do áudio">
            <i />
          </div>
          <div className="st-transport__history">
            <button
              type="button"
              className="st-icon-btn"
              onClick={undo}
              disabled={past.length === 0}
              aria-label="Desfazer"
              title="Desfazer (Ctrl + Z)"
            >
              <Undo2 aria-hidden="true" />
            </button>
            <button
              type="button"
              className="st-icon-btn"
              onClick={redo}
              disabled={future.length === 0}
              aria-label="Refazer"
              title="Refazer (Ctrl + Y)"
            >
              <Redo2 aria-hidden="true" />
            </button>
            <details className="st-shortcuts">
              <summary className="st-icon-btn" aria-label="Ver atalhos do teclado" title="Atalhos">
                <Keyboard aria-hidden="true" />
              </summary>
              <dl>
                {SHORTCUTS.map(([keys, action]) => (
                  <div key={keys}>
                    <dt>{keys}</dt>
                    <dd>{action}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        </div>

        <TrimTimeline
          duration={duration}
          start={start}
          end={end}
          peaks={peaks}
          isLoadingPeaks={isLoadingPeaks}
          video={videoElement}
          onChange={(startTime, endTime) => updateConfig({ startTime, endTime })}
          onSeek={seek}
        />

        <div className="st-cut-tools">
          <TimeField
            label="Início"
            value={start}
            onCommit={(value) =>
              updateConfig({ startTime: clamp(value, 0, end - MIN_CUT_SECONDS) })
            }
          />
          <TimeField
            label="Fim"
            value={end}
            onCommit={(value) =>
              updateConfig({
                endTime: clamp(value, start + MIN_CUT_SECONDS, duration),
              })
            }
          />
          <button type="button" className="st-chip" onClick={markStart} title="Atalho: I">
            <Flag aria-hidden="true" />
            Início aqui
          </button>
          <button type="button" className="st-chip" onClick={markEnd} title="Atalho: O">
            <FlagOff aria-hidden="true" />
            Fim aqui
          </button>
          <button
            type="button"
            className="st-chip"
            disabled={!canQuickCut}
            onClick={() => updateConfig({ startTime: 0, endTime: QUICK_CUT_SECONDS })}
          >
            Primeiros 30 s
          </button>
          <button
            type="button"
            className="st-chip"
            disabled={!canQuickCut}
            onClick={() =>
              updateConfig({
                startTime: Math.round((duration - QUICK_CUT_SECONDS) * 10) / 10,
                endTime: duration,
              })
            }
          >
            Últimos 30 s
          </button>
          <button
            type="button"
            className="st-chip"
            disabled={hasFullRange}
            onClick={() => updateConfig({ startTime: 0, endTime: duration })}
          >
            <RotateCcw aria-hidden="true" />
            Vídeo inteiro
          </button>
        </div>
      </div>

      <aside className="st-inspector" aria-label="Ajustes do áudio">
        <fieldset className="st-panel">
          <legend>Formato</legend>
          <div className="st-formats">
            {FORMATS.map((format) => {
              const disabled = Boolean(
                format.needsServer && processingMode === 'browser-only'
              )
              return (
                <label
                  key={format.id}
                  className={`st-format ${config.format === format.id ? 'is-active' : ''} ${
                    disabled ? 'is-disabled' : ''
                  }`}
                  title={disabled ? 'Disponível apenas no modo híbrido' : format.hint}
                >
                  <input
                    type="radio"
                    name="sonora-format"
                    className="sr-only"
                    checked={config.format === format.id}
                    disabled={disabled}
                    onChange={() => updateConfig({ format: format.id })}
                  />
                  <strong>{format.id.toUpperCase()}</strong>
                  <small>{disabled ? 'Só no modo híbrido' : format.hint}</small>
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="st-panel">
          <legend>Qualidade</legend>
          {config.format === 'wav' ? (
            <p className="text-muted text-xs leading-relaxed">
              O WAV mantém PCM 16-bit a 44,1 kHz, sem compressão.
            </p>
          ) : (
            <>
              <div className="st-panel__value">
                <span>{BITRATES[bitrateIndex].label}</span>
                <strong>{config.bitrate} kbps</strong>
              </div>
              <RangeInput
                min={0}
                max={BITRATES.length - 1}
                step={1}
                value={bitrateIndex}
                aria-label="Qualidade do áudio"
                aria-valuetext={`${config.bitrate} kbps`}
                onValueChange={(index) =>
                  updateConfig({
                    bitrate: BITRATES[index].kbps,
                    qualityTier: BITRATES[index].tier,
                  })
                }
              />
              <div className="st-scale" aria-hidden="true">
                {BITRATES.map((item) => (
                  <span key={item.kbps}>{item.kbps}</span>
                ))}
              </div>
            </>
          )}
        </fieldset>

        <fieldset className="st-panel">
          <legend>Som</legend>
          <div className="st-panel__value">
            <span className="inline-flex items-center gap-1.5">
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              Volume
            </span>
            <button
              type="button"
              className="st-reset"
              disabled={config.preserveOriginal || config.volume === 100}
              onClick={() => updateConfig({ volume: 100 })}
              title="Voltar para 100%"
            >
              {config.preserveOriginal ? 100 : config.volume}%
            </button>
          </div>
          <RangeInput
            min={20}
            max={200}
            step={5}
            value={config.preserveOriginal ? 100 : config.volume}
            disabled={config.preserveOriginal}
            aria-label="Volume de saída em porcentagem"
            onValueChange={(volume) => updateConfig({ volume })}
          />
          <p className="text-muted mt-2 text-xs">
            {config.volume > 100 && !config.preserveOriginal
              ? 'Acima de 100% o som pode distorcer. Confira na prévia.'
              : 'A prévia acompanha o volume em tempo real.'}
          </p>
          <div className="mt-3 flex flex-col gap-1">
            <SwitchRow
              label="Normalizar volume"
              description="Equilibra o som. Aplicado ao converter."
              checked={config.normalize && !config.preserveOriginal}
              disabled={config.preserveOriginal}
              onChange={(normalize) => updateConfig({ normalize })}
            />
            <SwitchRow
              label="Manter som original"
              description="Ignora volume e normalização."
              checked={config.preserveOriginal}
              onChange={(preserveOriginal) => updateConfig({ preserveOriginal })}
            />
            <div className="st-beats">
              <SwitchRow
                label="Batidas no início"
                description={
                  video.withIntroBeats
                    ? 'Este vídeo já começa com as batidas.'
                    : `4 batidas, ${INTRO_BEATS_SECONDS.toLocaleString('pt-BR')} s antes do áudio.`
                }
                checked={config.introBeats}
                onChange={(introBeats) => updateConfig({ introBeats })}
              />
              <button
                type="button"
                className="st-icon-btn"
                onClick={toggleBeatsPreview}
                aria-label={isPreviewingBeats ? 'Parar as batidas' : 'Ouvir as batidas'}
                title={isPreviewingBeats ? 'Parar' : 'Ouvir as batidas'}
              >
                {isPreviewingBeats ? <Square aria-hidden="true" /> : <Drum aria-hidden="true" />}
              </button>
            </div>
          </div>
        </fieldset>
        <div className="st-dock">
          <label className="st-dock__name">
            <span>Nome do arquivo</span>
            <span className="st-dock__field">
              <input
                value={config.customFileName}
                placeholder={video.baseName}
                onChange={(event) => updateConfig({ customFileName: event.target.value })}
              />
              <b>.{config.format}</b>
            </span>
          </label>
          <dl className="st-dock__stats">
            <div>
              <dt>Duração</dt>
              <dd>{formatDuration(selectedDuration)}</dd>
            </div>
            <div>
              <dt>Tamanho</dt>
              <dd>~{formatBytes(estimatedSize)}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="btn-lime st-dock__convert"
            onClick={onStartConversion}
          >
            <Sparkles aria-hidden="true" />
            Converter em {config.format.toUpperCase()}
          </button>
        </div>
      </aside>

    </section>
  )
}
