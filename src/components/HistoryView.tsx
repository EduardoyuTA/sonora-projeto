import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Download,
  FileAudio,
  Pause,
  Play,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import type { AudioFormat, HistoryItem } from '../types/sonora'
import { formatBytes, formatDuration } from '../utils/formatters'
import { WaveformPlayer } from './WaveformPlayer'

interface HistoryViewProps {
  items: HistoryItem[]
  onRedownload: (item: HistoryItem) => Promise<void>
  onGetPlayableUrl: (item: HistoryItem) => Promise<string | null>
  onRemoveItem: (id: string) => Promise<void>
  onClearAll: () => Promise<void>
  onGoToConverter: () => void
  onPlayStateChange?: (isPlaying: boolean) => void
}

type SortMode = 'recentes' | 'antigos' | 'maiores' | 'nome'

const UNDO_WINDOW_MS = 6000

const SORTERS: Record<SortMode, (a: HistoryItem, b: HistoryItem) => number> = {
  recentes: (a, b) => b.createdAt.localeCompare(a.createdAt),
  antigos: (a, b) => a.createdAt.localeCompare(b.createdAt),
  maiores: (a, b) => b.size - a.size,
  nome: (a, b) => a.outputFileName.localeCompare(b.outputFileName, 'pt-BR'),
}

