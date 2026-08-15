import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { Concept } from './RoadmapView'
import { Loader2, X } from 'lucide-react'

interface Card {
  q: string
  a: string
}

export default function FlashcardsModal({
  concept,
  onClose,
}: {
  concept: Concept
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  const { data, isLoading, error } = useQuery({
    queryKey: ['learning', 'flashcards', concept.id],
    queryFn: async () => {
      const r = await api<{ answer: string }>('/api/ai/learning-assist', {
        method: 'POST',
        body: JSON.stringify({ concept_id: concept.id, mode: 'flashcards' }),
      })
      try {
        const start = r.answer.indexOf('{')
        const end = r.answer.lastIndexOf('}') + 1
        const parsed = JSON.parse(r.answer.slice(start, end))
        return (parsed.cards ?? []) as Card[]
      } catch {
        return [{ q: t('learning.ai.flashcardParseFail'), a: r.answer.slice(0, 400) }]
      }
    },
  })

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[80vh] w-[560px] max-w-[92vw] flex-col rounded-xl border border-border bg-surface shadow-2xl dark:border-border dark:bg-surface">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-border">
          <h2 className="text-[13.5px] font-semibold">
            {t('learning.ai.flashcards')}: {concept.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-foreground/45 hover:bg-surface-hover dark:hover:bg-neutral-800"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-[200px] flex-1 space-y-2 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-foreground/45">
              <Loader2 size={16} className="animate-spin" /> {t('ai.thinking')}
            </div>
          )}
          {error && <p className="text-red-500">{error instanceof Error ? error.message : String(error)}</p>}
          {(data ?? []).map((card, i) => {
            const shown = revealed.has(i)
            return (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setRevealed((prev) => {
                    const next = new Set(prev)
                    if (next.has(i)) next.delete(i)
                    else next.add(i)
                    return next
                  })
                }
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  shown
                    ? 'border-accent bg-accent-soft'
                    : 'border-border hover:border-border dark:border-border dark:hover:border-neutral-600'
                }`}
              >
                <div className="text-[13px] font-medium">{card.q}</div>
                {shown ? (
                  <div className="mt-2 text-[12.5px] leading-relaxed text-foreground/65 dark:text-foreground/75">
                    {card.a}
                  </div>
                ) : (
                  <div className="mt-2 text-[11.5px] text-foreground/45">
                    {t('learning.ai.flashcardReveal')}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
