import { useCallback, useEffect, useRef, useState } from 'react'
import { Shield, Sparkles, Zap } from 'lucide-react'
import type {
  ActiveTab,
  AppSettings,
  AuthUser,
  ConversionConfig,
  ConversionState,
  ConvertedAudioResult,
  HistoryItem,
  MascotMood,
  VideoMetadata,
} from './types/sonora'
import {
  clearAllAudioBlobs,
  clearAuthSession,
  deleteAudioBlob,
  getAudioBlob,
  loadAuthSession,
  loadHistoryMeta,
  loadLastFormatPreferences,
  loadSettings,
  saveAuthSession,
  saveHistoryMeta,
  saveLastFormatPreferences,
  saveSettings,
  storeAudioBlob,
} from './services/storageService'
import {
  convertVideoToAudio,
  validateAndProbeVideo,
  warmupNativeEngine,
} from './services/audioConversionEngine'
import { Navbar } from './components/Navbar'
import { UploadZone } from './components/UploadZone'
import { ConversionSettingsPanel } from './components/ConversionSettingsPanel'
import { ResultCard } from './components/ResultCard'
import { HistoryView } from './components/HistoryView'
import { SettingsView } from './components/SettingsView'
import { MascotGuide } from './components/MascotGuide'
import { LoginView } from './components/LoginView'

