import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  FlaskConical,
  FolderKanban,
  HelpCircle,
  Inbox,
  Lightbulb,
  Sparkles,
  ListTodo,
  Plus,
  SquarePen,
  Timer,
  TriangleAlert,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import { useUiStore } from '../store/useUiStore'
import { relativeTime, parseApiTime, todayLabel } from '../utils/time'

interface Task {
  id: number
  title: string
  kind: string
  status: string
  priority: string
  due_date: string | null
  completed_at: string | null
  created_at: string
}

interface DashboardData {
  today_tasks: Task[]
  today_done: number
  done_today_tasks: Task[]
  focus_minutes_today: number
  learning: {
    streak_days: number
    weekly_focus_minutes: number
    concepts: { total: number; mastered?: number; [k: string]: number | undefined }
  }
  counts: {
    projects: number
    papers: number
    experiments: number
    open_questions: number
    active_hypotheses: number
  }
  recent_activity: { event_type: string; title: string; detail: string; created_at: string }[]
}

const KIND_STYLES: Record<string, string> = {
  learning: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  research: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  experiment: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  general: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
}

const EVENT_ICONS: Record<string, typeof ListTodo> = {
  'task.created': ListTodo,
  'task.completed': CheckCircle2,
  'inbox.added': Inbox,
  'focus.completed': Timer,
}

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const openTaskModal = useUiStore((s) => s.openTaskModal)
  const openFocus = useUiStore((s) => s.openFocus)
  const openQuickCreate = useUiStore((s) => s.openQuickCreate)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardData>('/api/dashboard'),
  })

  const toggleMutation = useMutation({
    mutationFn: (task: Task) =>
      api(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: task.status === 'done' ? 'todo' : 'done' }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })

  const quickActions = [
    {
      key: 'newTask',
      icon: Plus,
      run: () => openTaskModal(),
    },
    {
      key: 'addInbox',
      icon: Inbox,
      run: () => navigate('/inbox'),
    },
    {
      key: 'quickCreate',
      icon: Sparkles,
      run: () => openQuickCreate('paper'),
    },
    {
      key: 'focusMode',
      icon: Timer,
      run: () => openFocus(),
    },
  ]

  const counts = data?.counts
  const learning = data?.learning
  const activity = data?.recent_activity ?? []

  const [showDone, setShowDone] = useState(false)
  const doneRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!showDone) return
    const onDown = (e: MouseEvent) => {
      if (!doneRef.current?.contains(e.target as Node)) setShowDone(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDone(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [showDone])

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold">{t('dashboard.title')}</h1>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            {todayLabel()}
          </p>
        </div>
        <div className="relative flex gap-2 text-[12px]">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-accent transition-colors hover:bg-accent hover:text-white"
            data-tip={t('dashboard.doneTodayTip')}
          >
            ✓ {t('dashboard.doneToday', { n: data?.today_done ?? 0 })}
          </button>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">
            <Timer size={11} className="mr-1 inline" />
            {data?.focus_minutes_today ?? 0}′
          </span>
          {showDone && (
            <div
              ref={doneRef}
              className="absolute right-0 top-8 z-50 w-72 rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            >
              <header className="flex items-center justify-between border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
                <h3 className="text-[12px] font-semibold">
                  {t('dashboard.doneTodayTitle')}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDone(false)}
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X size={12} />
                </button>
              </header>
              <div className="max-h-72 overflow-y-auto py-1">
                {(data?.done_today_tasks ?? []).length === 0 && (
                  <p className="px-3 py-5 text-center text-[12px] text-neutral-400">
                    {t('dashboard.emptyDoneToday')}
                  </p>
                )}
                {(data?.done_today_tasks ?? []).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  >
                    <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                    <div className="min-w-0 flex-1 truncate text-[12.5px]" data-tip={task.title}>
                      {task.title}
                    </div>
                    <span
                      className={`shrink-0 rounded px-1.5 py-px text-[10px] ${KIND_STYLES[task.kind] ?? KIND_STYLES.general}`}
                    >
                      {t(`task.kinds.${task.kind}`)}
                    </span>
                    <span className="shrink-0 font-mono text-[10.5px] text-neutral-400">
                      {task.completed_at
                        ? parseApiTime(task.completed_at).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* quick actions */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {quickActions.map(({ key, icon: Icon, run }) => (
          <button
            key={key}
            type="button"
            onClick={run}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-3 text-[12px] text-neutral-600 transition-colors hover:border-accent hover:text-accent dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <Icon size={16} className="text-accent" />
            {t(`dashboard.actions.${key}`)}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* Today */}
        <section className="col-span-3 rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2">
          <header className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold">
              <ListTodo size={14} className="text-accent" />
              {t('dashboard.today')}
            </h2>
            <button
              type="button"
              onClick={() => openTaskModal()}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-accent transition-colors hover:bg-accent-soft"
            >
              <Plus size={12} /> {t('task.new')}
            </button>
          </header>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {(data?.today_tasks ?? []).length === 0 && (
              <p className="px-4 py-8 text-center text-[12.5px] text-neutral-400">
                {t('dashboard.emptyToday')}
              </p>
            )}
            {(data?.today_tasks ?? []).map((task) => {
              const overdue =
                task.due_date && task.due_date < new Date().toISOString().slice(0, 10)
              return (
                <div key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => toggleMutation.mutate(task)}
                    className="text-neutral-300 transition-colors hover:text-accent dark:text-neutral-600"
                    data-tip={t('task.toggleDone')}
                  >
                    <Circle size={17} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div
                      data-tip={task.title}
                      className={`truncate text-[13.5px] ${
                        task.status === 'done'
                          ? 'text-neutral-400 line-through'
                          : ''
                      }`}
                    >
                      {task.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-400">
                      <span
                        className={`rounded px-1.5 py-px ${KIND_STYLES[task.kind] ?? KIND_STYLES.general}`}
                      >
                        {t(`task.kinds.${task.kind}`)}
                      </span>
                      {task.due_date && (
                        <span className={overdue ? 'flex items-center gap-0.5 text-red-500' : ''}>
                          {overdue && <TriangleAlert size={10} />}
                          {task.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600" />
                </div>
              )
            })}
          </div>
        </section>

        {/* right column */}
        <div className="col-span-3 space-y-4 lg:col-span-1">
          {/* research overview */}
          <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <button
              type="button"
              onClick={() => navigate('/research')}
              className="flex items-center gap-1.5 text-[13px] font-semibold transition-colors hover:text-accent"
            >
              <FlaskConical size={14} className="text-accent" />
              {t('dashboard.researchOverview')}
              <ChevronRight size={12} className="text-neutral-300" />
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ['projects', FolderKanban],
                ['papers', BookOpen],
                ['experiments', FlaskConical],
                ['open_questions', HelpCircle],
                ['active_hypotheses', Lightbulb],
              ].map(([key, Icon]) => (
                <div
                  key={key as string}
                  className="rounded-md bg-neutral-50 p-2.5 dark:bg-neutral-800/60"
                >
                  <div className="text-[18px] font-semibold leading-none">
                    {counts?.[key as keyof typeof counts] ?? 0}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-400">
                    <Icon size={11} /> {t(`dashboard.counts.${key as string}`)}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/research')}
              className="mt-2.5 text-[11px] text-accent transition-colors hover:underline"
            >
              {t('dashboard.openResearch')} →
            </button>
          </section>

          {/* learning overview */}
          <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold">
              <SquarePen size={14} className="text-accent" />
              {t('dashboard.learningOverview')}
            </h2>
            <div className="mt-3 flex gap-2">
              <div className="flex-1 rounded-md bg-neutral-50 p-2.5 text-center dark:bg-neutral-800/60">
                <div className="text-[18px] font-semibold leading-none">
                  🔥 {learning?.streak_days ?? 0}
                </div>
                <div className="mt-1 text-[11px] text-neutral-400">
                  {t('dashboard.streakDays')}
                </div>
              </div>
              <div className="flex-1 rounded-md bg-neutral-50 p-2.5 text-center dark:bg-neutral-800/60">
                <div className="text-[18px] font-semibold leading-none">
                  {learning?.weekly_focus_minutes ?? 0}′
                </div>
                <div className="mt-1 text-[11px] text-neutral-400">
                  {t('dashboard.weeklyFocus')}
                </div>
              </div>
            </div>
            {learning?.concepts && learning.concepts.total > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{t('dashboard.conceptProgress')}</span>
                  <span>
                    {learning.concepts.mastered ?? 0}/{learning.concepts.total}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{
                      width: `${Math.round(((learning.concepts.mastered ?? 0) / learning.concepts.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* recent activity */}
      <section className="mt-4 rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <header className="border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
          <h2 className="text-[13px] font-semibold">{t('dashboard.recentActivity')}</h2>
        </header>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {activity.length === 0 && (
            <p className="px-4 py-6 text-center text-[12.5px] text-neutral-400">
              {t('dashboard.emptyActivity')}
            </p>
          )}
          {activity.map((ev) => {
            const Icon = EVENT_ICONS[ev.event_type] ?? ListTodo
            return (
              <div key={ev.created_at + ev.title} className="flex items-center gap-3 px-4 py-2.5">
                <Icon size={14} className="shrink-0 text-neutral-400" />
                <div className="min-w-0 flex-1 truncate text-[13px]" data-tip={ev.title}>
                  {ev.title}
                </div>
                <span className="shrink-0 text-[11px] text-neutral-400">
                  {relativeTime(ev.created_at)}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
