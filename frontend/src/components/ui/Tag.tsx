import type { ReactNode } from 'react'

/** Semantic tag tones — map to design tokens, never hard-coded page colors. */
const TONES: Record<string, string> = {
  neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  learning: 'bg-learning-soft text-learning',
  research: 'bg-research-soft text-research',
  leisure: 'bg-leisure-soft text-leisure',
  literature: 'bg-literature-soft text-literature',
  experiment: 'bg-experiment-soft text-experiment',
  question: 'bg-question-soft text-question',
  hypothesis: 'bg-hypothesis-soft text-hypothesis',
  result: 'bg-result-soft text-result',
}

export default function Tag({
  tone = 'neutral',
  children,
  className = '',
  tip,
}: {
  tone?: string
  children: ReactNode
  className?: string
  tip?: string
}) {
  return (
    <span
      data-tip={tip}
      className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-px text-[10.5px] font-medium leading-4 ${TONES[tone] ?? TONES.neutral} ${className}`}
    >
      {children}
    </span>
  )
}
