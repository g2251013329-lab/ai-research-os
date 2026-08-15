import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Atom,
  Brain,
  ExternalLink,
  Loader2,
  MessageSquare,
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
import { useSettingsStore } from '../../store/useSettingsStore'

interface Project {
  id: number
  title: string
}

interface Paper {
  id: number
  title: string
}

interface ZoteroItem {
  key: string
  title: string
  year: string
  authors: string
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

type Channel = 'deepseek' | 'gpt' | 'claude_science'

const CHANNELS: { id: Channel; icon: typeof Sparkles }[] = [
  { id: 'deepseek', icon: Sparkles },
  { id: 'gpt', icon: MessageSquare },
  { id: 'claude_science', icon: Atom },
]


function parseCtx(value: string): { type: string | null; id: number | string | null } {
  if (!value) return { type: null, id: null }
  const idx = value.indexOf(':')
  if (idx < 0) return { type: value, id: null }
  return { type: value.slice(0, idx), id: value.slice(idx + 1) }
}

export default function AiContextPanel() {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const location = useLocation()
  const settings = useSettingsStore((s) => s.settings)

  const [open, setOpen] = useState(true)
  const [channel, setChannel] = useState<Channel>('deepseek')
  const [csBusy, setCsBusy] = useState(false)
  const [csLoginRequired, setCsLoginRequired] = useState(false)
  const [ctx, setCtx] = useState('')
  const [manual, setManual] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [memOpen, setMemOpen] = useState(false)
  const [memKind, setMemKind] = useState('fact')
  const [memText, setMemText] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  // auto-detect project context from route
  useEffect(() => {
    const m = location.pathname.match(/^\/research\/projects\/(\d+)/)
    if (m && !manual) {
      setCtx(`project:${m[1]}`)
    } else if (!m && !manual) {
      setCtx('')
    }
  }, [location.pathname, manual])

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Project[]>('/api/projects'),
  })

  const { data: papers } = useQuery({
    queryKey: ['papers', 'all'],
    queryFn: () => api<Paper[]>('/api/papers?limit=30'),
  })

  const { data: zoteroItems } = useQuery({
    queryKey: ['zotero', 'items', 'context'],
    queryFn: () => api<ZoteroItem[]>('/api/zotero/items?limit=30'),
  })

  const { data: memory } = useQuery({
    queryKey: ['memory'],
    queryFn: () => api<MemoryEntry[]>('/api/memory'),
  })

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const { type: ctxType } = parseCtx(ctx)
  const isProject = ctxType === 'project'

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim()
    if (!text || streaming) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text }])
    setStreaming(true)
    setMessages((m) => [...m, { role: 'ai', text: '' }])
    const { type, id } = parseCtx(ctx)
    try {
      await postSSE(
        '/api/ai/chat',
        {
          message: text,
          object_type: type,
          object_id: id,
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
    const { id } = parseCtx(ctx)
    try {
      await api('/api/memory', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'fact',
          content: text.slice(0, 500),
          project_id: isProject && id ? Number(id) : null,
        }),
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
    const { id } = parseCtx(ctx)
    try {
      await api('/api/memory', {
        method: 'POST',
        body: JSON.stringify({
          kind: memKind,
          content: memText.trim(),
          project_id: isProject && id ? Number(id) : null,
        }),
      })
      setMemText('')
      void queryClient.invalidateQueries({ queryKey: ['memory'] })
      toast(t('ai.remembered'))
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    }
  }

  const openClaudeScience = async (forceLogin: boolean) => {
    setCsBusy(true)
    try {
      const r = await api<{ url: string; login_required: boolean; error?: string }>(
        forceLogin ? '/api/system/claude-science-login' : '/api/system/claude-science-open',
        { method: 'POST' },
      )
      if (r.error) {
        toast(r.error)
        return
      }
      setCsLoginRequired(Boolean(r.login_required))
      window.open(r.url, '_blank', 'noopener')
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setCsBusy(false)
    }
  }

  return (
    <aside
      className={`flex shrink-0 flex-col border-l border-border bg-surface transition-[width] dark:border-border dark:bg-surface ${
        open ? 'w-80' : 'w-9'
      }`}
    >
      <div className="flex h-11 items-center justify-between border-b border-border px-2 dark:border-border">
        {open && (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-foreground/65 dark:text-foreground/75">
            <Sparkles size={13} className="text-accent" />
            {t('aiPanel.title')}
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-1.5 text-foreground/45 transition-colors hover:bg-surface-hover dark:hover:bg-neutral-800"
          aria-label={open ? 'collapse' : 'expand'}
        >
          {open ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
        </button>
      </div>

      {open && (
        <>
        {/* channel selector */}
        <div className="shrink-0 border-b border-border p-2">
          <div className="flex rounded-lg bg-surface-hover p-0.5">
            {CHANNELS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setChannel(id)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] transition-colors ${
                  channel === id
                    ? 'bg-surface font-medium text-accent shadow-sm'
                    : 'text-foreground/55 hover:text-foreground'
                }`}
                data-tip={t(`ai.channels.${id}.tip`)}
              >
                <Icon size={11} />
                <span className="truncate">{t(`ai.channels.${id}.name`)}</span>
              </button>
            ))}
          </div>
        </div>

        {channel === 'deepseek' && (
        <>
        {/* context selector */}
      <div className="shrink-0 border-b border-neutral-100 p-2.5 dark:border-border">
        <div className="text-[10.5px] font-semibold uppercase tracking-wide text-foreground/45">
          {t('ai.context')}
        </div>
        <select
          value={ctx}
          onChange={(e) => {
            setCtx(e.target.value)
            setManual(Boolean(e.target.value))
          }}
          className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-accent dark:border-border dark:bg-surface"
        >
          <option value="">{t('ai.noContext')}</option>
          {(projects ?? []).length > 0 && (
            <optgroup label={t('ai.groupProjects')}>
              {(projects ?? []).map((p) => (
                <option key={`project:${p.id}`} value={`project:${p.id}`}>
                  {p.title}
                </option>
              ))}
            </optgroup>
          )}
          {(papers ?? []).length > 0 && (
            <optgroup label={t('ai.groupPapers')}>
              {(papers ?? []).map((p) => (
                <option key={`paper:${p.id}`} value={`paper:${p.id}`}>
                  {p.title.length > 40 ? p.title.slice(0, 40) + '…' : p.title}
                </option>
              ))}
            </optgroup>
          )}
          {(zoteroItems ?? []).length > 0 && (
            <optgroup label={t('ai.groupZotero')}>
              {(zoteroItems ?? []).map((z) => (
                <option key={`zotero:${z.key}`} value={`zotero:${z.key}`}>
                  {z.year ? `[${z.year}] ` : ''}
                  {(z.title || '未命名').length > 40
                    ? (z.title || '未命名').slice(0, 40) + '…'
                    : z.title || '未命名'}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {isProject && (
          <div className="mt-1 flex gap-1.5">
            {quickActions.map(({ key, run }) => (
              <button
                key={key}
                type="button"
                onClick={run}
                disabled={streaming}
                className="flex-1 rounded-md border border-border px-1.5 py-1 text-[10.5px] text-foreground/55 transition-colors hover:border-accent hover:text-accent disabled:opacity-40 dark:border-border"
              >
                {t(`ai.quick.${key}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* chat */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
          {messages.length === 0 && (
            <p className="px-1 pt-2 text-[11.5px] leading-relaxed text-foreground/45">
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
                      : 'mr-2 bg-surface-hover text-foreground/75 dark:bg-neutral-800 dark:text-foreground/85'
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
                  className="mt-0.5 ml-1 flex items-center gap-1 text-[10.5px] text-foreground/45 transition-colors hover:text-accent"
                >
                  <Brain size={10} /> {t('ai.remember')}
                </button>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="flex shrink-0 gap-1.5 border-t border-neutral-100 p-2 dark:border-border">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send()
            }}
            placeholder={t('ai.chatPlaceholder')}
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-accent dark:border-border dark:bg-surface"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || streaming}
            className="rounded-lg bg-accent px-2 text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            aria-label="send"
          >
            {streaming ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
      </div>

        </>
        )}

        {channel !== 'deepseek' && (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              {channel === 'gpt' ? <MessageSquare size={24} /> : <Atom size={24} />}
            </span>
            <div>
              <div className="text-[13.5px] font-semibold">
                {t(`ai.channels.${channel}.name`)}
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-foreground/50">
                {t(`ai.channels.${channel}.desc`)}
              </p>
            </div>
            {channel === 'gpt' ? (
              <a
                href={settings?.ai_gpt_url || 'https://chatgpt.com'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-accent-dark"
              >
                <ExternalLink size={13} />
                {t('ai.channels.gpt.open')}
              </a>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void openClaudeScience(false)}
                  disabled={csBusy}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
                >
                  {csBusy ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ExternalLink size={13} />
                  )}
                  {t('ai.channels.claude_science.open')}
                </button>
                {csLoginRequired && (
                  <button
                    type="button"
                    onClick={() => void openClaudeScience(true)}
                    disabled={csBusy}
                    className="text-[11px] text-foreground/45 underline decoration-dotted underline-offset-2 transition-colors hover:text-accent"
                  >
                    {t('ai.channels.claude_science.relogin')}
                  </button>
                )}
              </>
            )}
            <p className="text-[10.5px] text-foreground/40">{t('ai.channels.webOnly')}</p>
          </div>
        )}

      {/* memory */}
      <div className="shrink-0 border-t border-neutral-100 dark:border-border">
        <button
          type="button"
          onClick={() => setMemOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 px-2.5 py-2 text-[11.5px] font-medium text-foreground/55 transition-colors hover:text-accent dark:text-foreground/55"
        >
          <Brain size={12} className="text-accent" />
          {t('ai.memory')} ({memory?.length ?? 0})
          <span className="ml-auto text-foreground/35">{memOpen ? '−' : '+'}</span>
        </button>
        {memOpen && (
          <div className="space-y-1.5 px-2.5 pb-2.5">
            <div className="flex gap-1.5">
              <select
                value={memKind}
                onChange={(e) => setMemKind(e.target.value)}
                className="rounded-md border border-border bg-surface px-1.5 py-1 text-[11px] outline-none dark:border-border dark:bg-surface"
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
                className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-[11.5px] outline-none focus:border-accent dark:border-border dark:bg-surface"
              />
              <button
                type="button"
                onClick={() => void addMemory()}
                disabled={!memText.trim()}
                className="rounded-lg bg-accent px-1.5 text-white disabled:opacity-40"
              >
                <Plus size={12} />
              </button>
            </div>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {(memory ?? []).map((m) => (
                <div
                  key={m.id}
                  className="group flex items-start gap-1.5 rounded-md bg-surface-hover p-1.5 dark:bg-neutral-800/60"
                >
                  <span className="shrink-0 rounded bg-accent-soft px-1 text-[9.5px] text-accent">
                    {t(`ai.memoryKinds.${m.kind}`)}
                  </span>
                  <span
                    className="min-w-0 flex-1 text-[11px] leading-snug text-foreground/65 dark:text-foreground/75"
                    data-tip={m.content}
                  >
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
                    className="shrink-0 rounded p-0.5 text-foreground/35 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-foreground/65"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
              {(memory ?? []).length === 0 && (
                <p className="text-[11px] text-foreground/45">{t('ai.memoryEmpty')}</p>
              )}
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </aside>
  )
}
