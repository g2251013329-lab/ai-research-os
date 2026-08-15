import { useTranslation } from 'react-i18next'

interface Props {
  titleKey: string
  phase: string
}

export default function PlaceholderPage({ titleKey, phase }: Props) {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-lg font-semibold">{t(titleKey)}</h1>
      <div className="mt-6 rounded-lg border border-dashed border-border bg-surface p-10 text-center dark:border-border dark:bg-surface">
        <p className="text-[13px] text-foreground/45 dark:text-foreground/55">
          {t('spaces.placeholder', { phase })}
        </p>
      </div>
    </div>
  )
}
