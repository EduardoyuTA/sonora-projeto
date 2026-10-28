import React, { useEffect, useId, useRef, useState } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Shield,
} from 'lucide-react'
import type { AuthUser } from '../types/sonora'
import { SonoraBrandMark } from './SonoraBrandMark'

interface LoginViewProps {
  onSuccessLogin: (user: AuthUser) => void
  reducedMotion?: boolean
}

interface CapybaraVideoShowcaseProps {
  prefersReducedMotion: boolean
}

/**
 * Memoized video showcase so form re-renders never remount or re-download the MP4 stream.
 */
const CapybaraVideoShowcase: React.FC<CapybaraVideoShowcaseProps> = React.memo(
  ({ prefersReducedMotion }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const [videoReady, setVideoReady] = useState(false)

    useEffect(() => {
      const videoEl = videoRef.current
      if (!videoEl) return

      if (prefersReducedMotion) {
        videoEl.pause()
      } else {
        videoEl.play().catch(() => {
          // Fallback poster remains visible if autoplay is restricted
        })
      }
    }, [prefersReducedMotion])

    return (
      <section
        aria-label="Apresentação visual SONORA STUDIO"
        className="relative w-full lg:w-[56%] xl:w-[58%] h-[230px] sm:h-[320px] lg:h-screen overflow-hidden bg-[#090B0C] select-none shrink-0"
      >
        {/* Static Poster Fallback (also shown when prefers-reduced-motion is active) */}
        <img
          src="/capivara-login-poster.jpg"
          alt=""
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-[56%_36%] lg:object-[62%_center] transition-opacity duration-300 ${
            videoReady && !prefersReducedMotion ? 'opacity-0' : 'opacity-100'
          }`}
          draggable={false}
        />

        {/* Autoplay Silent Looping Capybara Video */}
        {!prefersReducedMotion && (
          <video
            ref={videoRef}
            src="/capivara-login-boas-vindas-claro.mp4"
            poster="/capivara-login-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onCanPlay={() => setVideoReady(true)}
            onLoadedData={() => setVideoReady(true)}
            className="pointer-events-none h-full w-full object-cover object-[56%_36%] lg:object-[62%_center]"
          />
        )}

        {/* Top subtle vignette for brand legibility */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#090B0C]/85 via-[#090B0C]/35 to-transparent"
        />

        {/* Desktop seamless right-edge dark transition into the login column */}
        <div
          aria-hidden="true"
          className="pointer-events-none hidden lg:block absolute inset-y-0 right-0 w-44 xl:w-64 bg-gradient-to-r from-transparent via-[#090B0C]/75 to-[#090B0C]"
        />

        {/* Mobile/Tablet bottom-edge dark transition into the login card */}
        <div
          aria-hidden="true"
          className="pointer-events-none lg:hidden absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-[#090B0C]/75 to-[#090B0C]"
        />

        {/* Top-left Brand Header Over Video */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-7 lg:top-8 lg:left-9 z-10">
          <SonoraBrandMark size="md" withBackdrop />
        </div>
      </section>
    )
  }
)

CapybaraVideoShowcase.displayName = 'CapybaraVideoShowcase'

function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSuccessLogin,
  reducedMotion = false,
}) => {
  const emailInputId = useId()
  const passwordInputId = useId()
  const emailErrorId = useId()
  const passwordErrorId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [isRegisterMode, setIsRegisterMode] = useState(false)

  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [statusNotice, setStatusNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemReducedMotion(event.matches)
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const prefersReducedMotion = reducedMotion || systemReducedMotion

  const validateForm = (): boolean => {
    let valid = true

    if (!email.trim()) {
      setEmailError('Informe seu endereço de e-mail.')
      valid = false
    } else if (!isValidEmail(email)) {
      setEmailError('Digite um e-mail válido (ex.: voce@exemplo.com).')
      valid = false
    } else {
      setEmailError(null)
    }

    if (!password) {
      setPasswordError('Informe sua senha para continuar.')
      valid = false
    } else if (password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.')
      valid = false
    } else {
      setPasswordError(null)
    }

    return valid
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatusNotice(null)

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    const cleanEmail = email.trim().toLowerCase()
    const displayName = cleanEmail.split('@')[0] || 'Produtor Sonora'

    window.setTimeout(() => {
      setIsSubmitting(false)
      onSuccessLogin({
        email: cleanEmail,
        name: displayName,
        provider: 'email',
        rememberMe,
        loggedInAt: new Date().toISOString(),
      })
    }, 520)
  }

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    if (isSubmitting) return
    setEmailError(null)
    setPasswordError(null)
    setStatusNotice(null)
    setIsSubmitting(true)

    window.setTimeout(() => {
      setIsSubmitting(false)
      onSuccessLogin({
        email:
          provider === 'google'
            ? 'estudio@google.sonora.app'
            : 'estudio@apple.sonora.app',
        name: provider === 'google' ? 'Conta Google' : 'Conta Apple',
        provider,
        rememberMe,
        loggedInAt: new Date().toISOString(),
      })
    }, 450)
  }

  const handleForgotPassword = () => {
    setPasswordError(null)
    if (email.trim() && isValidEmail(email)) {
      setStatusNotice(
        `Enviamos as instruções de recuperação para ${email.trim()}.`
      )
    } else {
      setStatusNotice(
        'Digite seu e-mail no campo acima para receber o link de redefinição de senha.'
      )
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#090B0C] text-[#F7F8F8] flex flex-col lg:flex-row overflow-x-hidden selection:bg-[#B8F238] selection:text-[#090B0C]">
      {/* Left Column: ~58% width on desktop with Capybara Video */}
      <CapybaraVideoShowcase prefersReducedMotion={prefersReducedMotion} />

      {/* Right Column: ~42% width on desktop with Login Card */}
      <main className="relative flex-1 lg:w-[44%] xl:w-[42%] lg:min-h-screen flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-6 xl:px-12">
        {/* Nearly invisible background grid lines */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #F7F8F8 1px, transparent 1px), linear-gradient(to bottom, #F7F8F8 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        {/* Subtle radial lime glow behind the card */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] rounded-full bg-[#B8F238]/[0.05] blur-[100px]"
        />

        {/* Login Card */}
        <section
          aria-labelledby="sonora-login-heading"
          className="relative z-10 w-full max-w-[540px] rounded-[28px] bg-[#12161A] border border-[#222830] shadow-[0_24px_64px_rgba(0,0,0,0.68)] px-6 py-6 sm:px-9 sm:py-8"
        >
          {/* 1. Marca SONORA STUDIO (oculta no desktop: a marca já aparece sobre o vídeo) */}
          <div className="flex justify-center mb-4 sm:mb-5 lg:hidden">
            <SonoraBrandMark size="md" centered />
          </div>

          {/* 2. Título & 3. Texto */}
          <div className="text-center mb-5 sm:mb-6">
            <h1
              id="sonora-login-heading"
              className="text-2xl sm:text-[28px] xl:text-[31px] font-bold tracking-tight text-[#F7F8F8] leading-tight"
            >
              {isRegisterMode ? 'Crie sua conta' : 'Bem-vindo de volta'}
            </h1>
            <p className="mt-1.5 text-sm text-[#9CA5B2] leading-relaxed">
              {isRegisterMode
                ? 'Leva menos de um minuto. Depois é só arrastar seu primeiro vídeo.'
                : 'Entre para continuar transformando vídeos em áudio.'}
            </p>
          </div>

          {/* Status Notice (Forgot Password / Mode switch feedback) */}
          {statusNotice && (
            <div
              role="status"
              aria-live="polite"
              className="mb-4 rounded-xl border border-[#B8F238]/35 bg-[#171F14] px-3.5 py-2.5 text-xs text-[#E4F9B8]"
            >
              {statusNotice}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* 4. Campo "E-mail" */}
            <div>
              <label
                htmlFor={emailInputId}
                className="block text-xs sm:text-sm font-semibold text-[#F7F8F8] mb-1.5"
              >
                E-mail
              </label>
              <div
                className={`group flex items-center h-[54px] sm:h-[56px] rounded-2xl bg-[#171B20] border px-4 transition-all duration-180 ${
                  emailError
                    ? 'border-red-500/80 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-500/25'
                    : 'border-[#2A313C] hover:border-[#38414F] focus-within:border-[#B8F238] focus-within:ring-2 focus-within:ring-[#B8F238]/20 focus-within:shadow-[0_0_20px_rgba(184,242,56,0.14)]'
                }`}
              >
                <Mail
                  aria-hidden="true"
                  className="w-4 h-4 sm:w-5 sm:h-5 text-[#9CA5B2] group-focus-within:text-[#B8F238] transition-colors duration-180 shrink-0 mr-3"
                />
                <input
                  id={emailInputId}
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (emailError) setEmailError(null)
                  }}
                  placeholder="voce@exemplo.com"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? emailErrorId : undefined}
                  className="w-full h-full bg-transparent text-sm sm:text-[15px] text-[#F7F8F8] placeholder-[#6C7684] focus:outline-none disabled:opacity-60"
                />
              </div>
              {emailError && (
                <p
                  id={emailErrorId}
                  role="alert"
                  className="mt-1 text-xs font-medium text-red-400"
                >
                  {emailError}
                </p>
              )}
            </div>

            {/* 5. Campo "Senha" + 6. Controle para mostrar ou ocultar a senha */}
            <div>
              <label
                htmlFor={passwordInputId}
                className="block text-xs sm:text-sm font-semibold text-[#F7F8F8] mb-1.5"
              >
                Senha
              </label>
              <div
                className={`group flex items-center h-[54px] sm:h-[56px] rounded-2xl bg-[#171B20] border px-4 transition-all duration-180 ${
                  passwordError
                    ? 'border-red-500/80 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-500/25'
                    : 'border-[#2A313C] hover:border-[#38414F] focus-within:border-[#B8F238] focus-within:ring-2 focus-within:ring-[#B8F238]/20 focus-within:shadow-[0_0_20px_rgba(184,242,56,0.14)]'
                }`}
              >
                <Lock
                  aria-hidden="true"
                  className="w-4 h-4 sm:w-5 sm:h-5 text-[#9CA5B2] group-focus-within:text-[#B8F238] transition-colors duration-180 shrink-0 mr-3"
                />
                <input
                  id={passwordInputId}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete={
                    isRegisterMode ? 'new-password' : 'current-password'
                  }
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (passwordError) setPasswordError(null)
                  }}
                  placeholder="•••••••••"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? passwordErrorId : undefined}
                  className="w-full h-full bg-transparent text-sm sm:text-[15px] text-[#F7F8F8] placeholder-[#6C7684] focus:outline-none disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isSubmitting}
                  aria-label={
                    showPassword ? 'Ocultar senha' : 'Mostrar senha'
                  }
                  aria-pressed={showPassword}
                  className="ml-2 p-1.5 rounded-xl text-[#9CA5B2] hover:text-[#F7F8F8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F238] transition-colors duration-180 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p
                  id={passwordErrorId}
                  role="alert"
                  className="mt-1 text-xs font-medium text-red-400"
                >
                  {passwordError}
                </p>
              )}
            </div>

            {/* 7. Opção "Lembrar de mim" & 8. Link "Esqueci minha senha" */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
                <span className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isSubmitting}
                    className="peer sr-only"
                  />
                  <span className="w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-[5px] border border-[#323A46] bg-[#171B20] peer-checked:bg-[#B8F238] peer-checked:border-[#B8F238] peer-focus-visible:ring-2 peer-focus-visible:ring-[#B8F238] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#12161A] transition-all duration-180 flex items-center justify-center">
                    <Check
                      aria-hidden="true"
                      className={`w-3 h-3 text-[#090B0C] stroke-[3] transition-opacity duration-150 ${
                        rememberMe ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </span>
                </span>
                <span className="text-xs sm:text-sm text-[#F7F8F8] group-hover:text-white transition-colors whitespace-nowrap">
                  Lembrar de mim
                </span>
              </label>

              {!isRegisterMode && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isSubmitting}
                className="text-xs sm:text-sm font-medium text-[#B8F238] hover:text-[#cbf764] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F238] rounded-md px-1 py-0.5 transition-colors duration-180 cursor-pointer whitespace-nowrap"
              >
                Esqueci minha senha
              </button>
              )}
            </div>

            {/* 9. Botão principal "Entrar" */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[52px] sm:h-[54px] rounded-2xl bg-[#B8F238] hover:bg-[#c3f64e] active:scale-[0.99] disabled:opacity-65 disabled:cursor-not-allowed text-[#090B0C] font-bold text-[15px] sm:text-base flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(184,242,56,0.22)] hover:shadow-[0_0_28px_rgba(184,242,56,0.42)] transition-all duration-180 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F7F8F8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#12161A]"
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="w-5 h-5 animate-spin stroke-[2.5]"
                  />
                  <span>{isRegisterMode ? 'Criando conta...' : 'Entrando...'}</span>
                </>
              ) : (
                <>
                  <LogIn aria-hidden="true" className="w-5 h-5 stroke-[2.4]" />
                  <span>{isRegisterMode ? 'Criar conta' : 'Entrar'}</span>
                </>
              )}
            </button>
          </form>

          {/* 10. Divisor com o texto "ou continue com" */}
          <div className="relative my-5 flex items-center justify-center">
            <div
              aria-hidden="true"
              className="w-full border-t border-[#222830]"
            />
            <span className="bg-[#12161A] px-3.5 text-xs text-[#9CA5B2] shrink-0">
              ou continue com
            </span>
            <div
              aria-hidden="true"
              className="w-full border-t border-[#222830]"
            />
          </div>

          {/* 11. Botões "Google" e "Apple" */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={isSubmitting}
              className="h-[48px] sm:h-[50px] rounded-2xl bg-[#171B20] hover:bg-[#1D2229] active:scale-[0.99] border border-[#262E38] hover:border-[#384352] text-[#F7F8F8] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 transition-all duration-180 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F238] disabled:opacity-60"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0"
              >
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96Z"
                />
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('apple')}
              disabled={isSubmitting}
              className="h-[48px] sm:h-[50px] rounded-2xl bg-[#171B20] hover:bg-[#1D2229] active:scale-[0.99] border border-[#262E38] hover:border-[#384352] text-[#F7F8F8] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 transition-all duration-180 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F238] disabled:opacity-60"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0"
              >
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
              </svg>
              <span>Apple</span>
            </button>
          </div>

          {/* 12. Texto "Ainda não tem uma conta? Criar conta" */}
          <p className="mt-5 text-center text-xs sm:text-sm text-[#9CA5B2]">
            {isRegisterMode ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode((prev) => !prev)
                setStatusNotice(null)
                setEmailError(null)
                setPasswordError(null)
              }}
              disabled={isSubmitting}
              className="font-semibold text-[#B8F238] hover:text-[#cbf764] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F238] rounded-md px-1 py-0.5 transition-colors duration-180 cursor-pointer"
            >
              {isRegisterMode ? 'Entrar' : 'Criar conta'}
            </button>
          </p>

          {/* 13. Rodapé com ícone de escudo e texto "Processamento local e seguro" */}
          <div className="mt-5 pt-4 border-t border-[#1E242C] flex items-center justify-center gap-2 text-xs text-[#9CA5B2]">
            <Shield
              aria-hidden="true"
              className="w-4 h-4 text-[#B8F238] shrink-0"
            />
            <span>Processamento local e seguro</span>
          </div>
        </section>
      </main>
    </div>
  )
}
