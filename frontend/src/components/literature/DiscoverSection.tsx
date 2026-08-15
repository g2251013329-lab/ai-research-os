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
  if?: number | null
  zone?: number | null
  jcr?: string | null
  cas?: string | null
  cas_top?: string | null
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
  const [minZone, setMinZone] = useState(1)
  const [zoneRelaxed, setZoneRelaxed] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)

  const discover = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setHits(null)
    try {
      const r = await api<{
        results: Hit[]
        ai_ranked: boolean
        zone_filter: boolean
        zone_relaxed: boolean
      }>('/api/ai/discover', {
        method: 'POST',
        body: JSON.stringify({ query: query.trim(), min_zone: minZone }),
      })
      setHits(r.results)
      setAiRanked(r.ai_ranked)
      setZoneRelaxed(r.zone_relaxed)
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
    'rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-border dark:bg-surface'

  return (
    <div className="rounded-lg border border-border bg-surface dark:border-border dark:bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] font-medium text-foreground/65 transition-colors hover:text-accent dark:text-foreground/75"
      >
        <Sparkles size={14} className="text-accent" />
        {t('literature.discover.title')}
        <span className="ml-auto text-foreground/45">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-neutral-100 p-3 dark:border-border">
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
              className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              {t('literature.discover.search')}
            </button>
            <a
              href={`https://scholar.google.com/scholar?q=${encodeURIComponent(query.trim() || '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex shrink-0 items-center gap-1 rounded-md border border-border px-3 py-1.5 text-[12.5px] text-foreground/65 transition-colors hover:border-accent hover:text-accent dark:border-border dark:text-foreground/75"
            >
              {t('literature.discover.scholar')} ↗
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMinZone((v) => (v > 0 ? 0 : 1))
                void discover()
              }}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                minZone > 0
                  ? 'border-accent bg-accent-soft font-medium text-accent'
                  : 'border-border text-foreground/55 hover:border-accent hover:text-accent dark:border-border dark:text-foreground/55'
              }`}
            >
              {t('literature.discover.zoneOnly')}
            </button>
            {zoneRelaxed && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400">
                {t('literature.discover.zoneRelaxed')}
              </span>
            )}
          </div>

          {aiRanked && (
            <p className="text-[11px] text-foreground/45">{t('literature.discover.aiRanked')}</p>
          )}

          {hits && hits.length === 0 && (
            <p className="py-4 text-center text-[12px] text-foreground/45">
              {t('literature.discover.empty')}
            </p>
          )}

          <div className="divide-y divide-border-subtle dark:divide-border-subtle">
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
                    className="truncate text-[10.5px] text-foreground/45"
                    data-tip={[
                      hit.authors,
                      hit.year,
                      hit.journal,
                      hit.source,
                      hit.zone != null ? `中科院${hit.zone}区` : '',
                      hit.if != null ? `IF ${hit.if}` : '',
                      hit.jcr ?? '',
                      hit.reason ? `💡 ${hit.reason}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  >
                    {[hit.authors, hit.year, hit.journal].filter(Boolean).join(' · ')}
                    {hit.zone != null && (
                      <span
                        className={`ml-1 rounded px-1 py-px text-[10px] ${
                          hit.zone === 1
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-surface-hover text-foreground/55 dark:bg-neutral-800 dark:text-foreground/55'
                        }`}
                      >
                        中科院{hit.zone}区{hit.cas_top ? '·Top' : ''}
                      </span>
                    )}
                    {hit.if != null && (
                      <span className="ml-1 rounded bg-accent-soft px-1 py-px text-[10px] text-accent">
                        IF {hit.if}
                      </span>
                    )}
                    {hit.jcr && (
                      <span className="ml-1 rounded bg-surface-hover px-1 py-px text-[10px] text-foreground/55 dark:bg-neutral-800 dark:text-foreground/55">
                        {hit.jcr}
                      </span>
                    )}
                    {hit.zone == null && hit.journal && (
                      <span className="ml-1 text-[10px] text-foreground/45">
                        {t('literature.discover.zoneUnknown')}
                      </span>
                    )}
                    {hit.reason && (
                      <span className="text-accent"> 💡 {hit.reason}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void importHit(hit)}
                  disabled={importing === (hit.doi || hit.title)}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
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
