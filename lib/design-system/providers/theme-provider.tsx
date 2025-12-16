// ================================
// Theme Provider
// ================================
// Manages theme state (light/dark/system) and applies CSS variables

"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { applyTheme } from '../utils/apply-theme';
import type { Theme } from '../themes';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // This provider manages CSS variables only - next-themes handles the dark class
  // No state needed, just apply CSS variables based on current theme
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Listen to next-themes dark class changes and apply our CSS variables
  useEffect(() => {
    const applyCurrentTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const theme: Theme = isDark ? 'dark' : 'light';
      const resolved = applyTheme(theme);
      setResolvedTheme(resolved);
    };

    // Apply immediately
    applyCurrentTheme();

    // Watch for class changes (next-themes updates)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          // Only apply if dark class actually changed
          const oldHadDark = (mutation.oldValue || '').includes('dark');
          const newHasDark = document.documentElement.classList.contains('dark');
          
          if (oldHadDark !== newHasDark) {
            applyCurrentTheme();
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true, // Track old value to compare
    });

    return () => observer.disconnect();
  }, []);

  // Note: theme management is delegated to next-themes
  // This provider only exposes resolvedTheme for components that need it
  return (
    <ThemeContext.Provider value={{ 
      theme: resolvedTheme, // Always returns the current resolved theme
      setTheme: () => {}, // No-op, use next-themes' useTheme instead
      resolvedTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

