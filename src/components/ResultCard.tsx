import React, { useState } from 'react'
import {
  Check,
  CheckCircle2,
  Download,
  FileAudio,
  RefreshCw,
  Share2,
  Sliders,
} from 'lucide-react'
import type { ConvertedAudioResult } from '../types/sonora'
import { formatBytes, formatDuration } from '../utils/formatters'
import { WaveformPlayer } from './WaveformPlayer'

interface ResultCardProps {
  result: ConvertedAudioResult
  onDownload: (result: ConvertedAudioResult) => void
  onConvertAnother: () => void
  onEditSettings: () => void
  theme: 'light' | 'dark'
  onPlayStateChange?: (isPlaying: boolean) => void
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  onDownload,
  onConvertAnother,
  onEditSettings,
  theme,
  onPlayStateChange,
}) => {
  const isDark = theme === 'dark'
  const [downloadedRecently, setDownloadedRecently] = useState(false)
  const [shareStatus, setShareStatus] = useState<string | null>(null)

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const handleDownloadClick = () => {
    onDownload(result)
    setDownloadedRecently(true)
    window.setTimeout(() => {
      setDownloadedRecently(false)
    }, 3000)
  }

  const handleShareClick = async () => {
    if (!canNativeShare) return
    try {
      const fileToShare = new File([result.blob], result.outputFileName, {
        type: result.blob.type,
      })
      if (navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
        await navigator.share({
          title: result.outputFileName,
          text: 'Áudio convertido com SONORA',
          files: [fileToShare],
        })
      } else {
        await navigator.share({
          title: result.outputFileName,
          text: `Áudio convertido com SONORA: ${result.outputFileName} (${formatBytes(result.size)})`,
        })
      }
      setShareStatus('Compartilhado!')
      window.setTimeout(() => setShareStatus(null), 2500)
    } catch {
      // User cancelled share sheet
    }
  }

  return (
    <section
      aria-label="Resultado da conversão de áudio"
      className={`rounded-3xl border p-6 sm:p-8 transition-all ${
        isDark
          ? 'bg-[#15171A] border-[#24282E] text-[#F3F4F6]'
          : 'bg-white border-[#E5E7EB] text-[#111315] shadow-sm'
      }`}
    >
      {/* Top Banner: Success Badge & Real Metadata Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-[#E5E7EB] dark:border-[#24282E]">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center bg-[#BCEE45] text-[#111315] shadow-xs">
            <FileAudio className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4D7C0F] dark:text-[#BCEE45] mb-0.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Seu áudio está pronto!</span>
            </div>
            <h2
              className="text-lg sm:text-xl font-bold truncate"
              title={result.outputFileName}
            >
              {result.outputFileName}
            </h2>
          </div>
        </div>

        {/* Real Output Stats */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span
            className={`px-3 py-1.5 rounded-xl border font-semibold uppercase ${
              isDark
                ? 'bg-[#1C1F24] border-[#2D323B] text-[#BCEE45]'
                : 'bg-[#ECFCCB] border-[#D9F99D] text-[#3F6212]'
            }`}
          >
            {result.format}
          </span>
          <span
            className={`px-3 py-1.5 rounded-xl border ${
              isDark
                ? 'bg-[#1C1F24] border-[#2D323B] text-[#F3F4F6]'
                : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111315]'
            }`}
          >
            {formatBytes(result.size)}
          </span>
          <span
            className={`px-3 py-1.5 rounded-xl border ${
              isDark
                ? 'bg-[#1C1F24] border-[#2D323B] text-[#9CA3AF]'
                : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#525866]'
            }`}
          >
            {formatDuration(result.duration)}
          </span>
        </div>
      </div>

      {/* Integrated Waveform Audio Player */}
      <div className="mb-7">
        <WaveformPlayer
          audioUrl={result.objectUrl}
          fileName={result.outputFileName}
          format={result.format}
          qualityLabel={result.qualityLabel}
          duration={result.duration}
          peaks={result.peaks}
          theme={theme}
          onPlayStateChange={onPlayStateChange}
        />
      </div>

      {/* Primary & Secondary Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 order-2 sm:order-1">
          <button
            type="button"
            onClick={onConvertAnother}
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
              isDark
                ? 'bg-[#1C1F24] border-[#2D323B] text-[#F3F4F6] hover:bg-[#24282E]'
                : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111315] hover:bg-[#F1F3F5]'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Converter outro vídeo</span>
          </button>

          <button
            type="button"
            onClick={onEditSettings}
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
              isDark
                ? 'border-[#2D323B] text-[#9CA3AF] hover:text-white hover:bg-[#1C1F24]'
                : 'border-[#E5E7EB] text-[#525866] hover:text-[#111315] hover:bg-[#F9FAFB]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Editar configurações</span>
          </button>

          {canNativeShare && (
            <button
              type="button"
              onClick={handleShareClick}
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
                isDark
                  ? 'border-[#2D323B] text-[#9CA3AF] hover:text-white'
                  : 'border-[#E5E7EB] text-[#525866] hover:text-[#111315]'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>{shareStatus || 'Compartilhar'}</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleDownloadClick}
          className="order-1 sm:order-2 inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl font-bold text-base bg-[#BCEE45] hover:bg-[#A3E635] active:scale-[0.99] text-[#111315] shadow-xs transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#A3E635]"
        >
          {downloadedRecently ? (
            <>
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>Download concluído</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5 stroke-[2.2]" />
              <span>Baixar áudio ({formatBytes(result.size)})</span>
            </>
          )}
        </button>
      </div>
    </section>
  )
}
