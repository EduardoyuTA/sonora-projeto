export type AudioFormat = 'mp3' | 'wav' | 'm4a' | 'aac'

export type QualityTier = 'economica' | 'padrao' | 'alta' | 'personalizada'

export type BitrateKbps = 128 | 192 | 256 | 320

export type ConversionState =
  | 'idle'
  | 'validating'
  | 'loaded'
  | 'converting'
  | 'success'
  | 'error'

export interface VideoMetadata {
  file: File
  name: string
  baseName: string
  size: number
  type: string
  duration: number
  width: number
  height: number
  objectUrl: string
  isDemo?: boolean
}

export interface ConversionConfig {
  format: AudioFormat
  qualityTier: QualityTier
  bitrate: BitrateKbps
  customFileName: string
  startTime: number
  endTime: number
  volume: number // 0 to 200 (%)
  normalize: boolean
  preserveOriginal: boolean
}

export interface ConvertedAudioResult {
  id: string
  originalFileName: string
  outputFileName: string
  format: AudioFormat
  qualityLabel: string
  bitrate: BitrateKbps
  duration: number
  size: number
  createdAt: string
  blob: Blob
  objectUrl: string
  peaks: number[]
  engineUsed: 'ffmpeg-native' | 'web-audio-local'
}

export interface HistoryItem {
  id: string
  originalFileName: string
  outputFileName: string
  format: AudioFormat
  qualityLabel: string
  bitrate: BitrateKbps
  duration: number
  size: number
  createdAt: string
  peaks: number[]
  hasStoredBlob: boolean
}

export type ProcessingMode = 'hybrid-auto' | 'browser-only'

export interface AppSettings {
  theme: 'light' | 'dark'
  language: 'pt-BR'
  defaultFormat: AudioFormat
  defaultQualityTier: QualityTier
  defaultBitrate: BitrateKbps
  saveHistoryBlobs: boolean
  rememberLastConfig: boolean
  processingMode: ProcessingMode
  reducedMotion: boolean
  customApiUrl?: string
}

export interface NativeEngineHealth {
  status: 'checking' | 'online' | 'waking' | 'offline'
  latencyMs?: number
  endpoint: string
  engineName?: string
}

export interface AuthUser {
  email: string
  name: string
  provider: 'email' | 'google' | 'apple'
  rememberMe: boolean
  loggedInAt: string
}

export type ActiveTab = 'converter' | 'historico' | 'configuracoes'

export type MascotMood =
  | 'idle'
  | 'dragging'
  | 'validating'
  | 'loaded'
  | 'tuning'
  | 'trimming'
  | 'converting'
  | 'success'
  | 'grooving'
  | 'error'
  | 'petted'

export interface MascotPosition {
  x: number
  y: number
}

export interface MascotPrefs {
  minimized: boolean
  // null = posição padrão (canto inferior esquerdo)
  position: MascotPosition | null
}
