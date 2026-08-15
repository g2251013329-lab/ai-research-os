import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Timer,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '../../api/client'
import { useToastStore } from '../../store/useToastStore'
import { apiDate } from '../../utils/time'

interface CalTask {
  id: number
  title: string
  due_date: string | null
  kind: string
  status: string
}

interface CalSession {
  id: number
  topic: string
  duration_min: number
  session_date: string
}

interface CalFocus {
  id: number
  duration_min: number
  ended_at: string
}

interface CalSchedule {
  id: number
  date: string
  start_time: string
  end_time: string
  title: string
  kind: string
}

interface DayEvents {
  tasks: CalTask[]
  sessions: CalSession[]
  focus: CalFocus[]
  schedule: CalSchedule[]
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const SCHEDULE_KINDS = ['general', 'learning', 'research', 'experiment', 'leisure']

export default function CalendarView() {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // schedule add form
  const [sTitle, setSTitle] = useState('')
  const [sStart, setSStart] = useState('09:00')
  const [sEnd, setSEnd] = useState('10:00')
  const [sKind, setSKind] = useState('general')
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<number | null>(null)

  const { data } = useQuery({
    queryKey: ['learning', 'calendar', month],
    queryFn: () =>
      api<{
        tasks: CalTask[]
        sessions: CalSession[]
        focus: CalFocus[]
        schedule: CalSchedule[]
      }>(`/api/learning/calendar?month=${month}`),
  })

  const invalidateCalendar = () => {
    void queryClient.invalidateQueries({ queryKey: ['learning', 'calendar'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, due }: { id: number; due: string }) =>
      api(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ due_date: due }) }),
    onSuccess: invalidateCalendar,
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => api(`/api/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setConfirmDeleteTask(null)
      invalidateCalendar()
    },
  })

  const addScheduleMutation = useMutation({
    mutationFn: () =>
      api('/api/schedule', {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDay,
          start_time: sStart,
          end_time: sEnd,
          title: sTitle.trim(),
          kind: sKind,
        }),
      }),
    onSuccess: () => {
      setSTitle('')
      toast(t('learning.calendar.scheduleAdded'))
      invalidateCalendar()
    },
    onError: (e) => toast(e instanceof Error ? e.message : String(e)),
  })

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) => api(`/api/schedule/${id}`, { method: 'DELETE' }),
    onSuccess: invalidateCalendar,
  })

  const [year, mon] = month.split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const firstWeekday = (new Date(year, mon - 1, 1).getDay() + 6) % 7 // Monday=0
  const today = new Date().toISOString().slice(0, 10)

  const eventsByDay = useMemo(() => {
    const map: Record<string, DayEvents> = {}
    for (const task of data?.tasks ?? []) {
      const d = task.due_date ?? ''
      if (!d) continue
      ;(map[d] ??= { tasks: [], sessions: [], focus: [], schedule: [] }).tasks.push(task)
    }
    for (const s of data?.sessions ?? []) {
      ;(map[s.session_date] ??= { tasks: [], sessions: [], focus: [], schedule: [] }).sessions.push(s)
    }
    for (const f of data?.focus ?? []) {
      const d = apiDate(f.ended_at)
      ;(map[d] ??= { tasks: [], sessions: [], focus: [], schedule: [] }).focus.push(f)
    }
    for (const s of data?.schedule ?? []) {
      ;(map[s.date] ??= { tasks: [], sessions: [], focus: [], schedule: [] }).schedule.push(s)
    }
    for (const day of Object.values(map)) {
      day.schedule.sort((a, b) => a.start_time.localeCompare(b.start_time))
    }
    return map
  }, [data])

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = String(i + 1).padStart(2, '0')
      return `${month}-${d}`
    }),
  ]

  const selected = selectedDay ? eventsByDay[selectedDay] : null

  const field =
    'rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950'

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* month grid */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const d = new Date(year, mon - 2, 1)
                setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
              }}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date(year, mon, 1)
                setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
              }}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <ChevronRight size={15} />
            </button>
            <span className="px-1 text-[14px] font-semibold">
              {year} 年 {mon} 月
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const d = new Date()
              setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
              setSelectedDay(new Date().toISOString().slice(0, 10))
            }}
            className="rounded-md border border-neutral-200 px-2.5 py-1 text-[12px] transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
          >
            {t('learning.calendar.today')}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 text-center text-[11px] text-neutral-400">
              {w}
            </div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />
            const ev = eventsByDay[day]
            const isToday = day === today
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`flex min-h-[56px] flex-col items-start rounded-md border p-1.5 text-left text-[12px] transition-colors ${
                  selectedDay === day
                    ? 'border-accent bg-accent-soft'
                    : isToday
                      ? 'border-accent/60 bg-accent-soft/40'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                }`}
              >
                <span
                  className={`ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    isToday ? 'bg-accent font-semibold text-white' : ''
                  }`}
                >
                  {day.slice(8)}
                </span>
                {ev?.schedule.map((s) => (
                  <span
                    key={`s${s.id}`}
                    data-tip={`${s.start_time}${s.end_time ? '–' + s.end_time : ''} ${s.title}`}
                    className="mt-0.5 w-full truncate rounded bg-violet-50 px-1 text-[10px] text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                  >
                    {s.start_time} {s.title}
                  </span>
                ))}
                {ev?.tasks.map((task) => (
                  <span
                    key={`t${task.id}`}
                    data-tip={task.title}
                    className="mt-0.5 w-full truncate rounded bg-blue-50 px-1 text-[10px] text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                  >
                    {task.title}
                  </span>
                ))}
                {ev?.sessions.map((s) => (
                  <span
                    key={`cs${s.id}`}
                    data-tip={s.topic}
                    className="mt-0.5 flex w-full items-center gap-0.5 truncate rounded bg-emerald-50 px-1 text-[10px] text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    <CheckCircle2 size={9} /> {s.topic}
                  </span>
                ))}
                {ev?.focus.map((f) => (
                  <span
                    key={`f${f.id}`}
                    data-tip={`${t('learning.calendar.focus')} ${f.duration_min}′`}
                    className="mt-0.5 flex w-full items-center gap-0.5 truncate rounded bg-amber-50 px-1 text-[10px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                  >
                    <Timer size={9} /> {f.duration_min}′
                  </span>
                ))}
              </button>
            )
          })}
        </div>
      </div>

      {/* day panel */}
      <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="text-[13px] font-semibold">
          {selectedDay ?? t('learning.calendar.selectDay')}
        </div>

        {selectedDay && (
          <div className="mt-2 space-y-3">
            {/* schedule add */}
            <div className="rounded-md border border-violet-100 bg-violet-50/50 p-2 dark:border-violet-900/40 dark:bg-violet-950/20">
              <div className="flex items-center gap-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                <CalendarClock size={11} />
                {t('learning.calendar.schedule')}
              </div>
              <input
                value={sTitle}
                onChange={(e) => setSTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && sTitle.trim()) addScheduleMutation.mutate()
                }}
                placeholder={t('learning.calendar.schedulePlaceholder')}
                className={`mt-1.5 w-full text-[12px] ${field}`}
              />
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  type="time"
                  value={sStart}
                  onChange={(e) => setSStart(e.target.value)}
                  className={`w-[86px] text-[12px] ${field}`}
                />
                <span className="text-[11px] text-neutral-400">–</span>
                <input
                  type="time"
                  value={sEnd}
                  onChange={(e) => setSEnd(e.target.value)}
                  className={`w-[86px] text-[12px] ${field}`}
                />
                <select
                  value={sKind}
                  onChange={(e) => setSKind(e.target.value)}
                  className={`flex-1 text-[12px] ${field}`}
                >
                  {SCHEDULE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {t(`learning.calendar.kinds.${k}`)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!sTitle.trim()}
                  onClick={() => addScheduleMutation.mutate()}
                  className="rounded-md bg-accent px-2 py-1.5 text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
                  aria-label="add"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* schedule list */}
            {selected?.schedule.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-1.5 rounded-md bg-violet-50 p-2 text-[12px] text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
              >
                <span className="shrink-0 font-mono text-[11px]">
                  {s.start_time}
                  {s.end_time ? `–${s.end_time}` : ''}
                </span>
                <span className="truncate" data-tip={s.title}>
                  {s.title}
                </span>
                <button
                  type="button"
                  onClick={() => deleteScheduleMutation.mutate(s.id)}
                  className="ml-auto shrink-0 rounded p-0.5 text-violet-300 transition-colors hover:text-red-500 dark:text-violet-600"
                  data-tip={t('inbox.delete')}
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {/* tasks */}
            {selected?.tasks.map((task) => (
              <div key={task.id} className="rounded-md bg-neutral-50 p-2 dark:bg-neutral-800/60">
                <div className="flex items-center gap-1.5">
                  <div data-tip={task.title} className="min-w-0 flex-1 truncate text-[12px]">
                    {task.title}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmDeleteTask === task.id) {
                        deleteTaskMutation.mutate(task.id)
                      } else {
                        setConfirmDeleteTask(task.id)
                        setTimeout(() => setConfirmDeleteTask(null), 2500)
                      }
                    }}
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10.5px] transition-colors ${
                      confirmDeleteTask === task.id
                        ? 'bg-red-500 text-white'
                        : 'text-neutral-400 hover:text-red-500'
                    }`}
                    data-tip={t('learning.calendar.deleteTask')}
                  >
                    {confirmDeleteTask === task.id ? (
                      t('learning.calendar.confirmDelete')
                    ) : (
                      <Trash2 size={12} />
                    )}
                  </button>
                </div>
                <input
                  type="date"
                  value={task.due_date ?? ''}
                  onChange={(e) =>
                    e.target.value &&
                    rescheduleMutation.mutate({ id: task.id, due: e.target.value })
                  }
                  className="mt-1 w-full rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] outline-none dark:border-neutral-700 dark:bg-neutral-950"
                  data-tip={t('learning.calendar.reschedule')}
                />
              </div>
            ))}

            {/* check-ins & focus */}
            {selected?.sessions.map((s) => (
              <div
                key={`cs${s.id}`}
                className="flex items-center gap-1.5 rounded-md bg-emerald-50 p-2 text-[12px] text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                <CheckCircle2 size={12} />
                <span className="truncate">{s.topic}</span>
                <span className="ml-auto shrink-0 text-[11px]">{s.duration_min}′</span>
              </div>
            ))}
            {selected?.focus.map((f) => (
              <div
                key={`cf${f.id}`}
                className="flex items-center gap-1.5 rounded-md bg-amber-50 p-2 text-[12px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              >
                <Timer size={12} />
                <span className="truncate">{t('learning.calendar.focus')}</span>
                <span className="ml-auto shrink-0 text-[11px]">{f.duration_min}′</span>
              </div>
            ))}

            {!selected && (
              <p className="text-[12px] text-neutral-400">{t('learning.calendar.noEvents')}</p>
            )}
            {selected && !selected.tasks.length && !selected.sessions.length &&
              !selected.focus.length && !selected.schedule.length && (
              <p className="text-[12px] text-neutral-400">{t('learning.calendar.noEvents')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
