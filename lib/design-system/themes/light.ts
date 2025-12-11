// ================================
// Light Theme Configuration
// ================================
// Color definitions for light theme using HSL format

export const lightTheme = {
  name: 'light',
  colors: {
    // Background colors
    background: '0 0% 100%',           // White
    surface: '0 0% 98%',               // Off-white
    surfaceElevated: '0 0% 96%',       // Light gray
    
    // Text colors
    foreground: '0 0% 3.9%',           // Near black
    muted: '0 0% 45.1%',               // Gray
    mutedForeground: '0 0% 45.1%',     // Gray
    
    // Primary colors (blue)
    primary: '217 91% 60%',            // Blue-500
    primaryForeground: '0 0% 100%',     // White
    
    // Secondary colors
    secondary: '0 0% 96.1%',            // Light gray
    secondaryForeground: '0 0% 9%',    // Near black
    
    // Accent colors (purple)
    accent: '262 83% 58%',             // Purple-500
    accentForeground: '0 0% 100%',     // White
    
    // Card colors
    card: '0 0% 100%',                 // White
    cardForeground: '0 0% 3.9%',       // Near black
    
    // Popover colors
    popover: '0 0% 100%',               // White
    popoverForeground: '0 0% 3.9%',    // Near black
    
    // Border colors
    border: '0 0% 89.8%',              // Light gray
    input: '0 0% 89.8%',                // Light gray
    ring: '0 0% 3.9%',                 // Near black
    
    // Semantic colors
    destructive: '0 84.2% 60.2%',      // Red
    destructiveForeground: '0 0% 98%',  // Near white
    success: '142 76% 36%',            // Green
    warning: '38 92% 50%',             // Orange
    info: '217 91% 60%',                // Blue
    
    // Chart colors
    chart1: '12 76% 61%',
    chart2: '173 58% 39%',
    chart3: '197 37% 24%',
    chart4: '43 74% 66%',
    chart5: '27 87% 67%',
  },
} as const;

export type LightTheme = typeof lightTheme;

