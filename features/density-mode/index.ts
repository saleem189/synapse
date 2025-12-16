// ================================
// Density Mode Feature - Main Export
// ================================
// Public API for density mode functionality

// Types
export type { ViewDensity, DensityPreferences, DensityClasses } from './types';
export { DENSITY_PRESETS, DENSITY_STORAGE_KEY } from './types';

// Hooks
export { useDensityMode, useDensityClasses, useIsCompactMode } from './hooks/use-density-mode';

// Components
export { DensityModeToggle } from './components/density-mode-toggle';
export { DensityProvider } from './components/density-provider';

