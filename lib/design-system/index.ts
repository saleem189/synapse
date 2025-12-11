// ================================
// Design System - Main Export
// ================================
// Centralized design tokens and theming system

// Token exports
export * from './tokens/colors';
export * from './tokens/spacing';
export * from './tokens/typography';

// Re-export commonly used types
export type { ColorKey, ColorShade } from './tokens/colors';
export type { SpacingKey } from './tokens/spacing';
export type { FontSizeKey, FontWeightKey } from './tokens/typography';

// Theme exports
export * from './themes';

// Style exports
export * from './styles';

// Provider exports
export * from './providers';

// Utility exports
export { applyTheme } from './utils/apply-theme';
export { applyStyle } from './utils/apply-style';

// Utility function to access design tokens (backward compatibility)
export const tokens = {
    colors: require('./tokens/colors').colors,
    spacing: require('./tokens/spacing').spacing,
    typography: {
        fontFamily: require('./tokens/typography').fontFamily,
        fontSize: require('./tokens/typography').fontSize,
        fontWeight: require('./tokens/typography').fontWeight,
    },
} as const;
