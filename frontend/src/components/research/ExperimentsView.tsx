import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, FlaskConical, Loader2, Plus, Trash2, X } from 'lucide-react'
import { api } from '../../api/client'

export interface Experiment {
  id: number
  title: string
  objective: string
  hypothesis_text: string
  materials: string
  protocol: string
  variables: string
  procedure: string
  raw_data: string
  results: string
  figures: string
  interpretation: string
  problems: string
  next_step: string
  status: string
}

const STATUS_STYLES: Record<string, string> = {
  planned: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  running: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  abandoned: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
}

const STATUSES = ['planned', 'running', 'completed', 'abandoned']

/** PRD §13 13-field structure; key = Experiment field, label = i18n key. */
const FIELDS: { key: string; label: string; rows?: number }[] = [
  { key: 'objective', label: 'objective' },
  { key: 'hypothesis_text', label: 'hypothesis' },
  { key: 'materials', label: 'materials' },
  { key: 'protocol', label: 'protocol' },
  { key: 'variables', label: 'variables' },
  { key: 'procedure', label: 'procedure', rows: 3 },
  { key: 'raw_data', label: 'rawData', rows: 3 },
  { key: 'results', label: 'results', rows: 3 },
  { key: 'figures', label: 'figures', rows: 2 },
  { key: 'interpretation', label: 'interpretation', rows: 3 },
  { key: 'problems', label: 'problems', rows: 2 },
  { key: 'next_step', label: 'nextStep', rows: 2 },
]

export default function ExperimentsView({ projectId }: { projectId: number }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const { data: experiments } = useQuery({
    queryKey: ['experiments', projectId],
    queryFn: () => api<Experiment[]>(`/api/experiments?project_id=${projectId}`),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['experiments'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api('/api/experiments', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, title: title.trim(), ...form }),
      }),
    onSuccess: () => {
      setTitle('')
      setForm({})
      setCreating(false)
      invalidate()
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/api/experiments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/api/experiments/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const field =
    'rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-neutral-400">{t('research.experiment.hint')}</p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[12px] font-medium text-white transition-colors hover:bg-accent-dark"
        >
          <Plus size={12} /> {t('research.experiment.new')}
        </button>
      </div>

      {(experiments ?? []).length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-300 py-10 text-center text-[12.5px] text-neutral-400 dark:border-neutral-700">
          {t('research.experiment.empty')}
        </p>
      )}

      <div className="space-y-2">
        {(experiments ?? []).map((exp) => {
          const isOpen = expanded.has(exp.id)
          return (
            <div
              key={exp.id}
              className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev)
                      if (next.has(exp.id)) next.delete(exp.id)
                      else next.add(exp.id)
                      return next
                    })
                  }
                  className="rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <FlaskConical size={14} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium" data-tip={exp.title}>
                  {exp.title}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] ${STATUS_STYLES[exp.status] ?? ''}`}>
                  {t(`research.experiment.statuses.${exp.status}`)}
                </span>
                <select
                  value={exp.status}
                  onChange={(e) => statusMutation.mutate({ id: exp.id, status: e.target.value })}
                  className="rounded border border-neutral-200 bg-white px-1 py-0.5 text-[11px] outline-none dark:border-neutral-700 dark:bg-neutral-950"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`research.experiment.statuses.${s}`)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(exp.id)}
                  className="rounded p-1 text-neutral-300 hover:text-red-500 dark:text-neutral-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {isOpen && (
                <div className="space-y-2.5 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
                  {FIELDS.map(({ key, label }) =>
                    exp[key as keyof Experiment] ? (
                      <div key={key}>
                        <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                          {t(`research.experiment.fields.${label}`)}
                        </div>
                        <div
                          className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed"
                          data-tip={exp[key as keyof Experiment] as string}
                        >
                          {exp[key as keyof Experiment] as string}
                        </div>
                      </div>
                    ) : null,
                  )}
                  {FIELDS.every(({ key }) => !exp[key as keyof Experiment]) && (
                    <p className="text-[12px] text-neutral-400">{t('research.experiment.noFields')}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {creating && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreating(false)
          }}
        >
          <div className="max-h-[86vh] w-[560px] max-w-[94vw] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">{t('research.experiment.new')}</h2>
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('research.experiment.titlePlaceholder')}
              className={`mt-3 w-full ${field}`}
            />
            {FIELDS.map(({ key, label, rows }) => (
              <div key={key} className="mt-2.5">
                <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                  {t(`research.experiment.fields.${label}`)}
                </div>
                <textarea
                  value={form[key] ?? ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  rows={rows ?? 1}
                  className={`mt-1 w-full resize-y ${field}`}
                />
              </div>
            ))}
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
                disabled={!title.trim() || saving}
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
