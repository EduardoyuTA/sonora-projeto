import type {
  ConversionConfig,
  ConvertedAudioResult,
  NativeEngineHealth,
  ProcessingMode,
  VideoMetadata,
} from '../types/sonora'
import {
  ACCEPTED_VIDEO_EXTENSIONS,
  MAX_BROWSER_DURATION_LABEL,
  MAX_BROWSER_DURATION_SECONDS,
  MAX_BROWSER_FILE_SIZE_BYTES,
  MAX_BROWSER_FILE_SIZE_LABEL,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  getExtension,
  getQualityLabel,
  sanitizeFileName,
  stripExtension,
} from '../utils/formatters'
import { loadSettings } from './storageService'

export interface ConversionProgressUpdate {
  percent: number
  stage: string
}

const MAX_BROWSER_WORKING_BYTES = 512 * 1024 * 1024

/**
 * Validates the uploaded file for format, size, and readable video/audio duration.
 */
export async function validateAndProbeVideo(
  file: File,
  isDemo = false
): Promise<VideoMetadata> {
  if (!file) {
    throw new Error('Nenhum arquivo foi selecionado.')
  }

  if (file.size === 0) {
    throw new Error('O arquivo selecionado está vazio (0 bytes).')
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `O arquivo excede o limite máximo permitido de ${MAX_FILE_SIZE_LABEL}. Escolha um vídeo menor.`
    )
  }

  const ext = getExtension(file.name)
  const isVideoMime = file.type.startsWith('video/')
  const isKnownExt = ACCEPTED_VIDEO_EXTENSIONS.includes(ext)

  if (!isVideoMime && !isKnownExt) {
    throw new Error(
      `Formato "${ext || file.type || 'desconhecido'}" não suportado. Envie um arquivo MP4, MOV, WEBM, MKV ou AVI.`
    )
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const metadata = await new Promise<{
      duration: number
      width: number
      height: number
    }>((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true

      const timeout = window.setTimeout(() => {
        cleanup()
        reject(
          new Error(
            'Tempo esgotado ao ler os metadados do vídeo. O arquivo pode estar corrompido.'
          )
        )
      }, 12000)

      function cleanup() {
        window.clearTimeout(timeout)
        video.onloadedmetadata = null
        video.onerror = null
        video.removeAttribute('src')
        video.load()
      }

      video.onloadedmetadata = () => {
        const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0
        const w = video.videoWidth || 1280
        const h = video.videoHeight || 720
        cleanup()
        if (dur <= 0) {
          reject(new Error('Não foi possível identificar a duração deste vídeo.'))
          return
        }
        resolve({ duration: dur, width: w, height: h })
      }

      video.onerror = () => {
        cleanup()
        reject(
          new Error(
            'Arquivo de vídeo inválido ou codificação incompatível. Verifique se o vídeo não está corrompido.'
          )
        )
      }

      video.src = objectUrl
    })

    return {
      file,
      name: file.name,
      baseName: sanitizeFileName(stripExtension(file.name)),
      size: file.size,
      type: file.type || `video/${ext.replace('.', '') || 'mp4'}`,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      objectUrl,
      isDemo,
    }
  } catch (err) {
    URL.revokeObjectURL(objectUrl)
    throw err
  }
}

/**
 * Extracts real waveform amplitude peaks from an AudioBuffer or Blob.
 */
export async function computeWaveformPeaksFromBlob(
  blob: Blob,
  barCount = 72
): Promise<{ peaks: number[]; duration: number }> {
  const arrayBuffer = await blob.arrayBuffer()
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
    const peaks = computePeaksFromBuffer(audioBuffer, barCount)
    return { peaks, duration: audioBuffer.duration }
  } catch {
    // Fallback deterministic peaks if browser cannot decode raw ADTS AAC container directly
    const fallbackPeaks = Array.from({ length: barCount }, (_, i) => {
      const v = Math.sin(i * 0.35) * 0.35 + Math.cos(i * 0.19) * 0.25 + 0.45
      return Math.max(0.12, Math.min(0.95, Number(v.toFixed(3))))
    })
    return { peaks: fallbackPeaks, duration: 0 }
  } finally {
    try {
      await ctx.close()
    } catch {}
  }
}

