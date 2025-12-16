// ================================
// Density Mode Hook
// ================================
// Custom hook for managing view density preferences

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ViewDensity, DENSITY_STORAGE_KEY, DENSITY_PRESETS, DensityClasses } from '../types';

interface DensityModeState {
  mode: ViewDensity;
  classes: DensityClasses;
  setMode: (mode: ViewDensity) => void;
  toggleMode: () => void;
}

/**
 * Zustand store for density mode
 */
export const useDensityMode = create<DensityModeState>()(
  persist(
    (set, get) => ({
      mode: 'comfortable',
      classes: DENSITY_PRESETS.comfortable,
      
      setMode: (mode: ViewDensity) => {
        set({
          mode,
          classes: DENSITY_PRESETS[mode],
        });
      },
      
      toggleMode: () => {
        const currentMode = get().mode;
        const newMode: ViewDensity = currentMode === 'comfortable' ? 'compact' : 'comfortable';
        set({
          mode: newMode,
          classes: DENSITY_PRESETS[newMode],
        });
      },
    }),
    {
      name: DENSITY_STORAGE_KEY,
    }
  )
);

/**
 * Hook to get density classes for a specific element type
 */
export function useDensityClasses() {
  const classes = useDensityMode((state) => state.classes);
  return classes;
}

/**
 * Hook to check if in compact mode
 */
export function useIsCompactMode() {
  const mode = useDensityMode((state) => state.mode);
  return mode === 'compact';
}

