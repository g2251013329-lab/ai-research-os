import { useTranslation } from 'react-i18next'

export default function Dashboard() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-lg font-semibold">{t('dashboard.title')}</h1>
      <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
        {t('dashboard.subtitle')}
      </p>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-[15px] font-medium">{t('dashboard.welcome')}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          {t('dashboard.welcomeDesc')}
        </p>
        <p className="mt-4 inline-block rounded-md bg-accent-soft px-2.5 py-1 text-[12px] text-accent">
          {t('dashboard.comingSoon')}
        </p>
      </div>
    </div>
  )
}
