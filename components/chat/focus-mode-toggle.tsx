// ================================
// Focus Mode Toggle Component
// ================================
// Toggle button for focus mode

'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFocusMode } from '@/features/focus-mode';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FocusModeToggleProps {
  hiddenCount?: number;
  className?: string;
}

export function FocusModeToggle({ hiddenCount = 0, className }: FocusModeToggleProps) {
  const { isEnabled, toggleFocusMode } = useFocusMode();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggleFocusMode}
            variant={isEnabled ? "default" : "outline"}
            className={cn("w-full justify-start gap-2", className)}
            size="sm"
          >
            {isEnabled ? (
              <>
                <Eye className="w-4 h-4" />
                Focus Mode
                {hiddenCount > 0 && (
                  <span className="ml-auto text-xs opacity-70">
                    {hiddenCount} hidden
                  </span>
                )}
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                Show All
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">
            {isEnabled
              ? 'Focus mode is on. Only showing favorites, unread, and DMs.'
              : 'Enable focus mode to hide inactive channels.'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

