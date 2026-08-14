import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BookOpen,
  Coffee,
  FlaskConical,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Settings,
} from 'lucide-react'
import TopBar from './TopBar'
import AiContextPanel from './AiContextPanel'

const navItems = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/learning', key: 'nav.learning', icon: GraduationCap },
  { to: '/research', key: 'nav.research', icon: FlaskConical },
  { to: '/literature', key: 'nav.literature', icon: BookOpen },
  { to: '/inbox', key: 'nav.inbox', icon: Inbox },
  { to: '/leisure', key: 'nav.leisure', icon: Coffee },
]

export default function AppLayout() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Sidebar */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div className="text-sm font-semibold tracking-wide">{t('app.title')}</div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {t('app.subtitle')}
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {navItems.map(({ to, key, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                  isActive
                    ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                }`
              }
            >
              <Icon size={15} strokeWidth={1.8} />
              {t(key)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-neutral-200 p-2 dark:border-neutral-800">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                isActive
                  ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
              }`
            }
          >
            <Settings size={15} strokeWidth={1.8} />
            {t('nav.settings')}
          </NavLink>
        </div>
      </aside>

      {/* Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* AI context panel (collapsible; Phase 6 wires real context) */}
      <AiContextPanel />
    </div>
  )
}
