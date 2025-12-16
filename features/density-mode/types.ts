// ================================
// Density Mode Types
// ================================
// Types for view density preferences

/**
 * Available density modes
 */
export type ViewDensity = 'compact' | 'comfortable';

/**
 * Density mode preferences
 */
export interface DensityPreferences {
  mode: ViewDensity;
}

/**
 * Density classes for different UI elements
 */
export interface DensityClasses {
  // Avatar sizes
  avatar: {
    small: string;
    medium: string;
    large: string;
  };
  // Message bubble spacing
  message: {
    padding: string;
    fontSize: string;
    lineHeight: string;
  };
  // Layout spacing
  spacing: {
    gap: string;
    margin: string;
  };
  // Sidebar
  sidebar: {
    width: string;
    itemHeight: string;
    itemPadding: string;
  };
  // Chat header
  header: {
    height: string;
    padding: string;
  };
}

/**
 * Default density settings
 */
export const DENSITY_PRESETS: Record<ViewDensity, DensityClasses> = {
  compact: {
    avatar: {
      small: 'h-5 w-5',
      medium: 'h-6 w-6',
      large: 'h-8 w-8',
    },
    message: {
      padding: 'py-1 px-2',
      fontSize: 'text-sm',
      lineHeight: 'leading-tight',
    },
    spacing: {
      gap: 'gap-1',
      margin: 'my-0.5',
    },
    sidebar: {
      width: 'w-56',
      itemHeight: 'h-8',
      itemPadding: 'px-2 py-1',
    },
    header: {
      height: 'h-12',
      padding: 'px-3 py-2',
    },
  },
  comfortable: {
    avatar: {
      small: 'h-6 w-6',
      medium: 'h-8 w-8',
      large: 'h-10 w-10',
    },
    message: {
      padding: 'py-2.5 px-4',
      fontSize: 'text-base',
      lineHeight: 'leading-normal',
    },
    spacing: {
      gap: 'gap-2.5',
      margin: 'my-1',
    },
    sidebar: {
      width: 'w-64',
      itemHeight: 'h-10',
      itemPadding: 'px-4 py-2',
    },
    header: {
      height: 'h-14',
      padding: 'px-4 py-3',
    },
  },
};

/**
 * Local storage key for density preferences
 */
export const DENSITY_STORAGE_KEY = 'synapse:density-mode';

