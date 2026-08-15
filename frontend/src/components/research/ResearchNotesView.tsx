import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FileText, Loader2, Plus, X } from 'lucide-react'
import { api } from '../../api/client'
import { useToastStore } from '../../store/useToastStore'

interface Note {
  path: string
  title: string
  relative: string
  created: string
}

export default function ResearchNotesView({ projectId }: { projectId: number }) {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: notes } = useQuery({
    queryKey: ['research', 'notes', projectId],
    queryFn: () => api<Note[]>(`/api/research/notes?project_id=${projectId}`),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api('/api/research/notes', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), content, project_id: projectId }),
      }),
    onSuccess: () => {
      setTitle('')
      setContent('')
      setCreating(false)
      void queryClient.invalidateQueries({ queryKey: ['research', 'notes'] })
    },
  })

  const openMutation = useMutation({
    mutationFn: (path: string) =>
      api('/api/system/open-file', { method: 'POST', body: JSON.stringify({ path, app: 'Obsidian' }) }),
    onSuccess: () => toast(t('search.openedInObsidian')),
    onError: (e) => toast(e instanceof Error ? e.message : String(e)),
  })

  const field =
    'rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-border dark:bg-surface'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-foreground/45">{t('research.note.hint')}</p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-[12px] font-medium text-white transition-colors hover:bg-accent-dark"
        >
          <Plus size={12} /> {t('research.note.new')}
        </button>
      </div>

      <div className="divide-y divide-border-subtle rounded-lg border border-border bg-surface dark:divide-border-subtle dark:border-border dark:bg-surface">
        {(notes ?? []).length === 0 && (
          <p className="px-4 py-10 text-center text-[12.5px] text-foreground/45">{t('research.note.empty')}</p>
        )}
        {(notes ?? []).map((note) => (
          <div key={note.path} className="flex items-center gap-3 px-4 py-3">
            <FileText size={15} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px]" data-tip={note.title}>
                {note.title}
              </div>
              <div className="truncate text-[11px] text-foreground/45">
                {note.relative}
                {note.created && ` · ${note.created}`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => openMutation.mutate(note.path)}
              className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[12px] transition-colors hover:border-accent hover:text-accent dark:border-border"
            >
              <ExternalLink size={11} /> {t('research.note.open')}
            </button>
          </div>
        ))}
      </div>

      {creating && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreating(false)
          }}
        >
          <div className="w-[480px] max-w-[92vw] rounded-xl border border-border bg-surface p-4 shadow-2xl dark:border-border dark:bg-surface">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">{t('research.note.new')}</h2>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded p-1 text-foreground/45 hover:bg-surface-hover dark:hover:bg-neutral-800"
              >
                <X size={15} />
              </button>
            </div>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('research.note.titlePlaceholder')}
              className={`mt-3 w-full ${field}`}
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder={t('research.note.contentPlaceholder')}
              className={`mt-2 w-full resize-y ${field}`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-md border border-border px-3 py-1.5 text-[13px] transition-colors hover:bg-surface-hover dark:border-border dark:hover:bg-neutral-800"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaving(true)
                  createMutation.mutate(undefined, { onSettled: () => setSaving(false) })
                }}
                disabled={!title.trim() || saving}
                className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : t('research.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
