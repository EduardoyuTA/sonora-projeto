import React, { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Disc3,
  Heart,
  Headphones,
  MessageCircleHeart,
  Music,
  Scissors,
  Search,
  Sparkles,
  Upload,
  Volume2,
  Wand2,
} from 'lucide-react'
import type {
  ActiveTab,
  ConversionConfig,
  ConversionState,
  MascotMood,
  VideoMetadata,
} from '../types/sonora'
import { formatDuration } from '../utils/formatters'

interface MascotGuideProps {
  state: ConversionState
  activeTab?: ActiveTab
  theme: 'light' | 'dark'
  progressPercent?: number
  progressStage: string
  isDraggingFile?: boolean
  isAudioPlaying?: boolean
  config?: ConversionConfig
  video?: VideoMetadata | null
  historyCount?: number
  customReaction?: {
    mood: MascotMood
    eyebrow: string
    title: string
    description: string
  } | null
  // Increment to open the speech bubble (e.g. "Falar com a Capivara" button)
  talkRequest?: number
}

interface StudioTip {
  eyebrow: string
  title: string
  description: string
  pose: string
}

const STUDIO_TIPS: StudioTip[] = [
  {
    eyebrow: 'Dica da Capivara Produtora',
    title: 'Quer qualidade de estúdio sem ocupar espaço?',
    description:
      'O formato MP3 em 320 kbps ou M4A entrega fidelidade altíssima com um arquivo super leve!',
    pose: '/mascote/pose-peace.png',
  },
  {
    eyebrow: 'Segredo de Estúdio',
    title: 'Volume baixo no vídeo original?',
    description:
      'Abra as Configurações Avançadas e ative "Normalizar volume (-16 LUFS)" para deixar o som equilibrado igual ao Spotify.',
    pose: '/mascote/pose-laptop.png',
  },
  {
    eyebrow: 'Atalho Rápido',
    title: 'Sabia que você pode cortar só o refrão?',
    description:
      'Nas Configurações Avançadas você escolhe o segundo exato de início e fim antes mesmo de converter!',
    pose: '/mascote/pose-waveform.png',
  },
  {
    eyebrow: 'Privacidade Total',
    title: 'Seus arquivos nunca saem do seu controle!',
    description:
      'Aqui no SONORA tudo roda localmente com zero rastreamento. Até eu fico de fone fechado para proteger seus dados!',
    pose: '/mascote/pose-confident.png',
  },
  {
    eyebrow: 'Carinho Recebido ♥',
    title: 'Paz, amor e 320 kbps!',
    description:
      'Obrigado pelo carinho! Estou no canto da tela acompanhando cada clique seu no estúdio.',
    pose: '/mascote/pose-zen.png',
  },
  {
    eyebrow: 'Modo Festa no SONORA',
    title: 'Solta o som que eu danço junto!',
    description:
      'Sempre que você der Play na prévia do áudio ou no histórico, eu entro no ritmo aqui no cantinho!',
    pose: '/mascote/pose-dance.png',
  },
]

