import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Timer,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '../../api/client'
import { useToastStore } from '../../store/useToastStore'
import { apiDate, parseApiTime, tzOffsetMinutes } from '../../utils/time'

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

type ViewMode = 'month' | 'week' | 'day'

const SCHEDULE_KINDS = ['general', 'learning', 'research', 'experiment', 'leisure']
const DAY_START_HOUR = 7
const DAY_END_HOUR = 23
const HOUR_PX = 44

const SCHEDULE_COLORS: Record<string, string> = {
  general: 'bg-neutral-200/70 text-foreground/75 dark:bg-neutral-700/70 dark:text-foreground/85',
  learning: 'bg-sky-100 text-sky-800 dark:bg-sky-900/70 dark:text-sky-200',
  research: 'bg-violet-100 text-violet-800 dark:bg-violet-900/70 dark:text-violet-200',
  experiment: 'bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-200',
  leisure: 'bg-rose-100 text-rose-800 dark:bg-rose-900/70 dark:text-rose-200',
}

function addDays(dateStr: string, days: number): string {
  const d = parseApiTime(dateStr)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDay(dateStr: string, locale: string): string {
  return parseApiTime(dateStr).toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
  })
}

export default function CalendarView() {
  const { t, i18n } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US'
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Date(2026, 0, 5 + i).toLocaleDateString(locale, { weekday: 'narrow' }),
  )
  const queryClient = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)
  const [view, setView] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(today)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // schedule add form
  const [sTitle, setSTitle] = useState('')
  const [sStart, setSStart] = useState('09:00')
  const [sEnd, setSEnd] = useState('10:00')
  const [sKind, setSKind] = useState('general')
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<number | null>(null)

  // months needed for the current view (week may span two months)
  const months = useMemo(() => {
    const list = new Set<string>()
    const push = (d: string) => list.add(d.slice(0, 7))
    if (view === 'month') {
      push(cursor)
    } else if (view === 'week') {
      const dow = (parseApiTime(cursor).getDay() + 6) % 7
      push(addDays(cursor, -dow))
      push(addDays(cursor, -dow + 6))
    } else {
      push(cursor)
    }
    return [...list].sort()
  }, [view, cursor])

  const { data } = useQuery({
    queryKey: ['learning', 'calendar', months.join(','), tzOffsetMinutes()],
    queryFn: () =>
      Promise.all(
        months.map((m) =>
          api<{
            tasks: CalTask[]
            sessions: CalSession[]
            focus: CalFocus[]
            schedule: CalSchedule[]
          }>(`/api/learning/calendar?month=${m}&tz_offset_minutes=${tzOffsetMinutes()}`),
        ),
      ).then((parts) => ({
        tasks: parts.flatMap((p) => p.tasks),
        sessions: parts.flatMap((p) => p.sessions),
        focus: parts.flatMap((p) => p.focus),
        schedule: parts.flatMap((p) => p.schedule),
      })),
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
          date: view === 'day' ? cursor : selectedDay,
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

  // ----- navigation -----
  const nav = (dir: number) => {
    if (view === 'month') {
      const [y, m] = cursor.slice(0, 7).split('-').map(Number)
      const d = new Date(y, m - 1 + dir, 1)
      setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
    } else if (view === 'week') {
      const dow = (parseApiTime(cursor).getDay() + 6) % 7
      setCursor(addDays(cursor, -dow + dir * 7))
    } else {
      setCursor(addDays(cursor, dir))
    }
  }

  const goToday = () => {
    setCursor(today)
    setSelectedDay(today)
  }

  // ----- month grid -----
  const [year, mon] = cursor.slice(0, 7).split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const firstWeekday = (new Date(year, mon - 1, 1).getDay() + 6) % 7 // Monday=0
  const monthCells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = String(i + 1).padStart(2, '0')
      return `${cursor.slice(0, 7)}-${d}`
    }),
  ]

  // ----- week grid -----
  const weekDow = (parseApiTime(cursor).getDay() + 6) % 7
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(cursor, -weekDow + i))

  const selected = selectedDay ? eventsByDay[selectedDay] : null
  const dayEvents = cursor ? eventsByDay[cursor] : null

  // ----- day view time strip -----
  // one row per hour label (7:00..23:00 inclusive) so the last label
  // never spills out of the strip into the unscheduled section below
  const stripHeight = (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_PX
  const timeTop = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return (h - DAY_START_HOUR) * HOUR_PX + (m / 60) * HOUR_PX
  }

  const headerLabel = useMemo(() => {
    if (view === 'month')
      return new Date(year, mon - 1, 1).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
      })
    if (view === 'week') {
      const start = weekDays[0]
      const end = weekDays[6]
      if (start.slice(0, 7) === end.slice(0, 7)) return fmtDay(start, locale) + ' – ' + fmtDay(end, locale)
      return `${fmtDay(start, locale)} – ${fmtDay(end, locale)}`
    }
    return fmtDay(cursor, locale)
  }, [view, cursor, weekDays, year, mon, locale])

  const field =
    'rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-border dark:bg-surface'

  const dayCellChips = (day: string) => {
    const ev = eventsByDay[day]
    return (
      <>
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
      </>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div>
        {/* toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => nav(-1)}
              className="rounded-md p-1.5 text-foreground/45 hover:bg-surface-hover dark:hover:bg-neutral-800"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => nav(1)}
              className="rounded-md p-1.5 text-foreground/45 hover:bg-surface-hover dark:hover:bg-neutral-800"
            >
              <ChevronRight size={15} />
            </button>
            <span className="px-1 text-[14px] font-semibold">{headerLabel}</span>
            <button
              type="button"
              onClick={goToday}
              className="ml-1 rounded-md border border-border px-2.5 py-1 text-[12px] transition-colors hover:border-accent hover:text-accent dark:border-border"
            >
              {t('learning.calendar.today')}
            </button>
          </div>
          <div className="flex rounded-md border border-border p-0.5 dark:border-border">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded px-2.5 py-1 text-[12px] transition-colors ${
                  view === v
                    ? 'bg-accent-soft font-medium text-accent'
                    : 'text-foreground/55 hover:bg-surface-hover dark:text-foreground/55 dark:hover:bg-neutral-800'
                }`}
              >
                {t(`learning.calendar.view.${v}`)}
              </button>
            ))}
          </div>
        </div>

        {/* month grid */}
        {view === 'month' && (
          <div className="mt-3 grid grid-cols-7 gap-1">
            {weekdayLabels.map((w) => (
              <div key={w} className="py-1 text-center text-[11px] text-foreground/45">
                {w}
              </div>
            ))}
            {monthCells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />
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
                        : 'border-border hover:border-border dark:border-border dark:hover:border-neutral-700'
                  }`}
                >
                  <span
                    className={`ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      isToday ? 'bg-accent font-semibold text-white' : ''
                    }`}
                  >
                    {day.slice(8)}
                  </span>
                  {dayCellChips(day)}
                </button>
              )
            })}
          </div>
        )}

        {/* week grid */}
        {view === 'week' && (
          <div className="mt-3 grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <div key={day} className="py-1 text-center text-[11px] text-foreground/45">
                {parseApiTime(day).toLocaleDateString(locale, { weekday: 'short' })}
              </div>
            ))}
            {weekDays.map((day) => {
              const isToday = day === today
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`flex min-h-[96px] flex-col items-start rounded-md border p-1.5 text-left text-[12px] transition-colors ${
                    selectedDay === day
                      ? 'border-accent bg-accent-soft'
                      : isToday
                        ? 'border-accent/60 bg-accent-soft/40'
                        : 'border-border hover:border-border dark:border-border dark:hover:border-neutral-700'
                  }`}
                >
                  <span
                    className={`ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      isToday ? 'bg-accent font-semibold text-white' : ''
                    }`}
                  >
                    {day.slice(8)}
                  </span>
                  {dayCellChips(day)}
                </button>
              )
            })}
          </div>
        )}

        {/* day view: time strip */}
        {view === 'day' && (
          <div className="mt-3 overflow-hidden rounded-lg border border-border dark:border-border">
            <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-surface-hover/60 px-3 py-2 text-[12.5px] font-medium dark:border-border dark:bg-surface">
              <CalendarDays size={13} className="text-accent" />
              {fmtDay(cursor, locale)}
              {cursor === today && (
                <span className="rounded bg-accent px-1.5 py-px text-[10.5px] font-semibold text-white">
                  {t('learning.calendar.today')}
                </span>
              )}
            </div>
            <div className="relative flex" style={{ height: stripHeight }}>
              {/* hour labels */}
              <div className="w-11 shrink-0 border-r border-neutral-100 dark:border-border">
                {Array.from(
                  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
                  (_, i) => DAY_START_HOUR + i,
                ).map((h) => (
                  <div
                    key={h}
                    className="pr-1.5 text-right font-mono text-[10px] leading-[44px] text-foreground/45"
                    style={{ height: HOUR_PX }}
                  >
                    {h}:00
                  </div>
                ))}
              </div>
              {/* grid + schedules */}
              <div className="relative flex-1">
                {Array.from(
                  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
                  (_, i) => DAY_START_HOUR + i,
                ).map((h) => (
                  <div
                    key={h}
                    className="border-b border-neutral-100 dark:border-border/60"
                    style={{ height: HOUR_PX }}
                  />
                ))}
                {(dayEvents?.schedule ?? []).map((s) => {
                  const top = timeTop(s.start_time)
                  const end = s.end_time && s.end_time > s.start_time ? s.end_time : ''
                  const height = end
                    ? Math.max(20, timeTop(end) - top)
                    : HOUR_PX - 4
                  return (
                    <div
                      key={s.id}
                      data-tip={`${s.start_time}${end ? '–' + end : ''} ${s.title}`}
                      className={`absolute left-1 right-1 overflow-hidden rounded-md px-2 py-0.5 text-[11px] leading-tight ${SCHEDULE_COLORS[s.kind] ?? SCHEDULE_COLORS.general}`}
                      style={{ top: top + 2, height: height - 4 }}
                    >
                      <span className="truncate">{s.title}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* non-time-blocked items */}
            <div className="border-t border-neutral-100 bg-surface-hover/60 px-3 py-2 dark:border-border dark:bg-surface/40">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-foreground/45">
                <CalendarClock size={11} />
                {t('learning.calendar.unscheduled')}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {dayEvents?.tasks.map((task) => (
                  <span
                    key={`t${task.id}`}
                    data-tip={task.title}
                    className="truncate rounded bg-blue-50 px-2 py-1 text-[11px] text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                  >
                    {task.title}
                  </span>
                ))}
                {dayEvents?.sessions.map((s) => (
                  <span
                    key={`cs${s.id}`}
                    data-tip={s.topic}
                    className="flex items-center gap-1 truncate rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    <CheckCircle2 size={10} /> {s.topic}
                  </span>
                ))}
                {dayEvents?.focus.map((f) => (
                  <span
                    key={`cf${f.id}`}
                    data-tip={`${t('learning.calendar.focus')} ${f.duration_min}′`}
                    className="flex items-center gap-1 truncate rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                  >
                    <Timer size={10} /> {f.duration_min}′
                  </span>
                ))}
                {!dayEvents?.tasks.length &&
                  !dayEvents?.sessions.length &&
                  !dayEvents?.focus.length &&
                  !dayEvents?.schedule.length && (
                    <span className="text-[11.5px] text-foreground/45">
                      {t('learning.calendar.noEvents')}
                    </span>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* side panel */}
      <div className="rounded-lg border border-border bg-surface p-3 shadow-card dark:border-border dark:bg-surface">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold">
          <Clock3 size={13} className="text-foreground/45" />
          {view === 'day' ? fmtDay(cursor, locale) : (selectedDay ?? t('learning.calendar.selectDay'))}
        </div>

        {(view === 'day' ? cursor : selectedDay) && (
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
                <span className="text-[11px] text-foreground/45">–</span>
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
                  className="rounded-lg bg-accent px-2 py-1.5 text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
                  aria-label="add"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* schedule list */}
            {(view === 'day' ? dayEvents : selected)?.schedule.map((s) => (
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
            {(view === 'day' ? dayEvents : selected)?.tasks.map((task) => (
              <div key={task.id} className="rounded-md bg-surface-hover p-2 dark:bg-neutral-800/60">
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
                        : 'text-foreground/45 hover:text-red-500'
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
                  className="mt-1 w-full rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] outline-none dark:border-border dark:bg-surface"
                  data-tip={t('learning.calendar.reschedule')}
                />
              </div>
            ))}

            {/* check-ins & focus */}
            {(view === 'day' ? dayEvents : selected)?.sessions.map((s) => (
              <div
                key={`cs${s.id}`}
                className="flex items-center gap-1.5 rounded-md bg-emerald-50 p-2 text-[12px] text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                <CheckCircle2 size={12} />
                <span className="truncate">{s.topic}</span>
                <span className="ml-auto shrink-0 text-[11px]">{s.duration_min}′</span>
              </div>
            ))}
            {(view === 'day' ? dayEvents : selected)?.focus.map((f) => (
              <div
                key={`cf${f.id}`}
                className="flex items-center gap-1.5 rounded-md bg-amber-50 p-2 text-[12px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              >
                <Timer size={12} />
                <span className="truncate">{t('learning.calendar.focus')}</span>
                <span className="ml-auto shrink-0 text-[11px]">{f.duration_min}′</span>
              </div>
            ))}

            {!(view === 'day' ? dayEvents : selected) && (
              <p className="text-[12px] text-foreground/45">{t('learning.calendar.noEvents')}</p>
            )}
            {(view === 'day' ? dayEvents : selected) &&
              !(view === 'day' ? dayEvents : selected)!.tasks.length &&
              !(view === 'day' ? dayEvents : selected)!.sessions.length &&
              !(view === 'day' ? dayEvents : selected)!.focus.length &&
              !(view === 'day' ? dayEvents : selected)!.schedule.length && (
                <p className="text-[12px] text-foreground/45">{t('learning.calendar.noEvents')}</p>
              )}
          </div>
        )}
      </div>
    </div>
  )
}
