import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Minus,
  Music2,
  Plus,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import { useToastStore } from '../store/useToastStore'

interface Book {
  id: number
  title: string
  author: string
  status: string
  progress: number
}

interface ReadingNote {
  path: string
  title: string
  book: string
  relative: string
  created: string
}

const BOOK_STATUSES = ['planned', 'reading', 'finished', 'dropped']

const LINK_CARDS = [
  {
    key: 'music',
    icon: Music2,
    href: 'https://music.163.com',
    labelKey: 'leisure.music.open',
    launchApp: 'NeteaseMusic', // local NetEase Cloud Music client
    accent: 'bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-300',
  },
  {
    key: 'video',
    icon: Video,
    href: 'https://www.bilibili.com',
    labelKey: 'leisure.video.bilibili',
    accent: 'bg-sky-50 text-sky-500 dark:bg-sky-950/40 dark:text-sky-300',
    secondary: { labelKey: 'leisure.video.youtube', href: 'https://www.youtube.com' },
  },
  {
    key: 'english',
    icon: GraduationCap,
    href: 'https://www.episoden.com',
    labelKey: 'leisure.english.open',
    accent: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
]

export default function LeisurePage() {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const { data: books } = useQuery({
    queryKey: ['leisure', 'books'],
    queryFn: () => api<Book[]>('/api/leisure/books'),
  })
  const { data: notes } = useQuery({
    queryKey: ['leisure', 'notes'],
    queryFn: () => api<ReadingNote[]>('/api/leisure/notes'),
  })

  // add book form
  const [bTitle, setBTitle] = useState('')
  const [bAuthor, setBAuthor] = useState('')
  const [bStatus, setBStatus] = useState('planned')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  // note modal
  const [noteOpen, setNoteOpen] = useState(false)
  const [nTitle, setNTitle] = useState('')
  const [nContent, setNContent] = useState('')
  const [nBook, setNBook] = useState('')
  const [saving, setSaving] = useState(false)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['leisure'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['timeline'] })
  }

  const addBook = useMutation({
    mutationFn: () =>
      api('/api/leisure/books', {
        method: 'POST',
        body: JSON.stringify({ title: bTitle.trim(), author: bAuthor.trim(), status: bStatus }),
      }),
    onSuccess: () => {
      setBTitle('')
      setBAuthor('')
      setBStatus('planned')
      invalidate()
    },
    onError: (e) => toast(e instanceof Error ? e.message : String(e)),
  })

  const patchBook = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Book> }) =>
      api(`/api/leisure/books/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: invalidate,
  })

  const deleteBook = useMutation({
    mutationFn: (id: number) => api(`/api/leisure/books/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setConfirmDelete(null)
      invalidate()
    },
  })

  const openMutation = useMutation({
    mutationFn: (path: string) =>
      api('/api/system/open-file', {
        method: 'POST',
        body: JSON.stringify({ path, app: 'Obsidian' }),
      }),
    onSuccess: () => toast(t('search.openedInObsidian')),
    onError: (e) => toast(e instanceof Error ? e.message : String(e)),
  })

  const createNote = async () => {
    if (!nTitle.trim() || saving) return
    setSaving(true)
    try {
      await api('/api/leisure/notes', {
        method: 'POST',
        body: JSON.stringify({ title: nTitle.trim(), content: nContent, book: nBook }),
      })
      setNTitle('')
      setNContent('')
      setNBook('')
      setNoteOpen(false)
      invalidate()
    } finally {
      setSaving(false)
    }
  }

  const launchApp = useMutation({
    mutationFn: (app: string) =>
      api('/api/system/launch-app', { method: 'POST', body: JSON.stringify({ app }) }),
    onError: (e) => toast(e instanceof Error ? e.message : String(e)),
  })

  const field =
    'rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-border dark:bg-surface'

  const linkCard = (c: (typeof LINK_CARDS)[number]) => {
    const Icon = c.icon
    return (
      <div
        key={c.key}
        className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-surface p-4 shadow-card dark:border-border dark:bg-surface"
      >
        <div className="flex items-start gap-3">
          <span className={`rounded-md p-2 ${c.accent}`}>
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold">{t(`leisure.${c.key}.title`)}</div>
            <div className="mt-0.5 truncate text-[11.5px] text-foreground/45" data-tip={t(`leisure.${c.key}.hint`)}>
              {t(`leisure.${c.key}.hint`)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {c.launchApp ? (
            <button
              type="button"
              onClick={() => launchApp.mutate(c.launchApp!)}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-accent hover:text-accent dark:border-border"
            >
              <ExternalLink size={11} /> {t(c.labelKey)}
            </button>
          ) : (
            <a
              href={c.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-accent hover:text-accent dark:border-border"
            >
              <ExternalLink size={11} /> {t(c.labelKey)}
            </a>
          )}
          {c.secondary && (
            <a
              href={c.secondary.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-accent hover:text-accent dark:border-border"
            >
              <ExternalLink size={11} /> {t(c.secondary.labelKey)}
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">{t('leisure.title')}</h1>
      <p className="mt-0.5 text-[13px] text-foreground/55 dark:text-foreground/55">
        {t('leisure.subtitle')}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* reading module */}
        <section className="rounded-lg border border-border bg-surface shadow-card dark:border-border dark:bg-surface lg:col-span-2">
          <header className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5 dark:border-border">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold">
              <BookOpen size={14} className="text-accent" />
              {t('leisure.reading.title')}
            </h2>
            <span className="text-[11px] text-foreground/45" data-tip={t('leisure.reading.hint')}>
              {t('leisure.reading.hint')}
            </span>
          </header>

          {/* add book */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-100 px-4 py-2.5 dark:border-border">
            <input
              value={bTitle}
              onChange={(e) => setBTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && bTitle.trim()) addBook.mutate()
              }}
              placeholder={t('leisure.reading.titlePlaceholder')}
              className={`w-44 ${field}`}
            />
            <input
              value={bAuthor}
              onChange={(e) => setBAuthor(e.target.value)}
              placeholder={t('leisure.reading.authorPlaceholder')}
              className={`w-32 ${field}`}
            />
            <select
              value={bStatus}
              onChange={(e) => setBStatus(e.target.value)}
              className={`${field} text-[12.5px]`}
            >
              {BOOK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`leisure.reading.statuses.${s}`)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!bTitle.trim()}
              onClick={() => addBook.mutate()}
              className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              <Plus size={12} /> {t('leisure.reading.addBook')}
            </button>
          </div>

          {/* book list */}
          <div className="divide-y divide-border-subtle dark:divide-border-subtle">
            {(books ?? []).length === 0 && (
              <p className="px-4 py-8 text-center text-[12.5px] text-foreground/45">
                {t('leisure.reading.empty')}
              </p>
            )}
            {(books ?? []).map((book) => (
              <div key={book.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <div className="min-w-0 flex-1 basis-40">
                  <div data-tip={book.title} className="truncate font-serif text-[14px] font-semibold">
                    {book.title}
                  </div>
                  {book.author && (
                    <div className="truncate text-[11px] text-foreground/45">{book.author}</div>
                  )}
                </div>
                <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-hover)" strokeWidth="3.5" />
                    <circle
                      cx="18" cy="18" r="15.5" fill="none" stroke="var(--accent)" strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 15.5}`}
                      strokeDashoffset={`${2 * Math.PI * 15.5 * (1 - book.progress / 100)}`}
                    />
                  </svg>
                  <span className="absolute font-mono text-[8.5px] text-foreground/70">
                    {book.progress}%
                  </span>
                </span>
                <select
                  value={book.status}
                  onChange={(e) => patchBook.mutate({ id: book.id, data: { status: e.target.value } })}
                  className="rounded-md border border-border bg-surface px-1.5 py-1 text-[11.5px] outline-none dark:border-border dark:bg-surface"
                >
                  {BOOK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`leisure.reading.statuses.${s}`)}
                    </option>
                  ))}
                </select>
                <div
                  className="flex w-40 items-center gap-1.5"
                  data-tip={t('leisure.reading.quickAdjust')}
                >
                  <button
                    type="button"
                    onClick={() =>
                      patchBook.mutate({
                        id: book.id,
                        data: { progress: Math.max(0, book.progress - 5) },
                      })
                    }
                    className="rounded border border-border p-0.5 text-foreground/45 transition-colors hover:border-accent hover:text-accent dark:border-border"
                  >
                    <Minus size={11} />
                  </button>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-hover dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${book.progress}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      patchBook.mutate({
                        id: book.id,
                        data: { progress: Math.min(100, book.progress + 5) },
                      })
                    }
                    className="rounded border border-border p-0.5 text-foreground/45 transition-colors hover:border-accent hover:text-accent dark:border-border"
                  >
                    <Plus size={11} />
                  </button>

                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmDelete === book.id) {
                      deleteBook.mutate(book.id)
                    } else {
                      setConfirmDelete(book.id)
                      setTimeout(() => setConfirmDelete(null), 2500)
                    }
                  }}
                  className={`rounded px-1.5 py-1 text-[11px] transition-colors ${
                    confirmDelete === book.id
                      ? 'bg-red-500 text-white'
                      : 'text-foreground/45 hover:text-red-500'
                  }`}
                  data-tip={t('leisure.reading.deleteBook')}
                >
                  {confirmDelete === book.id ? (
                    t('leisure.reading.confirmDelete')
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* reading notes */}
          <div className="border-t border-neutral-100 dark:border-border">
            <div className="flex items-center justify-between px-4 pt-3">
              <h3 className="text-[12px] font-semibold text-foreground/55 dark:text-foreground/55">
                {t('leisure.reading.notes')}
              </h3>
              <button
                type="button"
                onClick={() => setNoteOpen(true)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-accent transition-colors hover:bg-accent-soft"
              >
                <Plus size={12} /> {t('leisure.reading.newNote')}
              </button>
            </div>
            <div className="px-4 pb-3">
              {(notes ?? []).length === 0 && (
                <p className="py-4 text-center text-[12px] text-foreground/45">
                  {t('leisure.reading.notesEmpty')}
                </p>
              )}
              {(notes ?? []).map((note) => (
                <div key={note.path} className="flex items-center gap-2 py-1.5">
                  <FileText size={13} className="shrink-0 text-foreground/45" />
                  <div className="min-w-0 flex-1">
                    <span data-tip={note.title} className="truncate text-[12.5px]">
                      {note.title}
                    </span>
                    <span className="ml-1.5 text-[10.5px] text-foreground/45">
                      {note.book && `《${note.book}》`}
                      {note.created && ` · ${note.created}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openMutation.mutate(note.path)}
                    className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[11px] transition-colors hover:border-accent hover:text-accent dark:border-border"
                    data-tip={t('leisure.reading.open')}
                  >
                    <ExternalLink size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* link modules */}
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {LINK_CARDS.map(linkCard)}
        </div>
      </div>

      {/* new note modal */}
      {noteOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setNoteOpen(false)
          }}
        >
          <div className="w-[440px] max-w-[92vw] rounded-xl border border-border bg-surface p-4 shadow-2xl dark:border-border dark:bg-surface">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">{t('leisure.reading.newNote')}</h2>
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                className="rounded p-1 text-foreground/45 hover:bg-surface-hover dark:hover:bg-neutral-800"
              >
                <X size={15} />
              </button>
            </div>
            <input
              autoFocus
              value={nTitle}
              onChange={(e) => setNTitle(e.target.value)}
              placeholder={t('leisure.reading.noteTitlePlaceholder')}
              className={`mt-3 w-full ${field}`}
            />
            <select
              value={nBook}
              onChange={(e) => setNBook(e.target.value)}
              className={`mt-2 w-full ${field}`}
            >
              <option value="">{t('leisure.reading.noteBookPlaceholder')}</option>
              {(books ?? []).map((b) => (
                <option key={b.id} value={b.title}>
                  {b.title}
                </option>
              ))}
            </select>
            <textarea
              value={nContent}
              onChange={(e) => setNContent(e.target.value)}
              rows={4}
              placeholder={t('leisure.reading.noteContentPlaceholder')}
              className={`mt-2 w-full resize-y ${field}`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                className="rounded-md border border-border px-3 py-1.5 text-[13px] transition-colors hover:bg-surface-hover dark:border-border dark:hover:bg-neutral-800"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void createNote()}
                disabled={!nTitle.trim() || saving}
                className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : t('leisure.reading.createNote')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