function computeConfigReaction(
  state: ConversionState,
  config?: ConversionConfig,
  video?: VideoMetadata | null
): {
  mood: MascotMood
  eyebrow: string
  title: string
  description: string
} | null {
  if (state !== 'loaded' || !config || !video) return null

  const isTrimmed =
    config.startTime > 0.2 ||
    (config.endTime > 0 && config.endTime < video.duration - 0.2)

  if (isTrimmed) {
    const cutDuration = Math.max(0.5, config.endTime - config.startTime)
    return {
      mood: 'trimming',
      eyebrow: 'Tesoura de ouro ativada',
      title: `Recorte ajustado para ${formatDuration(cutDuration)}!`,
      description: `Vou extrair apenas o trecho de ${formatDuration(config.startTime)} até ${formatDuration(config.endTime)} com precisão cirúrgica.`,
    }
  }

  if (!config.preserveOriginal && config.normalize) {
    return {
      mood: 'tuning',
      eyebrow: 'Masterização ativa',
      title: 'Normalização de estúdio (-16 LUFS) ligada!',
      description:
        'Ótima escolha! Vou equilibrar os picos baixos e altos para o áudio soar limpo e uniforme.',
    }
  }

  if (!config.preserveOriginal && config.volume !== 100) {
    return {
      mood: 'tuning',
      eyebrow: 'Ajuste de ganho',
      title:
        config.volume > 100
          ? `Turbinando o volume em ${config.volume}%!`
          : `Suavizando o volume para ${config.volume}%`,
      description:
        config.volume > 100
          ? 'Vou amplificar o sinal cuidando para evitar distorções.'
          : 'O áudio sairá mais suave e confortável para ouvir.',
    }
  }

  const formatMessages: Record<
    string,
    { eyebrow: string; title: string; description: string }
  > = {
    mp3: {
      eyebrow: `MP3 • ${config.bitrate} kbps`,
      title: 'O clássico que toca em qualquer lugar!',
      description:
        config.bitrate === 320
          ? 'Em 320 kbps você leva a fidelidade máxima do MP3. Pronto para converter!'
          : `Configurado em ${config.bitrate} kbps para ótimo equilíbrio entre leveza e nitidez.`,
    },
    wav: {
      eyebrow: 'WAV • PCM 16-bit Puro',
      title: 'Qualidade de estúdio sem compressão!',
      description:
        'Cada amostra sonora será preservada intacta em 44.1 kHz. Ideal para edição profissional!',
    },
    m4a: {
      eyebrow: `M4A • ${config.bitrate} kbps`,
      title: 'Eficiência moderna para Apple e Web!',
      description:
        'O contêiner M4A entrega graves e agudos cristalinos ocupando menos espaço que o MP3.',
    },
    aac: {
      eyebrow: `AAC • ${config.bitrate} kbps`,
      title: 'Áudio ágil e cristalino!',
      description:
        'Excelente para streaming e players modernos com compressão inteligente.',
    },
  }

  if (formatMessages[config.format]) {
    return {
      mood: 'loaded',
      ...formatMessages[config.format],
    }
  }

  return null
}

