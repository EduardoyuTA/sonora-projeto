import {
  checkNativeEngineHealth,
  getLastKnownEngineHealth,
  resolveApiBaseUrl,
} from './audioConversionEngine'

export type LinkErrorCode =
  | 'invalid_url'
  | 'unsupported'
  | 'private'
  | 'unavailable'
  | 'blocked'
  | 'too_large'
  | 'too_long'
  | 'drm'
  | 'no_audio'
  | 'busy'
  | 'timeout'
  | 'offline'
  | 'failed'

export class LinkDownloadError extends Error {
  readonly code: LinkErrorCode

  constructor(code: LinkErrorCode) {
    super(code)
    this.name = 'LinkDownloadError'
    this.code = code
  }
}

export interface LinkDownloadProgress {
  stage: 'connecting' | 'downloading' | 'receiving'
  percent: number | null
}

export interface LinkDownloadResult {
  file: File
  withIntroBeats: boolean
}

const KNOWN_CODES: LinkErrorCode[] = [
  'invalid_url',
  'unsupported',
  'private',
  'unavailable',
  'blocked',
  'too_large',
  'too_long',
  'drm',
  'no_audio',
  'busy',
  'timeout',
  'offline',
  'failed',
]

export const isValidLink = (value: string) => {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const readErrorCode = async (response: unknown): Promise<LinkErrorCode> => {
  try {
    if (!(response instanceof Blob)) return 'failed'
    const parsed = JSON.parse(await response.text()) as { code?: string }
    return KNOWN_CODES.includes(parsed.code as LinkErrorCode)
      ? (parsed.code as LinkErrorCode)
      : 'failed'
  } catch {
    return 'failed'
  }
}

/**
 * Pede ao servidor FFmpeg para baixar o vídeo do link e, se pedido,
 * colocar as batidas de contagem antes do vídeo.
 */
export async function downloadVideoFromLink(
  link: string,
  withIntroBeats: boolean,
  signal: AbortSignal,
  onProgress: (progress: LinkDownloadProgress) => void
): Promise<LinkDownloadResult> {
  if (!isValidLink(link)) throw new LinkDownloadError('invalid_url')

  const baseUrl = resolveApiBaseUrl()
  onProgress({ stage: 'connecting', percent: null })
  if (baseUrl && getLastKnownEngineHealth().status !== 'online') {
    const health = await checkNativeEngineHealth(baseUrl, 30000)
    if (health.status !== 'online') throw new LinkDownloadError('offline')
  }

  return new Promise<LinkDownloadResult>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${baseUrl}/api/download-link`, true)
    request.responseType = 'blob'
    request.setRequestHeader('Content-Type', 'application/json')

    const onAbort = () => {
      request.abort()
      reject(new DOMException('Download cancelado.', 'AbortError'))
    }
    if (signal.aborted) {
      onAbort()
      return
    }
    signal.addEventListener('abort', onAbort, { once: true })

    request.upload.onload = () => onProgress({ stage: 'downloading', percent: null })
    request.onprogress = (event) => {
      if (request.status !== 200) return
      onProgress({
        stage: 'receiving',
        percent: event.lengthComputable
          ? Math.round((event.loaded / event.total) * 100)
          : null,
      })
    }

    request.onload = async () => {
      signal.removeEventListener('abort', onAbort)
      const isVideo =
        request.status === 200 &&
        request.response instanceof Blob &&
        request.response.type.startsWith('video/')
      if (!isVideo) {
        reject(new LinkDownloadError(await readErrorCode(request.response)))
        return
      }

      const rawName = request.getResponseHeader('X-Sonora-Filename') || ''
      let name = 'video-sonora'
      try {
        name = decodeURIComponent(rawName) || name
      } catch {
        // Mantém o nome padrão
      }
      resolve({
        file: new File([request.response as Blob], `${name}.mp4`, { type: 'video/mp4' }),
        withIntroBeats: request.getResponseHeader('X-Sonora-Intro') === 'true',
      })
    }

    request.onerror = () => {
      signal.removeEventListener('abort', onAbort)
      reject(new LinkDownloadError('offline'))
    }

    request.send(JSON.stringify({ url: link.trim(), introBeats: withIntroBeats }))
  })
}
