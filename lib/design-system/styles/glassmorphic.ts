// ================================
// Glassmorphic Style Configuration
// ================================
// Modern glassmorphism design with blur and transparency

export const glassmorphicStyle = {
  name: 'glassmorphic',
  effects: {
    // Background opacity (semi-transparent for glass effect)
    backgroundOpacity: '0.7',          // 70% opaque
    backgroundOpacityElevated: '0.8',  // 80% opaque for elevated surfaces
    
    // Border (semi-transparent)
    borderWidth: '1px',
    borderStyle: 'solid',
    borderOpacity: '0.2',               // 20% opaque border
    
    // Shadow (softer, more diffused for glass effect)
    shadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    shadowElevated: '0 12px 40px 0 rgba(31, 38, 135, 0.5)',
    
    // Backdrop filter (glassmorphism core)
    backdropBlur: '16px',              // Blur amount (optimal for glass effect)
    backdropSaturate: '180%',           // Saturation boost for color enhancement
    
    // Glass effect enabled
    glassEffect: true,
  },
} as const;

export type GlassmorphicStyle = typeof glassmorphicStyle;

