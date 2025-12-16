// ================================
// Contextual Sidebar Component
// ================================
// Main sidebar container that shows different panels

'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useContextualSidebar } from '../hooks/use-contextual-sidebar';
import { ThreadPanel } from './thread-panel';
import type { Message } from '@/lib/types/message.types';

interface ContextualSidebarProps {
  roomId: string;
  currentUserId: string;
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReactionChange?: () => void;
  className?: string;
}

export function ContextualSidebar({
  roomId,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReactionChange,
  className,
}: ContextualSidebarProps) {
  const { isOpen, panelType, panelData, closePanel } = useContextualSidebar();

  if (!isOpen || !panelType || !panelData) {
    return null;
  }

  return (
    <div
      className={cn(
        "h-full border-l border-border bg-background flex flex-col",
        "w-full sm:w-96 lg:w-[28rem]",
        className
      )}
    >
      {/* Close Button */}
      <div className="absolute top-3 right-3 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={closePanel}
          className="h-8 w-8 rounded-full"
          title="Close sidebar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {panelType === 'thread' && 'messageId' in panelData && (
          <ThreadPanel
            messageId={panelData.messageId}
            roomId={roomId}
            currentUserId={currentUserId}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onReactionChange={onReactionChange}
          />
        )}

        {panelType === 'search' && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Search panel (coming soon)</p>
          </div>
        )}

        {panelType === 'profile' && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Profile panel (coming soon)</p>
          </div>
        )}

        {panelType === 'activity' && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Activity panel (coming soon)</p>
          </div>
        )}
      </div>
    </div>
  );
}

