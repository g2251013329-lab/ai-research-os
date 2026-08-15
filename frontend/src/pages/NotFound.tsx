import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <p className="text-[28px] font-bold tracking-tight text-neutral-300 dark:text-neutral-700">
        404
      </p>
      <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
        {t('notFound.title')}
      </p>
      <Link
        to="/"
        className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
      >
        {t('notFound.back')}
      </Link>
    </div>
  )
}
