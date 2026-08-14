import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronLeft, ChevronRight, Timer } from 'lucide-react'
import { api } from '../../api/client'

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

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

export default function CalendarView() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['learning', 'calendar', month],
    queryFn: () =>
      api<{ tasks: CalTask[]; sessions: CalSession[]; focus: CalFocus[] }>(
        `/api/learning/calendar?month=${month}`,
      ),
  })

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, due }: { id: number; due: string }) =>
      api(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ due_date: due }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['learning', 'calendar'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const [year, mon] = month.split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const firstWeekday = (new Date(year, mon - 1, 1).getDay() + 6) % 7 // Monday=0
  const today = new Date().toISOString().slice(0, 10)

  const eventsByDay = useMemo(() => {
    const map: Record<string, { tasks: CalTask[]; sessions: CalSession[]; focus: CalFocus[] }> = {}
    for (const task of data?.tasks ?? []) {
      const d = task.due_date ?? ''
      if (!d) continue
      ;(map[d] ??= { tasks: [], sessions: [], focus: [] }).tasks.push(task)
    }
    for (const s of data?.sessions ?? []) {
      ;(map[s.session_date] ??= { tasks: [], sessions: [], focus: [] }).sessions.push(s)
    }
    for (const f of data?.focus ?? []) {
      const d = f.ended_at.slice(0, 10)
      ;(map[d] ??= { tasks: [], sessions: [], focus: [] }).focus.push(f)
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

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
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
                {ev?.tasks.map((task) => (
                  <span
                    key={`t${task.id}`}
                    className="mt-0.5 w-full truncate rounded bg-blue-50 px-1 text-[10px] text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                  >
                    {task.title}
                  </span>
                ))}
                {ev?.sessions.map((s) => (
                  <span
                    key={`s${s.id}`}
                    className="mt-0.5 flex w-full items-center gap-0.5 truncate rounded bg-emerald-50 px-1 text-[10px] text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    <CheckCircle2 size={9} /> {s.topic}
                  </span>
                ))}
                {ev?.focus.map((f) => (
                  <span
                    key={`f${f.id}`}
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
        {selectedDay && !selected && (
          <p className="mt-3 text-[12px] text-neutral-400">{t('learning.calendar.noEvents')}</p>
        )}
        {selected && (
          <div className="mt-2 space-y-2">
            {selected.tasks.map((task) => (
              <div key={task.id} className="rounded-md bg-neutral-50 p-2 dark:bg-neutral-800/60">
                <div className="truncate text-[12px]">{task.title}</div>
                <input
                  type="date"
                  value={task.due_date ?? ''}
                  onChange={(e) =>
                    e.target.value &&
                    rescheduleMutation.mutate({ id: task.id, due: e.target.value })
                  }
                  className="mt-1 w-full rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] outline-none dark:border-neutral-700 dark:bg-neutral-950"
                  title={t('learning.calendar.reschedule')}
                />
              </div>
            ))}
            {selected.sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-1.5 rounded-md bg-emerald-50 p-2 text-[12px] text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                <CheckCircle2 size={12} />
                <span className="truncate">{s.topic}</span>
                <span className="ml-auto shrink-0 text-[11px]">{s.duration_min}′</span>
              </div>
            ))}
            {selected.focus.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-1.5 rounded-md bg-amber-50 p-2 text-[12px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
              >
                <Timer size={12} />
                <span className="truncate">{t('learning.calendar.focus')}</span>
                <span className="ml-auto shrink-0 text-[11px]">{f.duration_min}′</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
