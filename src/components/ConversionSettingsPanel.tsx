import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  FileAudio,
  Info,
  Scissors,
  Sliders,
  Sparkles,
  Volume2,
} from 'lucide-react'
import type {
  AudioFormat,
  BitrateKbps,
  ConversionConfig,
  ProcessingMode,
  QualityTier,
  VideoMetadata,
} from '../types/sonora'
import {
  estimateOutputSizeBytes,
  formatBytes,
  formatDuration,
  formatPreciseTime,
  mapTierToBitrate,
} from '../utils/formatters'

interface ConversionSettingsPanelProps {
  video: VideoMetadata
  config: ConversionConfig
  onChangeConfig: (next: ConversionConfig) => void
  onStartConversion: () => void
  processingMode: ProcessingMode
  isConverting: boolean
  theme: 'light' | 'dark'
}

export const ConversionSettingsPanel: React.FC<ConversionSettingsPanelProps> = ({
  video,
  config,
  onChangeConfig,
  onStartConversion,
  processingMode,
  isConverting,
  theme,
}) => {
  const isDark = theme === 'dark'
  const [showAdvanced, setShowAdvanced] = useState(false)

  const formats: {
    id: AudioFormat
    label: string
    badge: string
    description: string
    disabledInBrowserOnly?: boolean
  }[] = [
    {
      id: 'mp3',
      label: 'MP3',
      badge: 'Recomendado',
      description: 'Padrão universal para músicas, podcasts e celulares.',
    },
    {
      id: 'wav',
      label: 'WAV',
      badge: 'Sem compressão',
      description: 'Áudio PCM puro sem perdas adicionais na conversão.',
    },
    {
      id: 'm4a',
      label: 'M4A',
      badge: 'Apple / Web',
      description: 'Contêiner moderno eficiente com excelente fidelidade.',
      disabledInBrowserOnly: processingMode === 'browser-only',
    },
    {
      id: 'aac',
      label: 'AAC',
      badge: 'Stream',
      description: 'Áudio avançado compacto para players modernos.',
      disabledInBrowserOnly: processingMode === 'browser-only',
    },
  ]

  const qualityTiers: {
    id: QualityTier
    label: string
    sub: string
    kbps: BitrateKbps
  }[] = [
    {
      id: 'economica',
      label: 'Econômica',
      sub: '128 kbps • Menor arquivo',
      kbps: 128,
    },
    {
      id: 'padrao',
      label: 'Padrão',
      sub: '192 kbps • Equilíbrio ideal',
      kbps: 192,
    },
    {
      id: 'alta',
      label: 'Alta',
      sub: '320 kbps • Fidelidade máxima',
      kbps: 320,
    },
    {
      id: 'personalizada',
      label: 'Personalizada',
      sub: `${config.bitrate} kbps • Ajuste manual`,
      kbps: config.bitrate,
    },
  ]

  const bitrates: BitrateKbps[] = [128, 192, 256, 320]

  const selectedDuration = Math.max(
    0.5,
    (config.endTime > 0 ? config.endTime : video.duration) - config.startTime
  )
  const estimatedSize = estimateOutputSizeBytes(
    selectedDuration,
    config.format,
    config.bitrate
  )

  const handleSelectFormat = (fmt: AudioFormat) => {
    onChangeConfig({
      ...config,
      format: fmt,
    })
  }

  const handleSelectTier = (tier: QualityTier) => {
    const nextBitrate = mapTierToBitrate(tier, config.bitrate)
    onChangeConfig({
      ...config,
      qualityTier: tier,
      bitrate: nextBitrate,
    })
  }

  const handleSelectBitrate = (kbps: BitrateKbps) => {
    onChangeConfig({
      ...config,
      qualityTier: 'personalizada',
      bitrate: kbps,
    })
  }

  const handleStartTimeChange = (val: number) => {
    const clampedStart = Math.max(0, Math.min(val, config.endTime - 0.5))
    onChangeConfig({
      ...config,
      startTime: Number(clampedStart.toFixed(1)),
    })
  }

  const handleEndTimeChange = (val: number) => {
    const clampedEnd = Math.min(
      video.duration,
      Math.max(val, config.startTime + 0.5)
    )
    onChangeConfig({
      ...config,
      endTime: Number(clampedEnd.toFixed(1)),
    })
  }

  return (
    <section
      aria-label="Configurações de conversão de áudio"
      className={`rounded-3xl border p-6 sm:p-8 transition-all ${
        isDark
          ? 'bg-[#15171A] border-[#24282E] text-[#F3F4F6]'
          : 'bg-white border-[#E5E7EB] text-[#111315] shadow-xs'
      }`}
    >
      {/* Header with Estimated Size Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 mb-6 border-b border-[#E5E7EB] dark:border-[#24282E]">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#65A30D] dark:text-[#BCEE45]" />
            <span>Configurações de saída</span>
          </h3>
          <p
            className={`text-xs sm:text-sm mt-0.5 ${
              isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
            }`}
          >
            Escolha o formato ideal. A conversão preserva a clareza original sem prometer ganhos artificiais.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-mono border shrink-0 ${
            isDark
              ? 'bg-[#1C1F24] border-[#2D323B] text-[#F3F4F6]'
              : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111315]'
          }`}
          title="Cálculo estimado com base na duração do trecho selecionado e na taxa de bits escolhida."
        >
          <FileAudio className="w-4 h-4 text-[#65A30D] dark:text-[#BCEE45]" />
          <span>Tamanho estimado:</span>
          <strong className="font-semibold">~{formatBytes(estimatedSize)}</strong>
        </div>
      </div>

      {/* 1. Format Selection Grid */}
      <div className="mb-6">
        <label className="block text-xs font-mono uppercase tracking-wider mb-3 text-[#525866] dark:text-[#9CA3AF]">
          Formato de Áudio
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {formats.map((fmt) => {
            const active = config.format === fmt.id
            const disabled = Boolean(fmt.disabledInBrowserOnly)
            return (
              <button
                key={fmt.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectFormat(fmt.id)}
                className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
                  disabled
                    ? 'opacity-45 cursor-not-allowed border-dashed'
                    : active
                      ? isDark
                        ? 'bg-[#BCEE45]/12 border-[#BCEE45] text-white shadow-xs'
                        : 'bg-[#ECFCCB]/60 border-[#65A30D] text-[#111315] shadow-xs'
                      : isDark
                        ? 'bg-[#1C1F24] border-[#2D323B] text-[#F3F4F6] hover:border-[#3E4552]'
                        : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111315] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="font-bold text-base font-mono">{fmt.label}</span>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      active
                        ? 'bg-[#BCEE45] text-[#111315] font-semibold'
                        : isDark
                          ? 'bg-[#24282E] text-[#9CA3AF]'
                          : 'bg-[#E5E7EB] text-[#525866]'
                    }`}
                  >
                    {fmt.badge}
                  </span>
                </div>
                <p
                  className={`text-xs leading-snug ${
                    isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
                  }`}
                >
                  {fmt.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Audio Quality Selection (for compressed formats) */}
      {config.format !== 'wav' ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-mono uppercase tracking-wider text-[#525866] dark:text-[#9CA3AF]">
              Qualidade do Áudio
            </label>
            <span
              className={`text-xs flex items-center gap-1 ${
                isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
              }`}
              title="Taxas maiores preservam mais detalhes da faixa original do vídeo, mas não aumentam a qualidade além da fonte original."
            >
              <Info className="w-3.5 h-3.5" />
              <span>Respeita a fonte original</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {qualityTiers.map((tier) => {
              const active = config.qualityTier === tier.id
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => handleSelectTier(tier.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
                    active
                      ? isDark
                        ? 'bg-[#BCEE45]/12 border-[#BCEE45] text-white'
                        : 'bg-[#ECFCCB]/60 border-[#65A30D] text-[#111315]'
                      : isDark
                        ? 'bg-[#1C1F24] border-[#2D323B] text-[#F3F4F6] hover:border-[#3E4552]'
                        : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111315] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="font-semibold text-sm">{tier.label}</div>
                  <div
                    className={`text-xs font-mono mt-0.5 ${
                      isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
                    }`}
                  >
                    {tier.sub}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Specific kbps selector when Personalizada or MP3 is active */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2">
            <span
              className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'}`}
            >
              Taxa de bits (Bitrate):
            </span>
            <div className="inline-flex items-center gap-1.5">
              {bitrates.map((kbps) => {
                const active = config.bitrate === kbps
                return (
                  <button
                    key={kbps}
                    type="button"
                    onClick={() => handleSelectBitrate(kbps)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#BCEE45] border-[#A3E635] text-[#111315] font-bold'
                        : isDark
                          ? 'bg-[#1C1F24] border-[#2D323B] text-[#9CA3AF] hover:text-white'
                          : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#525866] hover:text-[#111315]'
                    }`}
                  >
                    {kbps} kbps
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 text-xs sm:text-sm ${
            isDark
              ? 'bg-[#1C1F24] border-[#2D323B] text-[#9CA3AF]'
              : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#525866]'
          }`}
        >
          <Info className="w-4 h-4 text-[#65A30D] dark:text-[#BCEE45] shrink-0 mt-0.5" />
          <div>
            <strong className={isDark ? 'text-white' : 'text-[#111315]'}>
              Formato WAV sem compressão selecionado:
            </strong>{' '}
            O áudio será extraído em PCM 16-bit (44.1 kHz) preservando cada amostra sonora sem compressão adicional.
          </div>
        </div>
      )}

      {/* 3. Progressive Disclosure: Advanced Settings Toggle */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          aria-expanded={showAdvanced}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
            isDark
              ? 'bg-[#1C1F24] border-[#2D323B] text-[#F3F4F6] hover:bg-[#24282E]'
              : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#111315] hover:bg-[#F1F3F5]'
          }`}
        >
          <span className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#65A30D] dark:text-[#BCEE45]" />
            <span>Configurações avançadas</span>
            <span
              className={`text-xs font-normal ${
                isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
              }`}
            >
              (Nome do arquivo, cortar trecho, volume e normalização)
            </span>
          </span>
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showAdvanced && (
          <div
            className={`mt-3 p-5 rounded-2xl border space-y-5 ${
              isDark
                ? 'bg-[#111316] border-[#24282E]'
                : 'bg-[#F9FAFB]/70 border-[#E5E7EB]'
            }`}
          >
            {/* Output File Name */}
            <div>
              <label
                htmlFor="sonora-custom-filename"
                className="block text-xs font-mono uppercase tracking-wider mb-2 text-[#525866] dark:text-[#9CA3AF]"
              >
                Nome do arquivo final
              </label>
              <div className="flex items-center">
                <input
                  id="sonora-custom-filename"
                  type="text"
                  value={config.customFileName}
                  onChange={(e) =>
                    onChangeConfig({ ...config, customFileName: e.target.value })
                  }
                  placeholder={video.baseName}
                  className={`flex-1 px-3.5 py-2.5 rounded-l-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#A3E635] ${
                    isDark
                      ? 'bg-[#1C1F24] border-[#2D323B] text-white'
                      : 'bg-white border-[#E5E7EB] text-[#111315]'
                  }`}
                />
                <span
                  className={`px-3.5 py-2.5 rounded-r-xl border border-l-0 text-sm font-mono font-semibold ${
                    isDark
                      ? 'bg-[#24282E] border-[#2D323B] text-[#BCEE45]'
                      : 'bg-[#F1F3F5] border-[#E5E7EB] text-[#525866]'
                  }`}
                >
                  .{config.format}
                </span>
              </div>
            </div>

            {/* Audio Trim / Cut Start & End */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="text-xs font-mono uppercase tracking-wider text-[#525866] dark:text-[#9CA3AF]">
                  Recortar trecho do vídeo
                </label>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#BCEE45]/20 text-[#65A30D] dark:text-[#BCEE45] font-semibold">
                  Duração selecionada: {formatDuration(selectedDuration)} (
                  {formatPreciseTime(selectedDuration)}s)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  className={`p-3.5 rounded-xl border ${
                    isDark
                      ? 'bg-[#1C1F24] border-[#2D323B]'
                      : 'bg-white border-[#E5E7EB]'
                  }`}
                >
                  <div className="flex justify-between text-xs mb-1.5">
                    <span>Início do trecho</span>
                    <span className="font-mono font-semibold">
                      {formatPreciseTime(config.startTime)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.5, video.duration - 0.5)}
                    step={0.1}
                    value={config.startTime}
                    onChange={(e) => handleStartTimeChange( parseFloat(e.target.value) )}
                    aria-label="Início do trecho em segundos"
                    className="w-full h-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                  />
                </div>

                <div
                  className={`p-3.5 rounded-xl border ${
                    isDark
                      ? 'bg-[#1C1F24] border-[#2D323B]'
                      : 'bg-white border-[#E5E7EB]'
                  }`}
                >
                  <div className="flex justify-between text-xs mb-1.5">
                    <span>Fim do trecho</span>
                    <span className="font-mono font-semibold">
                      {formatPreciseTime(config.endTime)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={video.duration}
                    step={0.1}
                    value={config.endTime}
                    onChange={(e) => handleEndTimeChange( parseFloat(e.target.value) )}
                    aria-label="Fim do trecho em segundos"
                    className="w-full h-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Volume, Normalization & Preserve Original */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div
                className={`p-3.5 rounded-xl border ${
                  isDark
                    ? 'bg-[#1C1F24] border-[#2D323B]'
                    : 'bg-white border-[#E5E7EB]'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Volume2 className="w-4 h-4 text-[#65A30D] dark:text-[#BCEE45]" />
                    <span>Volume de saída</span>
                  </span>
                  <span className="font-mono font-semibold">
                    {config.preserveOriginal ? '100% (Original)' : `${config.volume}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={200}
                  step={5}
                  disabled={config.preserveOriginal}
                  value={config.preserveOriginal ? 100 : config.volume}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      volume: parseInt(e.target.value, 10),
                    })
                  }
                  aria-label="Volume de saída em porcentagem"
                  className="w-full h-2 rounded-lg bg-gray-200 dark:bg-gray-700 disabled:opacity-40"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#525866] dark:text-[#9CA3AF] mt-1">
                  <span>20%</span>
                  <span>100% (Padrão)</span>
                  <span>200% (Boost)</span>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-2.5">
                <label
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-[#1C1F24] border-[#2D323B] hover:bg-[#24282E]'
                      : 'bg-white border-[#E5E7EB] hover:bg-[#F3F4F6]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">
                      Normalizar volume (Loudness)
                    </div>
                    <div
                      className={`text-[11px] ${
                        isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
                      }`}
                    >
                      Equilibra picos baixos e altos (-16 LUFS)
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.normalize && !config.preserveOriginal}
                    disabled={config.preserveOriginal}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        normalize: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-[#65A30D] rounded cursor-pointer"
                  />
                </label>

                <label
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-[#1C1F24] border-[#2D323B] hover:bg-[#24282E]'
                      : 'bg-white border-[#E5E7EB] hover:bg-[#F3F4F6]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">
                      Preservar dinâmica original
                    </div>
                    <div
                      className={`text-[11px] ${
                        isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
                      }`}
                    >
                      Ignora filtros de ganho e mantém o sinal puro
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.preserveOriginal}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        preserveOriginal: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-[#65A30D] rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Primary Action: Convert Now */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div
          className={`text-xs ${isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'}`}
        >
          Saída final:{' '}
          <strong className={`font-mono ${isDark ? 'text-white' : 'text-[#111315]'}`}>
            {config.customFileName || video.baseName}.{config.format}
          </strong>{' '}
          ({formatDuration(selectedDuration)})
        </div>

        <button
          type="button"
          disabled={isConverting}
          onClick={onStartConversion}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base bg-[#BCEE45] hover:bg-[#A3E635] active:scale-[0.99] disabled:opacity-50 text-[#111315] shadow-xs transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#A3E635]"
        >
          <Sparkles className="w-5 h-5 stroke-[2.2]" />
          <span>Converter em {config.format.toUpperCase()}</span>
        </button>
      </div>
    </section>
  )
}
