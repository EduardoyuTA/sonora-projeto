import React, { useState } from 'react'
import {
  AlertTriangle,
  Clock,
  Download,
  FileAudio,
  HardDrive,
  History,
  Play,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import type { HistoryItem } from '../types/sonora'
import { formatBytes, formatDuration } from '../utils/formatters'
import { WaveformPlayer } from './WaveformPlayer'

interface HistoryViewProps {
  items: HistoryItem[]
  onRedownload: (item: HistoryItem) => Promise<void>
  onGetPlayableUrl: (item: HistoryItem) => Promise<string | null>
  onRemoveItem: (id: string) => Promise<void>
  onClearAll: () => Promise<void>
  onGoToConverter: () => void
  theme: 'light' | 'dark'
  onPlayStateChange?: (isPlaying: boolean) => void
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  items,
  onRedownload,
  onGetPlayableUrl,
  onRemoveItem,
  onClearAll,
  onGoToConverter,
  theme,
  onPlayStateChange,
}) => {
  const isDark = theme === 'dark'
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [playingItemId, setPlayingItemId] = useState<string | null>(null)
  const [playingUrl, setPlayingUrl] = useState<string | null>(null)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  const handleTogglePreview = async (item: HistoryItem) => {
    if (playingItemId === item.id) {
      if (playingUrl) URL.revokeObjectURL(playingUrl)
      setPlayingItemId(null)
      setPlayingUrl(null)
      return
    }

    const url = await onGetPlayableUrl(item)
    if (url) {
      if (playingUrl) URL.revokeObjectURL(playingUrl)
      setPlayingItemId(item.id)
      setPlayingUrl(url)
    }
  }

  const formatDatePtBr = (iso: string) => {
    try {
      const date = new Date(iso)
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch {
      return iso
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 ${
          isDark
            ? 'bg-[#15171A] border-[#24282E] text-[#F3F4F6]'
            : 'bg-white border-[#E5E7EB] text-[#111315] shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#65A30D] dark:text-[#BCEE45] font-semibold mb-1">
              <History className="w-3.5 h-3.5" />
              <span>Biblioteca Local</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Histórico de Conversões
            </h1>
            <p
              className={`text-sm mt-1 ${
                isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
              }`}
            >
              Seus arquivos são mantidos exclusivamente no armazenamento local do seu navegador para sua privacidade.
            </p>
          </div>

          {items.length > 0 && (
            <div className="shrink-0">
              {!confirmClearAll ? (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    isDark
                      ? 'border-[#2D323B] text-[#9CA3AF] hover:text-red-400 hover:border-red-900/50'
                      : 'border-[#E5E7EB] text-[#525866] hover:text-red-600 hover:border-red-200'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Limpar histórico</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setConfirmClearAll(false)
                      if (playingUrl) URL.revokeObjectURL(playingUrl)
                      setPlayingItemId(null)
                      setPlayingUrl(null)
                      await onClearAll()
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    Confirmar exclusão total
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className={`p-2 rounded-xl border text-xs cursor-pointer ${
                      isDark
                        ? 'border-[#2D323B] text-[#9CA3AF]'
                        : 'border-[#E5E7EB] text-[#525866]'
                    }`}
                    aria-label="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Storage Disclaimer Banner */}
        <div
          className={`mt-5 p-3.5 rounded-2xl border flex items-center gap-3 text-xs ${
            isDark
              ? 'bg-[#1C1F24] border-[#2D323B] text-[#9CA3AF]'
              : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#525866]'
          }`}
        >
          <HardDrive className="w-4 h-4 text-[#65A30D] dark:text-[#BCEE45] shrink-0" />
          <span>
            O histórico utiliza o IndexedDB local deste dispositivo. Limpar os dados de navegação do navegador removerá os arquivos salvos aqui.
          </span>
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div
          className={`rounded-3xl border p-12 text-center ${
            isDark
              ? 'bg-[#15171A] border-[#24282E] text-[#F3F4F6]'
              : 'bg-white border-[#E5E7EB] text-[#111315] shadow-xs'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
              isDark
                ? 'bg-[#1C1F24] text-[#BCEE45]'
                : 'bg-[#F1F3F5] text-[#111315]'
            }`}
          >
            <FileAudio className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold mb-1">
            Seus arquivos convertidos aparecerão aqui.
          </h2>
          <p
            className={`text-sm max-w-md mx-auto mb-6 ${
              isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
            }`}
          >
            Assim que você converter seu primeiro vídeo em áudio, poderá ouvi-lo ou baixá-lo novamente a qualquer momento.
          </p>
          <button
            type="button"
            onClick={onGoToConverter}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm bg-[#BCEE45] hover:bg-[#A3E635] text-[#111315] transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Converter meu primeiro vídeo</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isPreviewOpen = playingItemId === item.id && Boolean(playingUrl)
            const isConfirmingDelete = itemToDelete === item.id

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                  isDark
                    ? 'bg-[#15171A] border-[#24282E] text-[#F3F4F6]'
                    : 'bg-white border-[#E5E7EB] text-[#111315] shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center font-mono font-bold text-xs uppercase ${
                        isDark
                          ? 'bg-[#24282E] text-[#BCEE45]'
                          : 'bg-[#ECFCCB] text-[#3F6212]'
                      }`}
                    >
                      {item.format}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-semibold text-base truncate"
                        title={item.outputFileName}
                      >
                        {item.outputFileName}
                      </h3>
                      <div
                        className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs mt-0.5 ${
                          isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
                        }`}
                      >
                        <span className="truncate max-w-[200px]" title={item.originalFileName}>
                          Origem: {item.originalFileName}
                        </span>
                        <span>•</span>
                        <span className="font-mono">
                          {formatDuration(item.duration)}
                        </span>
                        <span>•</span>
                        <span className="font-mono">{formatBytes(item.size)}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDatePtBr(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Item Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {item.hasStoredBlob ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTogglePreview(item)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                            isPreviewOpen
                              ? 'bg-[#BCEE45] border-[#A3E635] text-[#111315] font-semibold'
                              : isDark
                                ? 'bg-[#1C1F24] border-[#2D323B] text-[#F3F4F6] hover:bg-[#24282E]'
                                : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111315] hover:bg-[#F1F3F5]'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{isPreviewOpen ? 'Fechar player' : 'Ouvir'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onRedownload(item)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#BCEE45] hover:bg-[#A3E635] text-[#111315] transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar novamente</span>
                        </button>
                      </>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border ${
                          isDark
                            ? 'border-[#2D323B] text-[#9CA3AF]'
                            : 'border-[#E5E7EB] text-[#525866]'
                        }`}
                        title="Você desativou o armazenamento de cópias de áudio nas configurações de privacidade."
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Apenas registro</span>
                      </span>
                    )}

                    {!isConfirmingDelete ? (
                      <button
                        type="button"
                        onClick={() => setItemToDelete(item.id)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          isDark
                            ? 'border-[#2D323B] text-[#9CA3AF] hover:text-red-400'
                            : 'border-[#E5E7EB] text-[#525866] hover:text-red-600'
                        }`}
                        aria-label={`Remover ${item.outputFileName} do histórico`}
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            setItemToDelete(null)
                            if (playingItemId === item.id) {
                              if (playingUrl) URL.revokeObjectURL(playingUrl)
                              setPlayingItemId(null)
                              setPlayingUrl(null)
                            }
                            await onRemoveItem(item.id)
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                        >
                          Excluir
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(null)}
                          className="p-1.5 rounded-xl border text-xs cursor-pointer"
                          aria-label="Cancelar exclusão"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Waveform Player when User Clicks 'Ouvir' */}
                {isPreviewOpen && playingUrl && (
                  <div className="mt-4 pt-4 border-t border-[#E5E7EB] dark:border-[#24282E]">
                    <WaveformPlayer
                      audioUrl={playingUrl}
                      fileName={item.outputFileName}
                      format={item.format}
                      qualityLabel={item.qualityLabel}
                      duration={item.duration}
                      peaks={item.peaks}
                      theme={theme}
                      onPlayStateChange={onPlayStateChange}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
