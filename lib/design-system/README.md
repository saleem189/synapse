# Design System Documentation

**Last Updated:** 2025-12-10

---

## Overview

The ChatFlow design system provides a **two-dimensional theming system** that separates:
- **Theme** (Light/Dark/System) - Controls colors
- **Style** (Solid/Glassmorphic) - Controls visual effects

This allows users to independently choose their preferred theme and visual style.

---

## Quick Start

### Using Theme Hook

```tsx
import { useTheme } from '@/lib/design-system/providers';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme('dark')}>
      Current: {resolvedTheme}
    </button>
  );
}
```

### Using Style Hook

```tsx
import { useStyle } from '@/lib/design-system/providers';

function MyComponent() {
  const { style, setStyle } = useStyle();
  
  return (
    <button onClick={() => setStyle('glassmorphic')}>
      Current: {style}
    </button>
  );
}
```

### Using CSS Variables

```css
/* Components automatically use CSS variables */
.my-component {
  background-color: hsla(var(--card), var(--effect-background-opacity));
  backdrop-filter: blur(var(--effect-backdrop-blur));
  border: var(--effect-border-width) solid 
          hsla(var(--border), var(--effect-border-opacity));
}
```

---

## Available Themes

- `light` - Light color scheme
- `dark` - Dark color scheme
- `system` - Follows system preference

## Available Styles

- `solid` - Traditional opaque design (default)
- `glassmorphic` - Modern blur + transparency effects

---

## CSS Variables Reference

### Color Variables
- `--background` - Main background
- `--foreground` - Main text color
- `--card` - Card background
- `--primary` - Primary color
- `--accent` - Accent color
- `--border` - Border color
- `--color-surface-elevated` - Elevated surface (for glassmorphic)

### Effect Variables
- `--effect-background-opacity` - Background opacity (0-1)
- `--effect-background-opacity-elevated` - Elevated opacity
- `--effect-border-opacity` - Border opacity (0-1)
- `--effect-backdrop-blur` - Blur amount (px)
- `--effect-backdrop-saturate` - Saturation percentage
- `--effect-shadow` - Shadow value
- `--effect-shadow-elevated` - Elevated shadow

---

## Component Classes

### `.card`
Standard card component with dynamic styling:
```tsx
<div className="card">
  Content
</div>
```

### `.card-elevated`
Elevated card (for glassmorphic style):
```tsx
<div className="card-elevated">
  Content
</div>
```

### `.glass`
Glassmorphic effect utility:
```tsx
<div className="glass">
  Content
</div>
```

---

## Best Practices

1. **Always use CSS variables** instead of hard-coded colors
2. **Use theme-aware classes** like `.card` instead of custom styles
3. **Test both themes** (light/dark) and styles (solid/glassmorphic)
4. **Provide fallbacks** for browsers without backdrop-filter support

---

## Migration Guide

### Old Way (Hard-coded)
```tsx
<div className="bg-white dark:bg-gray-900">
  Content
</div>
```

### New Way (CSS Variables)
```tsx
<div className="bg-background">
  Content
</div>
```

---

**For more details, see:** `AUDIT_REPORTS/DESIGN_SYSTEM_RECOMMENDATION_2025-12-10.md`

