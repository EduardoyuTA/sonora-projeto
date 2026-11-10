import React from 'react'
import {
  AudioWaveform,
  Check,
  History,
  LogOut,
  Moon,
  Music,
  Settings,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import type {
  ActiveTab,
  AuthUser,
  ConversionState,
  ProcessingMode,
} from '../types/sonora'

interface NavItem {
  id: ActiveTab
  label: string
  badge?: number
}

const buildNavItems = (historyCount: number): NavItem[] => [
  { id: 'converter', label: 'Converter' },
  {
    id: 'historico',
    label: 'Histórico',
    badge: historyCount > 0 ? historyCount : undefined,
  },
  { id: 'configuracoes', label: 'Configurações' },
]

const NavIcon: React.FC<{ id: ActiveTab; className?: string }> = ({
  id,
  className = 'w-5 h-5',
}) => {
  if (id === 'converter') return <Music className={className} strokeWidth={2} />
  if (id === 'historico') return <History className={className} strokeWidth={2} />
  return <Settings className={className} strokeWidth={2} />
}

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]'

/* ----------------------------- Brand block ----------------------------- */

const Brand: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-3 rounded-xl text-left cursor-pointer ${focusRing}`}
    aria-label="SONORA - Ir para a tela de conversão"
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--accent)] text-[#0A0C0B]">
      <AudioWaveform className="h-5 w-5" strokeWidth={2.4} />
    </span>
    <span className="flex flex-col">
      <span className="font-display text-strong text-lg font-bold leading-tight tracking-[0.04em]">
        SONORA
      </span>
      <span className="text-muted text-xs">Vídeo para áudio</span>
    </span>
  </button>
)

/* ------------------------- Shared action buttons ------------------------ */

interface ThemeLogoutProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  user?: AuthUser | null
  onLogout?: () => void
}

const ThemeAndLogout: React.FC<ThemeLogoutProps> = ({
  theme,
  onToggleTheme,
  user,
  onLogout,
}) => {
  const isDark = theme === 'dark'
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggleTheme}
        className={`btn-glass h-11 w-11 rounded-xl flex items-center justify-center cursor-pointer ${focusRing}`}
        aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
        title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      >
        {isDark ? (
          <Sun className="text-muted h-[18px] w-[18px]" />
        ) : (
          <Moon className="text-muted h-[18px] w-[18px]" />
        )}
      </button>
      {user && onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className={`btn-glass h-11 rounded-xl flex items-center gap-2.5 pl-1.5 pr-3 cursor-pointer ${focusRing}`}
          title={
            user.provider === 'guest'
              ? 'Usando sem conta — Clique para sair'
              : `Conectado como ${user.email} — Clique para sair`
          }
          aria-label="Sair da conta"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-3)] text-sm font-semibold">
            {(user.name || 'V').charAt(0).toUpperCase()}
          </span>
          <span className="hidden sm:block max-w-[140px] truncate text-sm font-medium">
            {user.name}
          </span>
          <LogOut className="text-muted h-4 w-4" />
        </button>
      )}
    </div>
  )
}

/* ------------------------------ Etapas -------------------------------- */

const STEPS = ['Vídeo', 'Formato', 'Baixar'] as const

const stepFromState = (state: ConversionState): number => {
  if (state === 'success') return 2
  if (state === 'loaded' || state === 'converting') return 1
  return 0
}

export const ConversionSteps: React.FC<{ state: ConversionState }> = ({
  state,
}) => {
  const current = stepFromState(state)
  return (
    <ol
      aria-label="Etapas da conversão"
      className="flex flex-wrap items-center gap-1.5 text-[13px]"
    >
      {STEPS.map((label, index) => {
        const done = index < current
        const active = index === current
        return (
          <React.Fragment key={label}>
            {index > 0 && (
              <li
                aria-hidden="true"
                className={`h-px w-5 sm:w-6 ${
                  index <= current ? 'bg-[var(--accent-text)]' : 'bg-[var(--border-strong)]'
                }`}
              />
            )}
            <li
              aria-current={active ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 ${
                active
                  ? 'bg-[var(--surface-3)] text-strong font-semibold'
                  : 'text-muted'
              }`}
            >
              <span
                className={`step-dot ${
                  active
                    ? 'bg-[var(--accent)] text-[#0A0C0B]'
                    : done
                      ? 'bg-[var(--accent-soft)] text-accent'
                      : 'border border-[var(--border-strong)]'
                }`}
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
              </span>
              {label}
            </li>
          </React.Fragment>
        )
      })}
    </ol>
  )
}

