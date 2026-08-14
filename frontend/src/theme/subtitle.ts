/**
 * Brand subtitle (e.g. "LLPS") art catalog: script fonts + color choices.
 * Bundled fonts (@fontsource) work offline everywhere; system fonts are
 * macOS built-in script faces (fall back gracefully elsewhere).
 */
export interface SubtitleFont {
  id: string
  nameKey: string
  family: string
}

export const SUBTITLE_FONTS: SubtitleFont[] = [
  {
    id: 'great-vibes',
    nameKey: 'fonts.greatVibes',
    family: "'Great Vibes', cursive",
  },
  {
    id: 'dancing-script',
    nameKey: 'fonts.dancingScript',
    family: "'Dancing Script', cursive",
  },
  {
    id: 'snell',
    nameKey: 'fonts.snell',
    family: "'Snell Roundhand', cursive",
  },
  {
    id: 'apple-chancery',
    nameKey: 'fonts.appleChancery',
    family: "'Apple Chancery', cursive",
  },
  {
    id: 'brush-script',
    nameKey: 'fonts.brushScript',
    family: "'Brush Script MT', cursive",
  },
  {
    id: 'zapfino',
    nameKey: 'fonts.zapfino',
    family: "'Zapfino', cursive",
  },
]

export interface SubtitleColor {
  id: string
  nameKey: string
  /** hex value; 'accent' uses the theme gradient instead */
  value: string | null
}

export const SUBTITLE_COLORS: SubtitleColor[] = [
  { id: 'accent', nameKey: 'colors.accent', value: null },
  { id: 'gold', nameKey: 'colors.gold', value: '#d4af37' },
  { id: 'rose', nameKey: 'colors.rose', value: '#f472b6' },
  { id: 'violet', nameKey: 'colors.violet', value: '#a78bfa' },
  { id: 'teal', nameKey: 'colors.teal', value: '#2dd4bf' },
  { id: 'coral', nameKey: 'colors.coral', value: '#fb7185' },
  { id: 'sky', nameKey: 'colors.sky', value: '#38bdf8' },
]

export const SUBTITLE_FONT_IDS = SUBTITLE_FONTS.map((f) => f.id)
export const SUBTITLE_COLOR_IDS = SUBTITLE_COLORS.map((c) => c.id)
