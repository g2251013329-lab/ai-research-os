import { create } from 'zustand'

export type QuickTab = 'project' | 'paper' | 'experiment' | 'question'

interface UiState {
  taskModalOpen: boolean
  taskModalKind: string
  focusOpen: boolean
  quickCreateTab: QuickTab | null
  openTaskModal: (kind?: string) => void
  closeTaskModal: () => void
  openFocus: () => void
  closeFocus: () => void
  openQuickCreate: (tab: QuickTab) => void
  closeQuickCreate: () => void
}

export const useUiStore = create<UiState>((set) => ({
  taskModalOpen: false,
  taskModalKind: 'general',
  focusOpen: false,
  quickCreateTab: null,
  openTaskModal: (kind = 'general') =>
    set({ taskModalOpen: true, taskModalKind: kind }),
  closeTaskModal: () => set({ taskModalOpen: false }),
  openFocus: () => set({ focusOpen: true }),
  closeFocus: () => set({ focusOpen: false }),
  openQuickCreate: (tab) => set({ quickCreateTab: tab }),
  closeQuickCreate: () => set({ quickCreateTab: null }),
}))
