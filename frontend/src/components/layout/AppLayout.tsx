import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Coffee,
  FlaskConical,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Settings,
  Timer,
} from 'lucide-react'
import { api } from '../../api/client'
import BrandMark from '../BrandMark'
import TopBar from './TopBar'
import AiContextPanel from './AiContextPanel'
import SearchPalette from '../search/SearchPalette'
import CommandPalette from '../commands/CommandPalette'
import TaskModal from '../dashboard/TaskModal'
import QuickCreateModal from '../dashboard/QuickCreateModal'
import FocusOverlay from '../focus/FocusOverlay'
import TooltipHost from '../TooltipHost'
import ToastHost from '../ToastHost'
import { useUiStore } from '../../store/useUiStore'

const navGroups: {
  labelKey: string
  items: { to: string; key: string; icon: typeof LayoutDashboard; end: boolean; dot: string | null }[]
}[] = [
  {
    labelKey: 'nav.space',
    items: [
      { to: '/', key: 'nav.dashboard', icon: LayoutDashboard, end: true, dot: null },
      { to: '/learning', key: 'nav.learning', icon: GraduationCap, end: false, dot: 'bg-learning' },
      { to: '/research', key: 'nav.research', icon: FlaskConical, end: false, dot: 'bg-research' },
      { to: '/literature', key: 'nav.literature', icon: BookOpen, end: false, dot: 'bg-literature' },
      { to: '/leisure', key: 'nav.leisure', icon: Coffee, end: false, dot: 'bg-leisure' },
      { to: '/inbox', key: 'nav.inbox', icon: Inbox, end: false, dot: null },
    ],
  },
  {
    labelKey: 'nav.system',
    items: [{ to: '/settings', key: 'nav.settings', icon: Settings, end: false, dot: null }],
  },
]

export default function AppLayout() {
  const { t } = useTranslation()
  const openTaskModal = useUiStore((s) => s.openTaskModal)
  const openFocus = useUiStore((s) => s.openFocus)
  const [searchOpen, setSearchOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [statusBarOpen, setStatusBarOpen] = useState(true)

  const { data: dash } = useQuery({
    queryKey: ['dashboard', 'shell'],
    queryFn: () =>
      api<{
        focus_minutes_today: number
        today_done: number
        recent_activity: { title: string }[]
      }>('/api/dashboard?tz_offset_minutes=' + new Date().getTimezoneOffset()),
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(false)
        setSearchOpen((v) => !v)
      } else if (
        mod &&
        e.shiftKey &&
        (e.key.toLowerCase() === 'l' || e.key.toLowerCase() === 'p')
      ) {
        // ⌘⇧P (canonical) with ⌘⇧L alias
        e.preventDefault()
        setSearchOpen(false)
        setPaletteOpen((v) => !v)
      } else if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        openTaskModal()
      } else if (e.key === 'Escape') {
        setSearchOpen(false)
        setPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openTaskModal])

  const recentTitle = dash?.recent_activity?.[0]?.title

  return (
    <div className="app-bg flex h-full text-foreground">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface/80 backdrop-blur">
        <div className="border-b border-border px-4 py-3.5">
          <BrandMark />
        </div>
        <nav className="flex-1 space-y-3 overflow-y-auto p-2 pt-3">
          {navGroups.map((group) => (
            <div key={group.labelKey}>
              <div className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-foreground/40">
                {t(group.labelKey)}
              </div>
              <div className="space-y-0.5">
                {group.items.map(({ to, key, icon: Icon, end, dot }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                        isActive
                          ? 'bg-accent-soft font-medium text-accent'
                          : 'text-foreground/65 hover:bg-surface-hover hover:text-foreground'
                      }`
                    }
                  >
                    <Icon
                      size={15}
                      strokeWidth={1.8}
                      className="transition-transform group-hover:scale-110"
                    />
                    <span className="flex-1">{t(key)}</span>
                    {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenSearch={() => setSearchOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Status / Activity bar */}
        {statusBarOpen && (
          <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-border bg-surface/70 px-3 text-[11px] text-foreground/50 backdrop-blur">
            <Timer size={11} className="text-accent" />
            <span>
              {t('dashboard.doneToday', { n: dash?.today_done ?? 0 })} ·{' '}
              {t('dashboard.weeklyFocus')} {dash?.focus_minutes_today ?? 0}′
            </span>
            {recentTitle && (
              <>
                <span className="text-foreground/25">·</span>
                <span data-tip={recentTitle} className="truncate">
                  {recentTitle}
                </span>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setStatusBarOpen(false)
                openFocus()
              }}
              className="ml-auto flex shrink-0 items-center gap-1 rounded px-1.5 py-px text-[11px] text-accent transition-colors hover:bg-accent-soft"
              data-tip={t('dashboard.actions.focusMode')}
            >
              <Timer size={11} />
              {t('dashboard.actions.focusMode')}
            </button>
          </footer>
        )}
      </div>

      {/* AI context panel (collapsible) */}
      <AiContextPanel />

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <TaskModal />
      <QuickCreateModal />
      <FocusOverlay />
      <TooltipHost />
      <ToastHost />
    </div>
  )
}
