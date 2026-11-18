import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react'
import { formatDuration, formatPreciseTime } from '../utils/formatters'

export const MIN_CUT_SECONDS = 0.5

const ZOOM_LEVELS = [1, 2, 4, 8]
const TICK_STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600]

type DragKind = 'start' | 'end' | 'range' | 'seek'

interface DragState {
  kind: DragKind
  grabOffset: number
  length: number
}

interface TrimTimelineProps {
  duration: number
  start: number
  end: number
  peaks: number[] | null
  isLoadingPeaks: boolean
  video: HTMLVideoElement | null
  onChange: (start: number, end: number) => void
  onSeek: (time: number) => void
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const roundTenth = (value: number) => Math.round(value * 10) / 10

const buildWavePath = (peaks: number[]) => {
  const top = peaks.map((peak, index) => `${index},${(50 - peak * 48).toFixed(1)}`)
  const bottom = peaks
    .map((peak, index) => `${index},${(50 + peak * 48).toFixed(1)}`)
    .reverse()
  return `M${top.join('L')}L${bottom.join('L')}Z`
}

export const TrimTimeline: React.FC<TrimTimelineProps> = ({
  duration,
  start,
  end,
  peaks,
  isLoadingPeaks,
  video,
  onChange,
  onSeek,
}) => {
  const [zoom, setZoom] = useState(1)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)
  const playheadRef = useRef<HTMLDivElement | null>(null)
  const hoverRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)

  const wavePath = useMemo(() => (peaks ? buildWavePath(peaks) : ''), [peaks])

  const ticks = useMemo(() => {
    const step =
      TICK_STEPS.find((candidate) => duration / candidate <= 7 * zoom) ?? 3600
    const list: number[] = []
    for (let time = 0; time <= duration; time += step) list.push(time)
    return list
  }, [duration, zoom])

  // O cursor anda fora do React para não redesenhar a tela a cada quadro
  useEffect(() => {
    if (!video) return
    let frame = 0
    const tick = () => {
      const position = clamp(video.currentTime / duration, 0, 1)
      if (playheadRef.current) {
        playheadRef.current.style.left = `${position * 100}%`
      }
      const scroller = scrollerRef.current
      if (scroller && !video.paused && !dragRef.current) {
        const x = position * scroller.scrollWidth
        const isOutside =
          x < scroller.scrollLeft ||
          x > scroller.scrollLeft + scroller.clientWidth - 24
        if (isOutside) scroller.scrollLeft = Math.max(0, x - 24)
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [video, duration])

  const timeAt = (clientX: number) => {
    const box = innerRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return 0
    return clamp((clientX - box.left) / box.width, 0, 1) * duration
  }

  const applyDrag = (drag: DragState, time: number) => {
    if (drag.kind === 'seek') {
      onSeek(time)
      return
    }
    if (drag.kind === 'start') {
      const next = roundTenth(clamp(time, 0, end - MIN_CUT_SECONDS))
      onChange(next, end)
      onSeek(next)
      return
    }
    if (drag.kind === 'end') {
      const next = Math.min(
        duration,
        roundTenth(clamp(time, start + MIN_CUT_SECONDS, duration))
      )
      onChange(start, next)
      onSeek(next)
      return
    }
    const nextStart = roundTenth(
      clamp(time - drag.grabOffset, 0, duration - drag.length)
    )
    onChange(nextStart, Math.min(duration, roundTenth(nextStart + drag.length)))
    onSeek(nextStart)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-drag]')
    const kind = (target?.dataset.drag ?? 'seek') as DragKind
    const time = timeAt(event.clientX)
    const drag = { kind, grabOffset: time - start, length: end - start }
    dragRef.current = drag
    event.currentTarget.setPointerCapture(event.pointerId)
    if (kind === 'seek') applyDrag(drag, time)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const time = timeAt(event.clientX)
    const hover = hoverRef.current
    if (hover) {
      hover.style.left = `${(time / duration) * 100}%`
      hover.dataset.time = formatPreciseTime(time)
    }
    if (dragRef.current) applyDrag(dragRef.current, time)
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const handleHandleKey = (
    event: React.KeyboardEvent<HTMLDivElement>,
    kind: 'start' | 'end'
  ) => {
    const step = event.shiftKey ? 1 : 0.1
    const current = kind === 'start' ? start : end
    const targets: Record<string, number> = {
      ArrowLeft: current - step,
      ArrowDown: current - step,
      ArrowRight: current + step,
      ArrowUp: current + step,
      Home: 0,
      End: duration,
    }
    const target = targets[event.key]
    if (target === undefined) return
    event.preventDefault()
    event.stopPropagation()
    applyDrag({ kind, grabOffset: 0, length: end - start }, target)
  }

  const startPercent = (start / duration) * 100
  const endPercent = (Math.min(end, duration) / duration) * 100
  const zoomIndex = ZOOM_LEVELS.indexOf(zoom)

  return (
    <div className="st-timeline">
      <div className="st-timeline__bar">
        <span className="text-muted text-xs">
          Arraste as alças verdes para cortar
        </span>
        <div className="st-zoom" role="group" aria-label="Zoom da linha do tempo">
          <button
            type="button"
            onClick={() => setZoom(ZOOM_LEVELS[zoomIndex - 1])}
            disabled={zoomIndex === 0}
            aria-label="Diminuir o zoom"
            title="Diminuir o zoom"
          >
            <ZoomOut />
          </button>
          <span aria-live="polite">{zoom}x</span>
          <button
            type="button"
            onClick={() => setZoom(ZOOM_LEVELS[zoomIndex + 1])}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            aria-label="Aumentar o zoom"
            title="Aumentar o zoom"
          >
            <ZoomIn />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="st-timeline__scroller"
        style={{ overflowX: zoom > 1 ? 'auto' : 'hidden' }}
      >
        <div
          ref={innerRef}
          className="st-timeline__inner"
          style={{ width: `${zoom * 100}%` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="st-ruler" aria-hidden="true">
            {ticks.map((time) => (
              <span key={time} style={{ left: `${(time / duration) * 100}%` }}>
                {formatDuration(time)}
              </span>
            ))}
          </div>

          <div className="st-track">
            {peaks ? (
              <>
                <svg
                  className="st-wave st-wave--base"
                  viewBox={`0 0 ${peaks.length - 1} 100`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d={wavePath} />
                </svg>
                <svg
                  className="st-wave st-wave--lit"
                  viewBox={`0 0 ${peaks.length - 1} 100`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  style={{
                    clipPath: `inset(0 ${100 - endPercent}% 0 ${startPercent}%)`,
                  }}
                >
                  <path d={wavePath} />
                </svg>
              </>
            ) : (
              <div className="st-track__empty">
                {isLoadingPeaks ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Lendo a forma de onda…
                  </>
                ) : (
                  'Forma de onda indisponível para este arquivo. O corte funciona normalmente.'
                )}
              </div>
            )}

            <div className="st-shade" style={{ left: 0, width: `${startPercent}%` }} />
            <div
              className="st-shade"
              style={{ left: `${endPercent}%`, right: 0 }}
            />

            <div
              className="st-selection"
              style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
            >
              <div
                className="st-selection__grip"
                data-drag="range"
                title="Arraste para mover o trecho inteiro"
              >
                {formatDuration(end - start)}
              </div>
            </div>

            <div
              className="st-handle"
              data-drag="start"
              role="slider"
              tabIndex={0}
              aria-label="Início do corte"
              aria-valuemin={0}
              aria-valuemax={roundTenth(end - MIN_CUT_SECONDS)}
              aria-valuenow={start}
              aria-valuetext={formatPreciseTime(start)}
              onKeyDown={(event) => handleHandleKey(event, 'start')}
              style={{ left: `${startPercent}%` }}
            >
              <i />
            </div>
            <div
              className="st-handle"
              data-drag="end"
              role="slider"
              tabIndex={0}
              aria-label="Fim do corte"
              aria-valuemin={roundTenth(start + MIN_CUT_SECONDS)}
              aria-valuemax={roundTenth(duration)}
              aria-valuenow={end}
              aria-valuetext={formatPreciseTime(end)}
              onKeyDown={(event) => handleHandleKey(event, 'end')}
              style={{ left: `${endPercent}%` }}
            >
              <i />
            </div>

            <div ref={playheadRef} className="st-playhead" aria-hidden="true" />
            <div ref={hoverRef} className="st-hover" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  )
}
