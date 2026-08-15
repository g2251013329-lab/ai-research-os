import type { ReactNode } from 'react'

/** Status indicator: color + icon + text (never color alone — DS §30). */
const DOT_TONES: Record<string, string> = {
  neutral: 'bg-neutral-400 dark:bg-surface-hover0',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  accent: 'bg-accent',
  learning: 'bg-learning',
  research: 'bg-research',
  leisure: 'bg-leisure',
}

export default function StatusBadge({
  tone = 'neutral',
  icon,
  children,
  className = '',
}: {
  tone?: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 text-[11px] text-foreground/60 ${className}`}
    >
      {icon ?? <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONES[tone] ?? DOT_TONES.neutral}`} />}
      <span className="truncate">{children}</span>
    </span>
  )
}
