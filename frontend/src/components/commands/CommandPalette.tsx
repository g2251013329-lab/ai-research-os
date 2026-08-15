import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Coffee,
  Command as CommandIcon,
  FlaskConical,
  FolderKanban,
  GraduationCap,
  HelpCircle,
  Inbox,
  Languages,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  Palette,
  PenLine,
  Rocket,
  Settings,
  SquarePen,
  SunMoon,
  Timer,
  X,
} from 'lucide-react'
import { api } from '../../api/client'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useToastStore } from '../../store/useToastStore'
import { useUiStore } from '../../store/useUiStore'
import type { Command, CommandDeps } from '../../commands/registry'

const GROUPS = ['nav', 'appearance', 'apps', 'actions']

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const openTaskModal = useUiStore((s) => s.openTaskModal)
  const openFocus = useUiStore((s) => s.openFocus)
  const openQuickCreate = useUiStore((s) => s.openQuickCreate)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const deps: CommandDeps = {
    navigate: (path) => navigate(path),
    toggleTheme: () =>
      void update({ theme: settings?.theme === 'dark' ? 'light' : 'dark' }),
    toggleLanguage: () =>
      void update({ language: settings?.language === 'zh' ? 'en' : 'zh' }),
    launchApp: async (app) => {
      try {
        await api('/api/system/launch-app', {
          method: 'POST',
          body: JSON.stringify({ app }),
        })
        toast(`${t('commands.launched')} ${app}`)
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e))
      }
    },
    openTaskModal,
    openFocus,
    openQuickCreate,
    toast,
    t,
  }

  const commands: Command[] = useMemo(() => {
    const nav = (path: string): Command['run'] => () => {
      navigate(path)
      onClose()
    }
    return [
      // navigation
      { id: 'go-dashboard', titleKey: 'commands.dashboard', groupKey: 'nav', icon: LayoutDashboard, available: true, run: nav('/') },
      { id: 'go-learning', titleKey: 'commands.learning', groupKey: 'nav', icon: GraduationCap, available: true, run: nav('/learning') },
      { id: 'go-research', titleKey: 'commands.research', groupKey: 'nav', icon: FlaskConical, available: true, run: nav('/research') },
      { id: 'go-literature', titleKey: 'commands.literature', groupKey: 'nav', icon: BookOpen, available: true, run: nav('/literature') },
      { id: 'go-inbox', titleKey: 'commands.inbox', groupKey: 'nav', icon: Inbox, available: true, run: nav('/inbox') },
      { id: 'go-leisure', titleKey: 'commands.leisure', groupKey: 'nav', icon: Coffee, available: true, run: nav('/leisure') },
      { id: 'go-settings', titleKey: 'commands.settings', groupKey: 'nav', icon: Settings, available: true, run: nav('/settings') },
      { id: 'go-design-system', titleKey: 'commands.designSystem', groupKey: 'nav', icon: Palette, available: true, run: nav('/design-system') },
      // appearance
      { id: 'toggle-theme', titleKey: 'commands.toggleTheme', groupKey: 'appearance', icon: SunMoon, available: true, run: () => { deps.toggleTheme(); onClose() } },
      { id: 'toggle-language', titleKey: 'commands.toggleLanguage', groupKey: 'appearance', icon: Languages, available: true, run: () => { deps.toggleLanguage(); onClose() } },
      // apps (external tools)
      { id: 'open-zotero', titleKey: 'commands.openZotero', groupKey: 'apps', icon: FolderKanban, available: true, run: () => deps.launchApp('Zotero') },
      { id: 'open-obsidian', titleKey: 'commands.openObsidian', groupKey: 'apps', icon: NotebookPen, available: true, run: () => deps.launchApp('Obsidian') },
      { id: 'open-xiaolvjing', titleKey: 'commands.openXiaolvjing', groupKey: 'apps', icon: BookOpen, available: true, run: () => deps.launchApp('小绿鲸英文文献阅读器') },
      // now real: notes + palette info
      { id: 'create-note', titleKey: 'commands.createNote', groupKey: 'actions', icon: SquarePen, available: true, run: () => { navigate('/learning?tab=notes'); onClose() } },
      { id: 'palette-info', titleKey: 'commands.paletteInfo', groupKey: 'actions', icon: Palette, available: true, run: () => setShowInfo(true) },
      // Phase 2: now real
      { id: 'create-task', titleKey: 'commands.createTask', groupKey: 'actions', icon: ListTodo, available: true, run: () => { deps.openTaskModal(); navigate('/'); onClose() } },
      { id: 'add-inbox', titleKey: 'commands.addInbox', groupKey: 'actions', icon: Inbox, available: true, run: () => { navigate('/inbox'); onClose() } },
      { id: 'focus-mode', titleKey: 'commands.focusMode', groupKey: 'actions', icon: Timer, available: true, run: () => { deps.openFocus(); navigate('/'); onClose() } },
      // Phase 4: now real
      { id: 'create-experiment', titleKey: 'commands.createExperiment', groupKey: 'actions', icon: FlaskConical, available: true, run: () => { deps.openQuickCreate('experiment'); onClose() } },
      { id: 'create-question', titleKey: 'commands.createQuestion', groupKey: 'actions', icon: HelpCircle, available: true, run: () => { deps.openQuickCreate('question'); onClose() } },
      { id: 'add-paper', titleKey: 'commands.addPaper', groupKey: 'actions', icon: BookOpen, available: true, run: () => { deps.openQuickCreate('paper'); onClose() } },
      // Phase 5: now real
      { id: 'sync-obsidian', titleKey: 'commands.syncObsidian', groupKey: 'apps', icon: Rocket, available: true, run: () => {
        void (async () => {
          try {
            await api('/api/git/sync', { method: 'POST' })
            toast(t('git.done'))
          } catch (e) {
            toast(e instanceof Error ? e.message : String(e))
          }
        })()
        onClose()
      } },
      { id: 'commit-changes', titleKey: 'commands.commitChanges', groupKey: 'apps', icon: PenLine, available: true, run: () => { navigate('/settings'); onClose() } },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.theme, settings?.language, navigate, onClose])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => {
      const title = t(c.titleKey).toLowerCase()
      const group = t(`palette.groups.${c.groupKey}`).toLowerCase()
      return title.includes(q) || group.includes(q) || c.id.includes(q)
    })
  }, [commands, query, t])

  const grouped = GROUPS.map((g) => ({
    group: g,
    items: filtered.filter((c) => c.groupKey === g),
  })).filter((g) => g.items.length > 0)

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((v) => Math.min(v + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((v) => Math.max(v - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const c = filtered[active]
      if (c) c.run()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="mt-[14vh] flex h-fit w-[560px] max-w-[92vw] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center gap-2.5 border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <CommandIcon size={16} className="shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder={t('palette.placeholder')}
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-neutral-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={15} />
          </button>
          <kbd className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-400 dark:border-neutral-700">
            ⌘⇧L
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-[12.5px] text-neutral-400">
              {t('search.noResults')}
            </p>
          )}
          {grouped.map((g) => (
            <div key={g.group} className="mb-1">
              <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                {t(`palette.groups.${g.group}`)}
              </div>
              {g.items.map((c) => {
                const idx = filtered.indexOf(c)
                const Icon = c.icon
                return (
                  <button
                    key={c.id}
                    type="button"
                    data-active={idx === active}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => c.run()}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors ${
                      !c.available
                        ? 'opacity-55'
                        : idx === active
                          ? 'bg-accent-soft'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <Icon
                      size={14}
                      className={`shrink-0 ${
                        idx === active && c.available
                          ? 'text-accent'
                          : 'text-neutral-400'
                      }`}
                    />
                    <span data-tip={t(c.titleKey)} className="flex-1 truncate text-[13px]">
                      {t(c.titleKey)}
                    </span>
                    {!c.available && c.phase && (
                      <span className="shrink-0 text-[10.5px] text-neutral-400">
                        {c.phase}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* shortcuts info */}
      {showInfo && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowInfo(false)
          }}
        >
          <div className="w-[340px] rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <h3 className="text-[13.5px] font-semibold">{t('palette.info.title')}</h3>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
              {(
                [
                  ['⌘K', t('palette.info.search')],
                  ['⌘⇧L', t('palette.info.palette')],
                  ['Esc', t('palette.info.close')],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between py-2 text-[12.5px]">
                  <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
                  <kbd className="rounded border border-neutral-200 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
