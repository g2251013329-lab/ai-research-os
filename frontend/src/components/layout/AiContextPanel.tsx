import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PanelRightClose, PanelRightOpen, Sparkles } from 'lucide-react'

export default function AiContextPanel() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)

  return (
    <aside
      className={`flex shrink-0 flex-col border-l border-neutral-200 bg-white transition-[width] dark:border-neutral-800 dark:bg-neutral-900 ${
        open ? 'w-72' : 'w-9'
      }`}
    >
      <div className="flex h-11 items-center justify-between border-b border-neutral-200 px-2 dark:border-neutral-800">
        {open && (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-600 dark:text-neutral-300">
            <Sparkles size={13} className="text-accent" />
            {t('aiPanel.title')}
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label={open ? 'collapse' : 'expand'}
        >
          {open ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
        </button>
      </div>
      {open && (
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-[12px] leading-relaxed text-neutral-400 dark:text-neutral-500">
            {t('aiPanel.placeholder')}
          </p>
        </div>
      )}
    </aside>
  )
}
