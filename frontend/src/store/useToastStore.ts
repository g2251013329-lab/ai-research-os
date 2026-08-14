import { create } from 'zustand'

interface ToastState {
  message: string | null
  show: (message: string) => void
  clear: () => void
}

let timer: ReturnType<typeof setTimeout> | null = null

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => {
    if (timer) clearTimeout(timer)
    set({ message })
    timer = setTimeout(() => set({ message: null }), 2400)
  },
  clear: () => {
    if (timer) clearTimeout(timer)
    set({ message: null })
  },
}))
