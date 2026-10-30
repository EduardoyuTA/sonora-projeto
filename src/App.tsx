import { useCallback, useEffect, useRef, useState } from 'react'
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
import {
  DesktopTopBar,
  MobileHeader,
  MobileTabBar,
  Sidebar,
} from './components/Navbar'
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

  const [talkRequest, setTalkRequest] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)
  const reactionTimerRef = useRef<number | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const historyItemsRef = useRef(historyItems)

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
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    setToastMessage(msg)
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current))
    }, 3500)
  }, [])

  const commitHistory = useCallback((items: HistoryItem[]) => {
    historyItemsRef.current = items
    setHistoryItems(items)
    saveHistoryMeta(items)
  }, [])

  useEffect(() => {
    historyItemsRef.current = historyItems
  }, [historyItems])

  useEffect(() => {
    const objectUrl = video?.objectUrl
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [video?.objectUrl])

  useEffect(() => {
    const objectUrl = result?.objectUrl
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [result?.objectUrl])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      if (reactionTimerRef.current) {
        window.clearTimeout(reactionTimerRef.current)
      }
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
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
      document.body.style.backgroundColor = '#070909'
      document.body.style.color = '#F3F4F6'
    } else {
      root.classList.remove('dark')
      document.body.style.backgroundColor = '#EDF1EA'
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

  const handleTalkToMascot = () => {
    setTalkRequest((n) => n + 1)
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

      const updatedHistory = [
        newHistoryItem,
        ...historyItemsRef.current.filter((item) => item.id !== converted.id),
      ].slice(0, 30)
      commitHistory(updatedHistory)
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
    const next = historyItemsRef.current.filter((item) => item.id !== id)
    commitHistory(next)
    await deleteAudioBlob(id)
    showToast('Item removido do histórico.')
  }

  const handleClearAllHistory = async () => {
    commitHistory([])
    await clearAllAudioBlobs()
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

  const isConverting = conversionState === 'converting'

  return (
    <div
      className={`relative min-h-screen ${
        settings.reducedMotion ? 'motion-reduce' : ''
      }`}
    >
      <div className="app-backdrop" aria-hidden="true" />

      {/* Subtle Floating Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="glass fixed top-4 left-1/2 z-50 -translate-x-1/2 px-4 py-3 rounded-2xl text-xs font-semibold text-strong flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-[#BCEE45]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive Capybara Mascot (bottom-left; sits in the sidebar on desktop) */}
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
        talkRequest={talkRequest}
      />

      <MobileTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        historyCount={historyItems.length}
        isConverting={isConverting}
      />

      <div className="lg:flex lg:gap-5 lg:p-5">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          historyCount={historyItems.length}
          isConverting={isConverting}
          onTalkToMascot={handleTalkToMascot}
        />

        <div className="flex-1 min-w-0 flex flex-col min-h-screen lg:min-h-[calc(100dvh-2.5rem)] px-3 sm:px-6 lg:px-0 pb-44 lg:pb-0">
          <MobileHeader
            onSelectTab={setActiveTab}
            theme={settings.theme}
            onToggleTheme={handleToggleTheme}
            user={authUser}
            onLogout={handleLogout}
          />
          <DesktopTopBar
            processingMode={settings.processingMode}
            theme={settings.theme}
            onToggleTheme={handleToggleTheme}
            user={authUser}
            onLogout={handleLogout}
          />

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-xl lg:max-w-6xl mx-auto">
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
              onTalkToMascot={handleTalkToMascot}
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

      <footer className="text-faint mt-10 py-6 text-xs">
        <div className="max-w-xl lg:max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-2 text-center lg:text-left">
          <span>
            <strong className="text-muted">SONORA</strong> — Conversão de vídeo para áudio com precisão e privacidade.
          </span>
          <span>
            Extraia áudio apenas de conteúdos que você possui autorização para utilizar.
          </span>
        </div>
      </footer>
        </div>
      </div>
    </div>
  )
}

export default App
