import React, { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Check,
  Moon,
  RefreshCw,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import type {
  AppSettings,
  AudioFormat,
  NativeEngineHealth,
  ProcessingMode,
  QualityTier,
} from '../types/sonora'
import {
  checkNativeEngineHealth,
  getLastKnownEngineHealth,
} from '../services/audioConversionEngine'
import { MAX_FILE_SIZE_LABEL, mapTierToBitrate } from '../utils/formatters'
import { SwitchRow } from './StudioControls'

interface SettingsViewProps {
  settings: AppSettings
  onUpdateSettings: (next: AppSettings) => void
  historyCount: number
  onClearHistory: () => Promise<void>
}

const SECTIONS = [
  { id: 'ajustes-aparencia', label: 'Aparência' },
  { id: 'ajustes-conversao', label: 'Conversão' },
  { id: 'ajustes-privacidade', label: 'Privacidade' },
  { id: 'ajustes-ajuda', label: 'Ajuda' },
]

const FORMATS: AudioFormat[] = ['mp3', 'wav', 'm4a', 'aac']

const QUALITIES: { id: QualityTier; label: string; detail: string }[] = [
  { id: 'economica', label: 'Econômica', detail: '128 kbps' },
  { id: 'padrao', label: 'Padrão', detail: '192 kbps' },
  { id: 'alta', label: 'Alta', detail: '320 kbps' },
]

const MODES: { id: ProcessingMode; label: string; detail: string }[] = [
  {
    id: 'hybrid-auto',
    label: 'Híbrido (recomendado)',
    detail:
      'Usa o servidor FFmpeg quando necessário e apaga o arquivo após a conversão. Aceita MP3, WAV, M4A e AAC.',
  },
  {
    id: 'browser-only',
    label: 'Somente no navegador',
    detail: 'O vídeo não sai do dispositivo. Aceita MP3 e WAV.',
  },
]

const SAVED_BADGE_MS = 1800

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  historyCount,
  onClearHistory,
}) => {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
  const [showSaved, setShowSaved] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [apiUrlInput, setApiUrlInput] = useState(settings.customApiUrl || '')
  const [engineHealth, setEngineHealth] = useState<NativeEngineHealth>(() =>
    getLastKnownEngineHealth()
  )
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const savedTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    checkNativeEngineHealth(settings.customApiUrl, 8000).then((result) => {
      if (active) setEngineHealth(result)
    })
    return () => {
      active = false
    }
  }, [settings.customApiUrl])

  useEffect(
    () => () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current)
    },
    []
  )

  const update = (patch: Partial<AppSettings>) => {
    onUpdateSettings({ ...settings, ...patch })
    setShowSaved(true)
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current)
    savedTimerRef.current = window.setTimeout(() => setShowSaved(false), SAVED_BADGE_MS)
  }

  const goToSection = (id: string) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }

  const testConnection = async () => {
    const cleanUrl = apiUrlInput.trim().replace(/\/+$/, '')
    setApiUrlInput(cleanUrl)
    update({ customApiUrl: cleanUrl })
    setIsTestingConnection(true)
    setEngineHealth(await checkNativeEngineHealth(cleanUrl, 12000))
    setIsTestingConnection(false)
  }

  const clearHistory = async () => {
    setConfirmClear(false)
    await onClearHistory()
  }

  const engineLabel =
    isTestingConnection || engineHealth.status === 'checking'
      ? 'Verificando conexão…'
      : engineHealth.status === 'online'
        ? `Servidor online${engineHealth.latencyMs ? ` · ${engineHealth.latencyMs} ms` : ''}`
        : 'Servidor indisponível, usando o navegador'

  return (
    <div className="flex flex-col gap-5">
      <header className="st-page-head">
        <div>
          <h1 className="text-strong text-2xl font-semibold">Ajustes</h1>
          <p className="text-muted mt-1 text-sm">Tudo é salvo automaticamente.</p>
        </div>
        <span className={`st-saved ${showSaved ? 'is-visible' : ''}`} role="status">
          {showSaved && (
            <>
              <Check aria-hidden="true" />
              Salvo
            </>
          )}
        </span>
      </header>

      <nav className="st-section-nav" aria-label="Seções dos ajustes">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`st-chip ${activeSection === section.id ? 'is-active' : ''}`}
            aria-current={activeSection === section.id ? 'true' : undefined}
            onClick={() => goToSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <section id="ajustes-aparencia" className="st-settings-card">
        <h2>Aparência</h2>
        <div className="st-theme-grid" role="radiogroup" aria-label="Tema da interface">
          {(
            [
              { id: 'light', label: 'Claro', Icon: Sun },
              { id: 'dark', label: 'Escuro', Icon: Moon },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={settings.theme === id}
              className={`st-theme st-theme--${id} ${settings.theme === id ? 'is-active' : ''}`}
              onClick={() => update({ theme: id })}
            >
              <span className="st-theme__preview" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="st-theme__label">
                <Icon aria-hidden="true" />
                {label}
              </span>
            </button>
          ))}
        </div>
        <SwitchRow
          label="Reduzir animações"
          description="Desliga os movimentos e as transições da interface."
          checked={settings.reducedMotion}
          onChange={(reducedMotion) => update({ reducedMotion })}
        />
      </section>

      <section id="ajustes-conversao" className="st-settings-card">
        <h2>Conversão</h2>

        <h3>Formato padrão</h3>
        <div className="st-filter-chips" role="radiogroup" aria-label="Formato padrão">
          {FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              role="radio"
              aria-checked={settings.defaultFormat === format}
              className={`st-chip ${settings.defaultFormat === format ? 'is-active' : ''}`}
              onClick={() => update({ defaultFormat: format })}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>

        <h3>Qualidade padrão</h3>
        <div className="st-option-grid st-option-grid--three" role="radiogroup" aria-label="Qualidade padrão">
          {QUALITIES.map((quality) => (
            <button
              key={quality.id}
              type="button"
              role="radio"
              aria-checked={settings.defaultQualityTier === quality.id}
              className={`st-option ${settings.defaultQualityTier === quality.id ? 'is-active' : ''}`}
              onClick={() =>
                update({
                  defaultQualityTier: quality.id,
                  defaultBitrate: mapTierToBitrate(quality.id, settings.defaultBitrate),
                })
              }
            >
              <strong>{quality.label}</strong>
              <small>{quality.detail}</small>
            </button>
          ))}
        </div>

        <h3>Onde converter</h3>
        <div className="st-option-grid" role="radiogroup" aria-label="Onde converter">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={settings.processingMode === mode.id}
              className={`st-option ${settings.processingMode === mode.id ? 'is-active' : ''}`}
              onClick={() => update({ processingMode: mode.id })}
            >
              <strong>{mode.label}</strong>
              <small>{mode.detail}</small>
            </button>
          ))}
        </div>

        <h3>Servidor de conversão</h3>
        <p className={`st-engine st-engine--${engineHealth.status}`} role="status">
          <Activity aria-hidden="true" />
          {engineLabel}
        </p>
        <div className="st-url-row">
          <input
            type="url"
            value={apiUrlInput}
            onChange={(event) => setApiUrlInput(event.target.value)}
            placeholder="https://sonora-ffmpeg-api.onrender.com"
            aria-label="Endereço do servidor FFmpeg"
          />
          <button
            type="button"
            className="btn-lime inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold cursor-pointer disabled:opacity-60"
            onClick={testConnection}
            disabled={isTestingConnection}
          >
            <RefreshCw
              className={`h-4 w-4 ${isTestingConnection ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isTestingConnection ? 'Testando…' : 'Salvar e testar'}
          </button>
        </div>

        <SwitchRow
          label="Lembrar as últimas opções"
          description="Mantém o último formato e a qualidade ao abrir um novo vídeo."
          checked={settings.rememberLastConfig}
          onChange={(rememberLastConfig) => update({ rememberLastConfig })}
        />
      </section>

      <section id="ajustes-privacidade" className="st-settings-card">
        <h2>Privacidade</h2>
        <SwitchRow
          label="Guardar cópia do áudio no histórico"
          description="Permite ouvir e baixar de novo sem reenviar o vídeo. Fica só neste navegador."
          checked={settings.saveHistoryBlobs}
          onChange={(saveHistoryBlobs) => update({ saveHistoryBlobs })}
        />
        <div className="st-danger-row">
          <div>
            <p className="text-strong text-sm font-semibold">
              Dados locais ({historyCount} {historyCount === 1 ? 'item' : 'itens'})
            </p>
            <p className="text-muted mt-0.5 text-xs">
              Apaga os registros e os áudios guardados neste navegador.
            </p>
          </div>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <button type="button" className="st-danger" onClick={clearHistory}>
                Confirmar exclusão
              </button>
              <button
                type="button"
                className="st-icon-btn"
                onClick={() => setConfirmClear(false)}
                aria-label="Cancelar"
              >
                <X aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="st-chip"
              disabled={historyCount === 0}
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 aria-hidden="true" />
              Apagar dados
            </button>
          )}
        </div>
      </section>

      <section id="ajustes-ajuda" className="st-settings-card">
        <h2>Ajuda</h2>
        <details className="st-help">
          <summary>Limites e formatos</summary>
          <ul>
            <li>Tamanho máximo por arquivo: {MAX_FILE_SIZE_LABEL}.</li>
            <li>Entrada: MP4, MOV, WEBM, MKV, AVI, M4V, OGV e 3GP.</li>
            <li>Saída: MP3 de 128 a 320 kbps, WAV PCM 16-bit, M4A e AAC.</li>
          </ul>
        </details>
        <details className="st-help">
          <summary>O vídeo não abre</summary>
          <p>Confira se ele tem uma faixa de áudio e se não está protegido por DRM.</p>
        </details>
        <details className="st-help">
          <summary>Qualidade do som</summary>
          <p>Taxas maiores evitam perdas na compressão, mas não superam a qualidade do vídeo original.</p>
        </details>
        <details className="st-help">
          <summary>Direitos autorais</summary>
          <p>Use o Sonora apenas com vídeos próprios ou conteúdos que você tem autorização para utilizar.</p>
        </details>
      </section>
    </div>
  )
}
