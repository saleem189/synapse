// ================================
// Solid Style Configuration
// ================================
// Traditional opaque design style (default)

export const solidStyle = {
  name: 'solid',
  effects: {
    // Background opacity (fully opaque)
    backgroundOpacity: '1',
    backgroundOpacityElevated: '1',
    
    // Border
    borderWidth: '1px',
    borderStyle: 'solid',
    borderOpacity: '1',
    
    // Shadow (standard)
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    shadowElevated: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    
    // Backdrop filter (none for solid)
    backdropBlur: '0px',
    backdropSaturate: '100%',
    
    // Glass effect disabled
    glassEffect: false,
  },
} as const;

export type SolidStyle = typeof solidStyle;

