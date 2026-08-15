import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/** Base modal: overlay + panel + title + Esc / backdrop close. */
export default function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  width = 480,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  icon?: ReactNode
  children: ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="overflow-hidden rounded-2xl border border-border bg-surface shadow-floating"
        style={{ width: `min(${width}px, 92vw)` }}
        role="dialog"
        aria-modal="true"
      >
        {typeof title === 'string' ? (
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-1.5 text-[14px] font-semibold">
              {icon}
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-foreground/45 transition-colors hover:bg-surface-hover hover:text-foreground"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          title
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
