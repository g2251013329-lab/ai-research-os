/** Accent theme catalog: id, i18n name key, and gradient swatch colors. */
export interface AccentTheme {
  id: string
  nameKey: string
  from: string
  to: string
}

export const ACCENT_THEMES: AccentTheme[] = [
  { id: 'ocean', nameKey: 'themes.ocean', from: '#3b82f6', to: '#6366f1' },
  { id: 'mint', nameKey: 'themes.mint', from: '#10b981', to: '#14b8a6' },
  { id: 'sakura', nameKey: 'themes.sakura', from: '#ec4899', to: '#d946ef' },
  { id: 'grape', nameKey: 'themes.grape', from: '#8b5cf6', to: '#a855f7' },
  { id: 'sunset', nameKey: 'themes.sunset', from: '#f59e0b', to: '#f97316' },
  { id: 'cyan', nameKey: 'themes.cyan', from: '#06b6d4', to: '#0ea5e9' },
  { id: 'coral', nameKey: 'themes.coral', from: '#f43f5e', to: '#fb7185' },
  { id: 'mono', nameKey: 'themes.mono', from: '#525252', to: '#a3a3a3' },
]

export const ACCENT_IDS = ACCENT_THEMES.map((t) => t.id)
