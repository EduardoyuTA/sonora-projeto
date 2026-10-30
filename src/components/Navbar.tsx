import React from 'react'
import {
  ChevronRight,
  History,
  LogOut,
  MessageCircle,
  Moon,
  Music,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react'
import type { ActiveTab, AuthUser, ProcessingMode } from '../types/sonora'

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

const NavIcon: React.FC<{ id: ActiveTab; variant: 'sidebar' | 'tab' }> = ({
  id,
  variant,
}) => {
  const size = 'w-6 h-6'
  if (id === 'converter') {
    return variant === 'sidebar' ? (
      <Music className={size} strokeWidth={1.8} />
    ) : (
      <Sparkles className={size} strokeWidth={1.8} />
    )
  }
  if (id === 'historico') return <History className={size} strokeWidth={1.8} />
  return <Settings className={size} strokeWidth={1.8} />
}

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635]'

/* ----------------------------- Brand block ----------------------------- */

const Brand: React.FC<{ size: 'md' | 'lg'; onClick: () => void }> = ({
  size,
  onClick,
}) => {
  const avatar =
    size === 'lg' ? 'w-16 h-16 rounded-[20px]' : 'w-14 h-14 rounded-[18px]'
  const title = size === 'lg' ? 'text-2xl' : 'text-xl'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3.5 rounded-2xl text-left cursor-pointer ${focusRing}`}
      aria-label="SONORA - Ir para a tela de conversão"
    >
      <div
        className={`${avatar} shrink-0 overflow-hidden border-[3px] border-[#BCEE45] bg-white shadow-[0_0_24px_rgba(188,238,69,0.45)]`}
      >
        <img
          src="/mascote.png"
          alt=""
          className="h-full w-full object-cover object-[50%_30%] scale-[1.15]"
          draggable={false}
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-strong ${title} font-bold tracking-tight leading-none`}>
            SONORA
          </span>
          <span className="text-accent rounded-full border border-[#BCEE45]/40 bg-[#BCEE45]/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
            Studio
          </span>
        </div>
        <span className="text-muted mt-1.5 block text-[15px] leading-tight">
          Vídeo para Áudio
        </span>
      </div>
    </button>
  )
}

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
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onToggleTheme}
        className={`btn-glass h-12 w-12 rounded-full flex items-center justify-center cursor-pointer ${focusRing}`}
        aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
        title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      >
        {isDark ? (
          <Sun className="h-5 w-5 text-[#BCEE45]" />
        ) : (
          <Moon className="h-5 w-5 text-[#4D7C0F]" />
        )}
      </button>
      {user && onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className={`btn-glass h-12 w-12 rounded-full flex items-center justify-center cursor-pointer ${focusRing}`}
          title={
            user.provider === 'guest'
              ? 'Usando sem conta — Clique para sair'
              : `Conectado como ${user.email} — Clique para sair`
          }
          aria-label="Sair da conta"
        >
          <LogOut className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

/* ------------------------------ Desktop ------------------------------- */

interface SidebarProps {
  activeTab: ActiveTab
  onSelectTab: (tab: ActiveTab) => void
  historyCount: number
  isConverting: boolean
  onTalkToMascot: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  historyCount,
  isConverting,
  onTalkToMascot,
}) => {
  const navItems = buildNavItems(historyCount)
  return (
    <aside className="glass glass-rim glass-glow hidden lg:flex sticky top-5 h-[calc(100dvh-2.5rem)] w-[19rem] shrink-0 flex-col rounded-[30px] p-5">
      <div className="px-1 pt-3 pb-6">
        <Brand size="lg" onClick={() => onSelectTab('converter')} />
      </div>
      <div className="mx-1 mb-5 h-px bg-[var(--glass-hairline)]" />

      <nav aria-label="Navegação principal" className="flex flex-col gap-2">
        {navItems.map((item) => {
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex items-center gap-4 rounded-2xl px-5 py-3.5 text-base font-medium transition-colors cursor-pointer ${focusRing} ${
                active
                  ? 'glass-soft glass-rim text-strong bg-[#BCEE45]/10 shadow-[0_0_24px_rgba(188,238,69,0.18)]'
                  : 'text-muted hover:text-[var(--text-strong)] hover:bg-[var(--glass-bg-soft)]'
              }`}
            >
              <span className={active ? 'text-accent' : ''}>
                <NavIcon id={item.id} variant="sidebar" />
              </span>
              <span>{item.label}</span>
              {item.id === 'converter' && isConverting && (
                <span
                  className="ml-auto h-2 w-2 animate-pulse rounded-full bg-[#BCEE45]"
                  title="Conversão em andamento"
                />
              )}
              {item.badge !== undefined && (
                <span className="ml-auto rounded-full bg-[#BCEE45] px-2 py-0.5 font-mono text-xs font-bold text-[#111315]">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Space reserved for the capybara mascot, which floats here */}
      <div className="flex-1" />

      <button
        type="button"
        onClick={onTalkToMascot}
        className={`btn-glass flex items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-3.5 text-[15px] font-medium cursor-pointer ${focusRing}`}
      >
        <MessageCircle className="text-accent h-6 w-6 shrink-0" strokeWidth={2} />
        <span>Falar com a Capivara</span>
        <ChevronRight className="ml-auto h-5 w-5" />
      </button>
    </aside>
  )
}