export function computePeaksFromBuffer(audioBuffer: AudioBuffer, barCount = 72): number[] {
  const channelData = audioBuffer.getChannelData(0)
  const totalSamples = channelData.length
  if (totalSamples === 0) {
    return Array(barCount).fill(0.15)
  }

  const blockSize = Math.max(1, Math.floor(totalSamples / barCount))
  const rawPeaks: number[] = []
  let maxPeak = 0.001

  for (let i = 0; i < barCount; i++) {
    const start = i * blockSize
    let sum = 0
    const limit = Math.min(totalSamples, start + blockSize)
    const step = Math.max(1, Math.floor((limit - start) / 64))
    let count = 0
    for (let j = start; j < limit; j += step) {
      const sample = Math.abs(channelData[j])
      sum += sample * sample
      count++
    }
    const rms = count > 0 ? Math.sqrt(sum / count) : 0
    rawPeaks.push(rms)
    if (rms > maxPeak) maxPeak = rms
  }

  return rawPeaks.map((p) => {
    const normalized = p / maxPeak
    return Number(Math.max(0.1, Math.min(1, Math.pow(normalized, 0.75))).toFixed(3))
  })
}

/**
 * Encodes an AudioBuffer into a standard 16-bit PCM WAV Blob.
 */
function encodeWavFromAudioBuffer(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(2, buffer.numberOfChannels)
  const sampleRate = buffer.sampleRate
  const numSamples = buffer.length
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const dataSize = numSamples * blockAlign
  const arrayBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arrayBuffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true) // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true) // BitsPerSample
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  const channels: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c))
  }

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]))
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset, int16, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

/**
 * Encodes an AudioBuffer into an MP3 Blob using @breezystack/lamejs with async progress reporting.
 */
async function encodeMp3FromAudioBuffer(
  buffer: AudioBuffer,
  bitrateKbps: number,
  signal: AbortSignal,
  onProgress: (fraction: number) => void
): Promise<Blob> {
  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const numChannels = Math.min(2, buffer.numberOfChannels)
  const sampleRate = buffer.sampleRate
  const encoder = new Mp3Encoder(numChannels, sampleRate, bitrateKbps)

  const leftFloat = buffer.getChannelData(0)
  const rightFloat = numChannels > 1 ? buffer.getChannelData(1) : leftFloat

  const totalSamples = leftFloat.length
  const sampleBlockSize = 1152 * 16
  const leftChunk = new Int16Array(sampleBlockSize)
  const rightChunk = new Int16Array(numChannels > 1 ? sampleBlockSize : 0)
  const mp3Chunks: Uint8Array[] = []
  let processed = 0

  while (processed < totalSamples) {
    if (signal.aborted) {
      throw new DOMException('Conversão cancelada pelo usuário.', 'AbortError')
    }

    const end = Math.min(processed + sampleBlockSize, totalSamples)
    const blockLength = end - processed
    for (let i = 0; i < blockLength; i++) {
      const left = Math.max(-1, Math.min(1, leftFloat[processed + i]))
      leftChunk[i] = left < 0 ? left * 0x8000 : left * 0x7fff
      if (numChannels > 1) {
        const right = Math.max(-1, Math.min(1, rightFloat[processed + i]))
        rightChunk[i] = right < 0 ? right * 0x8000 : right * 0x7fff
      }
    }

    const leftBlock = leftChunk.subarray(0, blockLength)
    const mp3buf =
      numChannels > 1
        ? encoder.encodeBuffer(leftBlock, rightChunk.subarray(0, blockLength))
        : encoder.encodeBuffer(leftBlock)

    if (mp3buf.length > 0) {
      mp3Chunks.push(new Uint8Array(mp3buf))
    }

    processed = end
    onProgress(processed / totalSamples)
    await new Promise((r) => setTimeout(r, 0))
  }

  const flushBuf = encoder.flush()
  if (flushBuf.length > 0) {
    mp3Chunks.push(new Uint8Array(flushBuf))
  }

  return new Blob(mp3Chunks as BlobPart[], { type: 'audio/mpeg' })
}

