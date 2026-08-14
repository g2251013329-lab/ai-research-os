import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Circle, Inbox, Loader2, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import { useToastStore } from '../store/useToastStore'
import { relativeTime } from '../utils/time'

interface InboxItem {
  id: number
  kind: string
  text: string
  source_url: string
  status: string
  created_at: string
}

const KIND_STYLES: Record<string, string> = {
  paper: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  idea: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  task: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  question: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  experiment: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  url: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  github: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  note: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
  reference: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  image: 'bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300',
  other: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
}

export default function InboxPage() {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all')
  const [text, setText] = useState('')
  const [kind, setKind] = useState('other')
  const [saving, setSaving] = useState(false)

  const { data: items } = useQuery({
    queryKey: ['inbox', filter],
    queryFn: () =>
      api<InboxItem[]>(filter === 'all' ? '/api/inbox' : `/api/inbox?status=${filter}`),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['inbox'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const addMutation = useMutation({
    mutationFn: () =>
      api('/api/inbox', { method: 'POST', body: JSON.stringify({ kind, text: text.trim() }) }),
    onSuccess: () => {
      setText('')
      invalidate()
    },
    onError: (e) => toast(e instanceof Error ? e.message : String(e)),
  })

  const toggleMutation = useMutation({
    mutationFn: (item: InboxItem) =>
      api(`/api/inbox/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: item.status === 'done' ? 'open' : 'done' }),
      }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/api/inbox/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const field =
    'rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950'

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-lg font-semibold">{t('inbox.title')}</h1>
      <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
        {t('inbox.subtitle')}
      </p>

      {/* quick add */}
      <div className="mt-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && text.trim()) {
              setSaving(true)
              addMutation.mutate(undefined, { onSettled: () => setSaving(false) })
            }
          }}
          placeholder={t('inbox.placeholder')}
          className={`flex-1 ${field}`}
        />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={`w-32 ${field}`}>
          {[
            'paper',
            'idea',
            'note',
            'url',
            'image',
            'experiment',
            'question',
            'github',
            'task',
            'reference',
            'other',
          ].map((k) => (
            <option key={k} value={k}>
              {t(`inbox.kinds.${k}`)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!text.trim() || saving}
          onClick={() => {
            setSaving(true)
            addMutation.mutate(undefined, { onSettled: () => setSaving(false) })
          }}
          className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Inbox size={13} />}
          {t('inbox.add')}
        </button>
      </div>

      {/* filters */}
      <div className="mt-3 flex gap-1">
        {(['all', 'open', 'done'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${
              filter === f
                ? 'bg-accent-soft font-medium text-accent'
                : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
          >
            {t(`inbox.filters.${f}`)}
          </button>
        ))}
      </div>

      {/* list */}
      <div className="mt-3 divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
        {(items ?? []).length === 0 && (
          <p className="px-4 py-10 text-center text-[12.5px] text-neutral-400">
            {t('inbox.empty')}
          </p>
        )}
        {(items ?? []).map((item) => (
          <div key={item.id} className="flex items-start gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => toggleMutation.mutate(item)}
              className={`mt-0.5 transition-colors hover:text-accent ${
                item.status === 'done'
                  ? 'text-accent'
                  : 'text-neutral-300 dark:text-neutral-600'
              }`}
              title={t('inbox.toggleDone')}
            >
              {item.status === 'done' ? <Check size={17} /> : <Circle size={17} />}
            </button>
            <div className="min-w-0 flex-1">
              <div
                className={`text-[13.5px] leading-snug ${
                  item.status === 'done' ? 'text-neutral-400 line-through' : ''
                }`}
              >
                {item.text}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-400">
                <span
                  className={`rounded px-1.5 py-px ${KIND_STYLES[item.kind] ?? KIND_STYLES.other}`}
                >
                  {t(`inbox.kinds.${item.kind}`)}
                </span>
                {item.source_url && <span className="truncate">{item.source_url}</span>}
                <span>{relativeTime(item.created_at)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => deleteMutation.mutate(item.id)}
              className="mt-0.5 rounded p-1 text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-neutral-600 dark:hover:bg-red-950/40"
              title={t('inbox.delete')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
