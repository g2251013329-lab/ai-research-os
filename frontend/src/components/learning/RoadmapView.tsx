import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { api } from '../../api/client'
import AiModal from '../ai/AiModal'
import ConceptLinksModal from './ConceptLinksModal'
import FlashcardsModal from './FlashcardsModal'

export interface Concept {
  id: number
  title: string
  description: string
  parent_id: number | null
  status: string
  sort_order: number
  children: Concept[]
}

const STATUS_STYLES: Record<string, string> = {
  not_started: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
  learning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  practiced: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  understood: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  mastered: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
}

const STATUSES = ['not_started', 'learning', 'practiced', 'understood', 'mastered']

export default function RoadmapView() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: tree } = useQuery({
    queryKey: ['learning', 'roadmap'],
    queryFn: () => api<Concept[]>('/api/learning/roadmap'),
  })

  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [addingUnder, setAddingUnder] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [aiNode, setAiNode] = useState<Concept | null>(null)
  const [aiMode, setAiMode] = useState('explain')
  const [linkNode, setLinkNode] = useState<Concept | null>(null)

  const AI_MODES = [
    { id: 'explain', label: t('learning.ai.explain') },
    { id: 'simplify', label: t('learning.ai.simplify') },
    { id: 'examples', label: t('learning.ai.examples') },
    { id: 'quiz', label: t('learning.ai.quiz') },
    { id: 'flashcards', label: t('learning.ai.flashcards') },
  ]

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['learning'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMutation = useMutation({
    mutationFn: (parentId: number | null) =>
      api('/api/learning/concepts', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim(), parent_id: parentId }),
      }),
    onSuccess: () => {
      setNewTitle('')
      setAddingUnder(null)
      invalidate()
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/api/learning/concepts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/api/learning/concepts/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const renderNode = (node: Concept, depth: number) => {
    const isCollapsed = collapsed.has(node.id)
    const hasChildren = node.children.length > 0
    return (
      <div key={node.id}>
        <div
          className="group flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
          style={{ marginLeft: depth * 18 }}
        >
          <button
            type="button"
            onClick={() =>
              setCollapsed((prev) => {
                const next = new Set(prev)
                if (next.has(node.id)) next.delete(node.id)
                else next.add(node.id)
                return next
              })
            }
            className={`rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 ${
              hasChildren ? '' : 'invisible'
            }`}
          >
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>

          <span
            className={`rounded px-1.5 py-px text-[10.5px] ${
              STATUS_STYLES[node.status] ?? STATUS_STYLES.not_started
            }`}
          >
            {t(`learning.statuses.${node.status}`)}
          </span>
          <span data-tip={node.title} className="flex-1 truncate text-[13px]">
            {node.title}
          </span>

          <select
            value={node.status}
            onChange={(e) => statusMutation.mutate({ id: node.id, status: e.target.value })}
            className="rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] text-neutral-400 outline-none hover:border-neutral-200 dark:hover:border-neutral-700"
            data-tip={t('learning.roadmap.changeStatus')}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`learning.statuses.${s}`)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setAddingUnder(node.id)
              setNewTitle('')
            }}
            className="rounded p-1 text-neutral-300 opacity-0 transition-opacity hover:text-accent group-hover:opacity-100 dark:text-neutral-600"
            data-tip={t('learning.roadmap.addChild')}
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              setAiNode(node)
              setAiMode('explain')
            }}
            className="rounded p-1 text-neutral-300 opacity-0 transition-opacity hover:text-accent group-hover:opacity-100 dark:text-neutral-600"
            data-tip={t('learning.ai.explain')}
          >
            <Sparkles size={13} />
          </button>
          <button
            type="button"
            onClick={() => setLinkNode(node)}
            className="rounded p-1 text-neutral-300 opacity-0 transition-opacity hover:text-accent group-hover:opacity-100 dark:text-neutral-600"
            data-tip={t('learning.links.button')}
          >
            <Link2 size={13} />
          </button>
          {!hasChildren && (
            <button
              type="button"
              onClick={() => deleteMutation.mutate(node.id)}
              className="rounded p-1 text-neutral-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-neutral-600"
              data-tip={t('learning.roadmap.delete')}
            >
              <Trash2 size={13} />
            </button>
          )}

          {addingUnder === node.id && (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTitle.trim())
                    createMutation.mutate(node.id)
                  if (e.key === 'Escape') setAddingUnder(null)
                }}
                placeholder={t('learning.roadmap.newChild')}
                className="w-40 rounded-md border border-accent bg-white px-2 py-0.5 text-[12px] outline-none dark:bg-neutral-950"
              />
              {createMutation.isPending && (
                <Loader2 size={12} className="animate-spin text-neutral-400" />
              )}
            </span>
          )}
        </div>
        {hasChildren && !isCollapsed && node.children.map((c) => renderNode(c, depth + 1))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-neutral-400">{t('learning.roadmap.hint')}</p>
        <button
          type="button"
          onClick={() => {
            setAddingUnder(-1)
            setNewTitle('')
          }}
          className="flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1 text-[12px] transition-colors hover:border-accent hover:text-accent dark:border-neutral-700"
        >
          <Plus size={12} /> {t('learning.roadmap.addRoot')}
        </button>
      </div>

      {addingUnder === -1 && (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTitle.trim()) createMutation.mutate(null)
              if (e.key === 'Escape') setAddingUnder(null)
            }}
            placeholder={t('learning.roadmap.newRoot')}
            className="w-64 rounded-md border border-accent bg-white px-2 py-1 text-[12px] outline-none dark:bg-neutral-950"
          />
          <button
            type="button"
            onClick={() => newTitle.trim() && createMutation.mutate(null)}
            className="rounded-lg bg-accent px-2.5 py-1 text-[12px] font-medium text-white"
          >
            {t('common.save')}
          </button>
        </div>
      )}

      <div className="mt-3 rounded-lg border border-neutral-200 bg-white py-2 dark:border-neutral-800 dark:bg-neutral-900">
        {(tree ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-[12.5px] text-neutral-400">
            {t('learning.roadmap.empty')}
          </p>
        )}
        {(tree ?? []).map((node) => renderNode(node, 0))}
      </div>

      {/* AI concept explainer */}
      {aiNode && (        <>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {AI_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setAiMode(m.id)}
                className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
                  aiMode === m.id
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700'
                }`}
              >
                {m.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAiNode(null)}
              className="ml-auto rounded-md border border-neutral-200 px-2.5 py-1 text-[12px] text-neutral-400 transition-colors hover:border-neutral-300 dark:border-neutral-700"
            >
              ✕
            </button>
          </div>
          {aiMode === 'flashcards' ? (
            <FlashcardsModal concept={aiNode} onClose={() => setAiNode(null)} />
          ) : (
            <AiModal
              title={`${t('learning.ai.explain')}: ${aiNode.title}`}
              fetcher={async () => {
                const r = await api<{ answer: string }>('/api/ai/learning-assist', {
                  method: 'POST',
                  body: JSON.stringify({ concept_id: aiNode.id, mode: aiMode }),
                })
                return r.answer
              }}
              onClose={() => setAiNode(null)}
            />
          )}
        </>
      )}

      {/* concept ↔ research links */}
      {linkNode && <ConceptLinksModal concept={linkNode} onClose={() => setLinkNode(null)} />}
    </div>
  )
}