/* ------------------------------ Desktop ------------------------------- */

interface SidebarProps {
  activeTab: ActiveTab
  onSelectTab: (tab: ActiveTab) => void
  historyCount: number
  isConverting: boolean
  processingMode: ProcessingMode
  /** Cartão da Capivara, fixo no rodapé da barra lateral */
  mascot?: React.ReactNode
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  historyCount,
  isConverting,
  processingMode,
  mascot,
}) => {
  const navItems = buildNavItems(historyCount)
  const isLocalOnly = processingMode === 'browser-only'
  return (
    <aside className="hidden lg:flex sticky top-0 h-dvh w-64 shrink-0 flex-col gap-7 border-r border-[var(--border)] bg-[var(--surface)] px-4 py-6 dark:bg-[#0D100E]">
      <div className="px-2">
        <Brand onClick={() => onSelectTab('converter')} />
      </div>

      <nav aria-label="Navegação principal" className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm transition-colors cursor-pointer ${focusRing} ${
                active
                  ? 'bg-[var(--surface-3)] text-strong font-semibold shadow-[inset_2px_0_0_var(--accent-text)]'
                  : 'text-muted font-medium hover:bg-[var(--surface-2)] hover:text-[var(--text-strong)]'
              }`}
            >
              <NavIcon id={item.id} className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
              {item.id === 'converter' && isConverting && (
                <span
                  className="ml-auto h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]"
                  title="Conversão em andamento"
                />
              )}
              {item.badge !== undefined && (
                <span className="text-muted ml-auto rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-mono text-xs">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col gap-3">
        {mascot}
        <p
          className="text-muted flex items-center gap-2 px-2 text-xs"
          title={
            isLocalOnly
              ? 'Seus arquivos são processados apenas no seu navegador e nunca saem do dispositivo.'
              : 'Modo híbrido: quando necessário, o vídeo é enviado com segurança ao servidor de conversão e apagado logo após o processamento.'
          }
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          {isLocalOnly ? 'Processamento 100% local' : 'Nada fica guardado no servidor'}
        </p>
      </div>
    </aside>
  )
}

interface DesktopTopBarProps extends ThemeLogoutProps {
  activeTab: ActiveTab
  conversionState: ConversionState
}

const TAB_TITLES: Record<ActiveTab, string> = {
  converter: 'Converter',
  historico: 'Histórico',
  configuracoes: 'Configurações',
}

export const DesktopTopBar: React.FC<DesktopTopBarProps> = ({
  activeTab,
  conversionState,
  ...rest
}) => (
  <div className="hidden lg:flex items-center justify-between gap-4 pb-8">
    {activeTab === 'converter' ? (
      <ConversionSteps state={conversionState} />
    ) : (
      <span className="text-muted text-sm font-medium">{TAB_TITLES[activeTab]}</span>
    )}
    <ThemeAndLogout {...rest} />
  </div>
)

/* ------------------------------- Mobile ------------------------------- */

interface MobileHeaderProps extends ThemeLogoutProps {
  onSelectTab: (tab: ActiveTab) => void
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onSelectTab,
  ...rest
}) => (
  <header className="lg:hidden flex items-center justify-between gap-3 px-1 pt-4 pb-5">
    <Brand onClick={() => onSelectTab('converter')} />
    <ThemeAndLogout {...rest} />
  </header>
)

interface MobileTabBarProps {
  activeTab: ActiveTab
  onSelectTab: (tab: ActiveTab) => void
  historyCount: number
  isConverting: boolean
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  activeTab,
  onSelectTab,
  historyCount,
  isConverting,
}) => {
  const navItems = buildNavItems(historyCount)
  return (
    <nav
      aria-label="Navegação móvel"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-[var(--border)] bg-[var(--surface)] px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:bg-[#0D100E]"
    >
      {navItems.map((item) => {
        const active = activeTab === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl text-xs transition-colors cursor-pointer ${focusRing} ${
              active ? 'text-accent font-semibold' : 'text-muted font-medium'
            }`}
          >
            <span className="relative">
              <NavIcon id={item.id} />
              {item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-3 min-w-5 rounded-full bg-[var(--accent)] px-1.5 text-center font-mono text-[11px] font-bold leading-5 text-[#0A0C0B]">
                  {item.badge}
                </span>
              )}
              {item.id === 'converter' && isConverting && (
                <span className="absolute -top-1 -right-2 h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
              )}
            </span>
            <span>{item.label === 'Configurações' ? 'Ajustes' : item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
