import React, { useEffect, useRef, useState } from 'react'
import { Download, Link2, Loader2, RotateCcw, X } from 'lucide-react'
import type { ProcessingMode, VideoOrigin } from '../types/sonora'
import {
  LinkDownloadError,
  downloadVideoFromLink,
  isValidLink,
  isYouTubeLink,
  type LinkDownloadProgress,
  type LinkErrorCode,
} from '../services/linkDownloadService'
import { Capybara } from './Capybara'
import { SwitchRow } from './StudioControls'

interface LinkImportProps {
  processingMode: ProcessingMode
  disabled?: boolean
  onImported: (file: File, origin: VideoOrigin) => void
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; progress: LinkDownloadProgress }
  | { kind: 'error'; code: LinkErrorCode }

const FRIENDLY_ERRORS: Record<LinkErrorCode, { title: string; message: string }> = {
  invalid_url: {
    title: 'Esse link não parece certo',
    message: 'Confira se ele começa com https:// e tente de novo.',
  },
  unsupported: {
    title: 'Ainda não abrimos links deste site',
    message: 'Se você tiver o arquivo do vídeo, é só soltar ele aqui.',
  },
  private: {
    title: 'Esse vídeo é privado',
    message: 'Ele pede login ou tem restrição de idade, então não conseguimos baixar.',
  },
  unavailable: {
    title: 'Esse vídeo não está disponível',
    message: 'Ele pode ter sido removido ou estar bloqueado na sua região.',
  },
  blocked: {
    title: 'O site pediu uma pausa',
    message: 'Ele bloqueou o download por agora. Tente de novo em alguns minutos.',
  },
  too_large: {
    title: 'Esse vídeo é grande demais',
    message: 'Aceitamos vídeos de até 500 MB.',
  },
  too_long: {
    title: 'Esse vídeo é longo demais',
    message: 'Aceitamos vídeos de até 30 minutos, sem transmissões ao vivo.',
  },
  drm: {
    title: 'Esse vídeo é protegido',
    message: 'Ele tem proteção contra cópia e não pode ser baixado.',
  },
  no_audio: {
    title: 'Esse vídeo não tem som',
    message: 'Escolha um vídeo com áudio para extrair a trilha.',
  },
  busy: {
    title: 'O estúdio está cheio agora',
    message: 'Espere alguns segundos e tente de novo.',
  },
  timeout: {
    title: 'O download demorou demais',
    message: 'Tente de novo ou escolha um vídeo mais curto.',
  },
  youtube: {
    title: 'O YouTube bloqueou este vídeo',
    message: 'Alguns vídeos do YouTube não podem ser baixados por aqui. Tente outro link ou solte o arquivo do vídeo no estúdio.',
  },
  offline: {
    title: 'Não alcançamos o servidor',
    message: 'Ele pode estar acordando. Tente de novo em alguns segundos.',
  },
  failed: {
    title: 'Não deu para baixar este vídeo',
    message: 'Tente outro link ou solte o arquivo do vídeo aqui.',
  },
}

const STAGE_LABELS: Record<LinkDownloadProgress['stage'], string> = {
  connecting: 'Conectando ao servidor…',
  downloading: 'Baixando o vídeo…',
  receiving: 'Trazendo o vídeo para o estúdio…',
}

