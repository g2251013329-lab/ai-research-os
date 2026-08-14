import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { api } from '../api/client'
import DiscoverSection from '../components/literature/DiscoverSection'
import MyPapersList from '../components/literature/MyPapersList'
import ZoteroImport from '../components/literature/ZoteroImport'

export default function LiteraturePage() {
  const { t } = useTranslation()

  const { data: status } = useQuery({
    queryKey: ['zotero', 'status'],
    queryFn: () =>
      api<{
        configured: boolean
        db_exists: boolean
        locked: boolean
        api_available: boolean
        db_path: string
      }>('/api/zotero/status'),
  })

  const dbReady = status?.db_exists && !status?.locked
  const apiOk = status?.db_exists && status?.locked && status?.api_available
  const lockedNoApi = status?.db_exists && status?.locked && !status?.api_available
  const connected = dbReady || apiOk

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold">{t('literature.title')}</h1>
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            {t('literature.subtitle')}
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] ${
            connected
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              : lockedNoApi
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
          }`}
        >
          <Sparkles size={11} />
          {dbReady
            ? t('literature.zoteroOk')
            : apiOk
              ? t('literature.zoteroApi')
              : lockedNoApi
                ? t('literature.zoteroLocked')
                : t('literature.zoteroMissing')}
        </span>
      </div>

      {lockedNoApi && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-[13px] leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {t('literature.zoteroLockedDesc')}
        </div>
      )}

      {!status?.db_exists && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-[13px] text-neutral-400">{t('literature.zoteroMissingDesc')}</p>
          <a
            href="/settings"
            className="mt-2 inline-block text-[13px] text-accent hover:underline"
          >
            {t('literature.goSettings')} →
          </a>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <DiscoverSection />
        {connected && <ZoteroImport />}
        <MyPapersList />
      </div>
    </div>
  )
}
