import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, KeyRound, Loader2 } from 'lucide-react'
import { api } from '../api/client'
import { useSettingsStore } from '../store/useSettingsStore'
import { ACCENT_THEMES } from '../theme/themes'
import { SUBTITLE_COLORS, SUBTITLE_FONTS } from '../theme/subtitle'

const UI_THEMES = [
  { id: 'laboratory', bg: '#f5f6f7', surface: '#ffffff', desc: '亮 · 实验室' },
  { id: 'midnight', bg: '#0b1220', surface: '#182236', desc: '暗 · 午夜实验室' },
  { id: 'graphite', bg: '#e9ebee', surface: '#f4f5f7', desc: '石墨 · 研究' },
  { id: 'paper', bg: '#f4efe6', surface: '#faf6ee', desc: '纸感 · 编辑' },
  { id: 'botanical', bg: '#eef1ec', surface: '#f7f9f5', desc: '植物 · 生命科学' },
]
import GitPanel from '../components/settings/GitPanel'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { settings, update, refreshKeyStatus, keyConfigured } = useSettingsStore()
  useEffect(() => {
    void (async () => {
      const s = await api<{ configured: boolean }>('/api/settings/onescholar-key/status')
      setOsConfigured(s.configured)
    })()
  }, [])

  const [vaultPath, setVaultPath] = useState(settings?.vault_path ?? '')
  const [zoteroPath, setZoteroPath] = useState(settings?.zotero_path ?? '~/Zotero')
  const [brandSubtitle, setBrandSubtitle] = useState(
    settings?.brand_subtitle ?? 'LLPS',
  )
  const [extraVaults, setExtraVaults] = useState(
    (settings?.extra_vaults ?? []).join('\n'),
  )
  const [model, setModel] = useState(settings?.deepseek_model ?? 'deepseek-chat')
  const [baseUrl, setBaseUrl] = useState(
    settings?.deepseek_base_url ?? 'https://api.deepseek.com',
  )
  const [apiKey, setApiKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [osBase, setOsBase] = useState(settings?.onescholar_base_url ?? 'https://api.sssam.com')
  const [osKey, setOsKey] = useState('')
  const [osConfigured, setOsConfigured] = useState<boolean | null>(null)
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

  const saveZotero = async () => {
    await update({ zotero_path: zoteroPath.trim() || '~/Zotero' })
    flashSaved()
  }

  const saveBrand = async () => {
    await update({
      brand_subtitle: brandSubtitle.trim() || settings?.brand_subtitle || 'LLPS',
    })
    flashSaved()
  }

  const saveExtraVaults = async () => {
    const list = extraVaults
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    await update({ extra_vaults: list })
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
      <h1 className="text-xl font-semibold tracking-tight">{t('settings.title')}</h1>

      <section className="mt-6 space-y-4">
        {/* Vault */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card dark:border-neutral-800 dark:bg-neutral-900">
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
              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
            >
              {t('common.save')}
            </button>
          </div>
        </div>

        {/* Zotero path */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card dark:border-neutral-800 dark:bg-neutral-900">
          <label className="block text-[13px] font-medium">{t('settings.zotero.label')}</label>
          <p className="mt-0.5 text-[12px] text-neutral-400 dark:text-neutral-500">
            {t('settings.zotero.desc')}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={zoteroPath}
              onChange={(e) => setZoteroPath(e.target.value)}
              className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
              placeholder="~/Zotero"
            />
            <button
              type="button"
              onClick={() => void saveZotero()}
              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
            >
              {t('common.save')}
            </button>
          </div>
        </div>

        {/* Extra search vaults */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card dark:border-neutral-800 dark:bg-neutral-900">
          <label className="block text-[13px] font-medium">
            {t('settings.vaults.extra')}
          </label>
          <p className="mt-0.5 text-[12px] text-neutral-400 dark:text-neutral-500">
            {t('settings.vaults.extraDesc')}
          </p>
          <div className="mt-2 flex gap-2">
            <textarea
              value={extraVaults}
              onChange={(e) => setExtraVaults(e.target.value)}
              rows={3}
              className="flex-1 resize-y rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
              placeholder="/Users/mathew/knowledge-base"
            />
            <button
              type="button"
              onClick={() => void saveExtraVaults()}
              className="h-fit rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
            >
              {t('common.save')}
            </button>
          </div>
        </div>

        {/* Brand subtitle */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card dark:border-neutral-800 dark:bg-neutral-900">
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
              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
            >
              {t('common.save')}
            </button>
          </div>

          {/* Script font choice */}
          <label className="mt-3 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            {t('settings.brand.font')}
          </label>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {SUBTITLE_FONTS.map((f) => {
              const active = (settings?.brand_subtitle_font ?? 'great-vibes') === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => void update({ brand_subtitle_font: f.id })}
                  className={`rounded-md border px-2 py-2 text-[15px] leading-none transition-colors ${
                    active
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600'
                  }`}
                  style={{ fontFamily: f.family }}
                >
                  LLPS
                </button>
              )
            })}
          </div>

          {/* Subtitle color choice */}
          <label className="mt-3 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            {t('settings.brand.color')}
          </label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {SUBTITLE_COLORS.map((c) => {
              const active = (settings?.brand_subtitle_color ?? 'accent') === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void update({ brand_subtitle_color: c.id })}
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[12px] transition-colors ${
                    active
                      ? 'border-accent bg-accent-soft'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full"
                    style={{
                      background:
                        c.value === null
                          ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                          : c.value,
                    }}
                  />
                  <span
                    className={
                      active
                        ? 'font-medium text-accent'
                        : 'text-neutral-500 dark:text-neutral-400'
                    }
                  >
                    {t(c.nameKey)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Language, theme & appearance */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card dark:border-neutral-800 dark:bg-neutral-900">
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
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card dark:border-neutral-800 dark:bg-neutral-900">
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

        {/* UI theme presets */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card dark:border-neutral-800 dark:bg-neutral-900">
          <label className="block text-[13px] font-medium">{t('settings.uiTheme.label')}</label>
          <p className="mt-0.5 text-[11.5px] text-neutral-400">{t('settings.uiTheme.hint')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {UI_THEMES.map((th) => {
              const active = (settings?.ui_theme ?? 'laboratory') === th.id
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => void update({ ui_theme: th.id })}
                  className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                    active
                      ? 'border-accent bg-accent-soft'
                      : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                  }`}
                >
                  <span
                    className="h-8 w-8 shrink-0 rounded-md border border-black/10"
                    style={{ background: `linear-gradient(135deg, ${th.bg}, ${th.surface})` }}
                  />
                  <span className="min-w-0">
                    <span
                      className={`block truncate text-[12px] ${
                        active ? 'font-medium text-accent' : 'text-neutral-700 dark:text-neutral-200'
                      }`}
                    >
                      {t(`settings.uiTheme.${th.id}`)}
                    </span>
                    <span className="block truncate text-[10.5px] text-neutral-400">
                      {th.desc}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Accent themes */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card dark:border-neutral-800 dark:bg-neutral-900">
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
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card dark:border-neutral-800 dark:bg-neutral-900">
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
              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
            >
              {t('common.save')}
            </button>
          </div>
        </div>

        {/* DeepSeek key */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card dark:border-neutral-800 dark:bg-neutral-900">
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
              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
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

        {/* One Scholar */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-card dark:border-neutral-800 dark:bg-neutral-900">
          <label className="block text-[13px] font-medium">{t('settings.onescholar.label')}</label>
          <p className="mt-0.5 text-[12px] text-neutral-400 dark:text-neutral-500">
            {t('settings.onescholar.desc')}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={osBase}
              onChange={(e) => setOsBase(e.target.value)}
              className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
              placeholder="https://api.sssam.com"
            />
            <button
              type="button"
              onClick={async () => {
                await update({ onescholar_base_url: osBase.trim() })
                flashSaved()
              }}
              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark"
            >
              {t('common.save')}
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="password"
              value={osKey}
              onChange={(e) => setOsKey(e.target.value)}
              className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-accent dark:border-neutral-700 dark:bg-neutral-950"
              placeholder={t('settings.onescholar.keyPlaceholder')}
            />
            <button
              type="button"
              disabled={!osKey.trim()}
              onClick={async () => {
                await api('/api/settings/onescholar-key', {
                  method: 'PUT',
                  body: JSON.stringify({ api_key: osKey.trim() }),
                })
                setOsKey('')
                const s = await api<{ configured: boolean }>(
                  '/api/settings/onescholar-key/status',
                )
                setOsConfigured(s.configured)
                flashSaved()
              }}
              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {t('settings.onescholar.saveKey')}
            </button>
            <span
              className={`flex items-center rounded-full px-2 py-1 text-[11px] ${
                osConfigured
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
              }`}
            >
              {osConfigured
                ? t('settings.key.configured')
                : t('settings.key.notConfigured')}
            </span>
          </div>
        </div>

        {/* Git sync */}
        <GitPanel />

        {savedFlash && (
          <p className="flex items-center gap-1 text-[12px] text-emerald-600 dark:text-emerald-400">
            <Check size={13} /> {t('common.saved')}
          </p>
        )}
      </section>
    </div>
  )
}
