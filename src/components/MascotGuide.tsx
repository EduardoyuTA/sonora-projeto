import React, { useState } from 'react'
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import type {
  ActiveTab,
  ConversionConfig,
  ConversionState,
  MascotMood,
  VideoMetadata,
} from '../types/sonora'
import { formatDuration } from '../utils/formatters'
import { loadMascotPrefs, saveMascotPrefs } from '../services/storageService'
import { Capybara } from './Capybara'

interface Dialogue {
  eyebrow: string
  title: string
  description: string
}

interface MascotGuideProps {
  /** Onde o cartão aparece: barra lateral (computador) ou faixa (celular) */
  variant: 'sidebar' | 'mobile'
  state: ConversionState
  activeTab?: ActiveTab
  progressPercent?: number
  progressStage: string
  isDraggingFile?: boolean
  isAudioPlaying?: boolean
  config?: ConversionConfig
  video?: VideoMetadata | null
  historyCount?: number
  customReaction?: ({ mood: MascotMood } & Dialogue) | null
}

const STUDIO_TIPS: Dialogue[] = [
  {
    eyebrow: 'Dica',
    title: 'MP3 a 192 kbps é o equilíbrio ideal.',
    description:
      'Leve para o celular e com som limpo. Para editar em estúdio, prefira WAV, que não perde qualidade.',
  },
  {
    eyebrow: 'Dica',
    title: 'Volume baixo no vídeo original?',
    description:
      'Nas configurações avançadas, ligue "Normalizar volume (-16 LUFS)" para deixar o som equilibrado.',
  },
  {
    eyebrow: 'Atalho',
    title: 'Dá para cortar só o refrão.',
    description:
      'Nas configurações avançadas você escolhe o segundo exato de início e fim antes de converter.',
  },
  {
    eyebrow: 'Privacidade',
    title: 'Nada fica guardado no servidor.',
    description:
      'Quando o servidor ajuda na conversão, o arquivo é apagado assim que o áudio fica pronto. O histórico fica só no seu navegador.',
  },
  {
    eyebrow: 'Atalho',
    title: 'Mudou de ideia no meio da conversão?',
    description: 'Aperte Esc para cancelar. Seu vídeo continua carregado.',
  },
]

function computeConfigReaction(
  state: ConversionState,
  config?: ConversionConfig,
  video?: VideoMetadata | null
): ({ mood: MascotMood } & Dialogue) | null {
  if (state !== 'loaded' || !config || !video) return null

  const isTrimmed =
    config.startTime > 0.2 ||
    (config.endTime > 0 && config.endTime < video.duration - 0.2)

  if (isTrimmed) {
    const cutDuration = Math.max(0.5, config.endTime - config.startTime)
    return {
      mood: 'trimming',
      eyebrow: 'Corte ajustado',
      title: `Vou extrair ${formatDuration(cutDuration)} de áudio.`,
      description: `Só o trecho de ${formatDuration(config.startTime)} até ${formatDuration(config.endTime)}.`,
    }
  }

  if (!config.preserveOriginal && config.normalize) {
    return {
      mood: 'tuning',
      eyebrow: 'Normalização ligada',
      title: 'Volume de estúdio (-16 LUFS).',
      description: 'Vou equilibrar as partes baixas e altas para o som ficar uniforme.',
    }
  }

  if (!config.preserveOriginal && config.volume !== 100) {
    return {
      mood: 'tuning',
      eyebrow: 'Ajuste de volume',
      title:
        config.volume > 100
          ? `Volume em ${config.volume}%.`
          : `Volume suavizado para ${config.volume}%.`,
      description:
        config.volume > 100
          ? 'Vou aumentar o som tomando cuidado para não distorcer.'
          : 'O áudio vai sair mais baixo e confortável de ouvir.',
    }
  }

  const formatMessages: Record<string, Dialogue> = {
    mp3: {
      eyebrow: `MP3 · ${config.bitrate} kbps`,
      title: 'O clássico que toca em qualquer lugar.',
      description:
        config.bitrate === 320
          ? 'Em 320 kbps é a melhor qualidade que o MP3 oferece.'
          : `Em ${config.bitrate} kbps o arquivo fica leve e com som nítido.`,
    },
    wav: {
      eyebrow: 'WAV · sem perdas',
      title: 'Qualidade de estúdio, sem compressão.',
      description: 'Ideal para editar. O arquivo fica bem maior que um MP3.',
    },
    m4a: {
      eyebrow: `M4A · ${config.bitrate} kbps`,
      title: 'Leve e com ótima fidelidade.',
      description: 'Ótimo para iPhone e Mac, ocupando menos espaço que o MP3.',
    },
    aac: {
      eyebrow: `AAC · ${config.bitrate} kbps`,
      title: 'Compacto e cristalino.',
      description: 'Ótimo para players modernos e redes sociais.',
    },
  }

  const message = formatMessages[config.format]
  return message ? { mood: 'loaded', ...message } : null
}

