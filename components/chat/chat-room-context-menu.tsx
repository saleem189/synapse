// ================================
// Chat Room Context Menu Component
// ================================
// Context menu for message actions (reply, edit, delete) - Using shadcn ContextMenu

"use client";

import { Reply, Settings, X, Pin, PinOff } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Message } from "@/lib/types/message.types";

interface ChatRoomContextMenuProps {
  message: Message;
  currentUserId: string | null;
  children: React.ReactNode;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
}

export function ChatRoomContextMenu({
  message,
  currentUserId,
  children,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onUnpin,
}: ChatRoomContextMenuProps) {
  const isOwnMessage = message.senderId === currentUserId;
  const canEdit = isOwnMessage && !message.isDeleted;
  const isPinned = (message as any).isPinned || false; // Type-safe check for isPinned

  const handlePinToggle = () => {
    if (isPinned && onUnpin) {
      onUnpin(message.id);
    } else if (!isPinned && onPin) {
      onPin(message.id);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={() => onReply(message)}
          className="cursor-pointer"
        >
          <Reply className="w-4 h-4 mr-2" />
          Reply
        </ContextMenuItem>
        
        {(onPin || onUnpin) && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={handlePinToggle}
              className="cursor-pointer"
            >
              {isPinned ? (
                <>
                  <PinOff className="w-4 h-4 mr-2" />
                  Unpin Message
                </>
              ) : (
                <>
                  <Pin className="w-4 h-4 mr-2" />
                  Pin Message
                </>
              )}
            </ContextMenuItem>
          </>
        )}
        
        {canEdit && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => onEdit(message.id, message.content)}
              className="cursor-pointer"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => onDelete(message.id)}
              variant="destructive"
              className="cursor-pointer"
            >
              <X className="w-4 h-4 mr-2" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

