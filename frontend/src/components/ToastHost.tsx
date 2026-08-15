import { useToastStore } from '../store/useToastStore'

export default function ToastHost() {
  const message = useToastStore((s) => s.message)
  if (!message) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex justify-center">
      <div className="rounded-lg border border-border bg-surface px-4 py-2 text-[13px] shadow-lg dark:border-border dark:bg-neutral-800">
        {message}
      </div>
    </div>
  )
}
