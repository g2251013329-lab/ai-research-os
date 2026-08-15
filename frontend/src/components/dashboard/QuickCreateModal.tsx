import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  FileUp,
  FlaskConical,
  FolderKanban,
  HelpCircle,
  Loader2,
  X,
} from 'lucide-react'
import { api, uploadFile } from '../../api/client'
import { useToastStore } from '../../store/useToastStore'
import { useUiStore, type QuickTab } from '../../store/useUiStore'

interface Project {
  id: number
  title: string
}

const TABS: { id: QuickTab; icon: typeof BookOpen; labelKey: string }[] = [
  { id: 'project', icon: FolderKanban, labelKey: 'quickCreate.tabs.project' },
  { id: 'paper', icon: BookOpen, labelKey: 'quickCreate.tabs.paper' },
  { id: 'experiment', icon: FlaskConical, labelKey: 'quickCreate.tabs.experiment' },
  { id: 'question', icon: HelpCircle, labelKey: 'quickCreate.tabs.question' },
]

export default function QuickCreateModal() {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const tab = useUiStore((s) => s.quickCreateTab)
  const close = useUiStore((s) => s.closeQuickCreate)

  const [projectId, setProjectId] = useState<number | ''>('')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Project[]>('/api/projects'),
    enabled: tab !== null,
  })

  if (tab === null) return null

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['projects'] })
    void queryClient.invalidateQueries({ queryKey: ['papers'] })
    void queryClient.invalidateQueries({ queryKey: ['experiments'] })
    void queryClient.invalidateQueries({ queryKey: ['questions'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const uploadPdf = async (file: File) => {
    setUploading(true)
    try {
      const r = await uploadFile<{ created: boolean }>('/api/papers/upload', file, {
        project_id: projectId ? String(projectId) : '',
      })
      toast(r.created ? t('quickCreate.uploaded') : t('quickCreate.duplicated'))
      invalidateAll()
      close()
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
    }
  }

  const createProject = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      await api('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), description: desc.trim() }),
      })
      setTitle('')
      setDesc('')
      toast(t('quickCreate.created'))
      invalidateAll()
      close()
    } finally {
      setSaving(false)
    }
  }

  const createExperiment = async () => {
    if (!projectId || !title.trim() || saving) return
    setSaving(true)
    try {
      await api('/api/experiments', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, title: title.trim() }),
      })
      setTitle('')
      toast(t('quickCreate.created'))
      invalidateAll()
      close()
    } finally {
      setSaving(false)
    }
  }

  const createQuestion = async () => {
    if (!projectId || !title.trim() || saving) return
    setSaving(true)
    try {
      await api('/api/questions', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, title: title.trim(), description: desc.trim() }),
      })
      setTitle('')
      setDesc('')
      toast(t('quickCreate.created'))
      invalidateAll()
      close()
    } finally {
      setSaving(false)
    }
  }

  const submit = () => {
    if (tab === 'project') void createProject()
    else if (tab === 'experiment') void createExperiment()
    else if (tab === 'question') void createQuestion()
  }

  const field =
    'rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-border dark:bg-surface'
  const busy = saving || uploading

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="w-[520px] max-w-[92vw] rounded-xl border border-border bg-surface p-4 shadow-2xl dark:border-border dark:bg-surface">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">{t('quickCreate.title')}</h2>
          <button
            type="button"
            onClick={close}
            className="rounded p-1 text-foreground/45 hover:bg-surface-hover dark:hover:bg-neutral-800"
          >
            <X size={15} />
          </button>
        </div>

        {/* tabs */}
        <div className="mt-3 flex gap-1.5">
          {TABS.map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setProjectId('')
                setTitle('')
                setDesc('')
                useUiStore.getState().openQuickCreate(id)
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-[12.5px] transition-colors ${
                tab === id
                  ? 'border-accent bg-accent-soft font-medium text-accent'
                  : 'border-border text-foreground/55 hover:border-border dark:border-border dark:text-foreground/55'
              }`}
            >
              <Icon size={13} />
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* project tab */}
        {tab === 'project' && (
          <div className="mt-3">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('quickCreate.projectTitle')}
              className={`w-full ${field}`}
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder={t('quickCreate.projectDesc')}
              className={`mt-2 w-full resize-y ${field}`}
            />
          </div>
        )}

        {/* paper tab: drag & drop */}
        {tab === 'paper' && (
          <div className="mt-3">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file) void uploadPdf(file)
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
                dragging
                  ? 'border-accent bg-accent-soft'
                  : 'border-border hover:border-accent dark:border-border'
              }`}
            >
              <FileUp size={22} className="text-accent" />
              <p className="text-[13px] font-medium">{t('quickCreate.dropHint')}</p>
              <p className="text-[11.5px] text-foreground/45">{t('quickCreate.dropSub')}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void uploadPdf(file)
                  e.target.value = ''
                }}
              />
              {uploading && (
                <Loader2 size={16} className="animate-spin text-accent" />
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
                className={`flex-1 ${field}`}
              >
                <option value="">{t('quickCreate.noProject')}</option>
                {(projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <a
                href="/literature"
                className="shrink-0 text-[12px] text-accent hover:underline"
              >
                {t('quickCreate.fromZotero')} →
              </a>
            </div>
          </div>
        )}

        {/* experiment / question tabs */}
        {(tab === 'experiment' || tab === 'question') && (
          <div className="mt-3">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
              className={`w-full ${field}`}
            >
              <option value="">{t('quickCreate.pickProject')}</option>
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                tab === 'experiment'
                  ? t('quickCreate.experimentTitle')
                  : t('quickCreate.questionTitle')
              }
              className={`mt-2 w-full ${field}`}
            />
            {tab === 'question' && (
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
                placeholder={t('quickCreate.questionDesc')}
                className={`mt-2 w-full resize-y ${field}`}
              />
            )}
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-border px-3 py-1.5 text-[13px] transition-colors hover:bg-surface-hover dark:border-border dark:hover:bg-neutral-800"
          >
            {t('common.cancel')}
          </button>
          {tab !== 'paper' && (
            <button
              type="button"
              onClick={submit}
              disabled={
                busy ||
                !title.trim() ||
                ((tab === 'experiment' || tab === 'question') && !projectId)
              }
              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : t('quickCreate.create')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
