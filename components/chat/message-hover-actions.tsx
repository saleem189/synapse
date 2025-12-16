"use client";

import { Reply, Smile, Pin, PinOff, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types/message.types';

interface MessageHoverActionsProps {
  message: Message;
  isSent: boolean;
  currentUserId: string;
  onReply: (message: Message) => void;
  onReact: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onOpenContextMenu?: (event: React.MouseEvent) => void;
}

/**
 * MessageHoverActions - Compact hover toolbar that appears on message hover
 * Shows: Reply | React | Pin | More (opens context menu)
 */
export function MessageHoverActions({
  message,
  isSent,
  currentUserId,
  onReply,
  onReact,
  onPin,
  onUnpin,
  onEdit,
  onDelete,
  onOpenContextMenu,
}: MessageHoverActionsProps) {
  const isOwner = message.senderId === currentUserId;
  const isPinned = message.isPinned;

  if (message.isDeleted) return null;

  return (
    <div
      className={cn(
        'absolute top-2 right-4 z-20 hover-actions',
        'flex items-center gap-0.5',
        'bg-background/95 backdrop-blur-sm',
        'border border-border rounded-lg shadow-lg',
        'p-0.5'
      )}
    >
      <TooltipProvider delayDuration={300}>
        {/* Reply Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 hover:bg-accent"
              onClick={() => onReply(message)}
            >
              <Reply className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Reply</TooltipContent>
        </Tooltip>

        {/* React Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 hover:bg-accent"
              onClick={() => onReact(message.id)}
            >
              <Smile className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Add reaction</TooltipContent>
        </Tooltip>

        {/* Pin/Unpin Button */}
        {(onPin || onUnpin) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 hover:bg-accent"
                onClick={() => {
                  if (isPinned && onUnpin) {
                    onUnpin(message.id);
                  } else if (!isPinned && onPin) {
                    onPin(message.id);
                  }
                }}
              >
                {isPinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isPinned ? 'Unpin message' : 'Pin message'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* More Options (Opens context menu) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 hover:bg-accent"
              onClick={(e) => {
                if (onOpenContextMenu) {
                  onOpenContextMenu(e);
                }
              }}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">More actions</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

