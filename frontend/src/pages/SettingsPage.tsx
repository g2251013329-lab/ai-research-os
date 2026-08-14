import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, KeyRound, Loader2 } from 'lucide-react'
import { api } from '../api/client'
import { useSettingsStore } from '../store/useSettingsStore'
import { ACCENT_THEMES } from '../theme/themes'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { settings, update, refreshKeyStatus, keyConfigured } = useSettingsStore()

  const [vaultPath, setVaultPath] = useState(settings?.vault_path ?? '')
  const [brandSubtitle, setBrandSubtitle] = useState(
    settings?.brand_subtitle ?? 'LLPS',
  )
  const [model, setModel] = useState(settings?.deepseek_model ?? 'deepseek-chat')
  const [baseUrl, setBaseUrl] = useState(
    settings?.deepseek_base_url ?? 'https://api.deepseek.com',
  )
  const [apiKey, setApiKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  const flashSaved = () => {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const saveVault = async () => {
    await update({ vault_path: vaultPath.trim() || settings?.vault_path })
    flashSaved()
  }

  const saveBrand = async () => {
    await update({
      brand_subtitle: brandSubtitle.trim() || settings?.brand_subtitle || 'LLPS',
    })
    flashSaved()
  }

  const saveAi = async () => {
    await update({ deepseek_model: model.trim(), deepseek_base_url: baseUrl.trim() })
    flashSaved()
  }

  const saveKey = async () => {
    if (!apiKey.trim()) return
    setSavingKey(true)
    try {
      await api('/api/settings/deepseek-key', {
        method: 'PUT',
        body: JSON.stringify({ api_key: apiKey.trim() }),
      })
      setApiKey('')
      setTestResult(null)
      await refreshKeyStatus()
      flashSaved()
    } finally {
      setSavingKey(false)
    }
  }

  const testKey = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await api<{ ok: boolean; models: string[] }>(
        '/api/settings/deepseek-key/test',
        { method: 'POST' },
      )
      setTestResult({ ok: true, message: r.models.join(', ') })
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : String(e) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-lg font-semibold">{t('settings.title')}</h1>

      <section className="mt-6 space-y-4">
        {/* Vault */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <label className="block text-[13px] font-medium">{t('settings.vault.label')}</label>
          <p className="mt-0.5 text-[12px] text-neutral-400 dark:text-neutral-500">
            {t('settings.vault.desc')}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={vaultPath}
              onChange={(e) => setVaultPath(e.target.value)}
              className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
              placeholder="/Users/mathew/ai-research-vault"
            />
            <button
              type="button"
              onClick={() => void saveVault()}
              className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
            >
              {t('common.save')}
            </button>
          </div>
        </div>

        {/* Brand subtitle */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <label className="block text-[13px] font-medium">{t('settings.brand.label')}</label>
          <p className="mt-0.5 text-[12px] text-neutral-400 dark:text-neutral-500">
            {t('settings.brand.desc')}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={brandSubtitle}
              onChange={(e) => setBrandSubtitle(e.target.value)}
              className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
              placeholder="LLPS"
            />
            <button
              type="button"
              onClick={() => void saveBrand()}
              className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
            >
              {t('common.save')}
            </button>
          </div>
        </div>

        {/* Language, theme & accent */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <label className="block text-[13px] font-medium">
              {t('settings.language.label')}
            </label>
            <select
              value={settings?.language ?? 'zh'}
              onChange={(e) =>
                void update({ language: e.target.value as 'zh' | 'en' })
              }
              className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
            >
              <option value="zh">{t('language.zh')}</option>
              <option value="en">{t('language.en')}</option>
            </select>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <label className="block text-[13px] font-medium">{t('settings.theme.label')}</label>
            <select
              value={settings?.theme ?? 'dark'}
              onChange={(e) =>
                void update({ theme: e.target.value as 'light' | 'dark' })
              }
              className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
            >
              <option value="light">{t('theme.light')}</option>
              <option value="dark">{t('theme.dark')}</option>
            </select>
          </div>
        </div>

        {/* Accent themes */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <label className="block text-[13px] font-medium">{t('themes.label')}</label>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {ACCENT_THEMES.map((th) => {
              const active = (settings?.accent ?? 'ocean') === th.id
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => void update({ accent: th.id })}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-colors ${
                    active
                      ? 'border-accent bg-accent-soft'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                  }`}
                >
                  <span
                    className="h-6 w-6 rounded-full shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${th.from}, ${th.to})`,
                    }}
                  />
                  <span
                    className={`text-[11px] ${
                      active
                        ? 'font-medium text-accent'
                        : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {t(th.nameKey)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* AI model */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <label className="block text-[13px] font-medium">{t('settings.ai.label')}</label>
          <div className="mt-2 grid grid-cols-[1fr_1.5fr_auto] gap-2">
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
              placeholder={t('settings.ai.baseUrl')}
            />
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
              placeholder={t('settings.ai.model')}
            />
            <button
              type="button"
              onClick={() => void saveAi()}
              className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
            >
              {t('common.save')}
            </button>
          </div>
        </div>

        {/* DeepSeek key */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <KeyRound size={14} className="text-neutral-400" />
            <label className="text-[13px] font-medium">{t('settings.key.label')}</label>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${
                keyConfigured
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
              }`}
            >
              {keyConfigured ? t('settings.key.configured') : t('settings.key.notConfigured')}
            </span>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
              placeholder={t('settings.key.placeholder')}
            />
            <button
              type="button"
              onClick={() => void saveKey()}
              disabled={savingKey || !apiKey.trim()}
              className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {savingKey ? <Loader2 size={13} className="animate-spin" /> : t('settings.key.save')}
            </button>
            <button
              type="button"
              onClick={() => void testKey()}
              disabled={testing || !keyConfigured}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-[13px] transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {testing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                t('common.test')
              )}
            </button>
          </div>
          {testResult && (
            <p
              className={`mt-2 text-[12px] ${
                testResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {testResult.ok ? t('settings.key.testOk') : t('settings.key.testFail')}
              {testResult.message}
            </p>
          )}
        </div>

        {savedFlash && (
          <p className="flex items-center gap-1 text-[12px] text-emerald-600 dark:text-emerald-400">
            <Check size={13} /> {t('common.saved')}
          </p>
        )}
      </section>
    </div>
  )
}
