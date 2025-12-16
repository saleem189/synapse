// ================================
// Reply Count Badge Component
// ================================
// Shows number of replies to a message (thread indicator)

'use client';

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useContextualSidebar } from '@/features/contextual-sidebar';

interface ReplyCountBadgeProps {
  count: number;
  messageId: string;
  roomId: string;
  onClick?: () => void;
  className?: string;
}

export function ReplyCountBadge({
  count,
  messageId,
  roomId,
  onClick,
  className,
}: ReplyCountBadgeProps) {
  const { openThread } = useContextualSidebar();

  if (count === 0) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onClick) {
      onClick();
    } else {
      // Open thread in contextual sidebar
      openThread(messageId, roomId);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-7 gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2",
        className
      )}
      onClick={handleClick}
      title={`View ${count} ${count === 1 ? 'reply' : 'replies'} in thread`}
    >
      <MessageCircle className="w-3.5 h-3.5" />
      <span className="font-medium">{count}</span>
      <span className="hidden sm:inline">{count === 1 ? 'reply' : 'replies'}</span>
    </Button>
  );
}

