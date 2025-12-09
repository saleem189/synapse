# Bundle Analysis Guide

## Overview

Bundle analysis helps identify large dependencies and optimize bundle size for better performance.

## Setup

Bundle analyzer is configured in `next.config.js` and can be run with npm scripts.

## Usage

### Analyze Both Client and Server Bundles

```bash
npm run analyze
```

This will:
1. Build the application
2. Open interactive bundle analysis reports in your browser
3. Show both client and server bundle sizes

### Analyze Only Server Bundle

```bash
npm run analyze:server
```

### Analyze Only Browser Bundle

```bash
npm run analyze:browser
```

## Understanding the Results

### What to Look For

1. **Large Dependencies**
   - Libraries over 100KB should be reviewed
   - Consider code splitting or alternatives

2. **Duplicate Dependencies**
   - Same library included multiple times
   - Check for version conflicts

3. **Unused Code**
   - Large files with low usage
   - Consider tree-shaking or removal

4. **Heavy Components**
   - Large React components
   - Consider lazy loading

### Common Issues and Solutions

#### Issue: Large Chart Library (Recharts)
**Solution:** Already lazy loaded in admin dashboard ✅

#### Issue: Large UI Component Library
**Solution:** Using Radix UI (tree-shakeable) ✅

#### Issue: Socket.io Client
**Solution:** Required for real-time features, but can be optimized with code splitting ✅

## Optimization Recommendations

### Already Implemented ✅
- Lazy loading for admin dashboard charts
- Lazy loading for modals
- Dynamic imports for heavy components
- Tree-shaking enabled

### Future Optimizations
1. **Code Splitting by Route**
   - Next.js handles this automatically
   - Verify routes are properly split

2. **Remove Unused Dependencies**
   - Run analysis and identify unused packages
   - Remove or replace with lighter alternatives

3. **Optimize Images**
   - Use Next.js Image component (already implemented)
   - Consider WebP format

4. **Font Optimization**
   - Use `next/font` for automatic optimization
   - Subset fonts to reduce size

## Running Analysis

1. **Development Analysis:**
   ```bash
   npm run analyze
   ```

2. **Production Build Analysis:**
   ```bash
   ANALYZE=true npm run build
   ```

3. **View Results:**
   - Reports open automatically in browser
   - Server bundle: `http://localhost:3000`
   - Client bundle: Interactive treemap visualization

## Best Practices

1. **Regular Analysis**
   - Run analysis before major releases
   - Monitor bundle size over time
   - Set bundle size budgets

2. **CI Integration**
   - Add bundle size checks to CI/CD
   - Fail builds if bundle exceeds threshold

3. **Performance Budgets**
   - Initial bundle: < 200KB (gzipped)
   - Total bundle: < 500KB (gzipped)
   - Individual chunks: < 100KB (gzipped)

## Current Status

- ✅ Bundle analyzer configured
- ✅ Analysis scripts added
- ✅ Lazy loading implemented
- ⚠️ Baseline analysis needed (run `npm run analyze`)

## Next Steps

1. Run initial analysis: `npm run analyze`
2. Document baseline bundle sizes
3. Set performance budgets
4. Create CI checks for bundle size

