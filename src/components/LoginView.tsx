import React, { useEffect, useId, useRef, useState } from 'react'
import {
  ArrowLeft,
  AudioLines,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  MailCheck,
  Moon,
  Scissors,
  Shield,
  ShieldCheck,
  Sun,
  User,
  UserPlus,
  UserRound,
} from 'lucide-react'
import type { AuthUser } from '../types/sonora'
import { SonoraBrandMark } from './SonoraBrandMark'
import {
  isAuthConfigured,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  translateAuthError,
  updatePassword,
} from '../services/authService'

type LoginMode = 'login' | 'register' | 'forgot' | 'reset'
type FieldName = 'name' | 'email' | 'password' | 'confirm'
type FieldErrors = Partial<Record<FieldName, string>>

interface LoginViewProps {
  onSuccessLogin: (user: AuthUser) => void
  onPasswordUpdated: () => void
  isPasswordRecovery?: boolean
  initialError?: string | null
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  reducedMotion?: boolean
}

const MIN_NEW_PASSWORD = 8

/* --------------------------- Vídeo da capivara -------------------------- */

const FEATURE_CHIPS = [
  { icon: AudioLines, label: 'MP3 · WAV · M4A · AAC' },
  { icon: Scissors, label: 'Corte e normalização' },
  { icon: ShieldCheck, label: 'Nada fica guardado' },
]

/**
 * Cenário único da tela: o vídeo nítido da capivara se dissolve numa versão
 * desfocada da mesma imagem que cobre a tela toda — sem divisão no meio.
 */
const LoginBackdrop: React.FC<{ prefersReducedMotion: boolean }> = React.memo(
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
          // O poster continua visível se o autoplay for bloqueado
        })
      }
    }, [prefersReducedMotion])

    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#06090A] select-none"
      >
        {/* Ambiente: a mesma cena, desfocada, preenchendo a tela inteira */}
        <img
          src="/capivara-login-poster.jpg"
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover scale-125 blur-[70px] saturate-[1.6] opacity-80"
        />

        {/* Cena nítida, com bordas que se dissolvem no ambiente */}
        <div className="login-hero-mask absolute inset-x-0 top-0 h-[48vh] lg:h-full lg:right-auto lg:w-[68%]">
          <img
            src="/capivara-login-poster.jpg"
            alt=""
            draggable={false}
            className={`absolute inset-0 h-full w-full object-cover object-[50%_30%] lg:object-[45%_center] saturate-[1.15] contrast-[1.05] transition-opacity duration-500 ${
              videoReady && !prefersReducedMotion ? 'opacity-0' : 'opacity-100'
            }`}
          />
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
              className="absolute inset-0 h-full w-full object-cover object-[50%_30%] lg:object-[45%_center] saturate-[1.15] contrast-[1.05]"
            />
          )}
        </div>

        {/* Leve sombra só onde há texto (canto inferior esquerdo) */}
        <div className="hidden lg:block absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_0%_100%,rgba(6,9,10,0.85),transparent_70%)]" />
        {/* Brilho lima atrás do cartão */}
        <div className="absolute right-[4%] top-1/2 -translate-y-1/2 h-[520px] w-[520px] rounded-full bg-[#B8F238]/10 blur-[120px]" />
      </div>
    )
  }
)

LoginBackdrop.displayName = 'LoginBackdrop'

const LoginHero: React.FC = () => (
  <div className="hidden lg:block max-w-xl text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.55)]">
    <h2 className="text-[34px] xl:text-5xl font-bold leading-[1.05] tracking-tight">
      Do vídeo ao áudio de estúdio{' '}
      <span className="text-[#C6FF4A]">em segundos.</span>
    </h2>
    <p className="mt-3 xl:mt-4 text-[15px] xl:text-lg text-white/80 max-w-md leading-relaxed">
      Extraia a trilha de qualquer vídeo, corte o trecho que quiser e baixe
      com qualidade de estúdio.
    </p>
    <ul className="mt-5 xl:mt-6 flex flex-wrap gap-2 [text-shadow:none]">
      {FEATURE_CHIPS.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold"
        >
          <Icon aria-hidden="true" className="w-3.5 h-3.5 text-[#C6FF4A]" />
          {label}
        </li>
      ))}
    </ul>
  </div>
)

