import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  ExternalLink,
  FolderKanban,
  Library,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react'
import { api } from '../api/client'
import { useToastStore } from '../store/useToastStore'
import MyPapersList from '../components/literature/MyPapersList'

interface ZoteroItem {
  key: string
  title: string
  authors: string
  year: string
  journal: string
  doi: string
  url: string
  tags: string[]
  type: string
}

interface Project {
  id: number
  title: string
}

interface ImportResult {
  created: number
  skipped: number
}

export default function LiteraturePage() {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [collection, setCollection] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [projectId, setProjectId] = useState<number | ''>('')
  const [tab, setTab] = useState<'zotero' | 'mine'>('zotero')

  const { data: status } = useQuery({
    queryKey: ['zotero', 'status'],
    queryFn: () =>
      api<{
        configured: boolean
        db_exists: boolean
        locked: boolean
        api_available: boolean
        db_path: string
      }>('/api/zotero/status'),
  })

  const dbReady = status?.db_exists && !status?.locked
  const apiOk = status?.db_exists && status?.locked && status?.api_available
  const lockedNoApi = status?.db_exists && status?.locked && !status?.api_available
  const connected = dbReady || apiOk

  const { data: collections } = useQuery({
    queryKey: ['zotero', 'collections'],
    queryFn: () => api<{ id: number; name: string; parent: number | null }[]>('/api/zotero/collections'),
    enabled: status?.db_exists === true,
  })

  const { data: items, isFetching } = useQuery({
    queryKey: ['zotero', 'items', collection, q],
    queryFn: () =>
      api<ZoteroItem[]>(
        `/api/zotero/items?${collection ? `collection=${collection}&` : ''}q=${encodeURIComponent(q)}&limit=60`,
      ),
    enabled: status?.db_exists === true,
  })

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Project[]>('/api/projects'),
  })

  const importMutation = useMutation({
    mutationFn: () =>
      api<ImportResult>('/api/zotero/import', {
        method: 'POST',
        body: JSON.stringify({
          keys: [...selected],
          project_id: projectId || null,
        }),
      }),
    onSuccess: (r) => {
      toast(t('literature.imported', { created: r.created, skipped: r.skipped }))
      setSelected(new Set())
      void queryClient.invalidateQueries({ queryKey: ['papers'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e) => toast(e instanceof Error ? e.message : String(e)),
  })

  const openInReader = async (item: ZoteroItem) => {
    try {
      const atts = await api<{ path: string }[]>(
        `/api/zotero/items/${item.key}/attachments`,
      )
      if (atts.length === 0) {
        toast(t('literature.noAttachment'))
        return
      }
      await api('/api/system/open-file', {
        method: 'POST',
        body: JSON.stringify({ path: atts[0].path, app: '小绿鲸英文文献阅读器' }),
      })
      toast(t('literature.openedReader'))
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    }
  }

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const visibleItems = useMemo(() => items ?? [], [items])

  const field =
    'rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950'

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold">{t('literature.title')}</h1>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            {t('literature.subtitle')}
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] ${
            connected
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              : lockedNoApi
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
          }`}
        >
          <Sparkles size={11} />
          {dbReady
            ? t('literature.zoteroOk')
            : apiOk
              ? t('literature.zoteroApi')
              : lockedNoApi
                ? t('literature.zoteroLocked')
                : t('literature.zoteroMissing')}
        </span>
      </div>

      {lockedNoApi && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-[13px] leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {t('literature.zoteroLockedDesc')}
        </div>
      )}

      {!status?.db_exists && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-[13px] text-neutral-400">{t('literature.zoteroMissingDesc')}</p>
          <a
            href="/settings"
            className="mt-2 inline-block text-[13px] text-accent hover:underline"
          >
            {t('literature.goSettings')} →
          </a>
        </div>
      )}

      {/* tabs: Zotero library / my papers */}
      <div className="mt-4 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => setTab('zotero')}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] transition-colors ${
            tab === 'zotero'
              ? 'border-accent font-medium text-accent'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <Library size={13} />
          {t('literature.tabs.zotero')}
        </button>
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] transition-colors ${
            tab === 'mine'
              ? 'border-accent font-medium text-accent'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <BookOpen size={13} />
          {t('literature.tabs.mine')}
        </button>
      </div>

      {tab === 'mine' && (
        <div className="mt-4">
          <MyPapersList />
        </div>
      )}

      {connected && tab === 'zotero' && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[200px_1fr]">          {/* collections */}
          <aside className="rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => setCollection(null)}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors ${
                collection === null
                  ? 'bg-accent-soft font-medium text-accent'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              <FolderKanban size={13} />
              {t('literature.all')}
            </button>
            {(collections ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCollection(String(c.id))}
                className={`mt-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] transition-colors ${
                  collection === String(c.id)
                    ? 'bg-accent-soft font-medium text-accent'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                }`}
                data-tip={c.name}
              >
                <FolderKanban size={13} className="shrink-0" />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </aside>

          {/* items */}
          <div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('literature.searchPlaceholder')}
                  className={`w-full pl-8 ${field}`}
                />
              </div>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
                className={`w-52 ${field}`}
              >
                <option value="">{t('literature.noProject')}</option>
                {(projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={selected.size === 0 || importMutation.isPending}
                onClick={() => importMutation.mutate()}
                className="flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                {importMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <BookOpen size={13} />
                )}
                {t('literature.import', { n: selected.size })}
              </button>
            </div>

            {isFetching && <p className="mt-4 text-center text-[12px] text-neutral-400">…</p>}
            {!isFetching && visibleItems.length === 0 && (
              <p className="mt-8 rounded-lg border border-dashed border-neutral-300 py-12 text-center text-[12.5px] text-neutral-400 dark:border-neutral-700">
                {t('literature.empty')}
              </p>
            )}

            <div className="mt-3 divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
              {visibleItems.map((item) => (
                <div key={item.key} className="flex items-start gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(item.key)}
                    onChange={() => toggle(item.key)}
                    className="mt-1 h-3.5 w-3.5 accent-[var(--accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium" data-tip={item.title}>
                      {item.title}
                    </div>
                    <div className="mt-0.5 truncate text-[11.5px] text-neutral-400" data-tip={item.authors}>
                      {[item.authors, item.year, item.journal].filter(Boolean).join(' · ')}
                    </div>
                    {item.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-neutral-100 px-1.5 py-px text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void openInReader(item)}
                    className="flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[11.5px] text-neutral-500 transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
                    data-tip={t('literature.openReaderTip')}
                  >
                    <ExternalLink size={11} />
                    {t('literature.openReader')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
