import type { ReactNode } from 'react'

/** Editorial section: title + optional right slot + subtle divider. */
export default function Section({
  title,
  icon,
  right,
  children,
  className = '',
}: {
  title?: ReactNode
  icon?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      {(title || right) && (
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
          <h2 className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-foreground">
            {icon}
            {title}
          </h2>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}
