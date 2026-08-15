import { useTranslation } from 'react-i18next'
import { Moon, Search, Sun } from 'lucide-react'
import { useSettingsStore } from '../../store/useSettingsStore'

export default function TopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { t } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-200/90 bg-white/70 px-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/60">
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex w-64 items-center gap-2 rounded-lg border border-neutral-200/90 bg-white px-2.5 py-1.5 text-[12px] text-neutral-400 shadow-sm transition-all hover:border-accent hover:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950/50 dark:hover:border-neutral-500"
        title="⌘K 搜索 · ⌘⇧L 命令面板"
      >
        <Search size={13} />
        <span className="flex-1 text-left">{t('search.title')}</span>
        <kbd className="rounded border border-neutral-200 px-1 font-mono text-[10px] text-neutral-400 dark:border-neutral-700">
          ⌘K
        </kbd>
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => update({ language: settings?.language === 'zh' ? 'en' : 'zh' })}
        className="rounded-md px-2.5 py-1 text-[12px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
      >
        {settings?.language === 'zh' ? 'EN' : '中文'}
      </button>
      <button
        type="button"
        onClick={() => update({ theme: settings?.theme === 'dark' ? 'light' : 'dark' })}
        className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        aria-label={settings?.theme === 'dark' ? t('theme.light') : t('theme.dark')}
      >
        {settings?.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  )
}
