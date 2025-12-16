// ================================
// Density Provider Component
// ================================
// Wraps the app and applies density classes globally

'use client';

import { useEffect, useState } from 'react';
import { useDensityMode } from '../hooks/use-density-mode';
import { cn } from '@/lib/utils';

interface DensityProviderProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that applies density classes to the entire app
 * This eliminates the need to apply classes to individual components
 * 
 * FIX: Uses mounted state to prevent hydration errors from Zustand persist
 */
export function DensityProvider({ children }: DensityProviderProps) {
  const { mode } = useDensityMode();
  const [mounted, setMounted] = useState(false);

  // Only access persisted state after client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use default mode during SSR to match server rendering
  const safeMode = mounted ? mode : 'comfortable';

  return (
    <div
      className={cn(
        'density-wrapper h-full',
        // Apply density mode as data attribute for CSS targeting
        `density-${safeMode}`
      )}
      data-density={safeMode}
      style={{
        // CSS variables for dynamic theming
        '--avatar-sm': safeMode === 'compact' ? '1.25rem' : '1.5rem',
        '--avatar-md': safeMode === 'compact' ? '1.5rem' : '2rem',
        '--avatar-lg': safeMode === 'compact' ? '2rem' : '2.5rem',
        '--message-padding-x': safeMode === 'compact' ? '0.5rem' : '1rem',
        '--message-padding-y': safeMode === 'compact' ? '0.25rem' : '0.625rem',
        '--spacing-gap': safeMode === 'compact' ? '0.25rem' : '0.625rem',
        '--font-size': safeMode === 'compact' ? '0.875rem' : '1rem',
        '--line-height': safeMode === 'compact' ? '1.25' : '1.5',
      } as React.CSSProperties}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}

