import { useTranslation } from 'react-i18next'
import { Moon, Search, Sun } from 'lucide-react'
import { useSettingsStore } from '../../store/useSettingsStore'

export default function TopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { t } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-3 dark:border-neutral-800 dark:bg-neutral-900">
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex w-64 items-center gap-2 rounded-md border border-neutral-200 px-2.5 py-1.5 text-[12px] text-neutral-400 transition-colors hover:border-accent hover:text-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"
        title="⌘K"
      >
        <Search size={13} />
        <span className="flex-1 text-left">{t('search.title')}</span>
        <kbd className="rounded border border-neutral-200 px-1 text-[10px] dark:border-neutral-700">
          ⌘K
        </kbd>
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => update({ language: settings?.language === 'zh' ? 'en' : 'zh' })}
        className="rounded-md px-2 py-1 text-[12px] text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      >
        {settings?.language === 'zh' ? 'EN' : '中文'}
      </button>
      <button
        type="button"
        onClick={() => update({ theme: settings?.theme === 'dark' ? 'light' : 'dark' })}
        className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        aria-label={settings?.theme === 'dark' ? t('theme.light') : t('theme.dark')}
      >
        {settings?.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  )
}
