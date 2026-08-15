import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Download, ExternalLink, Loader2 } from 'lucide-react'
import { api } from '../../api/client'
import { useToastStore } from '../../store/useToastStore'

interface ZoteroItem {
  key: string
  title: string
  authors: string
  year: string
  journal: string
  type: string
}

interface Paper {
  id: number
  zotero_key: string
}

export default function ZoteroImport() {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(true)
  const [importing, setImporting] = useState<string | null>(null)

  const { data: items } = useQuery({
    queryKey: ['zotero', 'items', 'import'],
    queryFn: () => api<ZoteroItem[]>('/api/zotero/items?limit=40'),
  })

  const { data: papers } = useQuery({
    queryKey: ['papers', 'all'],
    queryFn: () => api<Paper[]>('/api/papers'),
  })

  const importedKeys = new Set(
    (papers ?? []).map((p) => p.zotero_key).filter(Boolean),
  )
  const pending = (items ?? []).filter((i) => !importedKeys.has(i.key))

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['zotero', 'items', 'import'] })
    void queryClient.invalidateQueries({ queryKey: ['papers'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const importOne = async (item: ZoteroItem) => {
    setImporting(item.key)
    try {
      const r = await api<{ created: number; skipped: number }>('/api/zotero/import', {
        method: 'POST',
        body: JSON.stringify({ keys: [item.key] }),
      })
      toast(
        r.created > 0
          ? t('literature.imported', { created: r.created, skipped: r.skipped })
          : t('quickCreate.duplicated'),
      )
      invalidate()
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    } finally {
      setImporting(null)
    }
  }

  const openInReader = async (item: ZoteroItem) => {
    try {
      const atts = await api<{ path: string }[]>(
        `/api/zotero/items/${item.key}/attachments`,
      )
      if (atts.length === 0) {
        toast(t('literature.noAttachment'))
        return
      }
      await api('/api/system/open-file', {
        method: 'POST',
        body: JSON.stringify({ path: atts[0].path, app: '小绿鲸英文文献阅读器' }),
      })
      toast(t('literature.openedReader'))
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface dark:border-border dark:bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] font-medium text-foreground/65 transition-colors hover:text-accent dark:text-foreground/75"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {t('literature.zoteroImport.title')}
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] text-accent">
          {pending.length}
        </span>
      </button>

      {open && (
        <div className="divide-y divide-border-subtle border-t border-neutral-100 dark:divide-border-subtle dark:border-border">
          {pending.length === 0 && (
            <p className="px-3 py-4 text-center text-[11.5px] text-foreground/45">
              {t('literature.zoteroImport.empty')}
            </p>
          )}
          {pending.map((item) => (
            <div key={item.key} className="flex items-center gap-2 px-3 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px]" data-tip={item.title}>
                  {item.title || t('literature.zoteroImport.untitled')}
                </div>
                <div
                  className="truncate text-[10.5px] text-foreground/45"
                  data-tip={[item.authors, item.year, item.journal].filter(Boolean).join(' · ')}
                >
                  {[item.authors, item.year, item.journal].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void openInReader(item)}
                className="shrink-0 rounded p-1.5 text-foreground/45 transition-colors hover:bg-surface-hover hover:text-accent dark:hover:bg-neutral-800"
                data-tip={t('literature.openReader')}
              >
                <ExternalLink size={12} />
              </button>
              <button
                type="button"
                onClick={() => void importOne(item)}
                disabled={importing === item.key}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                {importing === item.key ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Download size={11} />
                )}
                {t('literature.importOne')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
