import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  type: 'success' | 'warning' | 'error' | 'info' | 'offline';
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  withPulse?: boolean;
}

/**
 * StatusIndicator - Professional status indicator with colored dot
 * 
 * @example
 * ```tsx
 * <StatusIndicator type="success">Online</StatusIndicator>
 * <StatusIndicator type="warning">Away</StatusIndicator>
 * <StatusIndicator type="error">Error</StatusIndicator>
 * <StatusIndicator type="info">Processing</StatusIndicator>
 * <StatusIndicator type="offline">Offline</StatusIndicator>
 * ```
 */
export function StatusIndicator({
  type,
  children,
  size = 'md',
  className,
  withPulse = false,
}: StatusIndicatorProps) {
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const dotColors = {
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    offline: 'bg-gray-400 border border-gray-300',
  };

  const ringColors = withPulse ? {
    success: 'ring-green-500/30',
    warning: 'ring-amber-500/30',
    error: 'ring-red-500/30',
    info: 'ring-blue-500/30',
    offline: '',
  } : {};

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative flex">
        <span
          className={cn(
            'inline-flex rounded-full',
            dotSizes[size],
            dotColors[type]
          )}
        />
        {withPulse && type !== 'offline' && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
              dotColors[type]
            )}
          />
        )}
      </span>
      <span className={cn('font-medium', textSizes[size])}>{children}</span>
    </div>
  );
}

/**
 * StatusDot - Just the colored dot indicator (no text)
 * Useful for avatars and compact displays
 */
export function StatusDot({
  type,
  size = 'md',
  className,
  withPulse = false,
  position = 'standalone', // 'standalone' | 'avatar'
}: {
  type: 'success' | 'warning' | 'error' | 'info' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  withPulse?: boolean;
  position?: 'standalone' | 'avatar';
}) {
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const dotColors = {
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    offline: 'bg-gray-400',
  };

  const positionClasses = position === 'avatar' 
    ? 'absolute bottom-0 right-0 border-2 border-background'
    : '';

  return (
    <span className={cn('relative flex', positionClasses, className)}>
      <span
        className={cn(
          'inline-flex rounded-full',
          dotSizes[size],
          dotColors[type]
        )}
      />
      {withPulse && type !== 'offline' && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            dotColors[type]
          )}
        />
      )}
    </span>
  );
}

