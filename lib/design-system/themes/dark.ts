// ================================
// Dark Theme Configuration
// ================================
// Color definitions for dark theme using HSL format

export const darkTheme = {
  name: 'dark',
  colors: {
    // Background colors
    background: '0 0% 3.9%',           // Near black
    surface: '0 0% 7%',                // Dark gray
    surfaceElevated: '0 0% 10%',      // Lighter dark gray
    
    // Text colors
    foreground: '0 0% 98%',            // Near white
    muted: '0 0% 63.9%',               // Light gray
    mutedForeground: '0 0% 63.9%',    // Light gray
    
    // Primary colors (blue - same as light for consistency)
    primary: '217 91% 60%',           // Blue-500
    primaryForeground: '0 0% 100%',    // White
    
    // Secondary colors
    secondary: '0 0% 14.9%',           // Dark gray
    secondaryForeground: '0 0% 98%',   // Near white
    
    // Accent colors (purple - same as light for consistency)
    accent: '262 83% 58%',            // Purple-500
    accentForeground: '0 0% 100%',     // White
    
    // Card colors
    card: '0 0% 3.9%',                // Near black
    cardForeground: '0 0% 98%',        // Near white
    
    // Popover colors
    popover: '0 0% 3.9%',              // Near black
    popoverForeground: '0 0% 98%',     // Near white
    
    // Border colors
    border: '0 0% 14.9%',              // Dark gray
    input: '0 0% 14.9%',               // Dark gray
    ring: '0 0% 83.1%',                // Light gray
    
    // Semantic colors
    destructive: '0 62.8% 30.6%',     // Dark red
    destructiveForeground: '0 0% 98%', // Near white
    success: '142 71% 45%',           // Green
    warning: '38 92% 50%',             // Orange
    info: '217 91% 60%',               // Blue
    
    // Chart colors
    chart1: '220 70% 50%',
    chart2: '160 60% 45%',
    chart3: '30 80% 55%',
    chart4: '280 65% 60%',
    chart5: '340 75% 55%',
  },
} as const;

export type DarkTheme = typeof darkTheme;

