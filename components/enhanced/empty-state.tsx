import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * EmptyState - Beautiful empty state component with icon, title, description, and optional action
 * 
 * @example
 * ```tsx
 * import { MessageCircle, Search, Hash } from 'lucide-react';
 * 
 * // No messages
 * <EmptyState
 *   icon={MessageCircle}
 *   title="No messages yet"
 *   description="Be the first to say hello!"
 *   action={{
 *     label: "Start Conversation",
 *     onClick: () => messageInputRef.current?.focus()
 *   }}
 * />
 * 
 * // No search results
 * <EmptyState
 *   icon={Search}
 *   title="No results found"
 *   description="Try different keywords or check your spelling"
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        'animate-in fade-in-50 duration-500',
        className
      )}
    >
      {/* Icon Container */}
      <div
        className={cn(
          'flex items-center justify-center',
          'w-16 h-16 rounded-full',
          'bg-muted/50 text-muted-foreground',
          'mb-4',
          'transition-all duration-300 ease-out',
          'hover:scale-110 hover:bg-muted/70'
        )}
      >
        <Icon className="w-8 h-8" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>

      {/* Action Button (Optional) */}
      {action && (
        <Button
          onClick={action.onClick}
          className="button-animate"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * EmptyStateCompact - Smaller version for inline usage
 */
export function EmptyStateCompact({
  icon: Icon,
  title,
  description,
  className,
}: Omit<EmptyStateProps, 'action'>) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-8 px-4 text-center',
        'animate-in fade-in-50 duration-300',
        className
      )}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 text-muted-foreground mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-medium text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

/**
 * EmptyStateInline - Minimal inline version
 */
export function EmptyStateInline({
  icon: Icon,
  text,
  className,
}: {
  icon: LucideIcon;
  text: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 py-4 px-4 text-sm text-muted-foreground',
        'animate-in fade-in-50 duration-200',
        className
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}

