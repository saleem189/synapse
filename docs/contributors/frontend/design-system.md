# Design System Guide

Complete guide to Synapse's two-dimensional theming system.

---

## Overview

Synapse's design system separates visual design into two independent dimensions:

**Dimension 1: Theme (Color Scheme)**
- Light
- Dark  
- System (follows OS preference)

**Dimension 2: Style (Visual Effects)**
- Solid (opaque, traditional)
- Glassmorphic (transparent, blurred)

This allows users to mix and match: "Dark + Glassmorphic" or "Light + Solid", etc.

---

## CSS Variables Architecture

All theming is controlled through CSS variables defined in `app/globals.css`.

### Color Variables

```css
:root {
  /* Base colors */
  --background: 0 0% 100%;      /* Main background */
  --foreground: 0 0% 3.9%;      /* Main text */
  --card: 0 0% 100%;            /* Card backgrounds */
  --card-foreground: 0 0% 3.9%; /* Card text */
  
  /* Interactive colors */
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  
  /* Status colors */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  
  /* UI elements */
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  --card: 0 0% 3.9%;
  --card-foreground: 0 0% 98%;
  /* ... dark mode colors */
}
```

### Effect Variables

```css
:root {
  /* Background opacity */
  --effect-background-opacity: 1;              /* Solid: 1, Glass: 0.7 */
  --effect-background-opacity-elevated: 1;     /* Elevated surfaces */
  
  /* Borders */
  --effect-border-width: 1px;
  --effect-border-style: solid;
  --effect-border-opacity: 1;                  /* Solid: 1, Glass: 0.3 */
  
  /* Shadows */
  --effect-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --effect-shadow-elevated: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  
  /* Glassmorphic effects */
  --effect-backdrop-blur: 0px;                 /* Solid: 0px, Glass: 16px */
  --effect-backdrop-saturate: 100%;            /* Solid: 100%, Glass: 150% */
}
```

---

## Using CSS Variables

### In Components

**DO:** Use CSS variables for all colors

```tsx
<div className="bg-background text-foreground border-border">
  <h1 className="text-primary">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>
```

**DON'T:** Hard-code colors

```tsx
// ❌ Bad - won't adapt to theme changes
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  Content
</div>
```

### In Custom CSS

```css
.my-component {
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border: 1px solid hsl(var(--border));
}
```

### With Opacity

```css
.my-component {
  /* 50% opacity */
  background-color: hsla(var(--primary), 0.5);
  
  /* Using effect variables */
  background-color: hsla(var(--card), var(--effect-background-opacity));
}
```

---

## Theme Hooks

### useTheme

Control the color scheme:

```tsx
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  return (
    <div>
      <p>Current: {resolvedTheme}</p>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
}
```

**Properties:**
- `theme` - Current theme setting ('light' | 'dark' | 'system')
- `setTheme(theme)` - Change theme
- `resolvedTheme` - Actual theme ('light' or 'dark', resolves 'system')

---

## Glassmorphic Style

### Automatic Application

Components automatically support glassmorphic effects:

```tsx
// This card will be solid OR glassmorphic based on user's style preference
<div className="card p-6">
  Content adapts automatically
</div>
```

### Manual Glassmorphic Effect

```tsx
<div className="glass">
  Always glassmorphic
</div>
```

### CSS for Glass Effect

```css
.glass {
  background-color: hsla(var(--card), var(--effect-background-opacity));
  backdrop-filter: blur(var(--effect-backdrop-blur)) 
                   saturate(var(--effect-backdrop-saturate));
  border: var(--effect-border-width) var(--effect-border-style) 
          hsla(var(--border), var(--effect-border-opacity));
  box-shadow: var(--effect-shadow);
}
```

---

## Component Classes

### .card

Standard card with automatic style support:

```tsx
<div className="card p-6 rounded-lg">
  Card content
</div>
```

**Properties:**
- Adapts to solid/glassmorphic style
- Uses `--card` background color
- Uses effect variables for opacity/blur

### .card-elevated

Elevated card (more prominent):

```tsx
<div className="card-elevated p-6 rounded-lg">
  Elevated content
</div>
```

**Properties:**
- Higher elevation shadow
- More opaque background in glassmorphic mode

### .btn-primary, .btn-secondary, etc.

Pre-styled button variants:

```tsx
<button className="btn-primary">
  Primary Action
</button>

<button className="btn-secondary">
  Secondary Action
</button>

<button className="btn-ghost">
  Ghost Button
</button>
```

---

## Color Palette

### Light Mode