export const LinkImport: React.FC<LinkImportProps> = ({
  processingMode,
  disabled = false,
  onImported,
}) => {
  const [link, setLink] = useState('')
  const [withIntroBeats, setWithIntroBeats] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const isLoading = status.kind === 'loading'
  const isYouTube = isYouTubeLink(link)
  const needsServer = processingMode === 'browser-only'

  const startDownload = async () => {
    if (isLoading || disabled) return
    if (!isValidLink(link)) {
      setStatus({ kind: 'error', code: 'invalid_url' })
      return
    }

    const controller = new AbortController()
    controllerRef.current = controller
    setStatus({ kind: 'loading', progress: { stage: 'connecting', percent: null } })

    try {
      const result = await downloadVideoFromLink(
        link,
        withIntroBeats,
        controller.signal,
        (progress) => setStatus({ kind: 'loading', progress })
      )
      setStatus({ kind: 'idle' })
      setLink('')
      onImported(result.file, { fromLink: true, withIntroBeats: result.withIntroBeats })
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        setStatus({ kind: 'idle' })
        return
      }
      setStatus({
        kind: 'error',
        code: error instanceof LinkDownloadError ? error.code : 'failed',
      })
    } finally {
      controllerRef.current = null
    }
  }

  if (needsServer) {
    return (
      <div className="st-link">
        <p className="st-link__title">
          <Link2 aria-hidden="true" />
          Baixar vídeo pelo link
        </p>
        <p className="text-muted text-sm">
          O download por link usa o servidor de conversão. Ative o modo híbrido em Ajustes para usar.
        </p>
      </div>
    )
  }

  // Quando o YouTube recusa, a mensagem fala dele diretamente
  const errorCode: LinkErrorCode | null =
    status.kind !== 'error'
      ? null
      : status.code === 'blocked' && isYouTube
        ? 'youtube'
        : status.code
  const friendlyError = errorCode ? FRIENDLY_ERRORS[errorCode] : null

  return (
    <div className="st-link">
      <p className="st-link__title">
        <Link2 aria-hidden="true" />
        Baixar vídeo pelo link
      </p>

      <form
        className="st-link__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void startDownload()
        }}
      >
        <label className="st-link__field">
          <span className="sr-only">Link do vídeo</span>
          <input
            type="url"
            inputMode="url"
            value={link}
            disabled={isLoading || disabled}
            onChange={(event) => {
              setLink(event.target.value)
              if (status.kind === 'error') setStatus({ kind: 'idle' })
            }}
            placeholder="Cole o link do vídeo"
          />
        </label>
        {isLoading ? (
          <button
            type="button"
            className="btn-glass st-link__button"
            onClick={() => controllerRef.current?.abort()}
          >
            <X aria-hidden="true" />
            Cancelar
          </button>
        ) : (
          <button
            type="submit"
            className="btn-lime st-link__button"
            disabled={disabled || !link.trim()}
          >
            <Download aria-hidden="true" />
            Baixar vídeo
          </button>
        )}
      </form>

      {isYouTube && status.kind === 'idle' && (
        <p className="st-link__hint">
          O YouTube bloqueia alguns vídeos. Se isso acontecer, a gente avisa.
        </p>
      )}

      <SwitchRow
        label="Colocar batidas no início"
        description="O vídeo baixado já começa com 4 batidas de contagem."
        checked={withIntroBeats}
        disabled={isLoading}
        onChange={setWithIntroBeats}
      />

      {status.kind === 'loading' && (
        <div className="st-link__status" role="status" aria-live="polite">
          <Loader2 className="animate-spin" aria-hidden="true" />
          <span>
            {STAGE_LABELS[status.progress.stage]}
            {status.progress.percent !== null && ` ${status.progress.percent}%`}
            {withIntroBeats && status.progress.stage === 'downloading' &&
              ' As batidas entram em seguida.'}
          </span>
        </div>
      )}

      {friendlyError && (
        <div className="st-link__error" role="alert">
          <Capybara mood="error" size={52} />
          <div className="min-w-0 flex-1">
            <p className="text-strong text-sm font-semibold">{friendlyError.title}</p>
            <p className="text-muted mt-0.5 text-sm">{friendlyError.message}</p>
          </div>
          {errorCode && errorCode !== 'invalid_url' && (
            <button
              type="button"
              className="st-icon-btn"
              onClick={() => void startDownload()}
              aria-label="Tentar de novo"
              title="Tentar de novo"
            >
              <RotateCcw aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <p className="text-faint text-xs">
        Baixe apenas vídeos que você tem autorização para usar.
      </p>
    </div>
  )
}
