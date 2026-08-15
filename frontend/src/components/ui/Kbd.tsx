import type { ReactNode } from 'react'

/** Keyboard key display. */
export default function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-foreground/55">
      {children}
    </kbd>
  )
}