/* ----------------------- Capivara que reage ao form ---------------------- */

const LoginMascot: React.FC<{ pose: string; message: string; isError: boolean }> = ({
  pose,
  message,
  isError,
}) => (
  <div className="flex items-center gap-3 mb-4">
    <span className="relative shrink-0 flex items-center justify-center w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(198,255,74,0.45),rgba(184,242,56,0.12)_60%,transparent_72%)]">
      <img
        key={pose}
        src={pose}
        alt=""
        draggable={false}
        className="login-mascot-pop w-14 h-14 sm:w-16 sm:h-16 object-contain"
      />
    </span>
    <div
      key={message}
      role={isError ? 'alert' : undefined}
      aria-live="polite"
      className={`login-fade-in relative rounded-2xl rounded-bl-md px-3.5 py-2.5 text-xs sm:text-[13px] leading-snug border ${
        isError
          ? 'border-red-400/40 bg-red-500/10 text-red-500 dark:text-red-300'
          : 'border-(--lg-card-border) bg-(--lg-bubble) text-(--lg-text)'
      }`}
    >
      {message}
    </div>
  </div>
)

/* ------------------------------ Campos ---------------------------------- */

interface TextFieldProps {
  id: string
  label: string
  icon: React.ElementType
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  autoComplete?: string
  placeholder?: string
  disabled?: boolean
  onFocus?: () => void
  onBlur?: () => void
  trailing?: React.ReactNode
  autoFocus?: boolean
}

const TextField: React.FC<TextFieldProps> = ({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
  placeholder,
  disabled,
  onFocus,
  onBlur,
  trailing,
  autoFocus,
}) => {
  const errorId = `${id}-error`
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs sm:text-sm font-semibold text-(--lg-text) mb-1.5"
      >
        {label}
      </label>
      <div
        className={`group flex items-center h-12 sm:h-[50px] rounded-2xl bg-(--lg-field) border px-4 transition-all duration-200 ${
          error
            ? 'border-red-500/80 focus-within:ring-2 focus-within:ring-red-500/25'
            : 'border-(--lg-field-border) hover:border-(--lg-field-border-hover) focus-within:border-[#B8F238] focus-within:ring-2 focus-within:ring-[#B8F238]/25'
        }`}
      >
        <Icon
          aria-hidden="true"
          className="w-4 h-4 sm:w-5 sm:h-5 text-(--lg-muted) group-focus-within:text-(--lg-accent-text) transition-colors shrink-0 mr-3"
        />
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="w-full h-full bg-transparent text-sm sm:text-[15px] text-(--lg-text) placeholder:text-(--lg-placeholder) focus:outline-none disabled:opacity-60"
        />
        {trailing}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}

function passwordScore(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= MIN_NEW_PASSWORD) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 14) score++
  return score
}

const STRENGTH_LABELS = ['Muito fraca', 'Fraca', 'Média', 'Boa', 'Forte']
const STRENGTH_COLORS = ['#EF4444', '#EF4444', '#F59E0B', '#84CC16', '#B8F238']

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  if (!password) return null
  const score = passwordScore(password)
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className="h-1 flex-1 rounded-full bg-(--lg-field-border) transition-colors duration-300"
            style={
              step <= score
                ? { backgroundColor: STRENGTH_COLORS[score] }
                : undefined
            }
          />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-(--lg-muted)">
        Força da senha: <strong>{STRENGTH_LABELS[score]}</strong>
      </p>
    </div>
  )
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

const GoogleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0">
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
)

