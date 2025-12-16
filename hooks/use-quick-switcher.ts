import { create } from 'zustand';

interface QuickSwitcherState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Global state for Quick Switcher modal
 * Allows triggering the switcher from anywhere in the app
 */
export const useQuickSwitcher = create<QuickSwitcherState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));

