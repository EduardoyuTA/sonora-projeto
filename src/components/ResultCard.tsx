import React, { useState } from 'react'
import {
  Check,
  CheckCircle2,
  Download,
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
      className={`rounded-[28px] border p-6 sm:p-8 transition-all ${
        isDark
          ? 'bg-[#121513] border-[#1F2421] text-[#F3F4F6]'
          : 'bg-white border-[#E5E7EB] text-[#111315] shadow-sm'
      }`}
    >
      {/* Top Banner: Success Badge & Real Metadata Pills */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-6 border-b border-[#E5E7EB] dark:border-[#1F2421]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-accent">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pronto
          </span>
          <h2 className="text-strong mt-2.5 text-2xl sm:text-[2rem] font-semibold leading-tight">
            Seu áudio está pronto.
          </h2>
          <p
            className="text-muted mt-1 font-mono text-[13px] truncate"
            title={result.outputFileName}
          >
            {result.outputFileName}
          </p>
        </div>

        {/* Real Output Stats */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span
            className={`px-3 py-1.5 rounded-xl border font-semibold uppercase ${
              isDark
                ? 'bg-[#161A18] border-[#2A302C] text-[#BCEE45]'
                : 'bg-[#ECFCCB] border-[#D9F99D] text-[#3F6212]'
            }`}
          >
            {result.format}
          </span>
          <span
            className={`px-3 py-1.5 rounded-xl border ${
              isDark
                ? 'bg-[#161A18] border-[#2A302C] text-[#F3F4F6]'
                : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111315]'
            }`}
          >
            {formatBytes(result.size)}
          </span>
          <span
            className={`px-3 py-1.5 rounded-xl border ${
              isDark
                ? 'bg-[#161A18] border-[#2A302C] text-[#A3AAA5]'
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
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl min-h-11 text-sm font-medium border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
              isDark
                ? 'bg-[#161A18] border-[#2A302C] text-[#F3F4F6] hover:bg-[#1F2421]'
                : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111315] hover:bg-[#F1F3F5]'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Converter outro vídeo</span>
          </button>

          <button
            type="button"
            onClick={onEditSettings}
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl min-h-11 text-sm font-medium border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
              isDark
                ? 'border-[#2A302C] text-[#A3AAA5] hover:text-white hover:bg-[#161A18]'
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
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl min-h-11 text-sm font-medium border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
                isDark
                  ? 'border-[#2A302C] text-[#A3AAA5] hover:text-white'
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
          className="btn-lime order-1 sm:order-2 inline-flex min-h-[52px] items-center justify-center gap-2.5 whitespace-nowrap px-7 rounded-xl font-semibold text-[15px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#A3E635]"
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
