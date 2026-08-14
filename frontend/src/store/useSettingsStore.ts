import { create } from 'zustand'
import i18n from '../i18n'
import { api } from '../api/client'

export interface AppSettings {
  vault_path: string
  language: 'zh' | 'en'
  theme: 'light' | 'dark'
  deepseek_model: string
  deepseek_base_url: string
}

interface SettingsState {
  settings: AppSettings | null
  loading: boolean
  keyConfigured: boolean | null
  load: () => Promise<void>
  update: (patch: Partial<AppSettings>) => Promise<void>
  refreshKeyStatus: () => Promise<void>
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,
  keyConfigured: null,
  load: async () => {
    set({ loading: true })
    try {
      const settings = await api<AppSettings>('/api/settings')
      localStorage.setItem('airos.lang', settings.language)
      applyTheme(settings.theme)
      set({ settings, loading: false })
      void get().refreshKeyStatus()
    } finally {
      set({ loading: false })
    }
  },
  update: async (patch) => {
    const settings = await api<AppSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
    localStorage.setItem('airos.lang', settings.language)
    void i18n.changeLanguage(settings.language)
    applyTheme(settings.theme)
    set({ settings })
  },
  refreshKeyStatus: async () => {
    try {
      const { configured } = await api<{ configured: boolean }>(
        '/api/settings/deepseek-key/status',
      )
      set({ keyConfigured: configured })
    } catch {
      set({ keyConfigured: null })
    }
  },
}))
