import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FilePenLine, Loader2, Plus, Sparkles, X } from 'lucide-react'
import { api } from '../../api/client'
import { useToastStore } from '../../store/useToastStore'
import AiModal from '../ai/AiModal'

interface Doc {
  path: string
  title: string
  relative: string
  created: string
  status?: string
}

export default function WritingView({ projectId }: { projectId: number }) {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Doc | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [aiDoc, setAiDoc] = useState<Doc | null>(null)
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiRunning, setAiRunning] = useState(false)

  const { data: docs } = useQuery({
    queryKey: ['research', 'writing', projectId],
    queryFn: () => api<Doc[]>(`/api/research/writing?project_id=${projectId}`),
  })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['research', 'writing'] })

  const createMutation = useMutation({
    mutationFn: () =>
      api('/api/research/writing', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), content, project_id: projectId }),
      }),
    onSuccess: () => {
      setTitle('')
      setContent('')
      setCreating(false)
      invalidate()
    },
  })

  const openEdit = async (doc: Doc) => {
    const item = await api<{ path: string; title: string; content: string }>(
      `/api/research/writing/item?path=${encodeURIComponent(doc.path)}`,
    )
    setEditing(doc)
    setEditContent(item.content)
  }

  const saveEdit = async () => {
    if (!editing || saving) return
    setSaving(true)
    try {
      await api(
        `/api/research/writing/item?path=${encodeURIComponent(editing.path)}`,
        { method: 'PATCH', body: JSON.stringify({ content: editContent }) },
      )
      setEditing(null)
      invalidate()
    } finally {
      setSaving(false)
    }
  }

  const openMutation = useMutation({
    mutationFn: (path: string) =>
      api('/api/system/open-file', { method: 'POST', body: JSON.stringify({ path, app: 'Obsidian' }) }),
    onSuccess: () => toast(t('search.openedInObsidian')),
    onError: (e) => toast(e instanceof Error ? e.message : String(e)),
  })

  const field =
    'rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-neutral-400">{t('research.writing.hint')}</p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-[12px] font-medium text-white transition-colors hover:bg-accent-dark"
        >
          <Plus size={12} /> {t('research.writing.new')}
        </button>
      </div>

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
        {(docs ?? []).length === 0 && (
          <p className="px-4 py-10 text-center text-[12.5px] text-neutral-400">
            {t('research.writing.empty')}
          </p>
        )}
        {(docs ?? []).map((doc) => (
          <div key={doc.path} className="flex items-center gap-3 px-4 py-3">
            <FilePenLine size={15} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px]" data-tip={doc.title}>
                {doc.title}
              </div>
              <div className="truncate text-[11px] text-neutral-400">
                {doc.relative}
                {doc.created && ` · ${doc.created}`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAiDoc(doc)
                setAiInstruction('')
              }}
              className="flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[12px] transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
              data-tip={t('ai.writingAssist')}
            >
              <Sparkles size={11} />
              {t('ai.writingAssist')}
            </button>
            <button
              type="button"
              onClick={() => void openEdit(doc)}
              className="flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[12px] transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
            >
              {t('research.writing.edit')}
            </button>
            <button
              type="button"
              onClick={() => openMutation.mutate(doc.path)}
              className="flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[12px] transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
            >
              <ExternalLink size={11} /> {t('research.writing.open')}
            </button>
          </div>
        ))}
      </div>

      {/* AI assistant: instruction input → result modal → apply */}
      {aiDoc && !aiRunning && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAiDoc(null)
          }}
        >
          <div className="w-[480px] max-w-[92vw] rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <h2 className="truncate text-[14px] font-semibold" data-tip={aiDoc.title}>
                {t('ai.writingAssist')}: {aiDoc.title}
              </h2>
              <button
                type="button"
                onClick={() => setAiDoc(null)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={15} />
              </button>
            </div>
            <textarea
              autoFocus
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              rows={3}
              placeholder={t('ai.writingInstruction')}
              className={`mt-3 w-full resize-y rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAiDoc(null)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-[13px] transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => setAiRunning(true)}
                className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
              >
                <Sparkles size={13} className="mr-1 inline" />
                {t('ai.generate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {aiDoc && aiRunning && (
        <AiModal
          title={`${t('ai.writingAssist')}: ${aiDoc.title.slice(0, 40)}`}
          fetcher={async () => {
            const item = await api<{ content: string }>(
              `/api/research/writing/item?path=${encodeURIComponent(aiDoc.path)}`,
            )
            const r = await api<{ suggestion: string }>('/api/ai/writing-assist', {
              method: 'POST',
              body: JSON.stringify({
                content: item.content,
                instruction: aiInstruction,
              }),
            })
            return r.suggestion
          }}
          onApply={async (text) => {
            await api(
              `/api/research/writing/item?path=${encodeURIComponent(aiDoc.path)}`,
              { method: 'PATCH', body: JSON.stringify({ content: text }) },
            )
            invalidate()
            setAiDoc(null)
            setAiRunning(false)
          }}
          onClose={() => {
            setAiDoc(null)
            setAiRunning(false)
          }}
        />
      )}

      {creating && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreating(false)
          }}
        >
          <div className="w-[520px] max-w-[92vw] rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">{t('research.writing.new')}</h2>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={15} />
              </button>
            </div>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('research.writing.titlePlaceholder')}
              className={`mt-3 w-full ${field}`}
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder={t('research.writing.contentPlaceholder')}
              className={`mt-2 w-full resize-y font-mono text-[12.5px] ${field}`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-[13px] transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
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

      {editing && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditing(null)
          }}
        >
          <div className="flex max-h-[86vh] w-[720px] max-w-[94vw] flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <h2 className="truncate text-[14px] font-semibold" data-tip={editing.title}>
                {editing.title}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={15} />
              </button>
            </div>
            <textarea
              autoFocus
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={20}
              className={`mt-3 w-full flex-1 resize-y font-mono text-[12.5px] leading-relaxed ${field}`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-[13px] transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={saving}
                className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
