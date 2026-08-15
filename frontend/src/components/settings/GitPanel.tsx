import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, GitBranch, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { api } from '../../api/client'
import { useToastStore } from '../../store/useToastStore'

interface GitStatus {
  repo: boolean
  vault?: string
  detail?: string
  branch?: string
  ahead?: number
  behind?: number
  dirty_count?: number
  dirty?: string[]
  last_commit?: string
}

export default function GitPanel() {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const { data: status, refetch } = useQuery({
    queryKey: ['git', 'status'],
    queryFn: () => api<GitStatus>('/api/git/status'),
  })

  const run = async (action: string, fn: () => Promise<unknown>) => {
    setBusy(action)
    try {
      await fn()
      await refetch()
      toast(t('git.done'))
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const btn =
    'rounded-md border border-border px-2.5 py-1.5 text-[12px] transition-colors hover:border-accent hover:text-accent disabled:opacity-50 dark:border-border'

  return (
    <div className="rounded-lg border border-border bg-surface p-4 dark:border-border dark:bg-surface">
      <div className="flex items-center gap-2">
        <GitBranch size={14} className="text-foreground/45" />
        <span className="text-[13px] font-medium">{t('git.title')}</span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="ml-auto rounded p-1 text-foreground/45 hover:text-accent"
          title={t('git.refresh')}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {status && !status.repo && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-[12px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">{t('git.notRepo')}</div>
            <div className="mt-0.5 text-[11.5px] opacity-80">{status.detail}</div>
          </div>
        </div>
      )}

      {status?.repo && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11.5px] sm:grid-cols-4">
            <div className="rounded-md bg-surface-hover p-2 dark:bg-neutral-800/60">
              <div className="font-mono text-[13px] font-semibold">{status.branch}</div>
              <div className="text-foreground/45">{t('git.branch')}</div>
            </div>
            <div className="rounded-md bg-surface-hover p-2 dark:bg-neutral-800/60">
              <div className="text-[13px] font-semibold">{status.ahead ?? 0}</div>
              <div className="text-foreground/45">{t('git.ahead')}</div>
            </div>
            <div className="rounded-md bg-surface-hover p-2 dark:bg-neutral-800/60">
              <div className="text-[13px] font-semibold">{status.behind ?? 0}</div>
              <div className="text-foreground/45">{t('git.behind')}</div>
            </div>
            <div className="rounded-md bg-surface-hover p-2 dark:bg-neutral-800/60">
              <div className="text-[13px] font-semibold">{status.dirty_count ?? 0}</div>
              <div className="text-foreground/45">{t('git.dirty')}</div>
            </div>
          </div>
          {status.last_commit && (
            <p className="mt-2 truncate font-mono text-[11px] text-foreground/45" data-tip={status.last_commit}>
              {status.last_commit}
            </p>
          )}
          {status.dirty_count ? (
            <div className="mt-2">
              <div
                className={`space-y-0.5 overflow-y-auto rounded-md bg-surface-hover p-2 text-[11px] font-mono text-foreground/55 dark:bg-neutral-800/60 ${
                  showAll ? 'max-h-80' : 'max-h-24'
                }`}
              >
                {(status.dirty ?? []).map((line) => (
                  <div key={line} className="truncate" data-tip={line}>
                    {line}
                  </div>
                ))}
              </div>
              {(status.dirty?.length ?? 0) > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-1 text-[11px] text-accent transition-colors hover:underline"
                >
                  {showAll
                    ? t('git.collapse')
                    : t('git.showAll', { n: status.dirty?.length ?? 0 })}
                </button>
              )}
            </div>
          ) : (
            <p className="mt-2 flex items-center gap-1 text-[11.5px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={12} /> {t('git.clean')}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('git.commitPlaceholder')}
              className="min-w-40 flex-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] outline-none focus:border-accent dark:border-border dark:bg-surface"
            />
            <button
              type="button"
              disabled={busy !== null || !message.trim()}
              onClick={() =>
                run('commit', () =>
                  api('/api/git/commit', {
                    method: 'POST',
                    body: JSON.stringify({ message: message.trim() }),
                  }),
                )
              }
              className={btn}
            >
              {busy === 'commit' ? <Loader2 size={12} className="animate-spin" /> : null}
              {t('git.commit')}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run('pull', () => api('/api/git/pull', { method: 'POST' }))}
              className={btn}
            >
              {t('git.pull')}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run('push', () => api('/api/git/push', { method: 'POST' }))}
              className={btn}
            >
              {t('git.push')}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                run('sync', () =>
                  api<{ steps: string[] }>('/api/git/sync', { method: 'POST' }),
                )
              }
              className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {busy === 'sync' ? <Loader2 size={12} className="animate-spin" /> : null}
              {t('git.sync')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
