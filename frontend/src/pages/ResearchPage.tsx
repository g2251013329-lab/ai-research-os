import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  ChevronRight,
  FlaskConical,
  FolderKanban,
  HelpCircle,
  LayoutGrid,
  Lightbulb,
  Loader2,
  Network,
  Plus,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import GraphView from '../components/research/GraphView'

interface Project {
  id: number
  title: string
  description: string
  status: string
  color: string
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  paused: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  completed: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  archived: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
}

export default function ResearchPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'list' | 'graph'>('list')

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () =>
      api<{
        papers: { total: number; read: number }
        experiments: { total: number; completed: number }
        questions: { total: number; resolved: number }
        hypotheses: { total: number; supported: number }
        tasks: { done_7d: number }
        focus: { minutes_7d: number }
        concepts: { total: number; mastered: number }
      }>('/api/stats'),
  })

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Project[]>('/api/projects'),
  })

  const { data: questions } = useQuery({
    queryKey: ['questions', 'all'],
    queryFn: () => api<{ id: number; project_id: number }[]>('/api/questions'),
  })

  const { data: papers } = useQuery({
    queryKey: ['papers', 'all'],
    queryFn: () => api<{ id: number; project_id: number | null }[]>('/api/papers'),
  })

  const { data: experiments } = useQuery({
    queryKey: ['experiments', 'all'],
    queryFn: () => api<{ id: number; project_id: number }[]>('/api/experiments'),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api('/api/projects', { method: 'POST', body: JSON.stringify({ title: title.trim(), description: desc.trim() }) }),
    onSuccess: () => {
      setTitle('')
      setDesc('')
      setCreating(false)
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const count = (list: { project_id?: number | null }[] | undefined, pid: number) =>
    (list ?? []).filter((x) => x.project_id === pid).length

  const field =
    'rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950'

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold">{t('research.title')}</h1>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            {t('research.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
        >
          <Plus size={14} /> {t('research.newProject')}
        </button>
      </div>

      {/* stats strip */}
      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {[
            ['papers', `${stats.papers.read}/${stats.papers.total}`],
            ['experiments', `${stats.experiments.completed}/${stats.experiments.total}`],
            ['questions', `${stats.questions.resolved}/${stats.questions.total}`],
            ['hypotheses', `${stats.hypotheses.supported}/${stats.hypotheses.total}`],
            ['tasks', `${stats.tasks.done_7d}`],
            ['focus', `${stats.focus.minutes_7d}′`],
            ['concepts', `${stats.concepts.mastered}/${stats.concepts.total}`],
          ].map(([key, value]) => (
            <div key={key} className="rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-center dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-[14px] font-semibold leading-none">{value}</div>
              <div className="mt-1 text-[10.5px] text-neutral-400">{t(`research.statsKeys.${key}`)}</div>
            </div>
          ))}
        </div>
      )}

      {/* view toggle */}
      <div className="mt-4 flex gap-1">
        <button
          type="button"
          onClick={() => setView('list')}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] transition-colors ${
            view === 'list'
              ? 'border-accent bg-accent-soft font-medium text-accent'
              : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
          }`}
        >
          <LayoutGrid size={13} />
          {t('research.viewList')}
        </button>
        <button
          type="button"
          onClick={() => setView('graph')}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] transition-colors ${
            view === 'graph'
              ? 'border-accent bg-accent-soft font-medium text-accent'
              : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400'
          }`}
        >
          <Network size={13} />
          {t('research.viewGraph')}
        </button>
      </div>

      {view === 'graph' && (
        <div className="mt-3">
          <GraphView onOpenProject={(id) => navigate(`/research/projects/${id}`)} />
        </div>
      )}

      {view === 'list' && isLoading && <p className="mt-8 text-center text-[13px] text-neutral-400">…</p>}
      {(projects ?? []).length === 0 && !isLoading && (
        <div className="mt-8 rounded-lg border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <p className="text-[13px] text-neutral-400">{t('research.empty')}</p>
        </div>
      )}

      {view === 'list' && (
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(projects ?? []).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => navigate(`/research/projects/${p.id}`)}
            className="group rounded-lg border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-accent dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-center justify-between">
              <FolderKanban size={17} className="text-accent" />
              <span
                className={`rounded-full px-2 py-0.5 text-[10.5px] ${STATUS_STYLES[p.status] ?? ''}`}
              >
                {t(`research.projectStatus.${p.status}`)}
              </span>
            </div>
            <div className="mt-2.5 truncate text-[14.5px] font-semibold" data-tip={p.title}>
              {p.title}
            </div>
            <div
              className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-neutral-400"
              data-tip={p.description}
            >
              {p.description || t('research.noDescription')}
            </div>
            <div className="mt-3 flex items-center gap-3 text-[11px] text-neutral-400">
              <span className="flex items-center gap-1">
                <HelpCircle size={11} /> {count(questions, p.id)}
              </span>
              <span className="flex items-center gap-1">
                <Lightbulb size={11} /> {t('research.hypothesesShort')}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen size={11} /> {count(papers, p.id)}
              </span>
              <span className="flex items-center gap-1">
                <FlaskConical size={11} /> {count(experiments, p.id)}
              </span>
              <ChevronRight
                size={13}
                className="ml-auto text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
              />
            </div>
          </button>
        ))}
      </div>
      )}

      {creating && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreating(false)
          }}
        >
          <div className="w-[440px] max-w-[92vw] rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">{t('research.newProject')}</h2>
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim() && !saving) {
                  setSaving(true)
                  createMutation.mutate(undefined, { onSettled: () => setSaving(false) })
                }
              }}
              placeholder={t('research.projectTitlePlaceholder')}
              className={`mt-3 w-full ${field}`}
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder={t('research.projectDescPlaceholder')}
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
