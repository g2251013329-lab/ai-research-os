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

const GROUPS = ['nav', 'appearance', 'apps', 'upcoming']

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
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
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
      // appearance
      { id: 'toggle-theme', titleKey: 'commands.toggleTheme', groupKey: 'appearance', icon: SunMoon, available: true, run: () => { deps.toggleTheme(); onClose() } },
      { id: 'toggle-language', titleKey: 'commands.toggleLanguage', groupKey: 'appearance', icon: Languages, available: true, run: () => { deps.toggleLanguage(); onClose() } },
      // apps (external tools)
      { id: 'open-zotero', titleKey: 'commands.openZotero', groupKey: 'apps', icon: FolderKanban, available: true, run: () => deps.launchApp('Zotero') },
      { id: 'open-obsidian', titleKey: 'commands.openObsidian', groupKey: 'apps', icon: NotebookPen, available: true, run: () => deps.launchApp('Obsidian') },
      { id: 'open-xiaolvjing', titleKey: 'commands.openXiaolvjing', groupKey: 'apps', icon: BookOpen, available: true, run: () => deps.launchApp('小绿鲸英文文献阅读器') },
      // upcoming
      { id: 'create-note', titleKey: 'commands.createNote', groupKey: 'upcoming', icon: SquarePen, available: false, phase: 'Phase 4', run: () => toast(t('palette.soon', { phase: 'Phase 4' })) },
      { id: 'sync-obsidian', titleKey: 'commands.syncObsidian', groupKey: 'upcoming', icon: Rocket, available: false, phase: 'Phase 5', run: () => toast(t('palette.soon', { phase: 'Phase 5' })) },
      { id: 'commit-changes', titleKey: 'commands.commitChanges', groupKey: 'upcoming', icon: PenLine, available: false, phase: 'Phase 5', run: () => toast(t('palette.soon', { phase: 'Phase 5' })) },
      { id: 'palette-info', titleKey: 'commands.paletteInfo', groupKey: 'upcoming', icon: Palette, available: false, phase: 'Phase 4', run: () => toast(t('palette.soon', { phase: 'Phase 4' })) },
      // Phase 2: now real
      { id: 'create-task', titleKey: 'commands.createTask', groupKey: 'upcoming', icon: ListTodo, available: true, run: () => { deps.openTaskModal(); navigate('/'); onClose() } },
      { id: 'add-inbox', titleKey: 'commands.addInbox', groupKey: 'upcoming', icon: Inbox, available: true, run: () => { navigate('/inbox'); onClose() } },
      { id: 'focus-mode', titleKey: 'commands.focusMode', groupKey: 'upcoming', icon: Timer, available: true, run: () => { deps.openFocus(); navigate('/'); onClose() } },
      // Phase 4: now real
      { id: 'create-experiment', titleKey: 'commands.createExperiment', groupKey: 'upcoming', icon: FlaskConical, available: true, run: () => { navigate('/research'); onClose() } },
      { id: 'create-question', titleKey: 'commands.createQuestion', groupKey: 'upcoming', icon: HelpCircle, available: true, run: () => { navigate('/research'); onClose() } },
      { id: 'add-paper', titleKey: 'commands.addPaper', groupKey: 'upcoming', icon: BookOpen, available: true, run: () => { navigate('/research'); onClose() } },
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
    </div>
  )
}
