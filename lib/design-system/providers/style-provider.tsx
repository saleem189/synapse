// ================================
// Style Provider
// ================================
// Manages style state (solid/glassmorphic) and applies CSS variables

"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { applyStyle } from '../utils/apply-style';
import type { Style } from '../styles';

interface StyleContextValue {
  style: Style;
  setStyle: (style: Style) => void;
}

const StyleContext = createContext<StyleContextValue | undefined>(undefined);

export function StyleProvider({ children }: { children: React.ReactNode }) {
  // FIX: Use default value for SSR to prevent hydration mismatch
  const [style, setStyleState] = useState<Style>('solid');
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    const savedStyle = localStorage.getItem('style') as Style;
    if (savedStyle) {
      setStyleState(savedStyle);
    }
  }, []);

  // Apply style on mount and when style changes
  useEffect(() => {
    if (!mounted) return; // Skip during SSR
    
    applyStyle(style);
    
    // Save to localStorage
    localStorage.setItem('style', style);
  }, [style, mounted]);

  const setStyle = (newStyle: Style) => {
    setStyleState(newStyle);
  };

  return (
    <StyleContext.Provider value={{ style, setStyle }}>
      {children}
    </StyleContext.Provider>
  );
}

export function useStyle() {
  const context = useContext(StyleContext);
  if (!context) {
    throw new Error('useStyle must be used within StyleProvider');
  }
  return context;
}

