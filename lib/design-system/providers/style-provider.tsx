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
  const [style, setStyleState] = useState<Style>(() => {
    if (typeof window === 'undefined') return 'solid';
    return (localStorage.getItem('style') as Style) || 'solid';
  });

  // Apply style on mount and when style changes
  useEffect(() => {
    applyStyle(style);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('style', style);
    }
  }, [style]);

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

