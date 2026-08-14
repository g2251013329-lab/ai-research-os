import { create } from 'zustand'

interface UiState {
  taskModalOpen: boolean
  taskModalKind: string
  focusOpen: boolean
  openTaskModal: (kind?: string) => void
  closeTaskModal: () => void
  openFocus: () => void
  closeFocus: () => void
}

export const useUiStore = create<UiState>((set) => ({
  taskModalOpen: false,
  taskModalKind: 'general',
  focusOpen: false,
  openTaskModal: (kind = 'general') =>
    set({ taskModalOpen: true, taskModalKind: kind }),
  closeTaskModal: () => set({ taskModalOpen: false }),
  openFocus: () => set({ focusOpen: true }),
  closeFocus: () => set({ focusOpen: false }),
}))
