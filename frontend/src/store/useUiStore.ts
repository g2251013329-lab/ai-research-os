import { create } from 'zustand'

interface UiState {
  taskModalOpen: boolean
  focusOpen: boolean
  openTaskModal: () => void
  closeTaskModal: () => void
  openFocus: () => void
  closeFocus: () => void
}

export const useUiStore = create<UiState>((set) => ({
  taskModalOpen: false,
  focusOpen: false,
  openTaskModal: () => set({ taskModalOpen: true }),
  closeTaskModal: () => set({ taskModalOpen: false }),
  openFocus: () => set({ focusOpen: true }),
  closeFocus: () => set({ focusOpen: false }),
}))