export const MascotGuide: React.FC<MascotGuideProps> = ({
  state,
  activeTab = 'converter',
  theme,
  progressPercent = 0,
  progressStage,
  isDraggingFile = false,
  isAudioPlaying = false,
  config,
  video,
  historyCount = 0,
  customReaction,
  talkRequest = 0,
}) => {
  const isDark = theme === 'dark'
  const [isPopping, setIsPopping] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const currentEventKey = `${activeTab}:${state}:${isDraggingFile ? 'drag' : ''}:${isAudioPlaying ? 'play' : ''}:${customReaction?.title || ''}:${talkRequest}`
  const [dismissedEventKey, setDismissedEventKey] = useState<string | null>(
    () => currentEventKey
  )
  const [petCount, setPetCount] = useState(0)
  const [tipSelection, setTipSelection] = useState<{
    forState: ConversionState
    forTab: ActiveTab
    index: number
  } | null>(null)

  const isBubbleOpen = dismissedEventKey !== currentEventKey

  const activeTipIndex =
    tipSelection &&
    tipSelection.forState === state &&
    tipSelection.forTab === activeTab
      ? tipSelection.index
      : null

  const configReaction = computeConfigReaction(state, config, video)

  const handleInteractMascot = () => {
    setDismissedEventKey(null)
    setIsPopping(true)
    setPetCount((prev) => prev + 1)
    setTipSelection((prev) => {
      const nextIndex =
        prev && prev.forState === state && prev.forTab === activeTab
          ? (prev.index + 1) % STUDIO_TIPS.length
          : 0
      return { forState: state, forTab: activeTab, index: nextIndex }
    })
    window.setTimeout(() => {
      setIsPopping(false)
    }, 560)
  }

  // Determine current mood
  const resolveMood = (): MascotMood => {
    if (activeTipIndex !== null) return 'petted'
    if (customReaction) return customReaction.mood
    if (isDraggingFile) return 'dragging'
    if (isAudioPlaying) return 'grooving'
    if (state === 'converting') return 'converting'
    if (state === 'validating') return 'validating'
    if (state === 'success') return 'success'
    if (state === 'error') return 'error'
    if (activeTab === 'converter' && state === 'loaded' && configReaction) {
      return configReaction.mood
    }
    if (activeTab === 'converter' && state === 'loaded') return 'loaded'
    return 'idle'
  }

  const mood = resolveMood()

  // Map current mood, stage, tab, and hover state to the processed capybara PNGs in /mascote/
  const resolveMascotImage = (): string => {
    if (activeTipIndex !== null) {
      return STUDIO_TIPS[activeTipIndex].pose
    }

    if (isDraggingFile || mood === 'dragging') {
      return '/mascote/pose-welcome.png'
    }

    if (isAudioPlaying || mood === 'grooving') {
      return isHovered ? '/mascote/pose-music.png' : '/mascote/pose-dance.png'
    }

    if (state === 'validating' || mood === 'validating') {
      return '/mascote/pose-curious.png'
    }

    if (state === 'converting' || mood === 'converting') {
      if (progressPercent < 18) {
        return '/mascote/pose-laptop.png'
      }
      if (progressPercent >= 88) {
        return '/mascote/pose-waveform.png'
      }
      return '/mascote/capy-converting.png'
    }

    if (state === 'error' || mood === 'error') {
      return '/mascote/pose-surprised.png'
    }

    if (state === 'success' || mood === 'success') {
      return isHovered ? '/mascote/pose-cheer.png' : '/mascote/capy-success.png'
    }

    if (customReaction?.mood === 'petted') {
      return '/mascote/pose-zen.png'
    }

    if (activeTab === 'configuracoes') {
      return isHovered
        ? '/mascote/pose-thumbsup.png'
        : '/mascote/pose-laptop.png'
    }

    if (activeTab === 'historico') {
      if (historyCount > 0) {
        return isHovered
          ? '/mascote/pose-dance.png'
          : '/mascote/pose-music.png'
      }
      return isHovered ? '/mascote/pose-wave.png' : '/mascote/pose-think.png'
    }

    if (mood === 'trimming') {
      return '/mascote/pose-waveform.png'
    }

    if (mood === 'tuning') {
      return '/mascote/pose-laptop.png'
    }

    if (state === 'loaded' || mood === 'loaded') {
      if (config?.format === 'wav') {
        return '/mascote/pose-confident.png'
      }
      return isHovered
        ? '/mascote/pose-cheer.png'
        : '/mascote/pose-thumbsup.png'
    }

    // Idle on converter tab
    if (isHovered) {
      return '/mascote/pose-peace.png'
    }
    return '/mascote/capy-hello.png'
  }

  const mascotImageSrc = resolveMascotImage()

  const animationClass = (() => {
    if (isPopping) return 'mascot-pop'
    switch (mood) {
      case 'dragging':
        return 'mascot-excited'
      case 'validating':
        return 'mascot-inspect'
      case 'converting':
      case 'grooving':
        return 'mascot-groove'
      case 'success':
      case 'petted':
        return 'mascot-celebrate'
      case 'error':
        return 'mascot-wobble'
      case 'trimming':
      case 'tuning':
        return 'mascot-excited'
      default:
        return 'mascot-float'
    }
  })()

  // Resolve contextual dialogue
  const resolveDialogue = (): {
    eyebrow: string
    title: string
    description: string
  } => {
    if (activeTipIndex !== null) {
      return STUDIO_TIPS[activeTipIndex]
    }

    if (customReaction) {
      return customReaction
    }

    if (isDraggingFile) {
      return {
        eyebrow: 'Solte o arquivo!',
        title: 'Opa! Pode soltar esse vídeo aqui na tela!',
        description:
          'Já estou de braços abertos para inspecionar a faixa de áudio na hora.',
      }
    }

    if (isAudioPlaying) {
      return {
        eyebrow: 'Curtindo o som ♪',
        title: 'Que som limpinho! Ficou bom demais!',
        description:
          'Use a forma de onda para navegar pela faixa ou mude a velocidade de reprodução.',
      }
    }

    if (state === 'validating') {
      return {
        eyebrow: 'Inspecionando vídeo',
        title: 'Deixa eu dar uma olhadinha nesse arquivo…',
        description:
          'Conferindo duração, resolução e trilha sonora para preparar o estúdio.',
      }
    }

    if (state === 'converting') {
      if (progressPercent < 32) {
        return {
          eyebrow: `Convertendo • ${progressPercent}%`,
          title: 'Aquecendo os motores do estúdio…',
          description:
            progressStage ||
            'Lendo o vídeo e separando a trilha sonora original sem perder nenhum detalhe.',
        }
      }
      if (progressPercent < 78) {
        return {
          eyebrow: `Extraindo áudio • ${progressPercent}%`,
          title: 'Capturando cada nota musical no capricho!',
          description:
            progressStage ||
            'Processando as frequências e aplicando suas configurações de qualidade.',
        }
      }
      return {
        eyebrow: `Quase pronto • ${progressPercent}%`,
        title: 'Dando aquele polimento final nos decibéis!',
        description:
          progressStage ||
          'Gerando a forma de onda interativa para você ouvir e baixar.',
      }
    }

    if (state === 'success' && activeTab === 'converter') {
      return {
        eyebrow: 'Missão cumprida!',
        title: 'Prontinho! Seu áudio saiu fresquinho do estúdio!',
        description:
          'Aperte o Play para a gente ouvir juntos na forma de onda ou clique em Baixar Áudio.',
      }
    }

    if (state === 'error' && activeTab === 'converter') {
      return {
        eyebrow: 'Ops, algo tropeçou',
        title: 'Não consegui extrair o áudio desse arquivo.',
        description:
          'Tente outro vídeo com faixa de áudio ativa ou teste com o vídeo de demonstração.',
      }
    }

    if (activeTab === 'historico') {
      return {
        eyebrow: 'Guardiã da Biblioteca',
        title:
          historyCount > 0
            ? `Você tem ${historyCount} ${historyCount === 1 ? 'áudio salvo' : 'áudios salvos'} no navegador!`
            : 'Sua biblioteca local ainda está vazia.',
        description:
          historyCount > 0
            ? 'Clique em "Ouvir" em qualquer faixa para a gente curtir o som juntos!'
            : 'Converta seu primeiro vídeo para ele aparecer salvo aqui com total privacidade.',
      }
    }

    if (activeTab === 'configuracoes') {
      return {
        eyebrow: 'Engenharia do Estúdio',
        title: 'Deixe o SONORA do seu jeito!',
        description:
          'Ajuste formato padrão, qualidade preferida e modo de processamento local.',
      }
    }

    if (state === 'loaded' && configReaction) {
      return configReaction
    }

    if (state === 'loaded') {
      return {
        eyebrow: 'Vídeo aprovado!',
        title: 'Tudo pronto! Como você quer o seu áudio?',
        description:
          'Escolha o formato ou abra as opções avançadas para cortar trechos e normalizar o som.',
      }
    }

    return {
      eyebrow: 'Capivara do SONORA',
      title: 'Oi! Estou aqui no cantinho para ajudar.',
      description:
        'Arraste um vídeo na página ou clique em mim para trocar de pose e receber dicas de estúdio!',
    }
  }

  const dialogue = resolveDialogue()
  const showMusicalNotes =
    mood === 'converting' ||
    mood === 'grooving' ||
    mood === 'success' ||
    isPopping ||
    isHovered

  // Mood badge icon on the corner of the mascot avatar
  const renderMoodBadge = () => {
    switch (mood) {
      case 'dragging':
        return (
          <span className="bg-[#BCEE45] text-[#111315] inline-flex p-1.5 rounded-full shadow-md border-2 border-[#111315]">
            <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
        )
      case 'validating':
        return (
          <span className="bg-amber-400 text-[#111315] inline-flex p-1.5 rounded-full shadow-md border-2 border-[#111315]">
            <Search className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
        )
      case 'converting':
      case 'grooving':
        return (
          <span className="bg-[#BCEE45] text-[#111315] inline-flex p-1.5 rounded-full shadow-md border-2 border-[#111315]">
            <Headphones className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
        )
      case 'trimming':
        return (
          <span className="bg-[#BCEE45] text-[#111315] inline-flex p-1.5 rounded-full shadow-md border-2 border-[#111315]">
            <Scissors className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
        )
      case 'tuning':
        return (
          <span className="bg-[#BCEE45] text-[#111315] inline-flex p-1.5 rounded-full shadow-md border-2 border-[#111315]">
            <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
        )
      case 'success':
        return (
          <span className="bg-[#BCEE45] text-[#111315] inline-flex p-1.5 rounded-full shadow-md border-2 border-[#111315]">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
        )
      case 'error':
        return (
          <span className="bg-red-500 text-white inline-flex p-1.5 rounded-full shadow-md border-2 border-white dark:border-[#111315]">
            <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>
        )
      case 'petted':
        return (
          <span className="bg-pink-500 text-white inline-flex p-1.5 rounded-full shadow-md border-2 border-white dark:border-[#111315]">
            <Heart className="w-3.5 h-3.5 fill-current" />
          </span>
        )
      default:
        return (
          <span className="bg-[#BCEE45] text-[#111315] inline-flex p-1.5 rounded-full shadow-md border-2 border-[#111315]">
            <Sparkles className="w-3.5 h-3.5 stroke-[2.4]" />
          </span>
        )
    }
  }

  return (
    <aside
      aria-live="polite"
      aria-label="Assistente mascote Capivara do SONORA"
      className="fixed left-1 bottom-[5.6rem] lg:left-12 lg:bottom-[6.5rem] z-[45] flex flex-col items-start pointer-events-none select-none"
    >
      {/* Floating Speech Bubble */}
      {isBubbleOpen && (
        <div
          className={`pointer-events-auto relative mb-2 w-[280px] sm:w-[320px] rounded-2xl border p-3.5 sm:p-4 shadow-xl transition-all duration-300 ${
            mood === 'dragging'
              ? isDark
                ? 'border-[#BCEE45] bg-[#181E14]/95 text-[#F3F4F6] backdrop-blur-md'
                : 'border-[#65A30D] bg-[#F7FEE7]/95 text-[#111315] backdrop-blur-md'
              : mood === 'error'
                ? isDark
                  ? 'border-red-800/80 bg-[#1A1315]/95 text-[#F3F4F6] backdrop-blur-md'
                  : 'border-red-300 bg-red-50/95 text-[#111315] backdrop-blur-md'
                : isDark
                  ? 'border-[#2D333B] bg-[#15171A]/95 text-[#F3F4F6] backdrop-blur-md'
                  : 'border-[#E5E7EB] bg-white/95 text-[#111315] backdrop-blur-md'
          }`}
        >
          {/* Top Header Row inside Bubble */}
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full ${
                  mood === 'error'
                    ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                    : isDark
                      ? 'bg-[#BCEE45]/15 text-[#BCEE45]'
                      : 'bg-[#ECFCCB] text-[#3F6212]'
                }`}
              >
                {(mood === 'converting' || mood === 'grooving') && (
                  <Disc3 className="w-3 h-3 animate-spin" />
                )}
                {mood === 'idle' && <Music className="w-3 h-3" />}
                <span>{dialogue.eyebrow}</span>
              </span>

              {petCount > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                    isDark
                      ? 'bg-[#1F242B] text-[#9CA3AF]'
                      : 'bg-[#F1F3F5] text-[#525866]'
                  }`}
                  title="Vezes que você interagiu com a Capivara"
                >
                  <Heart className="w-2.5 h-2.5 text-pink-500 fill-pink-500" />
                  <span>{petCount}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setDismissedEventKey(currentEventKey)}
              title="Minimizar balão de fala"
              aria-label="Minimizar balão de fala do mascote"
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'text-[#9CA3AF] hover:text-white hover:bg-[#24282E]'
                  : 'text-[#6B7280] hover:text-[#111315] hover:bg-[#F3F4F6]'
              }`}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dialogue Title & Description */}
          <h2 className="text-xs sm:text-sm font-bold leading-snug">
            {dialogue.title}
          </h2>
          <p
            className={`mt-1 text-[11px] sm:text-xs leading-relaxed ${
              isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
            }`}
          >
            {dialogue.description}
          </p>

          {/* Live Conversion Progress Bar inside Bubble */}
          {state === 'converting' && (
            <div className="mt-2.5">
              <div
                className={`h-1.5 w-full overflow-hidden rounded-full ${
                  isDark ? 'bg-[#24282E]' : 'bg-[#E5E7EB]'
                }`}
              >
                <div
                  className="h-full rounded-full bg-[#BCEE45] transition-all duration-300"
                  style={{
                    width: `${Math.max(5, Math.min(100, progressPercent))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Action Footer inside Bubble */}
          <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleInteractMascot}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
                isDark
                  ? 'bg-[#1C1F24] border-[#2D323B] text-[#F3F4F6] hover:border-[#BCEE45]/60 hover:text-[#BCEE45]'
                  : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111315] hover:border-[#65A30D] hover:bg-[#ECFCCB]/40'
              }`}
            >
              {activeTipIndex !== null ? (
                <>
                  <Wand2 className="w-3 h-3 text-[#4D7C0F] dark:text-[#BCEE45]" />
                  <span>Outra dica / pose</span>
                </>
              ) : (
                <>
                  <MessageCircleHeart className="w-3 h-3 text-[#4D7C0F] dark:text-[#BCEE45]" />
                  <span>Dica da Capivara</span>
                </>
              )}
            </button>

            <span
              className={`text-[10px] ${
                isDark ? 'text-[#6B7280]' : 'text-[#9CA3AF]'
              }`}
            >
              Clique na capivara ♥
            </span>
          </div>

          {/* Speech Bubble Pointer Tail */}
          <div
            aria-hidden="true"
            className={`absolute -bottom-2 left-10 h-3.5 w-3.5 rotate-45 border-r border-b ${
              mood === 'dragging'
                ? isDark
                  ? 'border-[#BCEE45] bg-[#181E14]'
                  : 'border-[#65A30D] bg-[#F7FEE7]'
                : mood === 'error'
                  ? isDark
                    ? 'border-red-800/80 bg-[#1A1315]'
                    : 'border-red-300 bg-red-50'
                  : isDark
                    ? 'border-[#2D333B] bg-[#15171A]'
                    : 'border-[#E5E7EB] bg-white'
            }`}
          />
        </div>
      )}

      {/* Interactive Capybara Character in the Bottom-Right Corner */}
      <div className="relative pointer-events-auto">
        {/* Floating Musical Notes / Hearts around the Mascot */}
        {showMusicalNotes && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-4 inset-x-0 flex justify-between px-2 z-20"
          >
            <span className="mascot-note-1 text-sm font-bold text-[#4D7C0F] dark:text-[#BCEE45] drop-shadow-xs">
              ♪
            </span>
            <span className="mascot-note-2 text-base font-bold text-pink-500 drop-shadow-xs">
              {isPopping ? '♥' : '♫'}
            </span>
            <span className="mascot-note-3 text-sm font-bold text-[#4D7C0F] dark:text-[#BCEE45] drop-shadow-xs">
              ♬
            </span>
          </div>
        )}

        {/* Ambient Glow Behind Mascot */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-2 rounded-full blur-xl transition-opacity duration-300 ${
            mood === 'error'
              ? 'bg-red-500/25 opacity-90'
              : mood === 'converting' ||
                  mood === 'grooving' ||
                  mood === 'dragging' ||
                  mood === 'success'
                ? 'bg-[#BCEE45]/35 opacity-100 animate-pulse'
                : 'bg-[#BCEE45]/20 opacity-75'
          }`}
        />

        <button
          type="button"
          onClick={handleInteractMascot}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          title="Clique na capivara para interagir, trocar de pose e ver dicas de estúdio!"
          aria-label="Interagir com o mascote capivara do SONORA"
          className={`group relative flex items-center justify-center w-[4.5rem] h-[4.5rem] sm:w-24 sm:h-24 lg:w-32 lg:h-32 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] rounded-full ${animationClass}`}
        >
          <img
            key={mascotImageSrc}
            src={mascotImageSrc}
            alt="Mascote capivara do SONORA"
            className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.32)] transition-transform duration-300 group-hover:scale-108 select-none"
            draggable={false}
          />

          {/* Scanning Laser Beam during validation */}
          {mood === 'validating' && (
            <div
              aria-hidden="true"
              className="mascot-scan-beam pointer-events-none absolute inset-x-3 h-1.5 rounded-full bg-gradient-to-r from-transparent via-[#A3E635] to-transparent shadow-[0_0_8px_#A3E635]"
            />
          )}

          {/* Studio Equalizer Bars at bottom when converting or playing audio */}
          {(mood === 'converting' || mood === 'grooving') && (
            <div
              aria-hidden="true"
              className="absolute bottom-1 inset-x-0 flex items-end justify-center gap-1 pointer-events-none"
            >
              <span className="mascot-eq-1 w-1 h-3 rounded-full bg-[#BCEE45] shadow-xs origin-bottom" />
              <span className="mascot-eq-2 w-1 h-4 rounded-full bg-[#BCEE45] shadow-xs origin-bottom" />
              <span className="mascot-eq-3 w-1 h-2.5 rounded-full bg-[#BCEE45] shadow-xs origin-bottom" />
              <span className="mascot-eq-4 w-1 h-3.5 rounded-full bg-[#BCEE45] shadow-xs origin-bottom" />
            </div>
          )}
        </button>

        {/* Corner Mood Badge */}
        <div className="absolute bottom-1 right-1 z-20 pointer-events-none">
          {renderMoodBadge()}
        </div>
      </div>
    </aside>
  )
}
