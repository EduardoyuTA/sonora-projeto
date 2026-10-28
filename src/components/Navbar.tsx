import React from 'react'
import {
  History,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react'
import type { ActiveTab, AuthUser, ProcessingMode } from '../types/sonora'

interface NavbarProps {
  activeTab: ActiveTab
  onSelectTab: (tab: ActiveTab) => void
  historyCount: number
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  isConverting: boolean
  user?: AuthUser | null
  onLogout?: () => void
  processingMode?: ProcessingMode
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  historyCount,
  theme,
  onToggleTheme,
  isConverting,
  user,
  onLogout,
  processingMode = 'browser-only',
}) => {
  const isDark = theme === 'dark'
  const isLocalOnly = processingMode === 'browser-only'

  const navItems: {
    id: ActiveTab
    label: string
    icon: React.ReactNode
    badge?: number
  }[] = [
    {
      id: 'converter',
      label: 'Converter',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'historico',
      label: 'Histórico',
      icon: <History className="w-4 h-4" />,
      badge: historyCount > 0 ? historyCount : undefined,
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: <Settings className="w-4 h-4" />,
    },
  ]

  return (
    <>
      <header
        className={`sticky top-0 z-40 backdrop-blur-md transition-colors border-b ${
          isDark
            ? 'bg-[#0C0D0E]/85 border-[#24282E] text-[#F3F4F6]'
            : 'bg-[#F9FAFB]/85 border-[#E5E7EB] text-[#111315]'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => onSelectTab('converter')}
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] rounded-xl py-1 pr-2 cursor-pointer"
            aria-label="SONORA - Ir para a tela de conversão"
          >
            <div
              className={`w-10 h-10 rounded-xl overflow-hidden border-2 bg-white transition-transform group-hover:scale-105 ${
                isDark ? 'border-[#BCEE45]/80' : 'border-[#111315]'
              }`}
            >
              <img
                src="/mascote.png"
                alt=""
                className="h-full w-full object-cover object-[50%_20%]"
              />
            </div>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-base leading-none">
                  SONORA
                </span>
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md font-semibold ${
                    isDark
                      ? 'bg-[#1F242B] text-[#BCEE45] border border-[#2D333B]'
                      : 'bg-[#ECFCCB] text-[#3F6212] border border-[#D9F99D]'
                  }`}
                >
                  Studio
                </span>
              </div>
              <span
                className={`text-[11px] leading-tight mt-0.5 ${
                  isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
                }`}
              >
                Vídeo para Áudio
              </span>
            </div>
          </button>

          {/* Desktop Navigation Pills */}
          <nav
            aria-label="Navegação principal"
            className={`hidden md:flex items-center p-1 rounded-xl border ${
              isDark
                ? 'bg-[#15171A] border-[#24282E]'
                : 'bg-[#F1F3F5] border-[#E5E7EB]'
            }`}
          >
            {navItems.map((item) => {
              const active = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
                    active
                      ? isDark
                        ? 'bg-[#24282E] text-white shadow-xs'
                        : 'bg-white text-[#111315] shadow-xs'
                      : isDark
                        ? 'text-[#9CA3AF] hover:text-white'
                        : 'text-[#525866] hover:text-[#111315]'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.id === 'converter' && isConverting && (
                    <span
                      className="w-2 h-2 rounded-full bg-[#A3E635] animate-pulse"
                      title="Conversão em andamento"
                    />
                  )}
                  {item.badge !== undefined && (
                    <span
                      className={`text-xs font-mono px-1.5 py-0.2 rounded-full ${
                        active
                          ? 'bg-[#BCEE45] text-[#111315] font-semibold'
                          : isDark
                            ? 'bg-[#24282E] text-[#9CA3AF]'
                            : 'bg-[#E5E7EB] text-[#525866]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Right Actions: Privacy Indicator, Theme Toggle & Logout */}
          <div className="flex items-center gap-2">
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                isDark
                  ? 'bg-[#15171A] border-[#24282E] text-[#9CA3AF]'
                  : 'bg-white border-[#E5E7EB] text-[#525866]'
              }`}
              title={
                isLocalOnly
                  ? 'Seus arquivos são processados apenas no seu navegador e nunca saem do dispositivo.'
                  : 'Modo híbrido: quando necessário, o vídeo é enviado com segurança ao nosso servidor de conversão e apagado logo após o processamento. Altere em Configurações.'
              }
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#4D7C0F] dark:text-[#BCEE45]" />
              <span>{isLocalOnly ? 'Processamento 100% local' : 'Processamento seguro'}</span>
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
                isDark
                  ? 'bg-[#15171A] border-[#24282E] text-[#F3F4F6] hover:bg-[#1F2227]'
                  : 'bg-white border-[#E5E7EB] text-[#111315] hover:bg-[#F3F4F6]'
              }`}
              aria-label={
                isDark ? 'Ativar tema claro' : 'Ativar tema escuro'
              }
              title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[#BCEE45]" />
              ) : (
                <Moon className="w-4 h-4 text-[#525866]" />
              )}
            </button>

            {user && onLogout && (
              <span
                className={`hidden lg:inline max-w-[160px] truncate text-xs font-medium ${
                  isDark ? 'text-[#9CA3AF]' : 'text-[#525866]'
                }`}
                title={user.email}
              >
                {user.name}
              </span>
            )}

            {user && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
                  isDark
                    ? 'bg-[#15171A] border-[#24282E] text-[#9CA3AF] hover:text-white hover:bg-[#1F2227]'
                    : 'bg-white border-[#E5E7EB] text-[#525866] hover:text-[#111315] hover:bg-[#F3F4F6]'
                }`}
                title={`Conectado como ${user.email} — Clique para sair`}
                aria-label="Sair da conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Navegação móvel"
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-lg px-3 py-1.5 flex items-center justify-around ${
          isDark
            ? 'bg-[#0C0D0E]/95 border-[#24282E] text-[#F3F4F6]'
            : 'bg-white/95 border-[#E5E7EB] text-[#111315]'
        }`}
      >
        {navItems.map((item) => {
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-xl text-xs font-medium transition-colors relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A3E635] ${
                active
                  ? isDark
                    ? 'text-[#BCEE45]'
                    : 'text-[#111315] font-semibold'
                  : isDark
                    ? 'text-[#9CA3AF]'
                    : 'text-[#525866]'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <div
                className={`p-1.5 rounded-lg mb-0.5 ${
                  active
                    ? isDark
                      ? 'bg-[#BCEE45]/15 text-[#BCEE45]'
                      : 'bg-[#BCEE45] text-[#111315]'
                    : ''
                }`}
              >
                {item.icon}
              </div>
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="absolute top-1 right-3 bg-[#BCEE45] text-[#111315] text-[10px] font-mono font-bold px-1.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </>
  )
}
