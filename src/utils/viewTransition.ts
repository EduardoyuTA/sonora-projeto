import { flushSync } from 'react-dom'

const MAX_WAIT_MS = 120

/* Troca de tela em fusão suave. É só opacidade, sem deslocamento na tela. */
export const runViewTransition = (
  update: () => void,
  reducedMotion: boolean
) => {
  const canAnimate =
    typeof document.startViewTransition === 'function' &&
    !document.hidden &&
    !reducedMotion

  if (!canAnimate) {
    update()
    return
  }

  let applied = false
  const apply = () => {
    if (applied) return
    applied = true
    flushSync(update)
  }

  const transition = document.startViewTransition(apply)
  transition.ready.catch(() => {})
  transition.finished.catch(() => {})
  // Painéis ocultos podem pausar a transição antes de aplicar a mudança
  window.setTimeout(apply, MAX_WAIT_MS)
}
