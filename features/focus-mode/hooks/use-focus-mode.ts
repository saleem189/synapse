// ================================
// Focus Mode Hook
// ================================
// Hook for managing focus mode state

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FocusModeStore } from '../types';

/**
 * Focus mode store
 * Persists to localStorage
 */
export const useFocusMode = create<FocusModeStore>()(
  persist(
    (set) => ({
      isEnabled: false,
      enableFocusMode: () => set({ isEnabled: true }),
      disableFocusMode: () => set({ isEnabled: false }),
      toggleFocusMode: () => set((state) => ({ isEnabled: !state.isEnabled })),
    }),
    {
      name: 'synapse-focus-mode',
      getStorage: () => localStorage,
    }
  )
);

