import type { VideoMetadata } from '../types/sonora'
import {
  MAX_BROWSER_DURATION_SECONDS,
  MAX_BROWSER_FILE_SIZE_BYTES,
} from '../utils/formatters'
import { computePeaksFromBuffer } from './audioConversionEngine'

const WAVEFORM_POINTS = 720
const ANALYSIS_SAMPLE_RATE = 8000

const cache = new WeakMap<File, number[]>()

/**
 * Lê a forma de onda real do vídeo sem enviar o arquivo a nenhum servidor.
 * Retorna null quando o arquivo é grande demais ou não tem áudio legível.
 */
export async function extractVideoWaveform(
  video: VideoMetadata
): Promise<number[] | null> {
  const cached = cache.get(video.file)
  if (cached) return cached

  if (
    video.size > MAX_BROWSER_FILE_SIZE_BYTES ||
    video.duration > MAX_BROWSER_DURATION_SECONDS
  ) {
    return null
  }

  try {
    const bytes = await video.file.arrayBuffer()
    // A taxa baixa reduz a memória usada: a análise só precisa do contorno
    const context = new OfflineAudioContext(
      1,
      ANALYSIS_SAMPLE_RATE,
      ANALYSIS_SAMPLE_RATE
    )
    const buffer = await context.decodeAudioData(bytes)
    const peaks = computePeaksFromBuffer(buffer, WAVEFORM_POINTS)
    cache.set(video.file, peaks)
    return peaks
  } catch {
    return null
  }
}
