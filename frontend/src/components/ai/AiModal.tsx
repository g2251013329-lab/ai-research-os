import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, Sparkles, X } from 'lucide-react'

interface Props {
  title: string
  /** callback to fetch the AI result; must return the text to display */
  fetcher: () => Promise<string>
  /** optional apply action (e.g. writing assist) */
  onApply?: (text: string) => void
  /** optional extra UI rendered below result (e.g. structured suggestion actions) */
  children?: React.ReactNode
  onClose: () => void
}

export default function AiModal({ title, fetcher, onApply, children, onClose }: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const text = await fetcher()
        if (alive) setResult(text)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[80vh] w-[640px] max-w-[94vw] flex-col rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold">
            <Sparkles size={14} className="text-accent" />
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-[180px] flex-1 overflow-y-auto whitespace-pre-wrap p-4 text-[13px] leading-relaxed">
          {loading && (
            <div className="flex h-full items-center justify-center gap-2 text-neutral-400">
              <Loader2 size={16} className="animate-spin" /> {t('ai.thinking')}
            </div>
          )}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && result}
          {!loading && !error && children}
        </div>

        {(onApply || children) && !loading && !error && (
          <div className="flex justify-end gap-2 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
            {onApply && (
              <button
                type="button"
                onClick={() => {
                  onApply(result)
                  setApplied(true)
                }}
                disabled={applied || !result}
                className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                {applied ? <Check size={12} /> : null}
                {applied ? t('ai.applied') : t('ai.apply')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
