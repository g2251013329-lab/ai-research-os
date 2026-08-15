import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import { api } from '../../api/client'
import { useUiStore } from '../../store/useUiStore'
import { useQueryClient } from '@tanstack/react-query'

const KINDS = ['general', 'learning', 'research', 'experiment']
const PRIORITIES = ['low', 'medium', 'high']

export default function TaskModal() {
  const { t } = useTranslation()
  const open = useUiStore((s) => s.taskModalOpen)
  const taskModalKind = useUiStore((s) => s.taskModalKind)
  const close = useUiStore((s) => s.closeTaskModal)
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('general')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setKind(taskModalKind)
  }, [open, taskModalKind])

  if (!open) return null

  const submit = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      await api('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          kind,
          priority,
          due_date: dueDate || null,
          description: description.trim(),
        }),
      })
      setTitle('')
      setDescription('')
      setDueDate('')
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      await queryClient.invalidateQueries({ queryKey: ['learning', 'calendar'] })
      close()
    } finally {
      setSaving(false)
    }
  }

  const field =
    'rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-border dark:bg-surface'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="w-[440px] max-w-[92vw] rounded-xl border border-border bg-surface p-4 shadow-2xl dark:border-border dark:bg-surface">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">{t('task.new')}</h2>
          <button
            type="button"
            onClick={close}
            className="rounded p-1 text-foreground/45 hover:bg-surface-hover dark:hover:bg-neutral-800"
          >
            <X size={15} />
          </button>
        </div>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
          placeholder={t('task.titlePlaceholder')}
          className={`mt-3 w-full ${field}`}
        />

        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`task.kinds.${k}`)}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={field}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {t(`task.priorities.${p}`)}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={field}
          />
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder={t('task.descriptionPlaceholder')}
          className={`mt-2.5 w-full resize-y ${field}`}
        />

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-border px-3 py-1.5 text-[13px] transition-colors hover:bg-surface-hover dark:border-border dark:hover:bg-neutral-800"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!title.trim() || saving}
            className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : t('task.create')}
          </button>
        </div>
      </div>
    </div>
  )
}
