// ================================
// Apply Style Utility
// ================================
// Applies style effects to CSS variables

import { solidStyle, glassmorphicStyle } from '../styles';
import type { Style } from '../styles';

export function applyStyle(styleName: Style): Style {
  if (typeof window === 'undefined') {
    return 'solid'; // SSR fallback
  }

  const root = document.documentElement;
  const style = styleName === 'glassmorphic' ? glassmorphicStyle : solidStyle;
  
  // Apply effect CSS variables
  Object.entries(style.effects).forEach(([key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    
    if (typeof value === 'boolean') {
      root.style.setProperty(`--effect-${cssKey}`, value ? '1' : '0');
    } else {
      root.style.setProperty(`--effect-${cssKey}`, String(value));
    }
  });
  
  // Add/remove glass class for conditional styling
  if (style.effects.glassEffect) {
    root.classList.add('glass-style');
  } else {
    root.classList.remove('glass-style');
  }
  
  return style.name;
}

