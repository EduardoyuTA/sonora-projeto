import type {
  AppSettings,
  AuthUser,
  HistoryItem,
  MascotPrefs,
} from '../types/sonora'

const SETTINGS_KEY = 'sonora_app_settings_v1'
const LAST_CONFIG_KEY = 'sonora_last_config_v1'
const HISTORY_META_KEY = 'sonora_history_meta_v1'
const AUTH_SESSION_KEY = 'sonora_auth_session_v1'
const MASCOT_PREFS_KEY = 'sonora_mascot_prefs_v1'

const DB_NAME = 'SonoraAudioVaultDB'
const DB_VERSION = 1
const STORE_NAME = 'audio_blobs'

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'pt-BR',
  defaultFormat: 'mp3',
  defaultQualityTier: 'padrao',
  defaultBitrate: 192,
  saveHistoryBlobs: true,
  rememberLastConfig: true,
  processingMode: 'hybrid-auto',
  reducedMotion: false,
  customApiUrl: '',
}

/**
 * Sessão local usada apenas no modo "Entrar sem conta". Contas reais ficam
 * com o Supabase (authService). Sessões antigas simuladas são descartadas.
 */
export function loadAuthSession(): AuthUser | null {
  try {
    const raw =
      localStorage.getItem(AUTH_SESSION_KEY) ??
      sessionStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    if (parsed?.provider !== 'guest') {
      clearAuthSession()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveAuthSession(user: AuthUser): void {
  try {
    const serialized = JSON.stringify(user)
    if (user.rememberMe) {
      localStorage.setItem(AUTH_SESSION_KEY, serialized)
      sessionStorage.removeItem(AUTH_SESSION_KEY)
    } else {
      sessionStorage.setItem(AUTH_SESSION_KEY, serialized)
      localStorage.removeItem(AUTH_SESSION_KEY)
    }
  } catch {}
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY)
    sessionStorage.removeItem(AUTH_SESSION_KEY)
  } catch {}
}

const DEFAULT_MASCOT_PREFS: MascotPrefs = { minimized: false, position: null }

export function loadMascotPrefs(): MascotPrefs {
  try {
    const raw = localStorage.getItem(MASCOT_PREFS_KEY)
    if (!raw) return DEFAULT_MASCOT_PREFS
    const parsed = JSON.parse(raw) as Partial<MascotPrefs>
    const position = parsed.position
    const validPosition =
      position &&
      Number.isFinite(position.x) &&
      Number.isFinite(position.y)
        ? { x: position.x, y: position.y }
        : null
    return { minimized: parsed.minimized === true, position: validPosition }
  } catch {
    return DEFAULT_MASCOT_PREFS
  }
}

export function saveMascotPrefs(prefs: MascotPrefs): void {
  try {
    localStorage.setItem(MASCOT_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage quota errors
  }
}

export function loadLastFormatPreferences(): {
  format?: AppSettings['defaultFormat']
  qualityTier?: AppSettings['defaultQualityTier']
  bitrate?: AppSettings['defaultBitrate']
} | null {
  try {
    const raw = localStorage.getItem(LAST_CONFIG_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveLastFormatPreferences(prefs: {
  format: AppSettings['defaultFormat']
  qualityTier: AppSettings['defaultQualityTier']
  bitrate: AppSettings['defaultBitrate']
}): void {
  try {
    localStorage.setItem(LAST_CONFIG_KEY, JSON.stringify(prefs))
  } catch {}
}

export function loadHistoryMeta(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_META_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveHistoryMeta(items: HistoryItem[]): void {
  try {
    localStorage.setItem(HISTORY_META_KEY, JSON.stringify(items))
  } catch {}
}

function openAudioDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function storeAudioBlob(id: string, blob: Blob): Promise<boolean> {
  try {
    const db = await openAudioDatabase()
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(blob, id)
      tx.oncomplete = () => {
        db.close()
        resolve(true)
      }
      tx.onerror = () => {
        db.close()
        resolve(false)
      }
    })
  } catch {
    return false
  }
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openAudioDatabase()
    return await new Promise<Blob | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)
      req.onsuccess = () => {
        db.close()
        resolve(req.result instanceof Blob ? req.result : null)
      }
      req.onerror = () => {
        db.close()
        resolve(null)
      }
    })
  } catch {
    return null
  }
}

export async function deleteAudioBlob(id: string): Promise<void> {
  try {
    const db = await openAudioDatabase()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(id)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        resolve()
      }
    })
  } catch {}
}

export async function clearAllAudioBlobs(): Promise<void> {
  try {
    const db = await openAudioDatabase()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.clear()
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        resolve()
      }
    })
  } catch {}
}
