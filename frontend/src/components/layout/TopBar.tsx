import { useTranslation } from 'react-i18next'
import { Moon, Search, Sun, Timer } from 'lucide-react'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useUiStore } from '../../store/useUiStore'

export default function TopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { t } = useTranslation()
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const openFocus = useUiStore((s) => s.openFocus)

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface/70 px-3 backdrop-blur">
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex w-64 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] text-foreground/45 shadow-subtle transition-all hover:border-accent hover:text-foreground/70"
        title="⌘K 搜索 · ⌘⇧P 命令面板"
      >
        <Search size={13} />
        <span className="flex-1 text-left">{t('search.title')}</span>
        <kbd className="rounded border border-border px-1 font-mono text-[10px] text-foreground/40">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      <button
        type="button"
        onClick={openFocus}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-foreground/55 transition-colors hover:bg-surface-hover hover:text-accent"
        data-tip={t('dashboard.actions.focusMode')}
      >
        <Timer size={13} />
        {t('dashboard.actions.focusMode')}
      </button>

      <button
        type="button"
        onClick={() => update({ language: settings?.language === 'zh' ? 'en' : 'zh' })}
        className="rounded-md px-2.5 py-1 text-[12px] font-medium text-foreground/55 transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        {settings?.language === 'zh' ? 'EN' : '中文'}
      </button>

      <button
        type="button"
        onClick={() => update({ theme: settings?.theme === 'dark' ? 'light' : 'dark' })}
        className="rounded-md p-1.5 text-foreground/55 transition-colors hover:bg-surface-hover hover:text-foreground"
        aria-label={settings?.theme === 'dark' ? t('theme.light') : t('theme.dark')}
      >
        {settings?.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  )
}