/**
 * Applies trim, volume gain, and peak normalization to an AudioBuffer.
 */
function processAudioBuffer(
  sourceBuffer: AudioBuffer,
  config: ConversionConfig
): AudioBuffer {
  const sampleRate = sourceBuffer.sampleRate
  const startSample = Math.max(
    0,
    Math.min(sourceBuffer.length - 1, Math.floor(config.startTime * sampleRate))
  )
  const endTimeEffective =
    config.endTime > config.startTime
      ? Math.min(sourceBuffer.duration, config.endTime)
      : sourceBuffer.duration
  const endSample = Math.max(
    startSample + 1,
    Math.min(sourceBuffer.length, Math.floor(endTimeEffective * sampleRate))
  )

  const frameCount = endSample - startSample
  const numChannels = Math.min(2, sourceBuffer.numberOfChannels)
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const offlineCtx = new AudioCtx()
  const targetBuffer = offlineCtx.createBuffer(numChannels, frameCount, sampleRate)
  offlineCtx.close().catch(() => {})

  let peakAmplitude = 0.0001
  if (!config.preserveOriginal && config.normalize) {
    for (let c = 0; c < numChannels; c++) {
      const src = sourceBuffer.getChannelData(c)
      for (let i = startSample; i < endSample; i++) {
        const abs = Math.abs(src[i])
        if (abs > peakAmplitude) peakAmplitude = abs
      }
    }
  }

  const normFactor =
    !config.preserveOriginal && config.normalize ? 0.94 / peakAmplitude : 1.0
  const volumeFactor = !config.preserveOriginal ? config.volume / 100 : 1.0
  const totalGain = normFactor * volumeFactor

  for (let c = 0; c < numChannels; c++) {
    const src = sourceBuffer.getChannelData(c)
    const dst = targetBuffer.getChannelData(c)
    for (let i = 0; i < frameCount; i++) {
      const sample = src[startSample + i] * totalGain
      dst[i] = Math.max(-1, Math.min(1, sample))
    }
  }

  return targetBuffer
}

const ENV_API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
)
  .trim()
  .replace(/\/+$/, '')

/**
 * Resolves the active FFmpeg backend URL:
 * 1. Custom URL configured by user in Settings (localStorage)
 * 2. Build-time VITE_API_BASE_URL environment variable (Vercel)
 * 3. Relative origin ('') for local Vite dev server or same-origin proxy
 */
export function resolveApiBaseUrl(overrideUrl?: string): string {
  const candidate =
    overrideUrl !== undefined
      ? overrideUrl.trim()
      : (loadSettings().customApiUrl || '').trim()
  if (candidate) {
    return candidate.replace(/\/+$/, '')
  }
  return ENV_API_BASE_URL
}

let lastKnownHealth: NativeEngineHealth = {
  status: 'checking',
  endpoint: ENV_API_BASE_URL || 'local',
}

export function getLastKnownEngineHealth(): NativeEngineHealth {
  return lastKnownHealth
}

/**
 * Checks whether the native FFmpeg API (Render or local Vite middleware) is online
 * and returning valid JSON (protecting against static SPA HTML rewrites).
 */
export async function checkNativeEngineHealth(
  overrideUrl?: string,
  timeoutMs = 8000
): Promise<NativeEngineHealth> {
  const baseUrl = resolveApiBaseUrl(overrideUrl)
  const endpointLabel = baseUrl || 'Servidor Local (/api)'
  const start = performance.now()

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
    })

    window.clearTimeout(timer)
    const contentType = res.headers.get('content-type') || ''

    if (!res.ok || !contentType.includes('application/json')) {
      lastKnownHealth = {
        status: 'offline',
        endpoint: endpointLabel,
      }
      return lastKnownHealth
    }

    const data = (await res.json()) as { status?: string; engine?: string }
    if (data && data.status === 'ok') {
      const latencyMs = Math.max(1, Math.round(performance.now() - start))
      lastKnownHealth = {
        status: 'online',
        latencyMs,
        endpoint: endpointLabel,
        engineName: data.engine || 'FFmpeg Native',
      }
      return lastKnownHealth
    }

    lastKnownHealth = {
      status: 'offline',
      endpoint: endpointLabel,
    }
    return lastKnownHealth
  } catch {
    window.clearTimeout(timer)
    lastKnownHealth = {
      status: 'offline',
      endpoint: endpointLabel,
    }
    return lastKnownHealth
  }
}

