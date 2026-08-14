import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, ExternalLink, Loader2, Plus, Trash2, X } from 'lucide-react'
import { api } from '../../api/client'
import type { RQ } from './QuestionsView'

export interface Paper {
  id: number
  title: string
  authors: string
  year: string
  journal: string
  doi: string
  url: string
  abstract: string
  notes: string
  status: string
  project_id: number | null
}

const PAPER_STATUSES = ['unread', 'reading', 'read']

export default function PapersView({ projectId }: { projectId: number }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    authors: '',
    year: '',
    journal: '',
    doi: '',
    url: '',
    abstract: '',
  })
  const [saving, setSaving] = useState(false)

  const { data: papers } = useQuery({
    queryKey: ['papers', projectId],
    queryFn: () => api<Paper[]>(`/api/papers?project_id=${projectId}`),
  })
  const { data: rqs } = useQuery({
    queryKey: ['questions', projectId],
    queryFn: () => api<RQ[]>(`/api/questions?project_id=${projectId}`),
  })
  const { data: links } = useQuery({
    queryKey: ['papers', 'links', projectId],
    queryFn: async () => {
      // fetch papers linked to each question of this project
      const result: Record<number, number[]> = {}
      for (const rq of rqs ?? []) {
        const linked = await api<Paper[]>(`/api/papers?question_id=${rq.id}`)
        result[rq.id] = linked.map((p) => p.id)
      }
      return result
    },
    enabled: (rqs ?? []).length > 0,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['papers'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api('/api/papers', {
        method: 'POST',
        body: JSON.stringify({ ...form, project_id: projectId }),
      }),
    onSuccess: () => {
      setForm({ title: '', authors: '', year: '', journal: '', doi: '', url: '', abstract: '' })
      setCreating(false)
      invalidate()
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/api/papers/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: invalidate,
  })

  const linkMutation = useMutation({
    mutationFn: ({ paperId, questionId, on }: { paperId: number; questionId: number; on: boolean }) =>
      on
        ? api(`/api/papers/${paperId}/questions`, { method: 'POST', body: JSON.stringify({ question_id: questionId }) })
        : api(`/api/papers/${paperId}/questions/${questionId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/api/papers/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const field =
    'rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950'

  const openUrl = (url: string) => {
    if (url) window.open(url, '_blank')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {[
            ['https://scholar.google.com', 'Google Scholar'],
            ['https://pubmed.ncbi.nlm.nih.gov', 'PubMed'],
            ['https://www.semanticscholar.org', 'Semantic Scholar'],
            ['https://europepmc.org', 'Europe PMC'],
          ].map(([url, name]) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[11.5px] text-neutral-500 transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
            >
              <ExternalLink size={10} /> {name}
            </a>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[12px] font-medium text-white transition-colors hover:bg-accent-dark"
        >
          <Plus size={12} /> {t('research.paper.new')}
        </button>
      </div>

      {(papers ?? []).length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-300 py-10 text-center text-[12.5px] text-neutral-400 dark:border-neutral-700">
          {t('research.paper.empty')}
        </p>
      )}

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
        {(papers ?? []).map((p) => (
          <div key={p.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <BookOpen size={15} className="mt-0.5 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => p.url && openUrl(p.url)}
                  className="text-left text-[13.5px] font-medium hover:text-accent"
                  data-tip={p.title}
                >
                  {p.title}
                </button>
                <div className="mt-0.5 text-[11.5px] text-neutral-400">
                  {[p.authors, p.year, p.journal].filter(Boolean).join(' · ')}
                </div>
                {p.abstract && (
                  <div className="mt-1 line-clamp-2 text-[11.5px] text-neutral-500 dark:text-neutral-400" data-tip={p.abstract}>
                    {p.abstract}
                  </div>
                )}
                {/* link to questions */}
                {(rqs ?? []).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(rqs ?? []).map((rq) => {
                      const linked = (links?.[rq.id] ?? []).includes(p.id)
                      return (
                        <button
                          key={rq.id}
                          type="button"
                          onClick={() => linkMutation.mutate({ paperId: p.id, questionId: rq.id, on: !linked })}
                          className={`rounded-full px-2 py-0.5 text-[10.5px] transition-colors ${
                            linked
                              ? 'bg-accent-soft text-accent'
                              : 'border border-dashed border-neutral-300 text-neutral-400 hover:border-accent hover:text-accent dark:border-neutral-700'
                          }`}
                          data-tip={rq.title}
                        >
                          {linked ? '✓ ' : '+ '}
                          {rq.title.length > 14 ? rq.title.slice(0, 14) + '…' : rq.title}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <select
                value={p.status}
                onChange={(e) => statusMutation.mutate({ id: p.id, status: e.target.value })}
                className="rounded-md border border-neutral-200 bg-white px-1.5 py-1 text-[11.5px] outline-none dark:border-neutral-700 dark:bg-neutral-950"
              >
                {PAPER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`research.paper.statuses.${s}`)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(p.id)}
                className="rounded p-1 text-neutral-300 hover:text-red-500 dark:text-neutral-600"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreating(false)
          }}
        >
          <div className="w-[520px] max-w-[92vw] rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">{t('research.paper.new')}</h2>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={15} />
              </button>
            </div>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('research.paper.titlePlaceholder')}
              className={`mt-3 w-full ${field}`}
            />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <input
                value={form.authors}
                onChange={(e) => setForm({ ...form, authors: e.target.value })}
                placeholder={t('research.paper.authors')}
                className={`col-span-2 ${field}`}
              />
              <input
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                placeholder={t('research.paper.year')}
                className={field}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={form.journal}
                onChange={(e) => setForm({ ...form, journal: e.target.value })}
                placeholder={t('research.paper.journal')}
                className={field}
              />
              <input
                value={form.doi}
                onChange={(e) => setForm({ ...form, doi: e.target.value })}
                placeholder="DOI"
                className={field}
              />
            </div>
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder={t('research.paper.urlPlaceholder')}
              className={`mt-2 w-full ${field}`}
            />
            <textarea
              value={form.abstract}
              onChange={(e) => setForm({ ...form, abstract: e.target.value })}
              rows={3}
              placeholder={t('research.paper.abstract')}
              className={`mt-2 w-full resize-y ${field}`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-[13px] transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaving(true)
                  createMutation.mutate(undefined, { onSettled: () => setSaving(false) })
                }}
                disabled={!form.title.trim() || saving}
                className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : t('research.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
