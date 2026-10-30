import {
  createClient,
  type AuthError,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js'
import type { AuthUser } from '../types/sonora'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
const REMEMBER_KEY = 'sonora_auth_remember_v1'

export const isAuthConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

function shouldRemember(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== '0'
  } catch {
    return true
  }
}

export function setRememberPreference(remember: boolean): void {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
  } catch {
    // Ignore storage errors
  }
}

// "Lembrar de mim": sessão no localStorage (persiste) ou sessionStorage (fecha com a aba)
const rememberAwareStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (shouldRemember()) {
        localStorage.setItem(key, value)
        sessionStorage.removeItem(key)
      } else {
        sessionStorage.setItem(key, value)
        localStorage.removeItem(key)
      }
    } catch {
      // Ignore storage errors
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch {
      // Ignore storage errors
    }
  },
}

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!isAuthConfigured) {
    throw new Error('Login com conta não está configurado neste ambiente.')
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: rememberAwareStorage,
      },
    })
  }
  return client
}

function redirectUrl(): string {
  return `${window.location.origin}/`
}

export function toAuthUser(user: User): AuthUser {
  const meta = user.user_metadata || {}
  const email = user.email || ''
  const name =
    String(meta.full_name || meta.name || '').trim() ||
    email.split('@')[0] ||
    'Produtor Sonora'
  return {
    email,
    name,
    provider: user.app_metadata?.provider === 'google' ? 'google' : 'email',
    rememberMe: shouldRemember(),
    loggedInAt: user.last_sign_in_at || new Date().toISOString(),
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed:
    'Confirme seu e-mail antes de entrar. Procure o link na sua caixa de entrada.',
  user_already_exists: 'Já existe uma conta com este e-mail. Tente entrar.',
  email_exists: 'Já existe uma conta com este e-mail. Tente entrar.',
  weak_password: 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  over_email_send_rate_limit:
    'Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.',
  over_request_rate_limit:
    'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.',
  signup_disabled: 'Novos cadastros estão desativados no momento.',
  email_address_invalid: 'Este endereço de e-mail não é aceito.',
  session_not_found: 'Sua sessão expirou. Peça um novo link de recuperação.',
}

export function translateAuthError(error: unknown): string {
  const authError = error as Partial<AuthError> | null
  const code = authError?.code
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
  if (authError?.name === 'AuthRetryableFetchError' || !navigator.onLine) {
    return 'Sem conexão com o servidor de login. Verifique sua internet.'
  }
  return 'Não foi possível concluir agora. Tente novamente em instantes.'
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await getClient().auth.getSession()
  return data.session
}

export function onAuthChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  const { data } = getClient().auth.onAuthStateChange(callback)
  return () => data.subscription.unsubscribe()
}

export async function signInWithEmail(
  email: string,
  password: string,
  remember: boolean
): Promise<AuthUser> {
  setRememberPreference(remember)
  const { data, error } = await getClient().auth.signInWithPassword({
    email,
    password,
  })
  if (error || !data.user) throw error ?? new Error('Falha no login')
  return toAuthUser(data.user)
}

/**
 * Cria a conta. Retorna o usuário se já entrou direto, ou null quando o
 * Supabase exige confirmação por e-mail antes do primeiro login.
 */
export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
  remember: boolean
): Promise<AuthUser | null> {
  setRememberPreference(remember)
  const { data, error } = await getClient().auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: redirectUrl(),
    },
  })
  if (error) throw error
  // Supabase devolve um usuário sem identidades quando o e-mail já existe
  if (data.user && data.user.identities?.length === 0) {
    throw { code: 'user_already_exists' }
  }
  return data.session && data.user ? toAuthUser(data.user) : null
}

export async function signInWithGoogle(remember: boolean): Promise<void> {
  setRememberPreference(remember)
  const { error } = await getClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl() },
  })
  if (error) throw error
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await getClient().auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl(),
  })
  if (error) throw error
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await getClient().auth.updateUser({ password })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  if (!isAuthConfigured) return
  await getClient().auth.signOut()
}

/** Lê e remove da URL os parâmetros de retorno do login (código OAuth, erros). */
export function consumeAuthRedirectParams(): string | null {
  const url = new URL(window.location.href)
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
  const description =
    url.searchParams.get('error_description') || hash.get('error_description')
  const keys = ['code', 'error', 'error_code', 'error_description', 'state']
  const hadParams = keys.some((key) => url.searchParams.has(key)) || hash.has('error')
  if (hadParams) {
    keys.forEach((key) => url.searchParams.delete(key))
    url.hash = ''
    window.history.replaceState(null, '', url.toString())
  }
  if (!description) return null
  return /expired|invalid/i.test(description)
    ? 'Esse link expirou ou já foi usado. Peça um novo.'
    : 'Não foi possível concluir o login. Tente novamente.'
}