const formatDate = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  items,
  onRedownload,
  onGetPlayableUrl,
  onRemoveItem,
  onClearAll,
  onGoToConverter,
  onPlayStateChange,
}) => {
  const [query, setQuery] = useState('')
  const [formatFilter, setFormatFilter] = useState<AudioFormat | 'todos'>('todos')
  const [sortMode, setSortMode] = useState<SortMode>('recentes')
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [openItem, setOpenItem] = useState<{ id: string; url: string } | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<string[]>([])

  const removalTimersRef = useRef(new Map<string, number>())
  const openUrlRef = useRef<string | null>(null)
  const removeItemRef = useRef(onRemoveItem)

  useEffect(() => {
    removeItemRef.current = onRemoveItem
    openUrlRef.current = openItem?.url ?? null
  })

  // Ao sair da tela, conclui as exclusões pendentes e libera o áudio aberto
  useEffect(() => {
    const timers = removalTimersRef.current
    return () => {
      timers.forEach((timer, id) => {
        window.clearTimeout(timer)
        void removeItemRef.current(id)
      })
      timers.clear()
      if (openUrlRef.current) URL.revokeObjectURL(openUrlRef.current)
    }
  }, [])

  const closePlayer = () => {
    if (openItem) URL.revokeObjectURL(openItem.url)
    setOpenItem(null)
  }

  const togglePlayer = async (item: HistoryItem) => {
    if (openItem?.id === item.id) {
      closePlayer()
      return
    }
    const url = await onGetPlayableUrl(item)
    if (!url) return
    if (openItem) URL.revokeObjectURL(openItem.url)
    setOpenItem({ id: item.id, url })
  }

  const scheduleRemoval = (id: string) => {
    if (openItem?.id === id) closePlayer()
    setPendingRemoval((list) => [...list, id])
    const timer = window.setTimeout(() => {
      removalTimersRef.current.delete(id)
      setPendingRemoval((list) => list.filter((itemId) => itemId !== id))
      void onRemoveItem(id)
    }, UNDO_WINDOW_MS)
    removalTimersRef.current.set(id, timer)
  }

  const undoRemoval = (id: string) => {
    window.clearTimeout(removalTimersRef.current.get(id))
    removalTimersRef.current.delete(id)
    setPendingRemoval((list) => list.filter((itemId) => itemId !== id))
  }

  const handleClearAll = async () => {
    setConfirmClearAll(false)
    closePlayer()
    removalTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    removalTimersRef.current.clear()
    setPendingRemoval([])
    await onClearAll()
  }

  const availableFormats = useMemo(
    () => Array.from(new Set(items.map((item) => item.format))),
    [items]
  )

  const visibleItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    return items
      .filter((item) => formatFilter === 'todos' || item.format === formatFilter)
      .filter(
        (item) =>
          !term ||
          item.outputFileName.toLocaleLowerCase('pt-BR').includes(term) ||
          item.originalFileName.toLocaleLowerCase('pt-BR').includes(term)
      )
      .sort(SORTERS[sortMode])
  }, [formatFilter, items, query, sortMode])

  const totals = useMemo(
    () => ({
      duration: items.reduce((sum, item) => sum + item.duration, 0),
      size: items.reduce((sum, item) => sum + item.size, 0),
    }),
    [items]
  )

  if (items.length === 0) {
    return (
      <section className="st-empty">
        <span className="icon-orb h-14 w-14">
          <FileAudio className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="text-strong text-xl font-semibold">
          Seus áudios vão aparecer aqui.
        </h1>
        <p className="text-muted max-w-md text-sm">
          Depois da primeira conversão, você pode ouvir e baixar de novo quando quiser.
        </p>
        <button
          type="button"
          onClick={onGoToConverter}
          className="btn-lime inline-flex min-h-12 items-center gap-2 rounded-xl px-6 font-semibold cursor-pointer"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Converter meu primeiro vídeo
        </button>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="st-page-head">
        <div>
          <h1 className="text-strong text-2xl font-semibold">Histórico</h1>
          <p className="text-muted mt-1 text-sm">Guardado só neste navegador.</p>
        </div>
        <dl className="st-stats">
          <div>
            <dt>Áudios</dt>
            <dd>{items.length}</dd>
          </div>
          <div>
            <dt>Duração</dt>
            <dd>{formatDuration(totals.duration)}</dd>
          </div>
          <div>
            <dt>Espaço</dt>
            <dd>{formatBytes(totals.size)}</dd>
          </div>
        </dl>
      </header>

      <div className="st-filters">
        <label className="st-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome"
            aria-label="Buscar no histórico"
          />
        </label>

        <div className="st-filter-chips" role="group" aria-label="Filtrar por formato">
          {(['todos', ...availableFormats] as const).map((format) => (
            <button
              key={format}
              type="button"
              className={`st-chip ${formatFilter === format ? 'is-active' : ''}`}
              aria-pressed={formatFilter === format}
              onClick={() => setFormatFilter(format)}
            >
              {format === 'todos' ? 'Todos' : format.toUpperCase()}
            </button>
          ))}
        </div>

        <select
          className="st-select"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
          aria-label="Ordenar o histórico"
        >
          <option value="recentes">Mais recentes</option>
          <option value="antigos">Mais antigos</option>
          <option value="maiores">Maiores</option>
          <option value="nome">Nome</option>
        </select>

        {confirmClearAll ? (
          <div className="flex items-center gap-2">
            <button type="button" className="st-danger" onClick={handleClearAll}>
              Apagar tudo
            </button>
            <button
              type="button"
              className="st-icon-btn"
              onClick={() => setConfirmClearAll(false)}
              aria-label="Cancelar"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="st-chip"
            onClick={() => setConfirmClearAll(true)}
          >
            <Trash2 aria-hidden="true" />
            Limpar
          </button>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <div className="st-empty st-empty--small">
          <p className="text-muted text-sm">Nenhum áudio encontrado com esses filtros.</p>
          <button
            type="button"
            className="st-chip"
            onClick={() => {
              setQuery('')
              setFormatFilter('todos')
            }}
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <ul className="app-stagger flex flex-col gap-2.5">
          {visibleItems.map((item) => {
            const isOpen = openItem?.id === item.id

            if (pendingRemoval.includes(item.id)) {
              return (
                <li key={item.id} className="st-history-item st-history-item--removed">
                  <span className="text-muted min-w-0 truncate text-sm">
                    {item.outputFileName} foi removido.
                  </span>
                  <button
                    type="button"
                    className="st-chip"
                    onClick={() => undoRemoval(item.id)}
                  >
                    <Undo2 aria-hidden="true" />
                    Desfazer
                  </button>
                </li>
              )
            }

            return (
              <li key={item.id} className={`st-history-item ${isOpen ? 'is-open' : ''}`}>
                <div className="st-history-item__row">
                  <button
                    type="button"
                    className="st-history-item__play"
                    disabled={!item.hasStoredBlob}
                    onClick={() => togglePlayer(item)}
                    aria-label={`${isOpen ? 'Fechar' : 'Ouvir'} ${item.outputFileName}`}
                    title={item.hasStoredBlob ? undefined : 'Sem cópia salva neste navegador'}
                  >
                    {isOpen ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-strong truncate text-sm font-semibold" title={item.outputFileName}>
                      {item.outputFileName}
                    </h2>
                    <p className="text-muted mt-0.5 truncate text-xs">
                      {item.format.toUpperCase()} · {formatDuration(item.duration)} ·{' '}
                      {formatBytes(item.size)} · {formatDate(item.createdAt)}
                    </p>
                  </div>

                  <div className="st-mini-wave" aria-hidden="true">
                    {item.peaks
                      .filter((_, index) => index % 3 === 0)
                      .map((peak, index) => (
                        <i key={index} style={{ height: `${Math.max(12, peak * 100)}%` }} />
                      ))}
                  </div>

                  {item.hasStoredBlob ? (
                    <button
                      type="button"
                      className="st-icon-btn"
                      onClick={() => onRedownload(item)}
                      aria-label={`Baixar ${item.outputFileName}`}
                      title="Baixar novamente"
                    >
                      <Download aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="st-icon-btn is-static" title="Apenas registro, sem cópia do áudio">
                      <AlertTriangle aria-hidden="true" />
                    </span>
                  )}
                  <button
                    type="button"
                    className="st-icon-btn st-icon-btn--danger"
                    onClick={() => scheduleRemoval(item.id)}
                    aria-label={`Remover ${item.outputFileName}`}
                    title="Remover"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>

                {isOpen && openItem && (
                  <div className="app-enter mt-3">
                    <WaveformPlayer
                      audioUrl={openItem.url}
                      fileName={item.outputFileName}
                      format={item.format}
                      qualityLabel={item.qualityLabel}
                      duration={item.duration}
                      peaks={item.peaks}
                      onPlayStateChange={onPlayStateChange}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
