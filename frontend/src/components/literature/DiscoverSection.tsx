import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Download, Loader2, Search, Sparkles } from 'lucide-react'
import { api } from '../../api/client'
import { useToastStore } from '../../store/useToastStore'

interface Hit {
  title: string
  authors: string
  year: string
  journal: string
  doi: string
  url: string
  source: string
  reason?: string
}

export default function DiscoverSection() {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [hits, setHits] = useState<Hit[] | null>(null)
  const [aiRanked, setAiRanked] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)

  const discover = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setHits(null)
    try {
      const r = await api<{ results: Hit[]; ai_ranked: boolean }>('/api/ai/discover', {
        method: 'POST',
        body: JSON.stringify({ query: query.trim() }),
      })
      setHits(r.results)
      setAiRanked(r.ai_ranked)
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const importHit = async (hit: Hit) => {
    setImporting(hit.doi || hit.title)
    try {
      const r = await api<{ created: boolean }>('/api/papers/from-discovery', {
        method: 'POST',
        body: JSON.stringify({
          title: hit.title,
          authors: hit.authors,
          year: hit.year,
          journal: hit.journal,
          doi: hit.doi,
          url: hit.url,
        }),
      })
      toast(r.created ? t('literature.importedOne') : t('quickCreate.duplicated'))
      void queryClient.invalidateQueries({ queryKey: ['papers'] })
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setImporting(null)
    }
  }

  const field =
    'rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950'

  return (
    <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] font-medium text-neutral-600 transition-colors hover:text-accent dark:text-neutral-300"
      >
        <Sparkles size={14} className="text-accent" />
        {t('literature.discover.title')}
        <span className="ml-auto text-neutral-400">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-neutral-100 p-3 dark:border-neutral-800">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void discover()
              }}
              placeholder={t('literature.discover.placeholder')}
              className={`flex-1 ${field}`}
            />
            <button
              type="button"
              onClick={() => void discover()}
              disabled={!query.trim() || loading}
              className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              {t('literature.discover.search')}
            </button>
          </div>

          {aiRanked && (
            <p className="text-[11px] text-neutral-400">{t('literature.discover.aiRanked')}</p>
          )}

          {hits && hits.length === 0 && (
            <p className="py-4 text-center text-[12px] text-neutral-400">
              {t('literature.discover.empty')}
            </p>
          )}

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {hits?.map((hit) => (
              <div key={hit.doi || hit.title} className="flex items-center gap-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <a
                    href={hit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-[12.5px] font-medium hover:text-accent"
                    data-tip={hit.title}
                  >
                    {hit.title}
                  </a>
                  <div
                    className="truncate text-[10.5px] text-neutral-400"
                    data-tip={[hit.authors, hit.year, hit.journal, hit.source].filter(Boolean).join(' · ')}
                  >
                    {[hit.authors, hit.year, hit.journal].filter(Boolean).join(' · ')}
                    {hit.reason && (
                      <span className="text-accent"> 💡 {hit.reason}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void importHit(hit)}
                  disabled={importing === (hit.doi || hit.title)}
                  className="flex shrink-0 items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
                >
                  {importing === (hit.doi || hit.title) ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Download size={11} />
                  )}
                  {t('literature.importOne')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