| Variable | HSL | Usage |
|----------|-----|-------|
| `--background` | 0 0% 100% | Page background |
| `--foreground` | 0 0% 3.9% | Text on background |
| `--card` | 0 0% 100% | Card backgrounds |
| `--primary` | 0 0% 9% | Primary actions |
| `--border` | 0 0% 89.8% | Borders |
| `--muted` | 0 0% 96.1% | Muted backgrounds |

### Dark Mode

| Variable | HSL | Usage |
|----------|-----|-------|
| `--background` | 0 0% 3.9% | Page background |
| `--foreground` | 0 0% 98% | Text on background |
| `--card` | 0 0% 3.9% | Card backgrounds |
| `--primary` | 0 0% 98% | Primary actions |
| `--border` | 0 0% 14.9% | Borders |
| `--muted` | 0 0% 14.9% | Muted backgrounds |

---

## Animations

### Available Animations

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Slide down */
@keyframes slideDown {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Scale */
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

### Using Animations

```tsx
<div className="animate-fadeIn">
  Fades in
</div>

<div className="animate-slideUp">
  Slides up
</div>
```

### Animation Delays

```tsx
<div className="animate-fadeIn animation-delay-100">
  Delayed 100ms
</div>

<div className="animate-fadeIn animation-delay-200">
  Delayed 200ms
</div>
```

---

## Responsive Breakpoints

```css
/* Mobile first approach */
.my-component {
  /* Mobile styles (default) */
  padding: 1rem;
}

/* Tablet and up */
@media (min-width: 640px) {
  .my-component {
    padding: 1.5rem;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .my-component {
    padding: 2rem;
  }
}
```

### Tailwind Breakpoints

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm:` | 640px | Tablet portrait |
| `md:` | 768px | Tablet landscape |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Large desktop |
| `2xl:` | 1536px | Extra large |

```tsx
<div className="
  grid 
  grid-cols-1 
  sm:grid-cols-2 
  lg:grid-cols-3 
  xl:grid-cols-4
  gap-4
">
  Responsive grid
</div>
```

---

## Custom Scrollbars

```css
/* Webkit browsers (Chrome, Safari) */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}
```

### Hide Scrollbar

```tsx
<div className="scrollbar-hide overflow-auto">
  Content with hidden scrollbar
</div>
```

---

## Best Practices

### 1. Always Use CSS Variables

✅ **Good:**
```tsx
<div className="bg-card text-card-foreground border-border">
```

❌ **Bad:**
```tsx
<div className="bg-white dark:bg-black text-black dark:text-white">
```

### 2. Test Both Themes

Always test your components in:
- Light mode + Solid style
- Light mode + Glassmorphic style
- Dark mode + Solid style
- Dark mode + Glassmorphic style

### 3. Provide Sufficient Contrast

Ensure text is readable on backgrounds:
- Light text on dark backgrounds
- Dark text on light backgrounds
- Check WCAG contrast requirements (4.5:1 minimum)

### 4. Use Semantic Colors

```tsx
// ✅ Good - semantic
<button className="bg-destructive text-destructive-foreground">
  Delete
</button>

// ❌ Bad - specific color
<button className="bg-red-500 text-white">
  Delete
</button>
```

### 5. Respect User's Style Preference

Don't force a style - let CSS variables handle it:

```tsx
// ✅ Good - adapts to user preference
<div className="card">
  
// ❌ Bad - forces glassmorphic
<div className="glass">
```

---

## Migration from Hard-coded Colors

If you find components with hard-coded colors, migrate them:

### Before

```tsx
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
  <h2 className="text-gray-900 dark:text-white">Title</h2>
  <p className="text-gray-600 dark:text-gray-400">Description</p>
</div>
```

### After

```tsx
<div className="bg-card border-border">
  <h2 className="text-card-foreground">Title</h2>
  <p className="text-muted-foreground">Description</p>
</div>
```

**Benefits:**
- Shorter class names
- Automatic theme support
- Automatic glassmorphic support
- Easier to maintain

---

## Browser Support

### Backdrop Filter

Glassmorphic effects use `backdrop-filter`, which is supported in:
- ✅ Chrome 76+
- ✅ Safari 9+
- ✅ Firefox 103+
- ✅ Edge 79+

### Fallback

For browsers without `backdrop-filter` support, automatic fallback increases opacity:

```css
@supports not (backdrop-filter: blur(16px)) {
  .glass {
    /* Increased opacity for better contrast */
    background-color: hsla(var(--card), 
                          calc(var(--effect-background-opacity) + 0.2));
  }
}
```

---

## Next Steps

- **[Component Library](./components.md)** - Available UI components
- **[Patterns & Examples](./patterns.md)** - Common patterns
- **[Frontend Architecture](./README.md)** - Main guide

---

## Questions?

- Check `app/globals.css` for all CSS variables
- Review `lib/design-system/` for theme utilities
- Look at existing components for examples

