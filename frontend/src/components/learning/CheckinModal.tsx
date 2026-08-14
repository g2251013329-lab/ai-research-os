import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'

const STATUSES = ['completed', 'partial', 'skipped']

export default function CheckinModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState(30)
  const [status, setStatus] = useState('completed')
  const [notes, setNotes] = useState('')
  const [reflections, setReflections] = useState('')
  const [takeaways, setTakeaways] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const submit = async () => {
    if (!topic.trim() || saving) return
    setSaving(true)
    try {
      await api('/api/learning/sessions', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim(),
          duration_min: duration,
          status,
          notes,
          reflections,
          takeaways,
        }),
      })
      setTopic('')
      setNotes('')
      setReflections('')
      setTakeaways('')
      await queryClient.invalidateQueries({ queryKey: ['learning'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const field =
    'rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-[460px] max-w-[92vw] rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">{t('learning.checkin.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={15} />
          </button>
        </div>

        <input
          autoFocus
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t('learning.checkin.topic')}
          className={`mt-3 w-full ${field}`}
        />

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 1))}
              className={`w-full ${field}`}
            />
            <span className="text-[12px] text-neutral-400">{t('learning.checkin.minutes')}</span>
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`learning.checkin.statuses.${s}`)}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder={t('learning.checkin.notes')}
          className={`mt-2.5 w-full resize-y ${field}`}
        />
        <textarea
          value={takeaways}
          onChange={(e) => setTakeaways(e.target.value)}
          rows={2}
          placeholder={t('learning.checkin.takeaways')}
          className={`mt-2 w-full resize-y ${field}`}
        />
        <textarea
          value={reflections}
          onChange={(e) => setReflections(e.target.value)}
          rows={2}
          placeholder={t('learning.checkin.reflections')}
          className={`mt-2 w-full resize-y ${field}`}
        />

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-[13px] transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!topic.trim() || saving}
            className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : t('learning.checkin.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
