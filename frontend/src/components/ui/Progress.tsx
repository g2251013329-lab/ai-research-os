/** Linear progress bar on semantic tokens. */
export default function Progress({
  value,
  className = '',
  tone = 'accent',
}: {
  value: number
  className?: string
  tone?: 'accent' | 'success' | 'warning' | 'info'
}) {
  const bar = {
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    info: 'bg-info',
  }[tone]
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-surface-hover ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(Math.max(0, Math.min(100, value)))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${bar} transition-[width] duration-500 ease-out`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}