export function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() =>
    loadAuthSession()
  )
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [activeTab, setActiveTab] = useState<ActiveTab>('converter')

  const [conversionState, setConversionState] = useState<ConversionState>('idle')
  const [video, setVideo] = useState<VideoMetadata | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [progressPercent, setProgressPercent] = useState(0)
  const [progressStage, setProgressStage] = useState('')

  const [config, setConfig] = useState<ConversionConfig>(() => {
    const initialSettings = loadSettings()
    const lastPrefs = initialSettings.rememberLastConfig
      ? loadLastFormatPreferences()
      : null
    return {
      format: lastPrefs?.format || initialSettings.defaultFormat,
      qualityTier: lastPrefs?.qualityTier || initialSettings.defaultQualityTier,
      bitrate: lastPrefs?.bitrate || initialSettings.defaultBitrate,
      customFileName: '',
      startTime: 0,
      endTime: 0,
      volume: 100,
      normalize: false,
      preserveOriginal: false,
    }
  })

  const [result, setResult] = useState<ConvertedAudioResult | null>(null)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() =>
    loadHistoryMeta()
  )
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [customMascotReaction, setCustomMascotReaction] = useState<{
    mood: MascotMood
    eyebrow: string
    title: string
    description: string
  } | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const reactionTimerRef = useRef<number | null>(null)

  const triggerMascotReaction = useCallback(
    (
      reaction: {
        mood: MascotMood
        eyebrow: string
        title: string
        description: string
      },
      durationMs = 4200
    ) => {
      if (reactionTimerRef.current) {
        window.clearTimeout(reactionTimerRef.current)
      }
      setCustomMascotReaction(reaction)
      reactionTimerRef.current = window.setTimeout(() => {
        setCustomMascotReaction(null)
      }, durationMs)
    },
    []
  )

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    window.setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current))
    }, 3500)
  }, [])

  // Sync theme and reduced motion to document
  useEffect(() => {
    const root = document.documentElement
    if (!authUser) {
      root.classList.add('dark')
      document.body.style.backgroundColor = '#090B0C'
      document.body.style.color = '#F7F8F8'
      return
    }

    if (settings.theme === 'dark') {
      root.classList.add('dark')
      document.body.style.backgroundColor = '#0C0D0E'
      document.body.style.color = '#F3F4F6'
    } else {
      root.classList.remove('dark')
      document.body.style.backgroundColor = '#F9FAFB'
      document.body.style.color = '#111315'
    }
  }, [settings.theme, authUser])

  // Pre-warm the Render FFmpeg API when running in hybrid-auto mode
  useEffect(() => {
    if (settings.processingMode === 'hybrid-auto') {
      warmupNativeEngine()
    }
  }, [settings.processingMode])

  const handleLoginSuccess = (user: AuthUser) => {
    saveAuthSession(user)
    setAuthUser(user)
    showToast(`Bem-vindo ao SONORA STUDIO, ${user.name}!`)
    triggerMascotReaction({
      mood: 'petted',
      eyebrow: 'Estúdio Liberado!',
      title: `Oi, ${user.name}! Que bom ter você de volta!`,
      description:
        'Arraste seu vídeo para a tela quando quiser extrair a trilha sonora.',
    })
  }

  const handleLogout = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    clearAuthSession()
    setAuthUser(null)
  }

  const handleUpdateSettings = (next: AppSettings) => {
    setSettings(next)
    saveSettings(next)
  }

  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark'
    handleUpdateSettings({
      ...settings,
      theme: nextTheme,
    })
    triggerMascotReaction({
      mood: 'petted',
      eyebrow: nextTheme === 'dark' ? 'Modo Noturno de Estúdio' : 'Luzes do Estúdio Acesas',
      title:
        nextTheme === 'dark'
          ? 'Tema escuro ativado! Conforto total para sessões noturnas.'
          : 'Tema claro ativado! Visual limpo e iluminado.',
      description:
        'Suas preferências visuais já foram salvas automaticamente no navegador.',
    })
  }

  const handleSelectFile = async (file: File, isDemo = false) => {
    if (conversionState === 'converting') return

    // Clean up previous URLs
    if (video?.objectUrl) {
      URL.revokeObjectURL(video.objectUrl)
    }
    if (result?.objectUrl) {
      URL.revokeObjectURL(result.objectUrl)
      setResult(null)
    }

    setErrorMessage(null)
    setConversionState('validating')

    try {
      const metadata = await validateAndProbeVideo(file, isDemo)
      setVideo(metadata)

      const lastPrefs = settings.rememberLastConfig
        ? loadLastFormatPreferences()
        : null
      const preferredFormat = lastPrefs?.format || settings.defaultFormat
      const effectiveFormat =
        settings.processingMode === 'browser-only' &&
        (preferredFormat === 'm4a' || preferredFormat === 'aac')
          ? 'mp3'
          : preferredFormat

      setConfig({
        format: effectiveFormat,
        qualityTier: lastPrefs?.qualityTier || settings.defaultQualityTier,
        bitrate: lastPrefs?.bitrate || settings.defaultBitrate,
        customFileName: metadata.baseName,
        startTime: 0,
        endTime: Number(metadata.duration.toFixed(1)),
        volume: 100,
        normalize: false,
        preserveOriginal: false,
      })

      setConversionState('loaded')
    } catch (err) {
      setVideo(null)
      setErrorMessage(
        (err as Error)?.message ||
          'Não foi possível validar o vídeo selecionado.'
      )
      setConversionState('error')
    }
  }

  const handleLoadDemoVideo = async () => {
    try {
      setConversionState('validating')
      setErrorMessage(null)
      const response = await fetch('/samples/demo-sonora-trilha.mp4')
      if (!response.ok) {
        throw new Error('Vídeo de demonstração não encontrado no servidor.')
      }
      const blob = await response.blob()
      const demoFile = new File([blob], 'demo-sonora-trilha.mp4', {
        type: 'video/mp4',
      })
      await handleSelectFile(demoFile, true)
    } catch (err) {
      setErrorMessage(
        (err as Error)?.message ||
          'Não foi possível carregar o vídeo de demonstração.'
      )
      setConversionState('error')
    }
  }

  const handleRemoveVideo = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (video?.objectUrl) {
      URL.revokeObjectURL(video.objectUrl)
    }
    if (result?.objectUrl) {
      URL.revokeObjectURL(result.objectUrl)
    }
    setVideo(null)
    setResult(null)
    setErrorMessage(null)
    setConversionState('idle')
  }

  const handleStartConversion = async () => {
    if (!video || conversionState === 'converting') return

    if (result?.objectUrl) {
      URL.revokeObjectURL(result.objectUrl)
      setResult(null)
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setConversionState('converting')
    setProgressPercent(4)
    setProgressStage('Preparando seu arquivo...')
    setErrorMessage(null)

    if (settings.rememberLastConfig) {
      saveLastFormatPreferences({
        format: config.format,
        qualityTier: config.qualityTier,
        bitrate: config.bitrate,
      })
    }

    try {
      const converted = await convertVideoToAudio(
        video,
        config,
        settings.processingMode,
        controller.signal,
        (update) => {
          setProgressPercent(update.percent)
          setProgressStage(update.stage)
        }
      )

      setResult(converted)
      setConversionState('success')

      // Persist in History
      let storedBlobOk = false
      if (settings.saveHistoryBlobs) {
        storedBlobOk = await storeAudioBlob(converted.id, converted.blob)
      }

      const newHistoryItem: HistoryItem = {
        id: converted.id,
        originalFileName: converted.originalFileName,
        outputFileName: converted.outputFileName,
        format: converted.format,
        qualityLabel: converted.qualityLabel,
        bitrate: converted.bitrate,
        duration: converted.duration,
        size: converted.size,
        createdAt: converted.createdAt,
        peaks: converted.peaks,
        hasStoredBlob: storedBlobOk,
      }

      const updatedHistory = [newHistoryItem, ...historyItems].slice(0, 30)
      setHistoryItems(updatedHistory)
      saveHistoryMeta(updatedHistory)
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        setConversionState('loaded')
        showToast('Conversão cancelada.')
        triggerMascotReaction({
          mood: 'loaded',
          eyebrow: 'Pausa na sessão',
          title: 'Conversão cancelada! Tudo sob controle.',
          description:
            'Seu vídeo continua carregado. Ajuste as opções abaixo se quiser tentar outro formato ou trecho.',
        })
        return
      }
      setErrorMessage(
        (err as Error)?.message ||
          'Ocorreu uma falha durante a conversão do arquivo.'
      )
      setConversionState('error')
    } finally {
      abortControllerRef.current = null
    }
  }

  const handleCancelConversion = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  // Keyboard shortcut: Escape cancels ongoing conversion
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && conversionState === 'converting') {
        handleCancelConversion()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [conversionState])

  const triggerBrowserDownload = (blobUrl: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadResult = (res: ConvertedAudioResult) => {
    triggerBrowserDownload(res.objectUrl, res.outputFileName)
    showToast(`Download iniciado: ${res.outputFileName}`)
    triggerMascotReaction({
      mood: 'petted',
      eyebrow: 'Download a caminho!',
      title: `Boa! "${res.outputFileName}" já está indo para o seu dispositivo!`,
      description:
        'Se precisar dele de novo mais tarde, também deixei salvo na aba Histórico para você.',
    })
  }

  const handleRedownloadHistoryItem = async (item: HistoryItem) => {
    const blob = await getAudioBlob(item.id)
    if (!blob) {
      showToast('O arquivo não está mais disponível no armazenamento local.')
      return
    }
    const url = URL.createObjectURL(blob)
    triggerBrowserDownload(url, item.outputFileName)
    window.setTimeout(() => URL.revokeObjectURL(url), 10000)
    showToast(`Baixando novamente: ${item.outputFileName}`)
  }

  const handleGetPlayableHistoryUrl = async (
    item: HistoryItem
  ): Promise<string | null> => {
    const blob = await getAudioBlob(item.id)
    if (!blob) {
      showToast('Áudio indisponível no cache local.')
      return null
    }
    return URL.createObjectURL(blob)
  }

  const handleRemoveHistoryItem = async (id: string) => {
    await deleteAudioBlob(id)
    const next = historyItems.filter((item) => item.id !== id)
    setHistoryItems(next)
    saveHistoryMeta(next)
    showToast('Item removido do histórico.')
  }

  const handleClearAllHistory = async () => {
    await clearAllAudioBlobs()
    setHistoryItems([])
    saveHistoryMeta([])
    showToast('Histórico local limpo.')
  }

  if (!authUser) {
    return (
      <LoginView
        onSuccessLogin={handleLoginSuccess}
        reducedMotion={settings.reducedMotion}
      />
    )
  }

  const isDark = settings.theme === 'dark'

  return (
    <div
      className={`min-h-screen flex flex-col pb-20 md:pb-12 ${
        settings.reducedMotion ? 'motion-reduce' : ''
      }`}
    >
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        historyCount={historyItems.length}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
        isConverting={conversionState === 'converting'}
        user={authUser}
        onLogout={handleLogout}
        processingMode={settings.processingMode}
      />

      {/* Subtle Floating Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-4 sm:left-6 z-50 px-4 py-3 rounded-2xl text-xs font-semibold shadow-lg border bg-[#111315] text-white border-[#2D323B] flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-[#BCEE45]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive Capybara Mascot fixed in the bottom-right corner */}
      <MascotGuide
        state={conversionState}
        activeTab={activeTab}
        theme={settings.theme}
        progressPercent={progressPercent}
        progressStage={progressStage}
        isDraggingFile={isDraggingFile}
        isAudioPlaying={isAudioPlaying}
        config={config}
        video={video}
        historyCount={historyItems.length}
        customReaction={customMascotReaction}
      />

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        {activeTab === 'converter' && (
          <div className="space-y-6">
            {/* Upload / Active Video Zone */}
            <UploadZone
              state={conversionState}
              video={video}
              errorMessage={errorMessage}
              progressPercent={progressPercent}
              progressStage={progressStage}
              onSelectFile={handleSelectFile}
              onLoadDemoVideo={handleLoadDemoVideo}
              onRemoveVideo={handleRemoveVideo}
              onCancelConversion={handleCancelConversion}
              onRetry={() => {
                if (video) {
                  setErrorMessage(null)
                  setConversionState('loaded')
                } else {
                  setConversionState('idle')
                }
              }}
              theme={settings.theme}
              onDragStateChange={setIsDraggingFile}
            />

            {/* Settings Panel when video is loaded */}
            {conversionState === 'loaded' && video && (
              <ConversionSettingsPanel
                video={video}
                config={config}
                onChangeConfig={setConfig}
                onStartConversion={handleStartConversion}
                processingMode={settings.processingMode}
                isConverting={false}
                theme={settings.theme}
              />
            )}

            {/* Result Card when conversion succeeds */}
            {conversionState === 'success' && result && (
              <ResultCard
                result={result}
                onDownload={handleDownloadResult}
                onConvertAnother={handleRemoveVideo}
                onEditSettings={() => setConversionState('loaded')}
                theme={settings.theme}
                onPlayStateChange={setIsAudioPlaying}
              />
            )}

            {/* Value Proposition Pillars when idle */}
            {conversionState === 'idle' && (
              <section
                aria-label="Diferenciais do SONORA"
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2"
              >
                <div
                  className={`p-5 rounded-2xl border ${
                    isDark
                      ? 'bg-[#15171A]/70 border-[#24282E]'
                      : 'bg-white border-[#E5E7EB]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#BCEE45]/20 text-[#4D7C0F] dark:text-[#BCEE45] mb-3">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h2 className="font-semibold text-sm mb-1">
                    Extração Instantânea
                  </h2>
                  <p
                    className={`text-xs leading-relaxed ${
                      isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
                    }`}
                  >
                    Motor híbrido com FFmpeg nativo e Web Audio para converter em MP3, WAV, M4A ou AAC em segundos.
                  </p>
                </div>

                <div
                  className={`p-5 rounded-2xl border ${
                    isDark
                      ? 'bg-[#15171A]/70 border-[#24282E]'
                      : 'bg-white border-[#E5E7EB]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#BCEE45]/20 text-[#4D7C0F] dark:text-[#BCEE45] mb-3">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="font-semibold text-sm mb-1">
                    Fidelidade de Estúdio
                  </h2>
                  <p
                    className={`text-xs leading-relaxed ${
                      isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
                    }`}
                  >
                    Corte o trecho exato, deixe o volume equilibrado automaticamente e ouça o resultado antes de baixar.
                  </p>
                </div>

                <div
                  className={`p-5 rounded-2xl border ${
                    isDark
                      ? 'bg-[#15171A]/70 border-[#24282E]'
                      : 'bg-white border-[#E5E7EB]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#BCEE45]/20 text-[#4D7C0F] dark:text-[#BCEE45] mb-3">
                    <Shield className="w-4 h-4" />
                  </div>
                  <h2 className="font-semibold text-sm mb-1">
                    Privacidade Absoluta
                  </h2>
                  <p
                    className={`text-xs leading-relaxed ${
                      isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
                    }`}
                  >
                    Zero anúncios e zero rastreamento. Prefere que nada saia do seu dispositivo? Ative o modo 100% local em Configurações.
                  </p>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-6">
            <HistoryView
              items={historyItems}
              onRedownload={handleRedownloadHistoryItem}
              onGetPlayableUrl={handleGetPlayableHistoryUrl}
              onRemoveItem={handleRemoveHistoryItem}
              onClearAll={handleClearAllHistory}
              onGoToConverter={() => setActiveTab('converter')}
              theme={settings.theme}
              onPlayStateChange={setIsAudioPlaying}
            />
          </div>
        )}

        {activeTab === 'configuracoes' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            historyCount={historyItems.length}
            onClearHistory={handleClearAllHistory}
          />
        )}
      </main>

      {/* Minimalist Footer */}
      <footer
        className={`mt-14 py-6 border-t text-xs ${
          isDark
            ? 'border-[#24282E] text-[#9CA3AF]'
            : 'border-[#E5E7EB] text-[#525866]'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <span>
            <strong>SONORA</strong> — Conversão de vídeo para áudio com precisão e privacidade.
          </span>
          <span>
            Extraia áudio apenas de conteúdos que você possui autorização para utilizar.
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
