import React, { useRef, useState } from 'react'
import {
  AlertCircle,
  Lock,
  MessageCircle,
  Music,
  Plus,
  Scissors,
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
      accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v,.ogv,.3gp"
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
        <p className={`text-sm ${isDark ? 'text-[#A3AAA5]' : 'text-[#525866]'}`}>
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
                isDark ? 'text-[#A3AAA5]' : 'text-[#525866]'
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
                      ? 'bg-[#121513] border-[#1F2421] text-[#F3F4F6] hover:bg-[#1F242B]'
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
                    ? 'border-[#1F2421] text-[#A3AAA5] hover:text-white'
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
            isDark ? 'bg-[#1F2421]' : 'bg-[#F1F3F5]'
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
              isDark ? 'text-[#A3AAA5]' : 'text-[#525866]'
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
                ? 'border-[#2A302C] text-[#A3AAA5] hover:text-red-400 hover:border-red-900/50'
                : 'border-[#E5E7EB] text-[#525866] hover:text-red-600 hover:border-red-200'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancelar conversão</span>
            <kbd
              className={`hidden sm:inline ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono border ${
                isDark ? 'border-[#2A302C] text-[#6B7280]' : 'border-[#E5E7EB] text-[#6B7280]'
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
                        ? 'bg-[#1F2421] text-[#A3AAA5]'
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
                  isDark ? 'text-[#A3AAA5]' : 'text-[#525866]'
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
                  ? 'bg-[#161A18] border-[#2A302C] text-[#F3F4F6] hover:bg-[#1F2421]'
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
                    ? 'border-[#2A302C] text-[#A3AAA5] hover:text-red-400 hover:bg-red-950/30'
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
                      ? 'border-[#2A302C] text-[#A3AAA5]'
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

  return (
    <>
      {hiddenInput}

      <section aria-label="Converter vídeo em áudio" className="flex flex-col gap-8">
        <div className="max-w-2xl">
          <h1 className="text-strong text-[2rem] sm:text-[2.75rem] font-semibold leading-[1.05]">
            Do vídeo ao áudio,
            <br />
            <span className="text-accent">sem complicação.</span>
          </h1>
          <p className="text-muted mt-3 max-w-xl text-[15px] sm:text-base leading-relaxed">
            Extraia a trilha de qualquer vídeo, corte o trecho que importa e baixe em MP3, WAV, M4A ou AAC.
          </p>
        </div>

        <div
          {...dragProps}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`dropzone-dashed flex flex-col items-center gap-5 rounded-3xl px-5 py-10 sm:px-8 sm:py-14 text-center transition-colors duration-200 ${
            isDragging
              ? 'border-[var(--accent-text)]! bg-[var(--accent-soft)]!'
              : isHovered
                ? 'bg-[var(--surface-2)]!'
                : ''
          }`}
        >
          <button
            type="button"
            onClick={triggerFileBrowser}
            className="icon-orb h-[72px] w-[72px] rounded-[20px]! cursor-pointer transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label="Selecionar vídeo"
          >
            <Upload className="h-8 w-8" strokeWidth={2} />
          </button>
          <div>
            <h2 className="text-strong text-xl sm:text-2xl font-semibold">
              {isDragging ? 'Pode soltar!' : 'Arraste seu vídeo para cá'}
            </h2>
            <p className="text-muted mt-1.5 text-sm">
              {formatsLabel} · até {MAX_FILE_SIZE_LABEL}
            </p>
          </div>
          <div className="flex w-full flex-col sm:w-auto sm:flex-row flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={triggerFileBrowser}
              className="btn-lime inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ring)]"
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.2} />
              Selecionar vídeo
            </button>
            <button
              type="button"
              onClick={onLoadDemoVideo}
              className="btn-glass inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <Play className="h-[18px] w-[18px]" strokeWidth={2} />
              Usar vídeo de exemplo
            </button>
          </div>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <FeatureItem
            icon={<Music className="h-5 w-5" strokeWidth={2} />}
            title="4 formatos de áudio"
            detail="MP3, WAV, M4A e AAC, com a qualidade que você escolher."
          />
          <FeatureItem
            icon={<Scissors className="h-5 w-5" strokeWidth={2} />}
            title="Corte e normalização"
            detail="Pegue só o trecho que importa, com volume de estúdio."
          />
          <FeatureItem
            icon={<Lock className="h-5 w-5" strokeWidth={2} />}
            title="Privado por padrão"
            detail="Arquivos são apagados assim que a conversão termina."
          />
        </ul>

        <button
          type="button"
          onClick={onTalkToMascot}
          className="btn-glass lg:hidden inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-xl px-4 text-sm font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <MessageCircle className="text-accent h-[18px] w-[18px]" strokeWidth={2} />
          Falar com a Capivara
        </button>
      </section>
    </>
  )
}

const FeatureItem: React.FC<{
  icon: React.ReactNode
  title: string
  detail: string
}> = ({ icon, title, detail }) => (
  <li className="glass flex gap-3.5 rounded-2xl p-4 sm:p-5">
    <span className="text-accent mt-0.5 shrink-0">{icon}</span>
    <span className="flex flex-col gap-1">
      <span className="text-strong text-sm font-semibold">{title}</span>
      <span className="text-muted text-[13px] leading-relaxed">{detail}</span>
    </span>
  </li>
)
