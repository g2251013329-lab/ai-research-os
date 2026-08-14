import type { LucideIcon } from 'lucide-react'

/** A palette command. `available: false` shows as coming-soon. */
export interface Command {
  id: string
  titleKey: string
  groupKey: string
  icon: LucideIcon
  available: boolean
  phase?: string
  run: () => void
}

export interface CommandDeps {
  navigate: (path: string) => void
  toggleTheme: () => void
  toggleLanguage: () => void
  launchApp: (app: string) => void
  openTaskModal: () => void
  openFocus: () => void
  openQuickCreate: (tab: 'project' | 'paper' | 'experiment' | 'question') => void
  toast: (message: string) => void
  t: (key: string) => string
}
