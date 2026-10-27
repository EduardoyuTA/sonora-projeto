import React, { useState } from 'react'
import {
  CheckCircle2,
  Cpu,
  Globe,
  HelpCircle,
  Moon,
  Shield,
  Sliders,
  Sun,
  Trash2,
} from 'lucide-react'
import type {
  AppSettings,
  AudioFormat,
  BitrateKbps,
  QualityTier,
} from '../types/sonora'
import { MAX_FILE_SIZE_LABEL, mapTierToBitrate } from '../utils/formatters'

interface SettingsViewProps {
  settings: AppSettings
  onUpdateSettings: (next: AppSettings) => void
  historyCount: number
  onClearHistory: () => Promise<void>
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  historyCount,
  onClearHistory,
}) => {
  const isDark = settings.theme === 'dark'
  const [clearedBanner, setClearedBanner] = useState(false)

  const handleFormatChange = (fmt: AudioFormat) => {
    onUpdateSettings({
      ...settings,
      defaultFormat: fmt,
    })
  }

  const handleQualityChange = (tier: QualityTier) => {
    const nextBitrate: BitrateKbps = mapTierToBitrate(tier, settings.defaultBitrate)
    onUpdateSettings({
      ...settings,
      defaultQualityTier: tier,
      defaultBitrate: nextBitrate,
    })
  }

  const handleClear = async () => {
    await onClearHistory()
    setClearedBanner(true)
    window.setTimeout(() => setClearedBanner(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 ${
          isDark
            ? 'bg-[#15171A] border-[#24282E] text-[#F3F4F6]'
            : 'bg-white border-[#E5E7EB] text-[#111315] shadow-xs'
        }`}
      >
        <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#65A30D] dark:text-[#BCEE45] font-semibold mb-1">
          <Sliders className="w-3.5 h-3.5" />
          <span>Preferências do Sistema</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Configurações do Aplicativo
        </h1>
        <p
          className={`text-sm mt-1 ${
            isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
          }`}
        >
          Personalize aparência, formato padrão, privacidade e motor de processamento. Todas as alterações são salvas automaticamente.
        </p>
      </div>

      {/* 1. Aparência e Idioma */}
      <section
        className={`rounded-3xl border p-6 sm:p-7 ${
          isDark
            ? 'bg-[#15171A] border-[#24282E] text-[#F3F4F6]'
            : 'bg-white border-[#E5E7EB] text-[#111315] shadow-xs'
        }`}
      >
        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          <Sun className="w-4 h-4 text-[#65A30D] dark:text-[#BCEE45]" />
          <span>Aparência, Acessibilidade e Idioma</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Theme Selector */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark
                ? 'bg-[#1C1F24] border-[#2D323B]'
                : 'bg-[#F9FAFB] border-[#E5E7EB]'
            }`}
          >
            <div className="text-xs font-mono uppercase tracking-wider mb-2 text-[#525866] dark:text-[#9CA3AF]">
              Tema da Interface
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  settings.theme === 'light'
                    ? 'bg-[#BCEE45] border-[#A3E635] text-[#111315]'
                    : isDark
                      ? 'border-[#2D323B] text-[#9CA3AF] hover:text-white'
                      : 'border-[#E5E7EB] text-[#525866]'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Claro (Padrão)</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  settings.theme === 'dark'
                    ? 'bg-[#BCEE45] border-[#A3E635] text-[#111315]'
                    : isDark
                      ? 'border-[#2D323B] text-[#9CA3AF]'
                      : 'border-[#E5E7EB] text-[#525866] hover:text-[#111315]'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Escuro</span>
              </button>
            </div>
          </div>

          {/* Language Selector */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark
                ? 'bg-[#1C1F24] border-[#2D323B]'
                : 'bg-[#F9FAFB] border-[#E5E7EB]'
            }`}
          >
            <div className="text-xs font-mono uppercase tracking-wider mb-2 text-[#525866] dark:text-[#9CA3AF]">
              Idioma do Sistema
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-xl border bg-white/50 dark:bg-[#15171A] border-[#E5E7EB] dark:border-[#2D323B]">
              <span className="inline-flex items-center gap-2 text-xs font-semibold">
                <Globe className="w-4 h-4 text-[#65A30D] dark:text-[#BCEE45]" />
                <span>Português (Brasil) — pt-BR</span>
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#BCEE45] text-[#111315] font-bold">
                Ativo
              </span>
            </div>
          </div>
        </div>

        {/* Reduced Motion Option */}
        <label
          className={`mt-4 flex items-center justify-between p-4 rounded-2xl border cursor-pointer ${
            isDark
              ? 'bg-[#1C1F24] border-[#2D323B]'
              : 'bg-[#F9FAFB] border-[#E5E7EB]'
          }`}
        >
          <div>
            <div className="text-sm font-semibold">
              Reduzir animações e movimento
            </div>
            <div
              className={`text-xs ${
                isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
              }`}
            >
              Simplifica transições visuais para maior conforto visual
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(e) =>
              onUpdateSettings({
                ...settings,
                reducedMotion: e.target.checked,
              })
            }
            className="w-4 h-4 accent-[#65A30D] rounded cursor-pointer"
          />
        </label>
      </section>

      {/* 2. Preferências Padrão de Conversão */}
      <section
        className={`rounded-3xl border p-6 sm:p-7 ${
          isDark
            ? 'bg-[#15171A] border-[#24282E] text-[#F3F4F6]'
            : 'bg-white border-[#E5E7EB] text-[#111315] shadow-xs'
        }`}
      >
        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#65A30D] dark:text-[#BCEE45]" />
          <span>Padrões de Conversão e Motor de Áudio</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Default Format */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark
                ? 'bg-[#1C1F24] border-[#2D323B]'
                : 'bg-[#F9FAFB] border-[#E5E7EB]'
            }`}
          >
            <label className="block text-xs font-mono uppercase tracking-wider mb-2 text-[#525866] dark:text-[#9CA3AF]">
              Formato Padrão
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['mp3', 'wav', 'm4a', 'aac'] as AudioFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleFormatChange(fmt)}
                  className={`py-2 rounded-xl font-mono text-xs font-bold uppercase border transition-all cursor-pointer ${
                    settings.defaultFormat === fmt
                      ? 'bg-[#BCEE45] border-[#A3E635] text-[#111315]'
                      : isDark
                        ? 'border-[#2D323B] text-[#9CA3AF] hover:text-white'
                        : 'border-[#E5E7EB] text-[#525866] hover:text-[#111315]'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Default Quality */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark
                ? 'bg-[#1C1F24] border-[#2D323B]'
                : 'bg-[#F9FAFB] border-[#E5E7EB]'
            }`}
          >
            <label className="block text-xs font-mono uppercase tracking-wider mb-2 text-[#525866] dark:text-[#9CA3AF]">
              Qualidade Padrão
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'economica', label: '128k (Eco)' },
                  { id: 'padrao', label: '192k (Padrão)' },
                  { id: 'alta', label: '320k (Alta)' },
                ] as { id: QualityTier; label: string }[]
              ).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleQualityChange(q.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    settings.defaultQualityTier === q.id
                      ? 'bg-[#BCEE45] border-[#A3E635] text-[#111315]'
                      : isDark
                        ? 'border-[#2D323B] text-[#9CA3AF] hover:text-white'
                        : 'border-[#E5E7EB] text-[#525866] hover:text-[#111315]'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Processing Mode Selector */}
        <div
          className={`p-4 rounded-2xl border mb-4 ${
            isDark
              ? 'bg-[#1C1F24] border-[#2D323B]'
              : 'bg-[#F9FAFB] border-[#E5E7EB]'
          }`}
        >
          <div className="text-xs font-mono uppercase tracking-wider mb-2 text-[#525866] dark:text-[#9CA3AF]">
            Arquitetura de Processamento
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, processingMode: 'hybrid-auto' })
              }
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                settings.processingMode === 'hybrid-auto'
                  ? isDark
                    ? 'bg-[#BCEE45]/12 border-[#BCEE45] text-white'
                    : 'bg-[#ECFCCB]/70 border-[#65A30D] text-[#111315]'
                  : isDark
                    ? 'border-[#2D323B] text-[#9CA3AF]'
                    : 'border-[#E5E7EB] text-[#525866]'
              }`}
            >
              <div className="font-semibold text-xs mb-0.5">
                Híbrido Nativo FFmpeg + Web Audio (Recomendado)
              </div>
              <div className="text-[11px] opacity-80">
                Usa o motor FFmpeg local para máxima velocidade e suporte a MP3, WAV, M4A e AAC sem retenção de arquivos.
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  processingMode: 'browser-only',
                })
              }
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                settings.processingMode === 'browser-only'
                  ? isDark
                    ? 'bg-[#BCEE45]/12 border-[#BCEE45] text-white'
                    : 'bg-[#ECFCCB]/70 border-[#65A30D] text-[#111315]'
                  : isDark
                    ? 'border-[#2D323B] text-[#9CA3AF]'
                    : 'border-[#E5E7EB] text-[#525866]'
              }`}
            >
              <div className="font-semibold text-xs mb-0.5">
                100% No Navegador (Web Audio + LameJS)
              </div>
              <div className="text-[11px] opacity-80">
                Decodifica e codifica MP3/WAV inteiramente na memória RAM da aba do navegador.
              </div>
            </button>
          </div>
        </div>

        {/* Remember last settings */}
        <label
          className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer ${
            isDark
              ? 'bg-[#1C1F24] border-[#2D323B]'
              : 'bg-[#F9FAFB] border-[#E5E7EB]'
          }`}
        >
          <div>
            <div className="text-sm font-semibold">
              Lembrar últimas opções utilizadas
            </div>
            <div
              className={`text-xs ${
                isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
              }`}
            >
              Mantém o último formato e taxa de bits escolhidos ao abrir um novo vídeo
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.rememberLastConfig}
            onChange={(e) =>
              onUpdateSettings({
                ...settings,
                rememberLastConfig: e.target.checked,
              })
            }
            className="w-4 h-4 accent-[#65A30D] rounded cursor-pointer"
          />
        </label>
      </section>

      {/* 3. Privacidade e Gerenciamento do Histórico */}
      <section
        className={`rounded-3xl border p-6 sm:p-7 ${
          isDark
            ? 'bg-[#15171A] border-[#24282E] text-[#F3F4F6]'
            : 'bg-white border-[#E5E7EB] text-[#111315] shadow-xs'
        }`}
      >
        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#65A30D] dark:text-[#BCEE45]" />
          <span>Privacidade e Armazenamento Local</span>
        </h2>

        <div className="space-y-3">
          <label
            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer ${
              isDark
                ? 'bg-[#1C1F24] border-[#2D323B]'
                : 'bg-[#F9FAFB] border-[#E5E7EB]'
            }`}
          >
            <div>
              <div className="text-sm font-semibold">
                Manter cópia do áudio no Histórico local (IndexedDB)
              </div>
              <div
                className={`text-xs ${
                  isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
                }`}
              >
                Permite ouvir e baixar novamente os áudios convertidos sem precisar reenviar o vídeo
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.saveHistoryBlobs}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  saveHistoryBlobs: e.target.checked,
                })
              }
              className="w-4 h-4 accent-[#65A30D] rounded cursor-pointer"
            />
          </label>

          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border ${
              isDark
                ? 'bg-[#1C1F24] border-[#2D323B]'
                : 'bg-[#F9FAFB] border-[#E5E7EB]'
            }`}
          >
            <div>
              <div className="text-sm font-semibold">
                Gerenciamento de dados armazenados ({historyCount}{' '}
                {historyCount === 1 ? 'item' : 'itens'})
              </div>
              <div
                className={`text-xs ${
                  isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
                }`}
              >
                Exclui imediatamente todos os registros e arquivos de áudio armazenados no navegador.
              </div>
            </div>

            {clearedBanner ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#65A30D] dark:text-[#BCEE45]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Histórico limpo com sucesso!</span>
              </span>
            ) : (
              <button
                type="button"
                disabled={historyCount === 0}
                onClick={handleClear}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Apagar todos os dados locais</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4. Limites do Sistema, Ajuda e Solução de Problemas */}
      <section
        className={`rounded-3xl border p-6 sm:p-7 ${
          isDark
            ? 'bg-[#15171A] border-[#24282E] text-[#F3F4F6]'
            : 'bg-white border-[#E5E7EB] text-[#111315] shadow-xs'
        }`}
      >
        <h2 className="text-base font-bold mb-4 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#65A30D] dark:text-[#BCEE45]" />
          <span>Limites de Arquivos, Direitos de Uso e Ajuda</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
          <div
            className={`p-4 rounded-2xl border ${
              isDark
                ? 'bg-[#1C1F24] border-[#2D323B] text-[#9CA3AF]'
                : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#525866]'
            }`}
          >
            <h3
              className={`font-semibold text-sm mb-1.5 ${
                isDark ? 'text-white' : 'text-[#111315]'
              }`}
            >
              Limites Técnicos e Formatos
            </h3>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                Tamanho máximo por arquivo: <strong>{MAX_FILE_SIZE_LABEL}</strong>.
              </li>
              <li>
                Formatos de entrada: MP4, MOV, WEBM, MKV, AVI, M4V, OGV e 3GP.
              </li>
              <li>
                Formatos de saída: MP3 (128 a 320 kbps), WAV (PCM 16-bit sem perdas), M4A e AAC.
              </li>
              <li>
                Arquivos temporários gerados na conversão são removidos automaticamente no mesmo segundo em que o áudio fica pronto.
              </li>
            </ul>
          </div>

          <div
            className={`p-4 rounded-2xl border ${
              isDark
                ? 'bg-[#1C1F24] border-[#2D323B] text-[#9CA3AF]'
                : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#525866]'
            }`}
          >
            <h3
              className={`font-semibold text-sm mb-1.5 ${
                isDark ? 'text-white' : 'text-[#111315]'
              }`}
            >
              Solução de Problemas e Uso Responsável
            </h3>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                <strong>Erro ao ler vídeo:</strong> Verifique se o vídeo possui trilha de áudio ativa e não está protegido por DRM.
              </li>
              <li>
                <strong>Qualidade do som:</strong> A conversão preserva a fidelidade original do vídeo; taxas maiores como 320 kbps evitam perdas por compressão.
              </li>
              <li>
                <strong>Direitos autorais:</strong> Utilize o SONORA apenas para vídeos próprios, gravações pessoais ou conteúdos que você tenha autorização para utilizar.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
