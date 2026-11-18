/* Liga vídeo, textos e detalhes visuais ao progresso da rolagem. */

const MAX_FRAME_WAIT_MS = 100
const MAX_LOADER_WAIT_MS = 6000
const CHAPTER_EDGE = 0.035
const SMOOTHING = 0.2

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const sceneProgress = (section: HTMLElement) => {
  const box = section.getBoundingClientRect()
  const distance = box.height - window.innerHeight
  return distance > 0 ? clamp(-box.top / distance, 0, 1) : 0
}

const chapterVisibility = (p: number, start: number, end: number) => {
  const enter = start <= 0 ? 1 : clamp((p - start) / CHAPTER_EDGE, 0, 1)
  const leave = end >= 1 ? 1 : clamp((end - p) / CHAPTER_EDGE, 0, 1)
  return Math.min(enter, leave)
}

const videoDuration = (video: HTMLVideoElement) =>
  video.readyState >= 1 && Number.isFinite(video.duration) ? video.duration : 0

/* Painéis ocultos podem pausar o requestAnimationFrame, então há um timeout. */
const schedule = (callback: () => void) => {
  if (document.hidden) {
    callback()
    return
  }
  let done = false
  const runOnce = () => {
    if (done) return
    done = true
    callback()
  }
  window.requestAnimationFrame(runOnce)
  window.setTimeout(runOnce, MAX_FRAME_WAIT_MS)
}

const formatTimecode = (seconds: number) =>
  `00:${String(Math.floor(seconds)).padStart(2, '0')}`

interface ScrollSceneOptions {
  section: HTMLElement
  video?: HTMLVideoElement | null
  /** Parte final da rolagem em que o último quadro fica parado */
  holdEnd?: number
  reducedMotion?: boolean
}

export const bindScrollScene = ({
  section,
  video = null,
  holdEnd = 0,
  reducedMotion = false,
}: ScrollSceneOptions) => {
  const chapters = Array.from(
    section.querySelectorAll<HTMLElement>('[data-capitulo]')
  ).map((element) => {
    const [start, end] = (element.dataset.capitulo ?? '0-1')
      .split('-')
      .map(Number)
    return { element, start, end }
  })
  const timecode = section.querySelector<HTMLElement>('[data-tempo]')

  let target = sceneProgress(section)
  let current = target
  let framePending = false
  let disposed = false

  const seekVideo = () => {
    if (!video || video.seeking) return
    const duration = videoDuration(video)
    if (!duration) return
    const videoProgress = clamp(current / (1 - holdEnd), 0, 1)
    const time = clamp(videoProgress * duration, 0, Math.max(0, duration - 0.001))
    if (Math.abs(video.currentTime - time) > 0.001) video.currentTime = time
  }

  const paint = () => {
    framePending = false
    if (disposed) return

    const difference = target - current
    const applyDirectly =
      document.hidden || reducedMotion || Math.abs(difference) < 0.0005
    current = applyDirectly ? target : current + difference * SMOOTHING

    seekVideo()
    section.style.setProperty('--p', target.toFixed(4))

    chapters.forEach(({ element, start, end }) => {
      const visibility = chapterVisibility(target, start, end)
      element.style.setProperty('--capitulo', visibility.toFixed(3))
      element.style.visibility = visibility > 0 ? 'visible' : 'hidden'
    })

    if (timecode && video) {
      const duration = videoDuration(video)
      timecode.textContent = formatTimecode(
        clamp(target / (1 - holdEnd), 0, 1) * duration
      )
    }

    if (current !== target) requestPaint()
  }

  const requestPaint = () => {
    if (framePending) return
    framePending = true
    schedule(paint)
  }

  const update = () => {
    target = sceneProgress(section)
    requestPaint()
  }

  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
  document.addEventListener('visibilitychange', update)
  video?.addEventListener('loadedmetadata', update)
  video?.addEventListener('durationchange', update)
  video?.addEventListener('seeked', seekVideo)

  paint()

  return () => {
    disposed = true
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
    document.removeEventListener('visibilitychange', update)
    video?.removeEventListener('loadedmetadata', update)
    video?.removeEventListener('durationchange', update)
    video?.removeEventListener('seeked', seekVideo)
  }
}

/* Libera a tela de carregamento quando o vídeo pode tocar até o fim. */
export const waitForVideo = (video: HTMLVideoElement, onReady: () => void) => {
  let released = false
  const release = () => {
    if (released) return
    released = true
    onReady()
  }

  if (video.readyState >= 4) {
    release()
    return () => {}
  }

  video.addEventListener('canplaythrough', release, { once: true })
  video.addEventListener('error', release, { once: true })
  const timer = window.setTimeout(release, MAX_LOADER_WAIT_MS)

  return () => {
    released = true
    window.clearTimeout(timer)
    video.removeEventListener('canplaythrough', release)
    video.removeEventListener('error', release)
  }
}

/* O Safari do iPhone só pinta o quadro depois de uma primeira reprodução. */
export const primeVideoOnTouch = (video: HTMLVideoElement) => {
  const prime = () => {
    video
      .play()
      .then(() => video.pause())
      .catch(() => {})
  }
  window.addEventListener('touchstart', prime, { once: true, passive: true })
  return () => window.removeEventListener('touchstart', prime)
}

const animateCount = (element: HTMLElement, reducedMotion: boolean) => {
  const max = Number(element.dataset.contar)
  const suffix = element.dataset.sufixo ?? ''
  if (reducedMotion) {
    element.textContent = `${max}${suffix}`
    return
  }
  const startedAt = performance.now()
  const durationMs = 1400
  const step = (now: number) => {
    const t = clamp((now - startedAt) / durationMs, 0, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    element.textContent = `${Math.round(eased * max)}${suffix}`
    if (t < 1) window.requestAnimationFrame(step)
  }
  window.requestAnimationFrame(step)
}

/* Revela blocos e inicia contadores quando entram na tela. */
export const bindReveals = (root: HTMLElement, reducedMotion: boolean) => {
  root.classList.add('reveal-ready')

  root.querySelectorAll<HTMLElement>('[data-revelar-grupo]').forEach((group) => {
    Array.from(group.children).forEach((child, index) => {
      ;(child as HTMLElement).style.setProperty('--ordem', String(index))
    })
  })

  const targets = root.querySelectorAll<HTMLElement>(
    '[data-revelar], [data-revelar-grupo], [data-contar]'
  )
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const element = entry.target as HTMLElement
        element.classList.add('is-visible')
        if (element.dataset.contar) animateCount(element, reducedMotion)
        observer.unobserve(element)
      })
    },
    { threshold: 0.15 }
  )
  targets.forEach((target) => observer.observe(target))

  return () => observer.disconnect()
}
