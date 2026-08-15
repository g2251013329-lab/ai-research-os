/** Small time helpers (relative labels for activity feeds). */

/**
 * Backend timestamps are UTC, serialized without an offset marker
 * (e.g. "2026-08-15T00:58:15.311122"). Plain `new Date(iso)` would parse
 * them as LOCAL time and shift the clock by the UTC offset — so parse as
 * UTC explicitly. Strings that already carry a timezone marker pass through.
 */
export function parseApiTime(iso: string): Date {
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z')
}

/** Local calendar date (YYYY-MM-DD) of a backend timestamp. */
export function apiDate(iso: string): string {
  const d = parseApiTime(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Client UTC offset in minutes (UTC+8 → -480), sent to backend for local-day boundaries. */
export function tzOffsetMinutes(): number {
  return new Date().getTimezoneOffset()
}

export function relativeTime(iso: string): string {
  const then = parseApiTime(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return parseApiTime(iso).toLocaleDateString()
}

export function todayLabel(locale: string = 'zh-CN'): string {
  return new Date().toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}