interface DesktopTopBarProps extends ThemeLogoutProps {
  processingMode: ProcessingMode
}

export const DesktopTopBar: React.FC<DesktopTopBarProps> = ({
  processingMode,
  ...rest
}) => {
  const isLocalOnly = processingMode === 'browser-only'
  return (
    <div className="hidden lg:flex items-center justify-end gap-3 pb-4">
      <div
        className="glass-soft text-muted flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium"
        title={
          isLocalOnly
            ? 'Seus arquivos são processados apenas no seu navegador e nunca saem do dispositivo.'
            : 'Modo híbrido: quando necessário, o vídeo é enviado com segurança ao nosso servidor de conversão e apagado logo após o processamento. Altere em Configurações.'
        }
      >
        <ShieldCheck className="text-accent h-4 w-4" />
        <span>{isLocalOnly ? 'Processamento 100% local' : 'Processamento seguro'}</span>
      </div>
      {rest.user && (
        <span
          className="text-muted max-w-[180px] truncate text-sm font-medium"
          title={rest.user.email}
        >
          {rest.user.name}
        </span>
      )}
      <ThemeAndLogout {...rest} />
    </div>
  )
}

/* ------------------------------- Mobile ------------------------------- */

interface MobileHeaderProps extends ThemeLogoutProps {
  onSelectTab: (tab: ActiveTab) => void
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onSelectTab,
  ...rest
}) => (
  <header className="lg:hidden flex items-center justify-between gap-3 px-1 pt-4 pb-5">
    <Brand size="md" onClick={() => onSelectTab('converter')} />
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
      className="glass glass-rim glass-glow lg:hidden fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl items-stretch justify-around rounded-[32px] p-2"
    >
      {navItems.map((item) => {
        const active = activeTab === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[26px] py-2.5 text-[13px] font-medium transition-colors cursor-pointer ${focusRing} ${
              active ? 'glass-soft text-accent' : 'text-muted'
            }`}
          >
            <span className="relative">
              <NavIcon id={item.id} variant="tab" />
              {item.badge !== undefined && (
                <span className="absolute -top-2 -right-3 min-w-5 rounded-full bg-[#BCEE45] px-1.5 text-center font-mono text-[11px] font-bold leading-5 text-[#111315]">
                  {item.badge}
                </span>
              )}
              {item.id === 'converter' && isConverting && (
                <span className="absolute -top-1 -right-2 h-2 w-2 animate-pulse rounded-full bg-[#BCEE45]" />
              )}
            </span>
            <span>{item.label}</span>
            {active && (
              <span className="absolute bottom-1 h-1 w-6 rounded-full bg-[#BCEE45] shadow-[0_0_8px_#BCEE45]" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
