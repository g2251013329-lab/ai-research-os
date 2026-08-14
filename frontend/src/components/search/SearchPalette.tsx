import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BookOpen,
  Coffee,
  FileText,
  FlaskConical,
  FolderKanban,
  GraduationCap,
  HelpCircle,
  Inbox,
  Lightbulb,
  Loader2,
  Search,
  StickyNote,
  X,
} from 'lucide-react'
import { api } from '../../api/client'
import { useToastStore } from '../../store/useToastStore'

export interface SearchResult {
  type: string
  id: string
  title: string
  subtitle: string
  url?: string
}

const TYPE_ORDER = [
  'literature',
  'project',
  'question',
  'hypothesis',
  'experiment',
  'note',
  'learning',
  'leisure',
  'inbox',
  'vault',
]

const TYPE_ICONS: Record<string, typeof FileText> = {
  literature: BookOpen,
  project: FolderKanban,
  question: HelpCircle,
  hypothesis: Lightbulb,
  experiment: FlaskConical,
  note: StickyNote,
  learning: GraduationCap,
  leisure: Coffee,
  inbox: Inbox,
  vault: FileText,
}

export default function SearchPalette({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const reqSeq = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setResults([])
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const seq = ++reqSeq.current
    const timer = setTimeout(async () => {
      const query = q.trim()
      if (!query) {
        setResults([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const r = await api<{ results: SearchResult[] }>(
          `/api/search?q=${encodeURIComponent(query)}`,
        )
        if (seq === reqSeq.current) {
          setResults(r.results)
          setActive(0)
        }
      } catch {
        if (seq === reqSeq.current) setResults([])
      } finally {
        if (seq === reqSeq.current) setLoading(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [q, open])

  const openResult = async (r: SearchResult) => {
    if (r.type === 'vault') {
      try {
        await api('/api/system/open-file', {
          method: 'POST',
          body: JSON.stringify({ path: r.id, app: 'Obsidian' }),
        })
        toast(t('search.openedInObsidian'))
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e))
      }
      onClose()
      return
    }
    if (r.url) {
      window.location.href = r.url
      onClose()
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((v) => Math.min(v + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((v) => Math.max(v - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const r = results[active]
      if (r) void openResult(r)
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: results.filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0)

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="mt-[14vh] flex h-fit w-[620px] max-w-[92vw] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center gap-2.5 border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <Search size={16} className="shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-neutral-400"
          />
          {loading && <Loader2 size={14} className="animate-spin text-neutral-400" />}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={15} />
          </button>
        </div>

        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-1.5">
          {!q.trim() && (
            <p className="px-3 py-6 text-center text-[12.5px] text-neutral-400">
              {t('search.empty')}
            </p>
          )}
          {q.trim() && !loading && results.length === 0 && (
            <p className="px-3 py-6 text-center text-[12.5px] text-neutral-400">
              {t('search.noResults')}
            </p>
          )}
          {grouped.map((g) => (
            <div key={g.type} className="mb-1">
              <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                {t(`search.types.${g.type}`)}
              </div>
              {g.items.map((r) => {
                const Icon = TYPE_ICONS[r.type] ?? FileText
                const idx = results.indexOf(r)
                return (
                  <button
                    key={r.id}
                    type="button"
                    data-active={idx === active}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => void openResult(r)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors ${
                      idx === active
                        ? 'bg-accent-soft'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <Icon
                      size={14}
                      className={`shrink-0 ${
                        idx === active ? 'text-accent' : 'text-neutral-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div data-tip={r.title} className="truncate text-[13px] font-medium">
                        {r.title}
                      </div>
                      <div data-tip={r.subtitle} className="truncate text-[11.5px] text-neutral-400">
                        {r.subtitle}
                      </div>
                    </div>
                    {idx === active && (
                      <span className="shrink-0 text-[11px] text-accent">
                        ↵ {t('search.openInObsidian')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
