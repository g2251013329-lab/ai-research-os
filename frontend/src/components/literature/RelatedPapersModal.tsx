import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, GitBranch, Loader2, Plus, X } from 'lucide-react'
import { api } from '../../api/client'
import { useToastStore } from '../../store/useToastStore'

interface Recommendation {
  title: string
  authors: string
  year: string
  journal: string
  doi: string
  url: string
  abstract: string
  source: string
}

export default function RelatedPapersModal({
  paper,
  onClose,
}: {
  paper: { id: number; title: string }
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const { data, isFetching } = useQuery({
    queryKey: ['related', paper.id],
    queryFn: () =>
      api<{ recommendations: Recommendation[]; note: string }>(
        '/api/ai/paper-recommendations',
        { method: 'POST', body: JSON.stringify({ paper_id: paper.id }) },
      ),
  })

  const importMutation = useMutation({
    mutationFn: (r: Recommendation) =>
      api<{ created: boolean }>('/api/papers/from-discovery', {
        method: 'POST',
        body: JSON.stringify({
          title: r.title,
          authors: r.authors,
          year: r.year,
          journal: r.journal,
          doi: r.doi,
          abstract: r.abstract,
        }),
      }),
    onSuccess: (res) => {
      toast(
        res.created ? t('literature.related.imported') : t('literature.related.existed'),
      )
      void queryClient.invalidateQueries({ queryKey: ['papers'] })
    },
    onError: (e) => toast(e instanceof Error ? e.message : String(e)),
  })

  const recs = data?.recommendations ?? []

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[85vh] w-[560px] max-w-[92vw] flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[14px] font-semibold">
            <GitBranch size={14} className="text-accent" />
            {t('literature.related.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={15} />
          </button>
        </div>
        <p className="mt-1 truncate text-[11.5px] text-neutral-400" data-tip={paper.title}>
          {paper.title}
        </p>

        <div className="mt-3 flex-1 overflow-y-auto pr-1">
          {isFetching && !recs.length && (
            <div className="flex items-center justify-center gap-2 py-10 text-neutral-400">
              <Loader2 size={16} className="animate-spin" /> {t('ai.thinking')}
            </div>
          )}
          {!isFetching && recs.length === 0 && (
            <p className="py-10 text-center text-[12.5px] text-neutral-400">
              {data?.note || t('literature.related.empty')}
            </p>
          )}
          {recs.map((r, i) => (
            <div
              key={r.doi || r.title + i}
              className="mb-2 rounded-lg border border-neutral-100 p-3 dark:border-neutral-800"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div data-tip={r.title} className="text-[13px] font-medium leading-snug">
                    {r.title}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-neutral-400">
                    {[r.authors, r.year, r.journal].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={importMutation.isPending}
                  onClick={() => importMutation.mutate(r)}
                  className="flex shrink-0 items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
                  data-tip={t('literature.related.import')}
                >
                  {importMutation.isPending ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Plus size={11} />
                  )}
                  {t('literature.related.import')}
                </button>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-md border border-neutral-200 px-2 py-1 text-[11px] transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
                  >
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
              {r.abstract && (
                <p className="mt-1.5 line-clamp-3 text-[11.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {r.abstract}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
