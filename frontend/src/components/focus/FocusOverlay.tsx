import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pause, Play, Timer, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useToastStore } from '../../store/useToastStore'
import { useUiStore } from '../../store/useUiStore'

interface Task {
  id: number
  title: string
  status: string
}

const PRESETS = [25, 50, 90]

const CUSTOM = -1

export default function FocusOverlay() {
  const { t } = useTranslation()
  const open = useUiStore((s) => s.focusOpen)
  const close = useUiStore((s) => s.closeFocus)
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const { data: tasks } = useQuery({
    queryKey: ['tasks', 'active'],
    queryFn: () => api<Task[]>('/api/tasks?limit=50'),
    enabled: open,
    select: (all) => all.filter((task) => task.status !== 'done'),
  })

  const [minutes, setMinutes] = useState(25)
  const [taskId, setTaskId] = useState<number | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [remaining, setRemaining] = useState<number | null>(null) // seconds
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (open) {
      setMinutes(25)
      setTaskId(null)
      setCustomTitle('')
      setRemaining(null)
      setRunning(false)
    }
  }, [open])

  useEffect(() => {
    if (!running || remaining === null) return
    const timer = setInterval(() => {
      setRemaining((r) => {
        if (r === null || r <= 1) {
          clearInterval(timer)
          setRunning(false)
          void finish()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  const finish = async () => {
    const taskTitle =
      taskId === CUSTOM
        ? customTitle.trim()
        : (tasks?.find((t2) => t2.id === taskId)?.title ?? '')
    try {
      await api('/api/focus/sessions', {
        method: 'POST',
        body: JSON.stringify({
          duration_min: minutes,
          task_title: taskTitle,
        }),
      })
      toast(t('focus.completedToast'))
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    }
    close()
  }

  const display = useMemo(() => {
    if (remaining === null) return String(minutes).padStart(2, '0') + ':00'
    const m = Math.floor(remaining / 60)
    const s = remaining % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [remaining, minutes])

  if (!open) return null

  const field =
    'rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-border dark:bg-surface'

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[380px] max-w-[92vw] rounded-2xl border border-border bg-surface p-6 text-center shadow-2xl dark:border-border dark:bg-surface">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground/55 dark:text-foreground/55">
            <Timer size={14} className="text-accent" /> {t('focus.title')}
          </span>
          <button
            type="button"
            onClick={close}
            className="rounded p-1 text-foreground/45 hover:bg-surface-hover dark:hover:bg-neutral-800"
          >
            <X size={15} />
          </button>
        </div>

        {/* task picker */}
        <select
          value={taskId === CUSTOM ? 'custom' : taskId ?? ''}
          onChange={(e) => {
            const v = e.target.value
            setTaskId(v === 'custom' ? CUSTOM : v ? Number(v) : null)
          }}
          className={`mt-4 w-full ${field}`}
        >
          <option value="">{t('focus.noTask')}</option>
          {(tasks ?? []).map((task) => (
            <option key={task.id} value={task.id} data-tip={task.title}>
              {task.title.length > 30 ? task.title.slice(0, 30) + '…' : task.title}
            </option>
          ))}
          <option value="custom">{t('focus.custom')}</option>
        </select>
        {taskId === CUSTOM && (
          <input
            autoFocus
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder={t('focus.customPlaceholder')}
            className={`mt-2 w-full ${field}`}
          />
        )}

        {/* duration presets */}
        {remaining === null && (
          <div className="mt-3 flex justify-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMinutes(p)}
                className={`rounded-md border px-3 py-1.5 text-[13px] transition-colors ${
                  minutes === p
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border hover:border-border dark:border-border dark:hover:border-neutral-600'
                }`}
              >
                {p}′
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
              className={`w-16 text-center ${field}`}
              placeholder="自定义"
            />
          </div>
        )}

        {/* timer */}
        <div className="mt-6 font-mono text-[56px] font-light leading-none tracking-tight">
          {display}
        </div>
        <div className="mt-1 text-[12px] text-foreground/45">{t('focus.currentTask')}</div>

        <div className="mt-6 flex justify-center gap-2">
          {remaining === null ? (
            <button
              type="button"
              onClick={() => {
                setRemaining(minutes * 60)
                setRunning(true)
              }}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
            >
              <Play size={13} /> {t('focus.start')}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setRunning((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
              >
                {running ? <Pause size={13} /> : <Play size={13} />}
                {running ? t('focus.pause') : t('focus.resume')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRemaining(0)
                }}
                className="rounded-md border border-border px-4 py-2 text-[13px] transition-colors hover:bg-surface-hover dark:border-border dark:hover:bg-neutral-800"
              >
                {t('focus.finishEarly')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
