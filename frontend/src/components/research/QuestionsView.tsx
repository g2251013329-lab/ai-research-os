import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '../../api/client'

export interface RQ {
  id: number
  title: string
  description: string
  status: string
  created_at: string
}

export interface Hypothesis {
  id: number
  question_id: number
  description: string
  evidence: string
  supporting: string
  contradicting: string
  status: string
}

const HYP_STATUS: Record<string, string> = {
  proposed: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  testing: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  supported: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  weakly_supported: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
}

const RQ_STATUSES = ['open', 'exploring', 'testing', 'supported', 'rejected', 'resolved']
const HYP_STATUSES = ['proposed', 'testing', 'supported', 'weakly_supported', 'rejected']

export default function QuestionsView({ projectId }: { projectId: number }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [rqModal, setRqModal] = useState(false)
  const [hypModalFor, setHypModalFor] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [hypDesc, setHypDesc] = useState('')
  const [hypEv, setHypEv] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: rqs } = useQuery({
    queryKey: ['questions', projectId],
    queryFn: () => api<RQ[]>(`/api/questions?project_id=${projectId}`),
  })
  const { data: hyps } = useQuery({
    queryKey: ['hypotheses', 'all'],
    queryFn: () => api<Hypothesis[]>('/api/hypotheses'),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['questions'] })
    void queryClient.invalidateQueries({ queryKey: ['hypotheses'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const rqMutation = useMutation({
    mutationFn: () =>
      api('/api/questions', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, title: title.trim(), description: desc.trim() }),
      }),
    onSuccess: () => {
      setTitle('')
      setDesc('')
      setRqModal(false)
      invalidate()
    },
  })

  const hypMutation = useMutation({
    mutationFn: () =>
      api('/api/hypotheses', {
        method: 'POST',
        body: JSON.stringify({ question_id: hypModalFor, description: hypDesc.trim(), evidence: hypEv.trim() }),
      }),
    onSuccess: () => {
      setHypDesc('')
      setHypEv('')
      setHypModalFor(null)
      invalidate()
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status, kind }: { id: number; status: string; kind: 'rq' | 'hyp' }) =>
      api(`/api/${kind === 'rq' ? 'questions' : 'hypotheses'}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, kind }: { id: number; kind: 'rq' | 'hyp' }) =>
      api(`/api/${kind === 'rq' ? 'questions' : 'hypotheses'}/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const field =
    'rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950'

  const modal = (
    inner: React.ReactNode,
    onClose: () => void,
  ) => (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-[480px] max-w-[92vw] rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        {inner}
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-neutral-400">{t('research.question.hint')}</p>
        <button
          type="button"
          onClick={() => setRqModal(true)}
          className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-[12px] font-medium text-white transition-colors hover:bg-accent-dark"
        >
          <Plus size={12} /> {t('research.question.new')}
        </button>
      </div>

      {(rqs ?? []).length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-300 py-10 text-center text-[12.5px] text-neutral-400 dark:border-neutral-700">
          {t('research.question.empty')}
        </p>
      )}

      {(rqs ?? []).map((rq) => {
        const isOpen = expanded.has(rq.id)
        const rqHyps = (hyps ?? []).filter((h) => h.question_id === rq.id)
        return (
          <div
            key={rq.id}
            className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-center gap-2.5 px-3.5 py-3">
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev)
                    if (next.has(rq.id)) next.delete(rq.id)
                    else next.add(rq.id)
                    return next
                  })
                }
                className="rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <HelpCircle size={14} className="shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium" data-tip={rq.title}>
                  {rq.title}
                </div>
                {rq.description && (
                  <div className="mt-0.5 line-clamp-2 text-[12px] text-neutral-400" data-tip={rq.description}>
                    {rq.description}
                  </div>
                )}
              </div>
              <select
                value={rq.status}
                onChange={(e) => statusMutation.mutate({ id: rq.id, status: e.target.value, kind: 'rq' })}
                className="rounded-md border border-neutral-200 bg-white px-1.5 py-1 text-[11.5px] outline-none dark:border-neutral-700 dark:bg-neutral-950"
              >
                {RQ_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`research.question.statuses.${s}`)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => deleteMutation.mutate({ id: rq.id, kind: 'rq' })}
                className="rounded p-1 text-neutral-300 hover:text-red-500 dark:text-neutral-600"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {isOpen && (
              <div className="space-y-2 border-t border-neutral-100 px-3.5 py-3 dark:border-neutral-800">
                {rqHyps.length === 0 && (
                  <p className="text-[12px] text-neutral-400">{t('research.hypothesis.empty')}</p>
                )}
                {rqHyps.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-md bg-neutral-50 p-2.5 dark:bg-neutral-800/60"
                  >
                    <div className="flex items-center gap-2">
                      <Lightbulb size={13} className="shrink-0 text-amber-500" />
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] ${HYP_STATUS[h.status] ?? ''}`}
                      >
                        {t(`research.hypothesis.statuses.${h.status}`)}
                      </span>
                      <select
                        value={h.status}
                        onChange={(e) =>
                          statusMutation.mutate({ id: h.id, status: e.target.value, kind: 'hyp' })
                        }
                        className="ml-auto rounded border border-neutral-200 bg-white px-1 py-0.5 text-[11px] outline-none dark:border-neutral-700 dark:bg-neutral-950"
                      >
                        {HYP_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {t(`research.hypothesis.statuses.${s}`)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate({ id: h.id, kind: 'hyp' })}
                        className="rounded p-0.5 text-neutral-300 hover:text-red-500 dark:text-neutral-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="mt-1.5 text-[13px]" data-tip={h.description}>
                      {h.description}
                    </div>
                    {h.evidence && (
                      <div className="mt-1 text-[11.5px] text-neutral-400" data-tip={h.evidence}>
                        <span className="font-medium">{t('research.hypothesis.evidence')}：</span>
                        {h.evidence}
                      </div>
                    )}
                    {h.supporting && (
                      <div className="mt-0.5 text-[11.5px] text-emerald-600 dark:text-emerald-400" data-tip={h.supporting}>
                        {t('research.hypothesis.supporting')}：{h.supporting}
                      </div>
                    )}
                    {h.contradicting && (
                      <div className="mt-0.5 text-[11.5px] text-red-500" data-tip={h.contradicting}>
                        {t('research.hypothesis.contradicting')}：{h.contradicting}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setHypModalFor(rq.id)}
                  className="flex items-center gap-1 rounded-md border border-dashed border-neutral-300 px-2.5 py-1.5 text-[12px] text-neutral-400 transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
                >
                  <Plus size={12} /> {t('research.hypothesis.new')}
                </button>
              </div>
            )}
          </div>
        )
      })}

      {rqModal &&
        modal(
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">{t('research.question.new')}</h2>
              <button
                type="button"
                onClick={() => setRqModal(false)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={15} />
              </button>
            </div>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('research.question.titlePlaceholder')}
              className={`mt-3 w-full ${field}`}
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder={t('research.question.descPlaceholder')}
              className={`mt-2 w-full resize-y ${field}`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRqModal(false)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-[13px] transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaving(true)
                  rqMutation.mutate(undefined, { onSettled: () => setSaving(false) })
                }}
                disabled={!title.trim() || saving}
                className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : t('research.create')}
              </button>
            </div>
          </>,
          () => setRqModal(false),
        )}

      {hypModalFor !== null &&
        modal(
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">{t('research.hypothesis.new')}</h2>
              <button
                type="button"
                onClick={() => setHypModalFor(null)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={15} />
              </button>
            </div>
            <textarea
              autoFocus
              value={hypDesc}
              onChange={(e) => setHypDesc(e.target.value)}
              rows={3}
              placeholder={t('research.hypothesis.descPlaceholder')}
              className={`mt-3 w-full resize-y ${field}`}
            />
            <textarea
              value={hypEv}
              onChange={(e) => setHypEv(e.target.value)}
              rows={2}
              placeholder={t('research.hypothesis.evidencePlaceholder')}
              className={`mt-2 w-full resize-y ${field}`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setHypModalFor(null)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-[13px] transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaving(true)
                  hypMutation.mutate(undefined, { onSettled: () => setSaving(false) })
                }}
                disabled={!hypDesc.trim() || saving}
                className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : t('research.create')}
              </button>
            </div>
          </>,
          () => setHypModalFor(null),
        )}
    </div>
  )
}
