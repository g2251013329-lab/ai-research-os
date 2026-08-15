import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ExternalLink,
  FileUp,
  GitBranch,
  Loader2,
  Pencil,
  Scale,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { api, uploadFile } from '../../api/client'
import { useToastStore } from '../../store/useToastStore'
import AiModal from '../ai/AiModal'
import RelatedPapersModal from './RelatedPapersModal'

interface Paper {
  id: number
  title: string
  authors: string
  year: string
  journal: string
  doi: string
  url: string
  abstract: string
  status: string
  project_id: number | null
  zotero_key: string
  local_path: string
}

interface Project {
  id: number
  title: string
}

const STATUSES = ['unread', 'reading', 'read']

export default function MyPapersList() {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [aiPaper, setAiPaper] = useState<Paper | null>(null)
  const [relatedPaper, setRelatedPaper] = useState<Paper | null>(null)
  const [editing, setEditing] = useState<Paper | null>(null)
  const [compareFrom, setCompareFrom] = useState<Paper | null>(null)
  const [compareWith, setCompareWith] = useState<Paper | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [editForm, setEditForm] = useState({
    title: '',
    authors: '',
    year: '',
    journal: '',
    doi: '',
    url: '',
    abstract: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: papers } = useQuery({
    queryKey: ['papers', 'all'],
    queryFn: () => api<Paper[]>('/api/papers'),
  })
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Project[]>('/api/projects'),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['papers'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const uploadPdf = async (file: File) => {
    setUploading(true)
    try {
      const r = await uploadFile<{ created: boolean }>('/api/papers/upload', file)
      toast(r.created ? t('quickCreate.uploaded') : t('quickCreate.duplicated'))
      invalidate()
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
    }
  }

  const openInReader = async (p: Paper) => {
    try {
      let path: string | null = p.local_path || null
      if (!path && p.zotero_key) {
        const atts = await api<{ path: string }[]>(
          `/api/zotero/items/${p.zotero_key}/attachments`,
        )
        path = atts[0]?.path ?? null
      }
      if (!path) {
        toast(t('literature.noAttachment'))
        return
      }
      await api('/api/system/open-file', {
        method: 'POST',
        body: JSON.stringify({ path, app: '小绿鲸英文文献阅读器' }),
      })
      toast(t('literature.openedReader'))
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    }
  }

  const patchMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Paper> }) =>
      api(`/api/papers/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/api/papers/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const openEdit = (p: Paper) => {
    setEditForm({
      title: p.title,
      authors: p.authors,
      year: p.year,
      journal: p.journal,
      doi: p.doi,
      url: p.url,
      abstract: p.abstract,
    })
    setEditing(p)
  }

  const field =
    'rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-border dark:bg-surface'

  return (
    <div className="space-y-2">
      {/* compact drop zone */}
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
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-1.5 text-[11.5px] transition-colors ${
          dragging
            ? 'border-accent bg-accent-soft text-accent'
            : 'border-border text-foreground/45 hover:border-accent hover:text-accent dark:border-border'
        }`}
      >
        <FileUp size={13} />
        {t('research.paper.dropHint')}
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
        {uploading && <Loader2 size={12} className="animate-spin" />}
      </div>

      {/* toolbar: search + status filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('literature.mineSearchPlaceholder')}
          className="w-52 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] outline-none transition-colors focus:border-accent"
        />
        {['all', 'unread', 'reading', 'read'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${
              statusFilter === s
                ? 'bg-accent-soft font-medium text-accent'
                : 'text-foreground/55 hover:bg-surface-hover'
            }`}
          >
            {s === 'all' ? t('literature.filterAll') : t(`research.paper.statuses.${s}`)}
          </button>
        ))}
      </div>

      {/* database-style rows */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        {/* column header */}
        <div className="grid grid-cols-[minmax(0,1fr)_120px_90px_auto] items-center gap-2 border-b border-border bg-surface-hover/60 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-foreground/40">
          <span>{t('literature.colPaper')}</span>
          <span>{t('research.paper.assignProject')}</span>
          <span>{t('literature.colStatus')}</span>
          <span className="w-[168px]">{t('literature.colActions')}</span>
        </div>
        <div className="divide-y divide-border-subtle">
        {(papers ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-[12.5px] text-foreground/45">
            {t('literature.mineEmpty')}
          </p>
        )}
        {(papers ?? [])
          .filter((p) => statusFilter === 'all' || p.status === statusFilter)
          .filter((p) => {
            if (!query.trim()) return true
            const q = query.trim().toLowerCase()
            return [p.title, p.authors, p.journal, p.doi].some((v) =>
              v.toLowerCase().includes(q),
            )
          })
          .map((p) => (
          <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_120px_90px_auto] items-center gap-2 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-[13px] font-medium"
                data-tip={p.title}
              >
                {p.title}
              </div>
              <div
                className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-foreground/45"
                data-tip={[p.authors, p.year, p.journal].filter(Boolean).join(' · ')}
              >
                <span className="truncate">
                  {[p.authors, p.year, p.journal].filter(Boolean).join(' · ')}
                </span>
                {p.project_id == null ? (
                  <span className="shrink-0 rounded bg-amber-50 px-1.5 py-px text-[10px] text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
                    {t('research.paper.unassigned')}
                  </span>
                ) : (
                  <span className="shrink-0 rounded bg-accent-soft px-1.5 py-px text-[10px] text-accent">
                    {projects?.find((x) => x.id === p.project_id)?.title ?? '?'}
                  </span>
                )}
              </div>
            </div>

            {/* status */}
            <select
              value={p.status}
              onChange={(e) => patchMutation.mutate({ id: p.id, patch: { status: e.target.value } })}
              className="w-[74px] shrink-0 rounded border border-border bg-surface px-1 py-1 text-[11px] outline-none dark:border-border dark:bg-surface"
              data-tip={t('research.paper.statusTip')}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`research.paper.statuses.${s}`)}
                </option>
              ))}
            </select>

            {/* project */}
            <select
              value={p.project_id ?? ''}
              onChange={(e) =>
                patchMutation.mutate({
                  id: p.id,
                  patch: { project_id: e.target.value ? Number(e.target.value) : null },
                })
              }
              className="w-[110px] shrink-0 rounded border border-border bg-surface px-1 py-1 text-[11px] outline-none dark:border-border dark:bg-surface"
              data-tip={t('research.paper.assignProject')}
            >
              <option value="">{t('research.paper.unassigned')}</option>
              {(projects ?? []).map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.title}
                </option>
              ))}
            </select>

            {/* icon actions */}
            <button
              type="button"
              onClick={() => void openInReader(p)}
              className="shrink-0 rounded p-1.5 text-foreground/45 transition-colors hover:bg-surface-hover hover:text-accent dark:hover:bg-neutral-800"
              data-tip={t('literature.openReader')}
            >
              <ExternalLink size={13} />
            </button>
            <button
              type="button"
              onClick={() => setCompareFrom(p)}
              className="shrink-0 rounded p-1.5 text-foreground/45 transition-colors hover:bg-surface-hover hover:text-accent dark:hover:bg-neutral-800"
              data-tip={t('literature.compare')}
            >
              <Scale size={13} />
            </button>
            <button
              type="button"
              onClick={() => setAiPaper(p)}
              className="shrink-0 rounded p-1.5 text-foreground/45 transition-colors hover:bg-surface-hover hover:text-accent dark:hover:bg-neutral-800"
              data-tip={t('ai.summarizePaper')}
            >
              <Sparkles size={13} />
            </button>
            <button
              type="button"
              onClick={() => setRelatedPaper(p)}
              className="shrink-0 rounded p-1.5 text-foreground/45 transition-colors hover:bg-surface-hover hover:text-accent dark:hover:bg-neutral-800"
              data-tip={t('literature.related.button')}
            >
              <GitBranch size={13} />
            </button>
            <button
              type="button"
              onClick={() => openEdit(p)}
              className="shrink-0 rounded p-1.5 text-foreground/45 transition-colors hover:bg-surface-hover hover:text-accent dark:hover:bg-neutral-800"
              data-tip={t('research.paper.edit')}
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate(p.id)}
              className="shrink-0 rounded p-1.5 text-foreground/45 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
              data-tip={t('inbox.delete')}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        </div>
      </div>

      {/* AI summary modal */}
      {aiPaper && (
        <AiModal
          title={`${t('ai.summarizePaper')}: ${aiPaper.title.slice(0, 40)}`}
          fetcher={async () => {
            const r = await api<{ summary: string }>('/api/ai/summarize-paper', {
              method: 'POST',
              body: JSON.stringify({ paper_id: aiPaper.id }),
            })
            return r.summary
          }}
          onClose={() => setAiPaper(null)}
        />
      )}

      {/* related papers modal */}
      {relatedPaper && <RelatedPapersModal paper={relatedPaper} onClose={() => setRelatedPaper(null)} />}

      {/* edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditing(null)
          }}
        >
          <div className="w-[520px] max-w-[92vw] rounded-xl border border-border bg-surface p-4 shadow-2xl dark:border-border dark:bg-surface">
            <div className="flex items-center justify-between">
              <h2 className="truncate text-[14px] font-semibold" data-tip={editing.title}>
                {t('research.paper.edit')}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded p-1 text-foreground/45 hover:bg-surface-hover dark:hover:bg-neutral-800"
              >
                <X size={15} />
              </button>
            </div>
            <input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder={t('research.paper.titlePlaceholder')}
              className={`mt-3 w-full ${field}`}
            />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <input
                value={editForm.authors}
                onChange={(e) => setEditForm({ ...editForm, authors: e.target.value })}
                placeholder={t('research.paper.authors')}
                className={`col-span-2 ${field}`}
              />
              <input
                value={editForm.year}
                onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                placeholder={t('research.paper.year')}
                className={field}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={editForm.journal}
                onChange={(e) => setEditForm({ ...editForm, journal: e.target.value })}
                placeholder={t('research.paper.journal')}
                className={field}
              />
              <input
                value={editForm.doi}
                onChange={(e) => setEditForm({ ...editForm, doi: e.target.value })}
                placeholder="DOI"
                className={field}
              />
            </div>
            <input
              value={editForm.url}
              onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
              placeholder={t('research.paper.urlPlaceholder')}
              className={`mt-2 w-full ${field}`}
            />
            <textarea
              value={editForm.abstract}
              onChange={(e) => setEditForm({ ...editForm, abstract: e.target.value })}
              rows={3}
              placeholder={t('research.paper.abstract')}
              className={`mt-2 w-full resize-y ${field}`}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-border px-3 py-1.5 text-[13px] transition-colors hover:bg-surface-hover dark:border-border dark:hover:bg-neutral-800"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() =>
                  patchMutation.mutate({ id: editing.id, patch: editForm }, { onSuccess: () => setEditing(null) })
                }
                disabled={!editForm.title.trim()}
                className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* compare: pick second paper */}
      {compareFrom && !compareWith && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCompareFrom(null)
          }}
        >
          <div className="w-[480px] max-w-[92vw] rounded-xl border border-border bg-surface p-4 shadow-2xl dark:border-border dark:bg-surface">
            <div className="flex items-center justify-between">
              <h2 className="truncate text-[14px] font-semibold" data-tip={compareFrom.title}>
                {t('literature.comparePick')}
              </h2>
              <button
                type="button"
                onClick={() => setCompareFrom(null)}
                className="rounded p-1 text-foreground/45 hover:bg-surface-hover dark:hover:bg-neutral-800"
              >
                <X size={15} />
              </button>
            </div>
            <div className="mt-3 max-h-[50vh] space-y-1 overflow-y-auto">
              {(papers ?? [])
                .filter((x) => x.id !== compareFrom.id)
                .map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => setCompareWith(x)}
                    className="w-full truncate rounded-md px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-surface-hover dark:hover:bg-neutral-800"
                    data-tip={x.title}
                  >
                    {x.title}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* compare result */}
      {compareFrom && compareWith && (
        <AiModal
          title={t('literature.compare')}
          fetcher={async () => {
            const r = await api<{ comparison: string }>('/api/ai/compare-papers', {
              method: 'POST',
              body: JSON.stringify({ paper_ids: [compareFrom.id, compareWith.id] }),
            })
            return r.comparison
          }}
          onClose={() => {
            setCompareFrom(null)
            setCompareWith(null)
          }}
        />
      )}
    </div>
  )
}
