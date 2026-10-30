import React, { useRef, useState } from 'react'
import {
  AlertCircle,
  ChevronRight,
  Database,
  FileVideo,
  MessageCircle,
  AudioWaveform,
  CheckCircle2,
  FolderOpen,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import type { ConversionState, VideoMetadata } from '../types/sonora'
import {
  ACCEPTED_VIDEO_EXTENSIONS,
  MAX_FILE_SIZE_LABEL,
  formatBytes,
  formatDuration,
} from '../utils/formatters'
import { HeroArt } from './HeroArt'

interface UploadZoneProps {
  state: ConversionState
  video: VideoMetadata | null
  errorMessage: string | null
  progressPercent: number
  progressStage: string
  onSelectFile: (file: File, isDemo?: boolean) => void
  onLoadDemoVideo: () => void
  onRemoveVideo: () => void
  onCancelConversion: () => void
  onRetry: () => void
  theme: 'light' | 'dark'
  onDragStateChange?: (isDragging: boolean) => void
  onTalkToMascot: () => void
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  state,
  video,
  errorMessage,
  progressPercent,
  progressStage,
  onSelectFile,
  onLoadDemoVideo,
  onRemoveVideo,
  onCancelConversion,
  onRetry,
  theme,
  onDragStateChange,
  onTalkToMascot,
}) => {
  const isDark = theme === 'dark'
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (state === 'converting' || state === 'validating') return
    if (!isDragging) {
      setIsDragging(true)
      onDragStateChange?.(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    // Ignore dragleave fired when the cursor moves onto a child element (avoids flicker)
    const next = e.relatedTarget as Node | null
    if (next && e.currentTarget.contains(next)) return
    setIsDragging(false)
    onDragStateChange?.(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    onDragStateChange?.(false)
    if (state === 'converting' || state === 'validating') return

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      onSelectFile(droppedFiles[0], false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onSelectFile(files[0], false)
    }
    e.target.value = ''
  }

  const triggerFileBrowser = () => {
    fileInputRef.current?.click()
  }

  // Hidden file input always present so user can pick another video anytime
  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v"
      onChange={handleFileChange}
      className="sr-only"
      aria-label="Selecionar arquivo de vídeo do dispositivo"
    />
  )

  // 4. VALIDATING STATE
  if (state === 'validating') {
    return (
      <div
        className={`rounded-3xl border p-8 sm:p-10 text-center transition-all ${
          'glass text-strong'
        }`}
        role="status"
        aria-live="polite"
      >
        {hiddenInput}
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#BCEE45]/20 text-[#4D7C0F] dark:text-[#BCEE45]">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <h2 className="text-lg font-semibold mb-1">
          Preparando seu vídeo...
        </h2>
        <p className={`text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'}`}>
          Conferindo formato, duração e se há uma trilha de áudio. Leva só alguns segundos.
        </p>
      </div>
    )
  }

  // 8. ERROR STATE
  if (state === 'error') {
    return (
      <div
        className={`rounded-3xl border p-7 sm:p-9 transition-all ${
          isDark
            ? 'bg-[#1A1315] border-red-900/60 text-[#F3F4F6]'
            : 'bg-red-50/60 border-red-200 text-[#111315]'
        }`}
        role="alert"
      >
        {hiddenInput}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-red-500/15 text-red-600 dark:text-red-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <span className="inline-block text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/15 text-red-600 dark:text-red-400 font-semibold mb-2">
              Não foi possível concluir
            </span>
            <h2 className="text-lg font-semibold mb-1.5">
              {errorMessage || 'Ocorreu um problema ao processar este arquivo.'}
            </h2>
            <p
              className={`text-sm mb-5 ${
                isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
              }`}
            >
              Certifique-se de que o vídeo possui faixa de áudio válida, está abaixo de{' '}
              {MAX_FILE_SIZE_LABEL} e utiliza um formato compatível (MP4, MOV, WEBM, MKV, AVI).
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                type="button"
                onClick={triggerFileBrowser}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-[#BCEE45] hover:bg-[#A3E635] text-[#111315] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635]"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Escolher outro vídeo</span>
              </button>
              {video && (
                <button
                  type="button"
                  onClick={onRetry}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm border transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-[#15171A] border-[#24282E] text-[#F3F4F6] hover:bg-[#1F242B]'
                      : 'bg-white border-[#E5E7EB] text-[#111315] hover:bg-[#F3F4F6]'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Tentar novamente</span>
                </button>
              )}
              <button
                type="button"
                onClick={onLoadDemoVideo}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm border transition-colors cursor-pointer ${
                  isDark
                    ? 'border-[#24282E] text-[#9CA3AF] hover:text-white'
                    : 'border-[#E5E7EB] text-[#525866] hover:text-[#111315]'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>Usar vídeo de demonstração</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 6. CONVERTING STATE
  if (state === 'converting' && video) {
    return (
      <div
        className={`rounded-3xl border p-7 sm:p-9 transition-all ${
          'glass text-strong'
        }`}
        role="status"
        aria-live="polite"
      >
        {hiddenInput}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-[#BCEE45] text-[#111315]">
              <AudioWaveform className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#4D7C0F] dark:text-[#BCEE45] font-semibold">
                  Processando áudio
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-semibold truncate">
                {video.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-2xl sm:text-3xl font-mono font-bold tracking-tight">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Real Progress Bar */}
        <div
          className={`w-full h-3 rounded-full overflow-hidden mb-3 ${
            isDark ? 'bg-[#24282E]' : 'bg-[#F1F3F5]'
          }`}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-[#A3E635] transition-all duration-200 rounded-full"
            style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <p
            className={`text-sm font-medium flex items-center gap-2 ${
              isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
            }`}
          >
            <Loader2 className="w-4 h-4 animate-spin text-[#4D7C0F] dark:text-[#BCEE45]" />
            <span>{progressStage || 'Extraindo o áudio...'}</span>
          </p>

          <button
            type="button"
            onClick={onCancelConversion}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isDark
                ? 'border-[#2D323B] text-[#9CA3AF] hover:text-red-400 hover:border-red-900/50'
                : 'border-[#E5E7EB] text-[#525866] hover:text-red-600 hover:border-red-200'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancelar conversão</span>
            <kbd
              className={`hidden sm:inline ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono border ${
                isDark ? 'border-[#2D323B] text-[#6B7280]' : 'border-[#E5E7EB] text-[#6B7280]'
              }`}
            >
              Esc
            </kbd>
          </button>
        </div>
      </div>
    )
  }

  // 5. LOADED STATE (Compact summary card with preview and change/remove actions)
  if ((state === 'loaded' || state === 'success') && video) {
    return (
      <div
        className={`rounded-3xl border p-5 sm:p-6 transition-all ${
          'glass text-strong'
        }`}
      >
        {hiddenInput}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
            {/* Video Thumbnail / Mini Preview */}
            <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-black/10">
              <video
                src={video.objectUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
              <div className="absolute bottom-1 right-1 bg-black/75 text-white text-[10px] font-mono px-1.5 py-0.2 rounded">
                {formatDuration(video.duration)}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#4D7C0F] dark:text-[#BCEE45]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Vídeo carregado</span>
                </span>
                {video.isDemo && (
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded ${
                      isDark
                        ? 'bg-[#24282E] text-[#9CA3AF]'
                        : 'bg-[#F1F3F5] text-[#525866]'
                    }`}
                  >
                    Demo
                  </span>
                )}
              </div>
              <h2
                className="font-semibold text-base truncate"
                title={video.name}
              >
                {video.name}
              </h2>
              <div
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono mt-0.5 ${
                  isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
                }`}
              >
                <span>{formatBytes(video.size)}</span>
                <span>•</span>
                <span>Duração: {formatDuration(video.duration)}</span>
                <span>•</span>
                <span>
                  {video.width}×{video.height}px
                </span>
              </div>
            </div>
          </div>

          {/* Actions: Change or Remove Video */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={triggerFileBrowser}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
                isDark
                  ? 'bg-[#1C1F24] border-[#2D323B] text-[#F3F4F6] hover:bg-[#24282E]'
                  : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111315] hover:bg-[#F1F3F5]'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Trocar vídeo</span>
            </button>

            {!confirmRemove ? (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                  isDark
                    ? 'border-[#2D323B] text-[#9CA3AF] hover:text-red-400 hover:bg-red-950/30'
                    : 'border-[#E5E7EB] text-[#525866] hover:text-red-600 hover:bg-red-50'
                }`}
                aria-label="Remover vídeo selecionado"
                title="Remover vídeo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmRemove(false)
                    onRemoveVideo()
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Confirmar remoção
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  className={`p-1.5 rounded-xl text-xs border cursor-pointer ${
                    isDark
                      ? 'border-[#2D323B] text-[#9CA3AF]'
                      : 'border-[#E5E7EB] text-[#525866]'
                  }`}
                  aria-label="Cancelar remoção"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 1, 2, 3. INITIAL / HOVER / DRAGGING STATE
  const formatsLabel = ACCEPTED_VIDEO_EXTENSIONS.map((e) =>
    e.replace('.', '').toUpperCase()
  ).join(', ')

  const dragProps = {
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  }

  const subtitle = isDragging
    ? 'Solte o vídeo aqui para iniciar a preparação imediata.'
    : 'Extraia músicas, trilhas sonoras, podcasts e instrumentais com fidelidade de estúdio em segundos.'

  return (
    <>
      {hiddenInput}

      {/* ---------------- Mobile / tablet: single glass card ---------------- */}
      <section
        {...dragProps}
        aria-label="Converter vídeo em áudio"
        className={`glass glass-rim glass-glow lg:hidden rounded-[34px] px-4 pt-4 pb-5 text-center transition-transform duration-200 ${
          isDragging ? 'scale-[1.01] ring-2 ring-[#BCEE45]' : ''
        }`}
      >
        <HeroArt variant="mobile" />

        <h1 className="text-strong mt-2 text-[2rem] sm:text-4xl font-bold leading-[1.1] tracking-tight">
          Transforme vídeos
          <br />
          em áudio
        </h1>
        <p className="text-muted mx-auto mt-3 max-w-sm text-[15px] leading-relaxed">
          {subtitle}
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={triggerFileBrowser}
            className="btn-lime flex w-full items-center gap-4 rounded-full p-2 pr-6 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#BCEE45]"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <Upload className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <span className="flex-1 text-xl font-bold">Selecionar vídeo</span>
            <ChevronRight className="h-6 w-6" strokeWidth={2.2} />
          </button>

          <button
            type="button"
            onClick={onLoadDemoVideo}
            className="btn-glass flex w-full items-center gap-3 rounded-full p-2 pr-4 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BCEE45]"
          >
            <span className="icon-orb h-12 w-12 shrink-0">
              <Play className="text-accent h-5 w-5" strokeWidth={2} />
            </span>
            <span className="flex-1 whitespace-nowrap text-[15px] font-medium leading-tight">
              Testar com vídeo de exemplo
            </span>
            <ChevronRight className="text-muted h-5 w-5" />
          </button>
        </div>

        <div className="glass-soft mt-4 rounded-[26px] px-4 text-left">
          <InfoRow
            icon={<FileVideo className="h-6 w-6" strokeWidth={1.8} />}
            title="Formatos aceitos"
            detail={formatsLabel}
            onClick={triggerFileBrowser}
          />
          <div className="ml-16 h-px bg-[var(--glass-hairline)]" />
          <InfoRow
            icon={<Database className="h-6 w-6" strokeWidth={1.8} />}
            title="Tamanho máximo"
            detail={MAX_FILE_SIZE_LABEL}
            onClick={triggerFileBrowser}
          />
        </div>

        {/* Bottom row: the mascot floats on the left, chat pill on the right */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onTalkToMascot}
            className="btn-glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BCEE45]"
          >
            <MessageCircle className="text-accent h-5 w-5" strokeWidth={2} />
            <span>Falar com a Capivara</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ---------------- Desktop: hero + dropzone + info cards ---------------- */}
      <section
        aria-label="Converter vídeo em áudio"
        className="glass glass-rim glass-glow hidden lg:block overflow-hidden rounded-[32px] p-8 xl:p-10"
      >
        <div className="grid grid-cols-[1fr_minmax(300px,0.9fr)] items-center gap-6">
          <div>
            <h1 className="text-strong text-5xl 2xl:text-6xl font-extrabold leading-[1.02] tracking-tight">
              Transforme
              <br />
              vídeos em <span className="text-accent">áudio</span>
            </h1>
            <p className="text-muted mt-5 max-w-lg text-lg leading-relaxed">
              {subtitle}
            </p>
          </div>
          <HeroArt variant="desktop" />
        </div>

        <div
          {...dragProps}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`dropzone-dashed mt-8 rounded-[26px] p-5 text-center transition-all duration-200 ${
            isDragging
              ? 'border-[#BCEE45]! bg-[#BCEE45]/10 scale-[1.01]'
              : isHovered
                ? 'bg-[var(--glass-bg-soft)]'
                : ''
          }`}
        >
          <button
            type="button"
            onClick={triggerFileBrowser}
            className="glass-soft mx-auto mt-3 flex h-20 w-24 items-center justify-center rounded-3xl cursor-pointer transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BCEE45]"
            aria-label="Selecionar vídeo"
          >
            <Upload className="text-strong h-8 w-8" strokeWidth={2} />
          </button>
          <p className="text-strong mt-5 text-xl font-semibold">
            {isDragging ? 'Pode soltar!' : 'Arraste e solte seu vídeo aqui'}
          </p>
          <p className="text-muted mt-1.5">
            ou{' '}
            <button
              type="button"
              onClick={triggerFileBrowser}
              className="text-accent font-medium hover:underline cursor-pointer focus:outline-none focus-visible:underline"
            >
              clique para selecionar
            </button>
          </p>
          <p className="text-faint mt-3 text-sm">
            {formatsLabel} <span className="mx-2">•</span> Até {MAX_FILE_SIZE_LABEL}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={triggerFileBrowser}
              className="btn-lime flex items-center justify-center gap-3 rounded-2xl py-4 text-lg font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#BCEE45]"
            >
              <FolderOpen className="h-6 w-6" strokeWidth={2} />
              <span>Selecionar vídeo</span>
            </button>
            <button
              type="button"
              onClick={onLoadDemoVideo}
              className="btn-glass flex items-center justify-center gap-3 rounded-2xl py-4 text-lg font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BCEE45]"
            >
              <Play className="text-accent h-6 w-6" strokeWidth={2} />
              <span>Testar com vídeo de exemplo</span>
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <InfoCard
            icon={<FileVideo className="h-6 w-6" strokeWidth={1.8} />}
            title="Formatos aceitos"
            detail={formatsLabel}
          />
          <InfoCard
            icon={<Database className="h-6 w-6" strokeWidth={1.8} />}
            title="Tamanho máximo"
            detail={MAX_FILE_SIZE_LABEL}
          />
        </div>
      </section>
    </>
  )
}

const InfoRow: React.FC<{
  icon: React.ReactNode
  title: string
  detail: string
  onClick: () => void
}> = ({ icon, title, detail, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-4 rounded-2xl py-3.5 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BCEE45]"
  >
    <span className="icon-orb h-12 w-12 shrink-0">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="text-strong block text-base font-semibold">{title}</span>
      <span className="text-muted block text-sm leading-snug">{detail}</span>
    </span>
    <ChevronRight className="text-muted h-5 w-5 shrink-0" />
  </button>
)

const InfoCard: React.FC<{
  icon: React.ReactNode
  title: string
  detail: string
}> = ({ icon, title, detail }) => (
  <div className="glass-soft flex items-center gap-5 rounded-[22px] p-5">
    <span className="icon-orb h-16 w-16 shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-strong text-lg font-semibold">{title}</p>
      <p className="text-muted mt-0.5 leading-snug">{detail}</p>
    </div>
  </div>
)