/* ------------------------------ Tela ------------------------------------ */

const HEADINGS: Record<LoginMode, { title: string; subtitle: string }> = {
  login: {
    title: 'Bem-vindo de volta',
    subtitle: 'Entre para continuar transformando vídeos em áudio.',
  },
  register: {
    title: 'Crie sua conta',
    subtitle: 'Leva menos de um minuto. Depois é só arrastar seu primeiro vídeo.',
  },
  forgot: {
    title: 'Recuperar senha',
    subtitle: 'Informe seu e-mail e enviaremos um link para criar uma nova senha.',
  },
  reset: {
    title: 'Crie uma nova senha',
    subtitle: 'Escolha uma senha forte que você ainda não usou aqui.',
  },
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSuccessLogin,
  onPasswordUpdated,
  isPasswordRecovery = false,
  initialError = null,
  theme,
  onToggleTheme,
  reducedMotion = false,
}) => {
  const baseId = useId()
  const fieldId = (name: FieldName) => `${baseId}-${name}`

  const [mode, setMode] = useState<LoginMode>(
    isPasswordRecovery ? 'reset' : 'login'
  )
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(initialError)
  const [emailSent, setEmailSent] = useState<{
    kind: 'confirm' | 'reset'
    email: string
  } | null>(null)
  const [focusedField, setFocusedField] = useState<FieldName | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)

  // O link de recuperação pode chegar com a tela já aberta
  const [lastRecovery, setLastRecovery] = useState(isPasswordRecovery)
  if (isPasswordRecovery !== lastRecovery) {
    setLastRecovery(isPasswordRecovery)
    if (isPasswordRecovery) setMode('reset')
  }

  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  )
  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mediaQuery) return
    const handleChange = (event: MediaQueryListEvent) =>
      setSystemReducedMotion(event.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  const prefersReducedMotion = reducedMotion || systemReducedMotion

  const isBusy = isSubmitting || isGoogleLoading
  const accountsEnabled = isAuthConfigured || mode === 'reset'
  const isDark = theme === 'dark'
  const needsNewPassword = mode === 'register' || mode === 'reset'

  const switchMode = (next: LoginMode) => {
    setMode(next)
    setErrors({})
    setFormError(null)
    setEmailSent(null)
    setPassword('')
    setConfirm('')
    setShowPassword(false)
  }

  const updateField = (field: FieldName, value: string) => {
    const setters = {
      name: setName,
      email: setEmail,
      password: setPassword,
      confirm: setConfirm,
    }
    setters[field](value)
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    if (formError) setFormError(null)
  }

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    if (mode === 'register' && name.trim().length < 2) {
      next.name = 'Como podemos te chamar? (mínimo 2 letras)'
    }
    if (mode !== 'reset') {
      if (!email.trim()) next.email = 'Informe seu e-mail.'
      else if (!isValidEmail(email))
        next.email = 'Digite um e-mail válido (ex.: voce@exemplo.com).'
    }
    if (mode === 'login' && !password) {
      next.password = 'Informe sua senha.'
    }
    if (needsNewPassword) {
      if (password.length < MIN_NEW_PASSWORD) {
        next.password = `Use pelo menos ${MIN_NEW_PASSWORD} caracteres.`
      } else if (passwordScore(password) < 2) {
        next.password = 'Misture letras maiúsculas, minúsculas e números.'
      }
      if (!next.password && confirm !== password) {
        next.confirm = 'As senhas não são iguais.'
      }
    }
    return next
  }

  const failWith = (message: string) => {
    setFormError(message)
    setShakeKey((k) => k + 1)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isBusy) return
    setFormError(null)

    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setShakeKey((k) => k + 1)
      return
    }

    const cleanEmail = email.trim().toLowerCase()
    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        onSuccessLogin(await signInWithEmail(cleanEmail, password, rememberMe))
      } else if (mode === 'register') {
        const user = await signUpWithEmail(
          name.trim(),
          cleanEmail,
          password,
          rememberMe
        )
        if (user) onSuccessLogin(user)
        else setEmailSent({ kind: 'confirm', email: cleanEmail })
      } else if (mode === 'forgot') {
        await sendPasswordReset(cleanEmail)
        setEmailSent({ kind: 'reset', email: cleanEmail })
      } else {
        await updatePassword(password)
        onPasswordUpdated()
      }
    } catch (err) {
      failWith(translateAuthError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    if (isBusy) return
    setFormError(null)
    setIsGoogleLoading(true)
    try {
      // Redireciona para o Google; a sessão volta pela URL
      await signInWithGoogle(rememberMe)
    } catch (err) {
      setIsGoogleLoading(false)
      failWith(translateAuthError(err))
    }
  }

  const handleGuest = () => {
    if (isBusy) return
    onSuccessLogin({
      email: '',
      name: 'Visitante',
      provider: 'guest',
      rememberMe: true,
      loggedInAt: new Date().toISOString(),
    })
  }

  // Pose e fala da capivara conforme o que a pessoa está fazendo
  const resolveMascot = (): { pose: string; message: string; isError: boolean } => {
    if (formError) {
      return { pose: '/mascote/pose-surprised.png', message: formError, isError: true }
    }
    if (Object.values(errors).some(Boolean)) {
      return {
        pose: '/mascote/pose-think.png',
        message: 'Quase lá! Dá uma conferida nos campos marcados.',
        isError: false,
      }
    }
    if (emailSent) {
      return {
        pose: '/mascote/pose-thumbsup.png',
        message: 'E-mail a caminho! Confira também a caixa de spam.',
        isError: false,
      }
    }
    if (isGoogleLoading) {
      return {
        pose: '/mascote/pose-wave.png',
        message: 'Te levando até o Google…',
        isError: false,
      }
    }
    if (isSubmitting) {
      return {
        pose: '/mascote/pose-laptop.png',
        message: 'Conferindo com o servidor…',
        isError: false,
      }
    }
    if (!accountsEnabled) {
      return {
        pose: '/mascote/pose-peace.png',
        message: 'As contas ainda não estão ativas, mas o estúdio já está aberto!',
        isError: false,
      }
    }
    if (focusedField === 'password' || focusedField === 'confirm') {
      return showPassword
        ? {
            pose: '/mascote/pose-surprised.png',
            message: 'Opa, senha à mostra! Cuidado com quem está olhando.',
            isError: false,
          }
        : {
            pose: '/mascote/pose-zen.png',
            message: 'Pode digitar, prometo não espiar.',
            isError: false,
          }
    }
    if (focusedField === 'email') {
      return {
        pose: '/mascote/pose-curious.png',
        message:
          mode === 'forgot'
            ? 'Acontece! Qual e-mail você usou no cadastro?'
            : 'Hmm, qual é o seu e-mail?',
        isError: false,
      }
    }
    if (focusedField === 'name') {
      return {
        pose: '/mascote/pose-welcome.png',
        message: name.trim()
          ? `Prazer, ${name.trim().split(' ')[0]}!`
          : 'Como posso te chamar?',
        isError: false,
      }
    }
    const idle: Record<LoginMode, { pose: string; message: string }> = {
      login: { pose: '/mascote/pose-wave.png', message: 'Oi! Que bom te ver por aqui.' },
      register: {
        pose: '/mascote/pose-welcome.png',
        message: 'Bora criar sua conta? É rapidinho.',
      },
      forgot: {
        pose: '/mascote/pose-think.png',
        message: 'Esqueceu? Sem problema, te ajudo a criar outra.',
      },
      reset: {
        pose: '/mascote/pose-confident.png',
        message: 'Escolha uma senha nova e forte.',
      },
    }
    return { ...idle[mode], isError: false }
  }

  const mascot = resolveMascot()
  const heading = HEADINGS[mode]
  const fieldFocus = (field: FieldName) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField((current) => (current === field ? null : current)),
  })

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      disabled={isBusy}
      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
      aria-pressed={showPassword}
      className="ml-2 p-1.5 rounded-xl text-(--lg-muted) hover:text-(--lg-text) focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F238] transition-colors cursor-pointer"
    >
      {showPassword ? (
        <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
      ) : (
        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
      )}
    </button>
  )

  const linkButtonClass =
    'font-semibold text-(--lg-accent-text) hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F238] rounded-md px-1 py-0.5 cursor-pointer disabled:opacity-60'
  const primaryButtonClass =
    'w-full h-12 sm:h-[50px] rounded-2xl bg-[#B8F238] hover:bg-[#c3f64e] active:scale-[0.99] disabled:opacity-65 disabled:cursor-not-allowed text-[#090B0C] font-bold text-[15px] sm:text-base flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(184,242,56,0.22)] hover:shadow-[0_0_28px_rgba(184,242,56,0.42)] transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-(--lg-text) focus-visible:ring-offset-2 focus-visible:ring-offset-(--lg-card)'
  const secondaryButtonClass =
    'w-full h-12 rounded-2xl bg-(--lg-field) border border-(--lg-field-border) hover:border-(--lg-field-border-hover) active:scale-[0.99] text-(--lg-text) text-sm font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F238] disabled:opacity-60 disabled:cursor-not-allowed'

  const submitLabel: Record<LoginMode, { idle: string; busy: string; icon: React.ElementType }> = {
    login: { idle: 'Entrar', busy: 'Entrando…', icon: LogIn },
    register: { idle: 'Criar conta', busy: 'Criando conta…', icon: UserPlus },
    forgot: { idle: 'Enviar link de recuperação', busy: 'Enviando…', icon: Mail },
    reset: { idle: 'Salvar nova senha', busy: 'Salvando…', icon: KeyRound },
  }
  const SubmitIcon = submitLabel[mode].icon

  const renderEmailSent = () => (
    <div className="login-fade-in text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B8F238]/15 text-(--lg-accent-text)">
        <MailCheck className="w-7 h-7" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-(--lg-text)">
        Confira seu e-mail
      </h1>
      <p className="mt-2 text-sm text-(--lg-muted) leading-relaxed">
        {emailSent?.kind === 'confirm'
          ? 'Enviamos um link de confirmação para '
          : 'Se existir uma conta com esse endereço, enviamos um link para '}
        <strong className="text-(--lg-text)">{emailSent?.email}</strong>.{' '}
        {emailSent?.kind === 'confirm'
          ? 'Clique nele para ativar sua conta e entrar.'
          : 'Ele vale por uma hora.'}
      </p>
      <button
        type="button"
        onClick={() => switchMode('login')}
        className={`${secondaryButtonClass} mt-6`}
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Voltar para o login
      </button>
    </div>
  )

  const renderForm = () => (
    <div key={mode} className="login-fade-in">
      <div className="text-center mb-4">
        <h1
          id="sonora-login-heading"
          className="text-2xl sm:text-[26px] font-bold tracking-tight text-(--lg-text) leading-tight"
        >
          {heading.title}
        </h1>
        <p className="mt-1.5 text-sm text-(--lg-muted) leading-relaxed">
          {heading.subtitle}
        </p>
      </div>

      <form
        key={shakeKey}
        onSubmit={handleSubmit}
        noValidate
        className={`space-y-3.5 ${shakeKey > 0 ? 'login-shake' : ''}`}
      >
        {mode === 'register' && (
          <TextField
            id={fieldId('name')}
            label="Nome"
            icon={User}
            value={name}
            onChange={(v) => updateField('name', v)}
            error={errors.name}
            autoComplete="name"
            placeholder="Como quer ser chamado"
            disabled={isBusy}
            {...fieldFocus('name')}
          />
        )}

        {mode !== 'reset' && (
          <TextField
            id={fieldId('email')}
            label="E-mail"
            icon={Mail}
            type="email"
            value={email}
            onChange={(v) => updateField('email', v)}
            error={errors.email}
            autoComplete="email"
            placeholder="voce@exemplo.com"
            disabled={isBusy}
            {...fieldFocus('email')}
          />
        )}

        {mode !== 'forgot' && (
          <div>
            <TextField
              id={fieldId('password')}
              label={mode === 'reset' ? 'Nova senha' : 'Senha'}
              icon={Lock}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(v) => updateField('password', v)}
              error={errors.password}
              autoComplete={needsNewPassword ? 'new-password' : 'current-password'}
              placeholder={
                needsNewPassword ? `Mínimo ${MIN_NEW_PASSWORD} caracteres` : '••••••••'
              }
              disabled={isBusy}
              trailing={passwordToggle}
              autoFocus={mode === 'reset'}
              {...fieldFocus('password')}
            />
            {needsNewPassword && <PasswordStrength password={password} />}
          </div>
        )}

        {needsNewPassword && (
          <TextField
            id={fieldId('confirm')}
            label="Confirmar senha"
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={(v) => updateField('confirm', v)}
            error={errors.confirm}
            autoComplete="new-password"
            placeholder="Repita a senha"
            disabled={isBusy}
            {...fieldFocus('confirm')}
          />
        )}

        {(mode === 'login' || mode === 'register') && (
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <span className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isBusy}
                  className="peer sr-only"
                />
                <span className="w-[18px] h-[18px] rounded-[5px] border border-(--lg-field-border) bg-(--lg-field) peer-checked:bg-[#B8F238] peer-checked:border-[#B8F238] peer-focus-visible:ring-2 peer-focus-visible:ring-[#B8F238] transition-all flex items-center justify-center">
                  <Check
                    aria-hidden="true"
                    className={`w-3 h-3 text-[#090B0C] stroke-[3] transition-opacity ${
                      rememberMe ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </span>
              </span>
              <span className="text-xs sm:text-sm text-(--lg-text)">
                Lembrar de mim
              </span>
            </label>

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                disabled={isBusy}
                className={`text-xs sm:text-sm ${linkButtonClass}`}
              >
                Esqueci minha senha
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className={primaryButtonClass}
        >
          {isSubmitting ? (
            <Loader2 aria-hidden="true" className="w-5 h-5 animate-spin stroke-[2.5]" />
          ) : (
            <SubmitIcon aria-hidden="true" className="w-5 h-5 stroke-[2.4]" />
          )}
          <span>
            {isSubmitting ? submitLabel[mode].busy : submitLabel[mode].idle}
          </span>
        </button>
      </form>

      {(mode === 'login' || mode === 'register') && (
        <>
          <div className="relative my-4 flex items-center gap-3">
            <div aria-hidden="true" className="flex-1 border-t border-(--lg-divider)" />
            <span className="text-xs text-(--lg-muted) shrink-0">ou</span>
            <div aria-hidden="true" className="flex-1 border-t border-(--lg-divider)" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={isBusy}
            className={secondaryButtonClass}
          >
            {isGoogleLoading ? (
              <Loader2 aria-hidden="true" className="w-[18px] h-[18px] animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span>
              {mode === 'register' ? 'Cadastrar com Google' : 'Continuar com Google'}
            </span>
          </button>
        </>
      )}

      <p className="mt-4 text-center text-xs sm:text-sm text-(--lg-muted)">
        {mode === 'login' && (
          <>
            Ainda não tem uma conta?{' '}
            <button
              type="button"
              onClick={() => switchMode('register')}
              disabled={isBusy}
              className={linkButtonClass}
            >
              Criar conta
            </button>
          </>
        )}
        {mode === 'register' && (
          <>
            Já tem uma conta?{' '}
            <button
              type="button"
              onClick={() => switchMode('login')}
              disabled={isBusy}
              className={linkButtonClass}
            >
              Entrar
            </button>
          </>
        )}
        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => switchMode('login')}
            disabled={isBusy}
            className={`inline-flex items-center gap-1 ${linkButtonClass}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Voltar para o login
          </button>
        )}
      </p>
    </div>
  )

  const renderAccountsDisabled = () => (
    <div className="login-fade-in text-center">
      <h1
        id="sonora-login-heading"
        className="text-2xl sm:text-[28px] font-bold tracking-tight text-(--lg-text)"
      >
        Bem-vindo ao SONORA
      </h1>
      <p className="mt-1.5 text-sm text-(--lg-muted) leading-relaxed">
        O login com conta ainda não está disponível neste site. Você já pode
        converter seus vídeos sem cadastro.
      </p>
      {import.meta.env.DEV && (
        <p className="mt-3 rounded-xl border border-dashed border-(--lg-field-border) px-3 py-2 text-[11px] text-(--lg-muted) font-mono">
          Dev: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local
        </p>
      )}
    </div>
  )

  return (
    <div
      className={`login-theme-${isDark ? 'dark' : 'light'} relative min-h-screen w-full text-(--lg-text) overflow-x-hidden selection:bg-[#B8F238] selection:text-[#090B0C]`}
    >
      <LoginBackdrop prefersReducedMotion={prefersReducedMotion} />

      <header className="absolute left-0 top-0 z-20 px-4 pt-4 sm:px-7 sm:pt-6 lg:px-10 lg:pt-8">
        <SonoraBrandMark size="md" withBackdrop />
      </header>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row lg:items-center lg:justify-end px-4 pb-8 pt-[34vh] sm:px-7 lg:px-10 lg:py-6 xl:px-16">
        {/* Apresentação fixa no canto inferior esquerdo (desktop) */}
        <div className="lg:absolute lg:left-10 lg:bottom-10 xl:left-16 xl:bottom-14 lg:right-[520px] xl:right-[560px]">
          <LoginHero />
        </div>

        <section
          aria-labelledby="sonora-login-heading"
          className="login-card relative w-full max-w-[460px] mx-auto lg:mx-0 shrink-0 rounded-[30px] border border-(--lg-card-border) bg-(--lg-card) backdrop-blur-2xl px-6 py-6 sm:px-8 sm:py-7 transition-colors duration-300"
          style={{ boxShadow: 'var(--lg-shadow)' }}
        >
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={isDark ? 'Tema claro' : 'Tema escuro'}
            className="absolute top-5 right-5 z-10 h-10 w-10 rounded-full border border-(--lg-field-border) bg-(--lg-field) text-(--lg-accent-text) flex items-center justify-center cursor-pointer hover:scale-105 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F238]"
          >
            {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
          <LoginMascot {...mascot} />

          {emailSent
            ? renderEmailSent()
            : accountsEnabled
              ? renderForm()
              : renderAccountsDisabled()}

          {/* Entrar sem conta */}
          {mode !== 'reset' && !emailSent && (
            <div className="mt-4 pt-4 border-t border-(--lg-divider)">
              <button
                type="button"
                onClick={handleGuest}
                disabled={isBusy}
                className={accountsEnabled ? secondaryButtonClass : primaryButtonClass}
              >
                <UserRound aria-hidden="true" className="w-4 h-4" />
                Entrar sem conta
              </button>
              <p className="mt-2 text-center text-[11px] text-(--lg-muted)">
                Seu histórico fica salvo só neste navegador.
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-(--lg-muted)">
            <Shield aria-hidden="true" className="w-4 h-4 text-(--lg-accent-text) shrink-0" />
            <span>Seus arquivos não ficam guardados em nenhum servidor</span>
          </div>
        </section>
      </div>
    </div>
  )
}
