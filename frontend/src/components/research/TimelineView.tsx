import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
import { api } from '../../api/client'
import { relativeTime } from '../../utils/time'

interface Event {
  event_type: string
  title: string
  detail: string
  created_at: string
}

export default function TimelineView({ projectId }: { projectId: number }) {
  const { t } = useTranslation()
  const { data: events } = useQuery({
    queryKey: ['timeline', projectId],
    queryFn: () => api<Event[]>(`/api/timeline?project_id=${projectId}&limit=50`),
  })

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-foreground/45">{t('research.timeline.hint')}</p>
      <div className="divide-y divide-border-subtle rounded-lg border border-border bg-surface dark:divide-border-subtle dark:border-border dark:bg-surface">
        {(events ?? []).length === 0 && (
          <p className="px-4 py-10 text-center text-[12.5px] text-foreground/45">
            {t('research.timeline.empty')}
          </p>
        )}
        {(events ?? []).map((ev) => (
          <div key={ev.created_at + ev.title} className="flex items-center gap-3 px-4 py-2.5">
            <Activity size={13} className="shrink-0 text-foreground/45" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px]" data-tip={ev.title}>
                {ev.title}
              </div>
              {ev.detail && (
                <div className="truncate text-[11px] text-foreground/45" data-tip={ev.detail}>
                  {ev.detail}
                </div>
              )}
            </div>
            <span className="shrink-0 text-[11px] text-foreground/45">
              {relativeTime(ev.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
