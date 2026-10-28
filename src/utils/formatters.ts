import type { AudioFormat, BitrateKbps, QualityTier } from '../types/sonora'

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024 // 500 MB
export const MAX_FILE_SIZE_LABEL = '500 MB'

export const ACCEPTED_VIDEO_EXTENSIONS = [
  '.mp4',
  '.mov',
  '.webm',
  '.mkv',
  '.avi',
  '.m4v',
  '.ogv',
  '.3gp',
]

export const ACCEPTED_VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/x-msvideo',
  'video/ogg',
  'video/3gpp',
  'application/octet-stream',
]

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / Math.pow(1024, i)
  return `${val.toFixed(i === 0 ? 0 : val >= 100 ? 0 : 1)} ${units[i]}`
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const totalSeconds = Math.floor(seconds)
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  const pad = (n: number) => String(n).padStart(2, '0')
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`
  }
  return `${pad(mins)}:${pad(secs)}`
}

export function formatPreciseTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0'
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(1)
  return `${String(mins).padStart(2, '0')}:${Number(secs) < 10 ? '0' + secs : secs}`
}

export function sanitizeFileName(name: string): string {
  const withoutControls = Array.from(name)
    .filter((ch) => ch.charCodeAt(0) >= 32)
    .join('')
  const cleaned = withoutControls
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || 'audio-sonora'
}

export function stripExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot <= 0) return filename
  return filename.slice(0, lastDot)
}

export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot < 0) return ''
  return filename.slice(lastDot).toLowerCase()
}

export function estimateOutputSizeBytes(
  durationSeconds: number,
  format: AudioFormat,
  bitrateKbps: BitrateKbps
): number {
  const effectiveDuration = Math.max(0.5, durationSeconds)
  if (format === 'wav') {
    // 44.1 kHz, 16-bit, stereo = 44100 * 2 * 2 = 176,400 bytes/sec
    return Math.round(effectiveDuration * 176400 + 44)
  }
  // Compressed formats (MP3, M4A, AAC): (bitrate in kbps * 1000 / 8) * seconds
  const bytesPerSecond = (bitrateKbps * 1000) / 8
  return Math.round(effectiveDuration * bytesPerSecond * 1.02) // +2% container overhead
}

export function getQualityLabel(
  format: AudioFormat,
  tier: QualityTier,
  bitrate: BitrateKbps
): string {
  if (format === 'wav') {
    return 'PCM 16-bit / 44.1 kHz (Sem compressão)'
  }
  const tierNames: Record<QualityTier, string> = {
    economica: 'Econômica',
    padrao: 'Padrão',
    alta: 'Alta fidelidade',
    personalizada: 'Personalizada',
  }
  return `${tierNames[tier]} • ${bitrate} kbps`
}

export function mapTierToBitrate(tier: QualityTier, currentBitrate: BitrateKbps): BitrateKbps {
  switch (tier) {
    case 'economica':
      return 128
    case 'padrao':
      return 192
    case 'alta':
      return 320
    case 'personalizada':
      return currentBitrate
  }
}
