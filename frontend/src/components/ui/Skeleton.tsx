/** Skeleton loading placeholder (DS §42 — skeletons over spinners). */
export default function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-surface-hover ${className}`}
    />
  )
}