export const MascotGuide: React.FC<MascotGuideProps> = ({
  variant,
  state,
  activeTab = 'converter',
  progressPercent = 0,
  progressStage,
  isDraggingFile = false,
  isAudioPlaying = false,
  config,
  video,
  historyCount = 0,
  customReaction,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(
    () => loadMascotPrefs().minimized
  )
  // No celular a faixa começa fechada (só uma linha)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [tip, setTip] = useState<{ key: string; index: number } | null>(null)

  // A dica só vale para a etapa em que foi pedida
  const contextKey = `${activeTab}:${state}`
  const activeTip = tip && tip.key === contextKey ? STUDIO_TIPS[tip.index] : null

  const showNextTip = () => {
    setTip((prev) => ({
      key: contextKey,
      index:
        prev && prev.key === contextKey
          ? (prev.index + 1) % STUDIO_TIPS.length
          : 0,
    }))
  }

  const setCollapsed = (value: boolean) => {
    setIsCollapsed(value)
    saveMascotPrefs({ minimized: value, position: null })
  }

  const configReaction = computeConfigReaction(state, config, video)

  const mood: MascotMood = (() => {
    if (activeTip) return 'petted'
    if (isDraggingFile) return 'dragging'
    if (state === 'converting') return 'converting'
    if (state === 'validating') return 'validating'
    if (state === 'error') return 'error'
    if (customReaction) return customReaction.mood
    if (isAudioPlaying) return 'grooving'
    if (state === 'success') return 'success'
    if (activeTab === 'converter' && state === 'loaded') {
      return configReaction?.mood ?? 'loaded'
    }
    return 'idle'
  })()

  const dialogue: Dialogue = (() => {
    if (activeTip) return activeTip
    if (isDraggingFile) {
      return {
        eyebrow: 'Pode soltar!',
        title: 'Solte o vídeo em qualquer lugar da tela.',
        description: 'Eu confiro o arquivo na hora.',
      }
    }
    if (state === 'validating') {
      return {
        eyebrow: 'Analisando',
        title: 'Deixa eu dar uma olhadinha…',
        description: 'Conferindo duração, resolução e se o vídeo tem som.',
      }
    }
    if (state === 'converting') {
      const stage =
        progressPercent < 32
          ? 'Preparando o estúdio…'
          : progressPercent < 78
            ? 'Capturando cada nota no capricho…'
            : 'Dando o polimento final…'
      return {
        eyebrow: `Convertendo · ${progressPercent}%`,
        title: stage,
        description: `${progressStage || 'Aplicando suas configurações.'} Aperte Esc para cancelar.`,
      }
    }
    if (state === 'error') {
      return {
        eyebrow: 'Ops',
        title: 'Esse arquivo tropeçou.',
        description: 'Tente outro vídeo que tenha som, ou use o vídeo de exemplo.',
      }
    }
    if (customReaction) return customReaction
    if (isAudioPlaying) {
      return {
        eyebrow: 'Curtindo o som',
        title: 'Que som limpinho!',
        description: 'Clique na forma de onda para pular para qualquer parte.',
      }
    }
    if (state === 'success' && activeTab === 'converter') {
      return {
        eyebrow: 'Pronto!',
        title: 'Seu áudio saiu do estúdio.',
        description: 'Dê o play para ouvir ou baixe agora. Uma cópia fica no Histórico.',
      }
    }
    if (activeTab === 'historico') {
      return {
        eyebrow: 'Histórico',
        title:
          historyCount > 0
            ? `${historyCount} ${historyCount === 1 ? 'áudio salvo' : 'áudios salvos'} neste navegador.`
            : 'Ainda não tem nada aqui.',
        description:
          historyCount > 0
            ? 'Ouça ou baixe de novo quando quiser.'
            : 'Seus áudios convertidos aparecem aqui, guardados só no seu navegador.',
      }
    }
    if (activeTab === 'configuracoes') {
      return {
        eyebrow: 'Configurações',
        title: 'Deixe o SONORA do seu jeito.',
        description: 'Escolha o formato padrão, a qualidade e onde a conversão acontece.',
      }
    }
    if (state === 'loaded' && configReaction) return configReaction
    if (state === 'loaded') {
      return {
        eyebrow: 'Vídeo carregado',
        title: 'Como você quer o seu áudio?',
        description: 'Escolha o formato. Nas opções avançadas dá para cortar e normalizar.',
      }
    }
    return {
      eyebrow: 'Capivara',
      title: 'Oi! Solte um vídeo que eu cuido do resto.',
      description: 'Clique em mim quando quiser uma dica.',
    }
  })()

  const isConverting = state === 'converting'
  const ringPercent = Math.max(0, Math.min(100, progressPercent))
  const dialogueKey = `${dialogue.eyebrow}|${dialogue.title}`

  const avatar = (size: number, ring: number) => (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size + ring * 2,
        height: size + ring * 2,
        background: isConverting
          ? `conic-gradient(var(--accent) ${ringPercent}%, var(--border-strong) 0)`
          : 'transparent',
      }}
    >
      <span
        className="flex items-center justify-center overflow-hidden rounded-full bg-[var(--surface-3)]"
        style={{ width: size, height: size }}
      >
        <Capybara mood={mood} size={Math.round(size * 0.92)} />
      </span>
    </span>
  )

  /* ------------------------------ Celular ------------------------------ */
  if (variant === 'mobile') {
    return (
      <aside
        aria-label="Dicas da Capivara"
        className="lg:hidden fixed inset-x-2 z-30 bottom-[calc(76px+env(safe-area-inset-bottom))] mx-auto max-w-xl rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-center gap-3 px-2.5 py-2">
          <button
            type="button"
            onClick={showNextTip}
            aria-label="Pedir uma dica à Capivara"
            className="rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {avatar(36, 2.5)}
          </button>
          <div key={dialogueKey} aria-live="polite" className="capy-tip-in min-w-0 flex-1">
            <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.06em]">
              {dialogue.eyebrow}
            </p>
            <p
              className={`text-strong text-[13px] leading-snug ${
                isMobileOpen ? '' : 'truncate'
              }`}
            >
              {dialogue.title}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen((open) => !open)}
            aria-expanded={isMobileOpen}
            aria-label={isMobileOpen ? 'Fechar a dica' : 'Ver a dica inteira'}
            className="text-muted flex h-11 w-11 shrink-0 items-center justify-center rounded-xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {isMobileOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
        {isMobileOpen && (
          <div className="capy-tip-in flex flex-col gap-3 border-t border-[var(--border)] px-3.5 pt-3 pb-3.5">
            <p className="text-muted text-[13px] leading-relaxed">{dialogue.description}</p>
            <button
              type="button"
              onClick={showNextTip}
              className="btn-glass inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Outra dica
            </button>
          </div>
        )}
      </aside>
    )
  }

  /* ------------------------ Barra lateral: recolhida ------------------------ */
  if (isCollapsed) {
    return (
      <aside
        aria-label="Capivara (recolhida)"
        className="flex items-center gap-2.5 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] py-1.5 pl-1.5 pr-1.5"
      >
        {avatar(36, 2)}
        <span className="text-muted min-w-0 flex-1 truncate text-[13px]">
          {isConverting ? `Convertendo · ${progressPercent}%` : 'Capivara'}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Abrir a Capivara"
          className="btn-glass flex h-9 w-9 items-center justify-center rounded-[10px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <ChevronUp className="text-muted h-4 w-4" />
        </button>
      </aside>
    )
  }

  /* ------------------------- Barra lateral: aberta ------------------------- */
  return (
    <aside
      aria-label="Dicas da Capivara"
      className="flex flex-col gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-2)] p-4"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={showNextTip}
          aria-label="Pedir uma dica à Capivara"
          title="Clique para outra dica"
          className="rounded-full cursor-pointer transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {avatar(58, 3)}
        </button>
        <div key={dialogueKey} className="capy-tip-in min-w-0" aria-live="polite">
          <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.08em]">
            {dialogue.eyebrow}
          </p>
          <p className="text-strong text-sm font-semibold leading-snug">{dialogue.title}</p>
        </div>
      </div>
      <p key={`d-${dialogueKey}`} className="capy-tip-in text-muted text-[13px] leading-relaxed">
        {dialogue.description}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={showNextTip}
          className="btn-glass flex min-h-10 flex-1 items-center justify-center gap-2 rounded-[10px] text-[13px] font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Outra dica
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Recolher a Capivara"
          title="Recolher"
          className="btn-glass flex h-10 w-10 items-center justify-center rounded-[10px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <ChevronDown className="text-muted h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
