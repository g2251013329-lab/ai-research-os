import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  CheckCircle2,
  Flame,
  NotebookPen,
  Plus,
  Route,
  Timer,
} from 'lucide-react'
import { api } from '../api/client'
import { useUiStore } from '../store/useUiStore'
import RoadmapView from '../components/learning/RoadmapView'
import CalendarView from '../components/learning/CalendarView'
import CheckinModal from '../components/learning/CheckinModal'
import NotesView from '../components/learning/NotesView'

interface Overview {
  progress: { total: number; mastered?: number; [k: string]: number | undefined }
  recent_sessions: { id: number; topic: string; duration_min: number; session_date: string }[]
  weak_areas: { id: number; title: string }[]
}

const TABS = ['roadmap', 'calendar', 'checkin', 'notes'] as const

export default function LearningPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<(typeof TABS)[number]>('roadmap')
  const [checkinOpen, setCheckinOpen] = useState(false)
  const openTaskModal = useUiStore((s) => s.openTaskModal)

  const { data: overview } = useQuery({
    queryKey: ['learning', 'overview'],
    queryFn: () => api<Overview>('/api/learning/overview'),
  })

  const { data: dash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () =>
      api<{ learning: { streak_days: number } }>('/api/dashboard'),
  })

  const progress = overview?.progress
  const mastered = progress?.mastered ?? 0
  const total = progress?.total ?? 0
  const pct = total ? Math.round((mastered / total) * 100) : 0
  const streak = dash?.learning.streak_days ?? 0

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold">{t('learning.title')}</h1>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            {t('learning.subtitle')}
          </p>
        </div>
        <div className="flex gap-2 text-[12px]">
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">
            <Flame size={11} className="mr-1 inline" />
            {t('learning.streak')} {streak}
          </span>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">
            {t('learning.masteredPct', { pct })}
          </span>
        </div>
      </div>

      {/* quick actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCheckinOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
        >
          <CheckCircle2 size={13} /> {t('learning.quick.checkin')}
        </button>
        <button
          type="button"
          onClick={() => openTaskModal('learning')}
          className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-[13px] transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
        >
          <Plus size={13} /> {t('learning.quick.newTask')}
        </button>
      </div>

      {/* tabs */}
      <div className="mt-4 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => setTab(tb)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] transition-colors ${
              tab === tb
                ? 'border-accent font-medium text-accent'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            {tb === 'roadmap' && <Route size={13} />}
            {tb === 'calendar' && <CalendarDays size={13} />}
            {tb === 'checkin' && <Timer size={13} />}
            {tb === 'notes' && <NotebookPen size={13} />}
            {t(`learning.tabs.${tb}`)}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'roadmap' && <RoadmapView />}
        {tab === 'calendar' && <CalendarView />}
        {tab === 'checkin' && (
          <div>
            <p className="text-[12px] text-neutral-400">{t('learning.checkin.hint')}</p>
            <div className="mt-3 divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
              {(overview?.recent_sessions ?? []).length === 0 && (
                <p className="px-4 py-10 text-center text-[12.5px] text-neutral-400">
                  {t('learning.checkin.empty')}
                </p>
              )}
              {(overview?.recent_sessions ?? []).map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <div title={s.topic} className="truncate text-[13.5px]">
                      {s.topic}
                    </div>
                    <div className="text-[11px] text-neutral-400">{s.session_date}</div>
                  </div>
                  <span className="shrink-0 text-[12px] text-neutral-400">{s.duration_min}′</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'notes' && <NotesView />}
      </div>

      <CheckinModal open={checkinOpen} onClose={() => setCheckinOpen(false)} />
    </div>
  )
}
