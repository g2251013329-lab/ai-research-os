import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Brain,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { api } from '../../api/client'
import { postSSE } from '../../api/stream'
import { useToastStore } from '../../store/useToastStore'

interface Project {
  id: number
  title: string
}

interface MemoryEntry {
  id: number
  kind: string
  content: string
  project_id: number | null
  updated_at: string
}

interface ChatMsg {
  role: 'user' | 'ai'
  text: string
  error?: boolean
}

const MEMORY_KINDS = ['fact', 'finding', 'decision', 'terminology', 'note']

export default function AiContextPanel() {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const location = useLocation()
  void useParams()

  const [open, setOpen] = useState(true)
  const chatOpen = true
  const [contextId, setContextId] = useState<number | null>(null)
  const [manualContext, setManualContext] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [memOpen, setMemOpen] = useState(false)
  const [memKind, setMemKind] = useState('fact')
  const [memText, setMemText] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  // auto-detect context from route: /research/projects/:id
  useEffect(() => {
    const m = location.pathname.match(/^\/research\/projects\/(\d+)/)
    if (m && !manualContext) {
      setContextId(Number(m[1]))
    } else if (!m && !manualContext) {
      setContextId(null)
    }
  }, [location.pathname, manualContext])

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Project[]>('/api/projects'),
  })

  const { data: memory } = useQuery({
    queryKey: ['memory'],
    queryFn: () => api<MemoryEntry[]>('/api/memory'),
  })

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const currentProject = projects?.find((p) => p.id === contextId)

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim()
    if (!text || streaming) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text }])
    setStreaming(true)
    setMessages((m) => [...m, { role: 'ai', text: '' }])
    try {
      await postSSE(
        '/api/ai/chat',
        {
          message: text,
          object_type: contextId ? 'project' : null,
          object_id: contextId ?? null,
        },
        (event, data) => {
          if (event === 'delta') {
            const d = data as { text: string }
            setMessages((m) => {
              const next = [...m]
              const last = next[next.length - 1]
              next[next.length - 1] = { ...last, text: last.text + d.text }
              return next
            })
          } else if (event === 'error') {
            const d = data as { detail: string }
            setMessages((m) => {
              const next = [...m]
              const last = next[next.length - 1]
              next[next.length - 1] = { ...last, text: d.detail, error: true }
              return next
            })
          }
        },
      )
    } catch (e) {
      setMessages((m) => {
        const next = [...m]
        const last = next[next.length - 1]
        next[next.length - 1] = {
          ...last,
          text: e instanceof Error ? e.message : String(e),
          error: true,
        }
        return next
      })
    } finally {
      setStreaming(false)
    }
  }

  const remember = async (text: string) => {
    try {
      await api('/api/memory', {
        method: 'POST',
        body: JSON.stringify({ kind: 'fact', content: text.slice(0, 500), project_id: contextId }),
      })
      toast(t('ai.remembered'))
      void queryClient.invalidateQueries({ queryKey: ['memory'] })
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    }
  }

  const quickActions = [
    { key: 'summarize', run: () => void send(t('ai.quickSummarize')) },
    { key: 'nextSteps', run: () => void send(t('ai.quickNext')) },
    { key: 'gaps', run: () => void send(t('ai.quickGaps')) },
  ]

  const addMemory = async () => {
    if (!memText.trim()) return
    try {
      await api('/api/memory', {
        method: 'POST',
        body: JSON.stringify({ kind: memKind, content: memText.trim(), project_id: contextId }),
      })
      setMemText('')
      void queryClient.invalidateQueries({ queryKey: ['memory'] })
      toast(t('ai.remembered'))
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <aside
      className={`flex shrink-0 flex-col border-l border-neutral-200 bg-white transition-[width] dark:border-neutral-800 dark:bg-neutral-900 ${
        open ? 'w-80' : 'w-9'
      }`}
    >
      <div className="flex h-11 items-center justify-between border-b border-neutral-200 px-2 dark:border-neutral-800">
        {open && (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-600 dark:text-neutral-300">
            <Sparkles size={13} className="text-accent" />
            {t('aiPanel.title')}
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label={open ? 'collapse' : 'expand'}
        >
          {open ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
        </button>
      </div>

      {open && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* context selector */}
          <div className="border-b border-neutral-100 p-2.5 dark:border-neutral-800">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">
              {t('ai.context')}
            </div>
            <select
              value={contextId ?? ''}
              onChange={(e) => {
                setContextId(e.target.value ? Number(e.target.value) : null)
                setManualContext(Boolean(e.target.value))
              }}
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[12px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
            >
              <option value="">{t('ai.noContext')}</option>
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            {currentProject && (
              <div className="mt-1 truncate text-[11px] text-accent" data-tip={currentProject.title}>
                {t('ai.autoDetected')}: {currentProject.title}
              </div>
            )}
            {/* quick actions */}
            <div className="mt-2 flex gap-1.5">
              {quickActions.map(({ key, run }) => (
                <button
                  key={key}
                  type="button"
                  onClick={run}
                  disabled={!contextId || streaming}
                  className="flex-1 rounded-md border border-neutral-200 px-1.5 py-1 text-[10.5px] text-neutral-500 transition-colors hover:border-accent hover:text-accent disabled:opacity-40 dark:border-neutral-700"
                >
                  {t(`ai.quick.${key}`)}
                </button>
              ))}
            </div>
          </div>

          {/* chat */}
          {chatOpen && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
                {messages.length === 0 && (
                  <p className="px-1 pt-2 text-[11.5px] leading-relaxed text-neutral-400">
                    {t('ai.chatHint')}
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div key={i}>
                    <div
                      className={`rounded-lg px-2.5 py-1.5 text-[12.5px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'ml-8 bg-accent-soft text-neutral-800 dark:text-neutral-100'
                          : msg.error
                            ? 'mr-2 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300'
                            : 'mr-2 bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {msg.text}
                      {msg.role === 'ai' && streaming && i === messages.length - 1 && (
                        <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-accent align-middle" />
                      )}
                    </div>
                    {msg.role === 'ai' && !msg.error && msg.text && !streaming && (
                      <button
                        type="button"
                        onClick={() => void remember(msg.text)}
                        className="mt-0.5 ml-1 flex items-center gap-1 text-[10.5px] text-neutral-400 transition-colors hover:text-accent"
                      >
                        <Brain size={10} /> {t('ai.remember')}
                      </button>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-1.5 border-t border-neutral-100 p-2 dark:border-neutral-800">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void send()
                  }}
                  placeholder={t('ai.chatPlaceholder')}
                  className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[12px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={!input.trim() || streaming}
                  className="rounded-md bg-accent px-2 text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
                  aria-label="send"
                >
                  {streaming ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* memory */}
          <div className="border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setMemOpen((v) => !v)}
              className="flex w-full items-center gap-1.5 px-2.5 py-2 text-[11.5px] font-medium text-neutral-500 transition-colors hover:text-accent dark:text-neutral-400"
            >
              <Brain size={12} className="text-accent" />
              {t('ai.memory')} ({memory?.length ?? 0})
              <span className="ml-auto text-neutral-300">{memOpen ? '−' : '+'}</span>
            </button>
            {memOpen && (
              <div className="space-y-1.5 px-2.5 pb-2.5">
                <div className="flex gap-1.5">
                  <select
                    value={memKind}
                    onChange={(e) => setMemKind(e.target.value)}
                    className="rounded-md border border-neutral-200 bg-white px-1.5 py-1 text-[11px] outline-none dark:border-neutral-700 dark:bg-neutral-950"
                  >
                    {MEMORY_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {t(`ai.memoryKinds.${k}`)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={memText}
                    onChange={(e) => setMemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void addMemory()
                    }}
                    placeholder={t('ai.memoryPlaceholder')}
                    className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11.5px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
                  />
                  <button
                    type="button"
                    onClick={() => void addMemory()}
                    disabled={!memText.trim()}
                    className="rounded-md bg-accent px-1.5 text-white disabled:opacity-40"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {(memory ?? []).map((m) => (
                    <div
                      key={m.id}
                      className="group flex items-start gap-1.5 rounded-md bg-neutral-50 p-1.5 dark:bg-neutral-800/60"
                    >
                      <span className="shrink-0 rounded bg-accent-soft px-1 text-[9.5px] text-accent">
                        {t(`ai.memoryKinds.${m.kind}`)}
                      </span>
                      <span className="min-w-0 flex-1 text-[11px] leading-snug text-neutral-600 dark:text-neutral-300" data-tip={m.content}>
                        {m.content}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void (async () => {
                            await api(`/api/memory/${m.id}`, { method: 'DELETE' })
                            void queryClient.invalidateQueries({ queryKey: ['memory'] })
                          })()
                        }
                        className="shrink-0 rounded p-0.5 text-neutral-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-neutral-600"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  {(memory ?? []).length === 0 && (
                    <p className="text-[11px] text-neutral-400">{t('ai.memoryEmpty')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
