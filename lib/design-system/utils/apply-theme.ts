// ================================
// Apply Theme Utility
// ================================
// Applies theme colors to CSS variables

import { lightTheme, darkTheme } from '../themes';
import type { Theme } from '../themes';

export function applyTheme(themeName: Theme): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light'; // SSR fallback
  }

  const root = document.documentElement;
  
  // Determine actual theme
  let theme = themeName === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? darkTheme : lightTheme)
    : themeName === 'dark' ? darkTheme : lightTheme;
  
  // Apply color CSS variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case for CSS variables
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--color-${cssKey}`, value);
    
    // Also set shadcn/ui compatible variables (for backward compatibility)
    // Map to existing shadcn/ui variable names
    const shadcnMapping: Record<string, string> = {
      background: '--background',
      foreground: '--foreground',
      card: '--card',
      'card-foreground': '--card-foreground',
      popover: '--popover',
      'popover-foreground': '--popover-foreground',
      primary: '--primary',
      'primary-foreground': '--primary-foreground',
      secondary: '--secondary',
      'secondary-foreground': '--secondary-foreground',
      muted: '--muted',
      'muted-foreground': '--muted-foreground',
      accent: '--accent',
      'accent-foreground': '--accent-foreground',
      destructive: '--destructive',
      'destructive-foreground': '--destructive-foreground',
      border: '--border',
      input: '--input',
      ring: '--ring',
      'chart-1': '--chart-1',
      'chart-2': '--chart-2',
      'chart-3': '--chart-3',
      'chart-4': '--chart-4',
      'chart-5': '--chart-5',
    };
    
    if (shadcnMapping[cssKey]) {
      root.style.setProperty(shadcnMapping[cssKey], value);
    }
  });
  
  // Set surface-elevated as a separate variable for glassmorphic style
  root.style.setProperty('--color-surface-elevated', theme.colors.surfaceElevated);
  
  // Update dark class for backward compatibility
  if (theme.name === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  return theme.name;
}

