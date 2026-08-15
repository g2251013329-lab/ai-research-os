import type { ReactNode } from 'react'

/** Composed empty state: icon + title + description + optional action (DS §41). */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      {icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
          {icon}
        </div>
      )}
      <div className="text-[13.5px] font-medium text-foreground">{title}</div>
      {description && (
        <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-foreground/50">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
