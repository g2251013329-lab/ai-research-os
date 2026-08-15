import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Link2, Loader2, Plus, X } from 'lucide-react'
import { api } from '../../api/client'
import { useToastStore } from '../../store/useToastStore'
import type { Concept } from './RoadmapView'

interface ConceptLink {
  id: number
  kind: string
  title: string
  subtitle: string
  url?: string
  path?: string
}

interface Candidate {
  id: number
  title: string
  subtitle?: string
}

const KIND_STYLES: Record<string, string> = {
  paper: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  project: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  experiment: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  question: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  note: 'bg-surface-hover text-foreground/65 dark:bg-neutral-800 dark:text-foreground/75',
}

export default function ConceptLinksModal({
  concept,
  onClose,
}: {
  concept: Concept
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [kind, setKind] = useState('paper')
  const [target, setTarget] = useState('')

  const { data: links } = useQuery({
    queryKey: ['learning', 'links', concept.id],
    queryFn: () => api<ConceptLink[]>(`/api/learning/concepts/${concept.id}/links`),
  })

  const { data: candidates } = useQuery({
    queryKey: ['learning', 'linkCandidates'],
    queryFn: async () => {
      const [papers, projects, experiments, questions, notes] = await Promise.all([
        api<Candidate[]>('/api/papers?limit=100'),
        api<Candidate[]>('/api/projects'),
        api<Candidate[]>('/api/experiments?limit=100'),
        api<Candidate[]>('/api/questions?limit=100'),
        api<{ relative: string; title: string }[]>('/api/learning/notes'),
      ])
      return {
        paper: papers.map((p) => ({ id: p.id, title: p.title })),
        project: projects.map((p) => ({ id: p.id, title: p.title })),
        experiment: experiments.map((e) => ({ id: e.id, title: e.title })),
        question: questions.map((q) => ({ id: q.id, title: q.title })),
        note: notes.map((n) => ({ id: n.relative, title: n.title })),
      } as unknown as Record<string, Candidate[]>
    },
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['learning', 'links'] })
    void queryClient.invalidateQueries({ queryKey: ['learning', 'linkCandidates'] })
    void queryClient.invalidateQueries({ queryKey: ['learning', 'roadmap'] })
  }

  const addLink = useMutation({
    mutationFn: () => {
      const targetId = kind === 'note' ? undefined : Number(target)
      return api('/api/learning/concepts/' + concept.id + '/links', {
        method: 'POST',
        body: JSON.stringify(
          kind === 'note'
            ? { kind, ref_path: target }
            : { kind, ref_id: targetId },
        ),
      })
    },
    onSuccess: () => {
      setTarget('')
      invalidate()
    },
    onError: (e) => toast(e instanceof Error ? e.message : String(e)),
  })

  const deleteLink = useMutation({
    mutationFn: (id: number) => api(`/api/learning/links/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const field =
    'rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-border dark:bg-surface'

  const candidatesForKind = (candidates ?? {})[kind] ?? []

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-[520px] max-w-[92vw] overflow-hidden rounded-xl border border-border bg-surface p-4 shadow-2xl dark:border-border dark:bg-surface">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[14px] font-semibold">
            <Link2 size={14} className="text-accent" />
            {t('learning.links.title')}：{concept.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-foreground/45 hover:bg-surface-hover dark:hover:bg-neutral-800"
          >
            <X size={15} />
          </button>
        </div>
        <p className="mt-1 text-[11.5px] text-foreground/45">{t('learning.links.hint')}</p>

        {/* add form */}
        <div className="mt-3 flex items-center gap-1.5">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className={`shrink-0 ${field}`}
          >
            {['paper', 'project', 'experiment', 'question', 'note'].map((k) => (
              <option key={k} value={k}>
                {t(`learning.links.kinds.${k}`)}
              </option>
            ))}
          </select>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className={`min-w-0 flex-1 ${field}`}
          >
            <option value="">{t('learning.links.selectTarget')}</option>
            {candidatesForKind.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!target || addLink.isPending}
            onClick={() => addLink.mutate()}
            className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            {addLink.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Plus size={12} />
            )}
            {t('learning.links.add')}
          </button>
        </div>

        {/* link list */}
        <div className="mt-3 max-h-72 divide-y divide-border-subtle overflow-y-auto rounded-lg border border-border dark:divide-border-subtle dark:border-border">
          {(links ?? []).length === 0 && (
            <p className="px-4 py-8 text-center text-[12.5px] text-foreground/45">
              {t('learning.links.empty')}
            </p>
          )}
          {(links ?? []).map((link) => (
            <div key={link.id} className="flex items-center gap-2 px-3 py-2">
              <span
                className={`shrink-0 rounded px-1.5 py-px text-[10px] ${KIND_STYLES[link.kind] ?? KIND_STYLES.note}`}
              >
                {t(`learning.links.kinds.${link.kind}`)}
              </span>
              <div className="min-w-0 flex-1">
                <div data-tip={link.title} className="truncate text-[12.5px]">
                  {link.title}
                </div>
                {link.subtitle && (
                  <div className="truncate text-[10.5px] text-foreground/45">{link.subtitle}</div>
                )}
              </div>
              {link.url && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate(link.url!)
                  }}
                  className="shrink-0 rounded p-1 text-foreground/35 transition-colors hover:text-accent dark:text-foreground/65"
                  data-tip={t('learning.links.open')}
                >
                  <ArrowUpRight size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => deleteLink.mutate(link.id)}
                className="shrink-0 rounded p-1 text-foreground/35 transition-colors hover:text-red-500 dark:text-foreground/65"
                data-tip={t('inbox.delete')}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
