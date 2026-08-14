import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpen,
  FilePenLine,
  FlaskConical,
  FolderKanban,
  HelpCircle,
  Lightbulb,
  NotebookPen,
  Route,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { api } from '../api/client'
import QuestionsView from '../components/research/QuestionsView'
import PapersView from '../components/research/PapersView'
import ExperimentsView from '../components/research/ExperimentsView'
import ResearchNotesView from '../components/research/ResearchNotesView'
import WritingView from '../components/research/WritingView'
import TimelineView from '../components/research/TimelineView'

interface Project {
  id: number
  title: string
  description: string
  status: string
}

const TABS = ['overview', 'questions', 'papers', 'experiments', 'notes', 'writing', 'timeline'] as const

export default function ProjectDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const projectId = Number(id)
  const [tab, setTab] = useState<(typeof TABS)[number]>('overview')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => api(`/api/projects/${projectId}`, { method: 'DELETE' }),
    onSuccess: () => {
      setConfirmDelete(false)
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      navigate('/research')
    },
  })

  const { data: project } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      const list = await api<Project[]>('/api/projects')
      return list.find((p) => p.id === projectId)
    },
  })

  const { data: questions } = useQuery({
    queryKey: ['questions', projectId],
    queryFn: () => api<{ id: number; title: string; status: string }[]>(`/api/questions?project_id=${projectId}`),
  })

  const { data: hyps } = useQuery({
    queryKey: ['hypotheses', 'all'],
    queryFn: () => api<{ id: number; question_id: number; status: string }[]>('/api/hypotheses'),
  })

  const { data: papers } = useQuery({
    queryKey: ['papers', projectId],
    queryFn: () => api<unknown[]>(`/api/papers?project_id=${projectId}`),
  })

  const { data: experiments } = useQuery({
    queryKey: ['experiments', projectId],
    queryFn: () => api<unknown[]>(`/api/experiments?project_id=${projectId}`),
  })

  const hypCount = (hyps ?? []).filter((h) =>
    (questions ?? []).some((q) => q.id === h.question_id),
  ).length

  const stats = [
    { key: 'questions', icon: HelpCircle, value: questions?.length ?? 0 },
    { key: 'hypotheses', icon: Lightbulb, value: hypCount },
    { key: 'papers', icon: BookOpen, value: papers?.length ?? 0 },
    { key: 'experiments', icon: FlaskConical, value: experiments?.length ?? 0 },
  ]

  if (!project) return <p className="p-8 text-center text-[13px] text-neutral-400">…</p>

  return (
    <div className="mx-auto max-w-6xl p-6">
      <Link
        to="/research"
        className="flex items-center gap-1 text-[12px] text-neutral-400 transition-colors hover:text-accent"
      >
        <ArrowLeft size={13} /> {t('research.back')}
      </Link>

      <div className="mt-2 flex items-center gap-2.5">
        <FolderKanban size={18} className="text-accent" />
        <h1 className="truncate text-lg font-semibold" data-tip={project.title}>
          {project.title}
        </h1>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="ml-auto flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[12px] text-neutral-400 transition-colors hover:border-red-300 hover:text-red-500 dark:border-neutral-700"
          data-tip={t('research.deleteProject')}
        >
          <Trash2 size={12} /> {t('research.deleteProject')}
        </button>
      </div>
      {project.description && (
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400" data-tip={project.description}>
          {project.description}
        </p>
      )}

      {/* overview stats */}
      {tab === 'overview' && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {stats.map(({ key, icon: Icon, value }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key === 'hypotheses' ? 'questions' : (key as (typeof TABS)[number]))}
              className="rounded-lg border border-neutral-200 bg-white p-4 text-center transition-colors hover:border-accent dark:border-neutral-800 dark:bg-neutral-900"
            >
              <Icon size={16} className="mx-auto text-accent" />
              <div className="mt-1.5 text-[20px] font-semibold leading-none">{value}</div>
              <div className="mt-1 text-[11.5px] text-neutral-400">{t(`research.stats.${key}`)}</div>
            </button>
          ))}
        </div>
      )}

      {/* tabs */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => setTab(tb)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] transition-colors ${
              tab === tb
                ? 'border-accent font-medium text-accent'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            {tb === 'overview' && <FolderKanban size={13} />}
            {tb === 'questions' && <HelpCircle size={13} />}
            {tb === 'papers' && <BookOpen size={13} />}
            {tb === 'experiments' && <FlaskConical size={13} />}
            {tb === 'notes' && <NotebookPen size={13} />}
            {tb === 'writing' && <FilePenLine size={13} />}
            {tb === 'timeline' && <Route size={13} />}
            {t(`research.tabs.${tb}`)}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'questions' && <QuestionsView projectId={projectId} />}
        {tab === 'papers' && <PapersView projectId={projectId} />}
        {tab === 'experiments' && <ExperimentsView projectId={projectId} />}
        {tab === 'notes' && <ResearchNotesView projectId={projectId} />}
        {tab === 'writing' && <WritingView projectId={projectId} />}
        {tab === 'timeline' && <TimelineView projectId={projectId} />}
      </div>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmDelete(false)
          }}
        >
          <div className="w-[420px] max-w-[92vw] rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center gap-2 text-red-500">
              <TriangleAlert size={16} />
              <h2 className="text-[14px] font-semibold">
                {t('research.deleteConfirmTitle')}
              </h2>
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              {t('research.deleteWarning')}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-[13px] transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {t('research.deleteConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