/**
 * Sends a silent background health-check ping to wake up the Render FFmpeg instance
 * as soon as the user opens the Vercel frontend.
 */
export function warmupNativeEngine(): void {
  const baseUrl = resolveApiBaseUrl()
  // Use a longer timeout (25s) on initial warmup in case Render free tier is in cold start
  checkNativeEngineHealth(baseUrl, 25000).catch(() => {})
}

/**
 * Performs conversion via the native FFmpeg server endpoint with real XHR upload/processing progress.
 */
async function convertViaNativeFfmpeg(
  video: VideoMetadata,
  config: ConversionConfig,
  signal: AbortSignal,
  onProgress: (update: ConversionProgressUpdate) => void
): Promise<Blob> {
  const baseUrl = resolveApiBaseUrl()
  const isLocalHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')

  // If deployed on Vercel without a configured Render URL and health check is offline,
  // skip uploading the entire video to the static host and fall back immediately.
  if (!baseUrl && !isLocalHost && lastKnownHealth.status === 'offline') {
    throw new Error('NETWORK_OR_ENGINE_UNAVAILABLE')
  }

  // If a remote Render URL is configured and hasn't responded yet, ping it before uploading
  if (baseUrl && lastKnownHealth.status !== 'online') {
    onProgress({
      percent: 6,
      stage: 'Conectando ao servidor FFmpeg...',
    })
    const health = await checkNativeEngineHealth(baseUrl, 15000)
    if (health.status !== 'online') {
      throw new Error('NETWORK_OR_ENGINE_UNAVAILABLE')
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${baseUrl}/api/convert`, true)
    xhr.responseType = 'blob'

    xhr.setRequestHeader('x-sonora-format', config.format)
    xhr.setRequestHeader('x-sonora-bitrate', String(config.bitrate))
    xhr.setRequestHeader('x-sonora-start', String(config.startTime))
    xhr.setRequestHeader('x-sonora-end', String(config.endTime))
    xhr.setRequestHeader('x-sonora-volume', String(config.volume))
    xhr.setRequestHeader('x-sonora-normalize', String(config.normalize))
    xhr.setRequestHeader('x-sonora-preserve', String(config.preserveOriginal))
    xhr.setRequestHeader('x-sonora-ext', getExtension(video.name) || '.mp4')

    let processingTimer: number | null = null
    let simulatedProc = 45

    const cleanupTimer = () => {
      if (processingTimer !== null) {
        window.clearInterval(processingTimer)
        processingTimer = null
      }
    }

    const onAbort = () => {
      cleanupTimer()
      xhr.abort()
      reject(new DOMException('Conversão cancelada pelo usuário.', 'AbortError'))
    }

    if (signal.aborted) {
      onAbort()
      return
    }
    signal.addEventListener('abort', onAbort, { once: true })

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const uploadFraction = event.loaded / event.total
        const pct = Math.round(uploadFraction * 42)
        onProgress({
          percent: Math.max(5, pct),
          stage: 'Preparando seu arquivo...',
        })
      }
    }

    xhr.upload.onload = () => {
      onProgress({
        percent: 45,
        stage: 'Extraindo o áudio...',
      })
      processingTimer = window.setInterval(() => {
        simulatedProc = Math.min(88, simulatedProc + 4)
        onProgress({
          percent: simulatedProc,
          stage:
            simulatedProc < 75
              ? 'Extraindo o áudio...'
              : 'Finalizando a conversão...',
        })
      }, 180)
    }

    xhr.onload = async () => {
      cleanupTimer()
      signal.removeEventListener('abort', onAbort)

      if (
        xhr.status >= 200 &&
        xhr.status < 300 &&
        xhr.response instanceof Blob &&
        !xhr.response.type.includes('text/html')
      ) {
        onProgress({
          percent: 94,
          stage: 'Finalizando a conversão...',
        })
        resolve(xhr.response)
      } else if (
        xhr.status === 404 ||
        xhr.status === 405 ||
        xhr.status === 408 ||
        xhr.status === 429 ||
        xhr.status >= 500 ||
        (xhr.response instanceof Blob && xhr.response.type.includes('text/html'))
      ) {
        reject(new Error('NETWORK_OR_ENGINE_UNAVAILABLE'))
      } else {
        let errorMessage = 'Falha no motor FFmpeg.'
        try {
          if (xhr.response instanceof Blob) {
            const text = await xhr.response.text()
            const parsed = JSON.parse(text)
            if (parsed?.error) errorMessage = parsed.error
          }
        } catch {}
        reject(new Error(errorMessage))
      }
    }

    xhr.onerror = () => {
      cleanupTimer()
      signal.removeEventListener('abort', onAbort)
      reject(new Error('NETWORK_OR_ENGINE_UNAVAILABLE'))
    }

    xhr.send(video.file)
  })
}

/**
 * Fallback/Local Web Audio API + DSP encoder directly in the browser.
 */
async function convertViaBrowserEngine(
  video: VideoMetadata,
  config: ConversionConfig,
  signal: AbortSignal,
  onProgress: (update: ConversionProgressUpdate) => void
): Promise<{ blob: Blob; peaks: number[]; duration: number }> {
  if (config.format !== 'mp3' && config.format !== 'wav') {
    throw new Error(
      `O formato ${config.format.toUpperCase()} requer o motor FFmpeg. Selecione MP3 ou WAV para converter diretamente no navegador.`
    )
  }

  if (video.size > MAX_BROWSER_FILE_SIZE_BYTES) {
    throw new Error(
      `A conversão no navegador aceita arquivos de até ${MAX_BROWSER_FILE_SIZE_LABEL} para evitar falta de memória. Ative o modo híbrido com FFmpeg ou escolha um vídeo menor.`
    )
  }

  if (video.duration > MAX_BROWSER_DURATION_SECONDS) {
    throw new Error(
      `A conversão no navegador aceita vídeos de até ${MAX_BROWSER_DURATION_LABEL} para evitar falta de memória. Ative o modo híbrido com FFmpeg ou escolha um vídeo mais curto.`
    )
  }

  const decodedPcmBytes = video.duration * 48_000 * 2 * 4
  const estimatedWorkingBytes = video.size + decodedPcmBytes * 2.25
  if (estimatedWorkingBytes > MAX_BROWSER_WORKING_BYTES) {
    throw new Error(
      'Este vídeo exigiria memória demais para uma conversão segura no navegador. Ative o modo híbrido com FFmpeg ou escolha um vídeo mais curto.'
    )
  }

  onProgress({ percent: 10, stage: 'Preparando seu arquivo...' })

  const arrayBuffer = await video.file.arrayBuffer()
  if (signal.aborted) {
    throw new DOMException('Conversão cancelada pelo usuário.', 'AbortError')
  }

  onProgress({ percent: 28, stage: 'Extraindo o áudio...' })

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const audioCtx = new AudioCtx()

  let decodedBuffer: AudioBuffer
  try {
    decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0))
  } catch {
    await audioCtx.close().catch(() => {})
    throw new Error(
      'Este vídeo não possui uma faixa de áudio compatível ou o arquivo está corrompido.'
    )
  } finally {
    await audioCtx.close().catch(() => {})
  }

  if (signal.aborted) {
    throw new DOMException('Conversão cancelada pelo usuário.', 'AbortError')
  }

  onProgress({ percent: 50, stage: 'Extraindo o áudio...' })
  const processedBuffer = processAudioBuffer(decodedBuffer, config)
  const peaks = computePeaksFromBuffer(processedBuffer, 72)

  onProgress({ percent: 62, stage: 'Finalizando a conversão...' })

  let outputBlob: Blob
  if (config.format === 'wav') {
    outputBlob = encodeWavFromAudioBuffer(processedBuffer)
    onProgress({ percent: 96, stage: 'Finalizando a conversão...' })
  } else {
    // Encode using LameJS MP3 encoder in browser
    outputBlob = await encodeMp3FromAudioBuffer(
      processedBuffer,
      config.bitrate,
      signal,
      (fraction) => {
        const pct = Math.round(62 + fraction * 34)
        onProgress({ percent: pct, stage: 'Finalizando a conversão...' })
      }
    )
  }

  return {
    blob: outputBlob,
    peaks,
    duration: processedBuffer.duration,
  }
}

/**
 * Main Conversion Orchestrator:
 * Uses Native FFmpeg when in hybrid-auto mode (supports MP3, WAV, M4A, AAC at ultra speed)
 * and transparently falls back to Web Audio API + LameJS in browser-only mode.
 */
export async function convertVideoToAudio(
  video: VideoMetadata,
  config: ConversionConfig,
  processingMode: ProcessingMode,
  signal: AbortSignal,
  onProgress: (update: ConversionProgressUpdate) => void
): Promise<ConvertedAudioResult> {
  onProgress({ percent: 4, stage: 'Preparando seu arquivo...' })

  let finalBlob: Blob | null = null
  let peaks: number[] = []
  let finalDuration = Math.max(0.5, config.endTime - config.startTime)
  let engineUsed: 'ffmpeg-native' | 'web-audio-local' = 'ffmpeg-native'

  if (processingMode === 'hybrid-auto') {
    try {
      const rawBlob = await convertViaNativeFfmpeg(video, config, signal, onProgress)
      // Normalize MIME if needed so browser <audio> can play ADTS AAC smoothly
      finalBlob = rawBlob
      const waveInfo = await computeWaveformPeaksFromBlob(finalBlob, 72)
      peaks = waveInfo.peaks
      if (waveInfo.duration > 0) {
        finalDuration = waveInfo.duration
      }
      engineUsed = 'ffmpeg-native'
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        throw err
      }
      const engineUnavailable =
        (err as Error)?.message === 'NETWORK_OR_ENGINE_UNAVAILABLE'
      // M4A/AAC need FFmpeg: the browser engine can only produce MP3/WAV
      if (
        engineUnavailable &&
        config.format !== 'mp3' &&
        config.format !== 'wav'
      ) {
        throw new Error(
          'O motor FFmpeg está indisponível no momento. Selecione MP3 ou WAV para usar a conversão local no navegador.'
        )
      }
      // If server endpoint wasn't reachable, fall back to browser engine
      if (engineUnavailable) {
        const browserRes = await convertViaBrowserEngine(
          video,
          config,
          signal,
          onProgress
        )
        finalBlob = browserRes.blob
        peaks = browserRes.peaks
        finalDuration = browserRes.duration
        engineUsed = 'web-audio-local'
      } else {
        throw err
      }
    }
  } else {
    const browserRes = await convertViaBrowserEngine(
      video,
      config,
      signal,
      onProgress
    )
    finalBlob = browserRes.blob
    peaks = browserRes.peaks
    finalDuration = browserRes.duration
    engineUsed = 'web-audio-local'
  }

  if (!finalBlob) {
    throw new Error('Não foi possível gerar o arquivo de áudio.')
  }

  onProgress({ percent: 100, stage: 'Seu áudio está pronto!' })

  const actualFormat =
    engineUsed === 'web-audio-local' &&
    (config.format === 'm4a' || config.format === 'aac')
      ? 'mp3'
      : config.format

  const cleanCustomName = sanitizeFileName(config.customFileName || video.baseName)
  const outputFileName = `${cleanCustomName}.${actualFormat}`
  const objectUrl = URL.createObjectURL(finalBlob)

  return {
    id: crypto.randomUUID(),
    originalFileName: video.name,
    outputFileName,
    format: actualFormat,
    qualityLabel: getQualityLabel(actualFormat, config.qualityTier, config.bitrate),
    bitrate: config.bitrate,
    duration: finalDuration,
    size: finalBlob.size,
    createdAt: new Date().toISOString(),
    blob: finalBlob,
    objectUrl,
    peaks,
    engineUsed,
  }
}
