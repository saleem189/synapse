// ================================
// Chat Room Context Menu Component
// ================================
// Slack-style context menu that appears at cursor position in viewport

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Reply, Settings, X, Pin, PinOff, Copy, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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
  onOpenContextMenu?: (handler: (e: React.MouseEvent) => void) => void;
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
  onOpenContextMenu,
}: ChatRoomContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  
  const isOwnMessage = message.senderId === currentUserId;
  const canEdit = isOwnMessage && !message.isDeleted;
  const isPinned = (message as any).isPinned || false;

  // Handle context menu open at cursor position
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get cursor position in viewport
    const x = e.clientX;
    const y = e.clientY;
    
    setPosition({ x, y });
    setIsOpen(true);
  }, []);

  // Expose the handler to parent via callback
  useEffect(() => {
    if (onOpenContextMenu) {
      onOpenContextMenu(handleContextMenu);
    }
  }, [onOpenContextMenu, handleContextMenu]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = position.x;
      let adjustedY = position.y;

      // Adjust horizontal position if menu overflows right edge
      if (position.x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 8;
      }

      // Adjust vertical position if menu overflows bottom edge
      if (position.y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 8;
      }

      if (adjustedX !== position.x || adjustedY !== position.y) {
        setPosition({ x: adjustedX, y: adjustedY });
      }
    }
  }, [isOpen, position]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const handleCopyLink = () => {
    // Copy message link to clipboard
    const link = `${window.location.origin}${window.location.pathname}?message=${message.id}`;
    navigator.clipboard.writeText(link);
    setIsOpen(false);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setIsOpen(false);
  };

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>

      {/* Slack-style context menu at cursor position */}
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[200px] rounded-lg border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          <div className="p-1">
            {/* Reply */}
            <button
              onClick={() => handleAction(() => onReply(message))}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
            >
              <Reply className="w-4 h-4" />
              <span>Reply in thread</span>
              <span className="ml-auto text-xs text-muted-foreground">T</span>
            </button>

            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
            >
              <LinkIcon className="w-4 h-4" />
              <span>Copy link</span>
              <span className="ml-auto text-xs text-muted-foreground">L</span>
            </button>

            {/* Copy message */}
            <button
              onClick={handleCopyMessage}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
            >
              <Copy className="w-4 h-4" />
              <span>Copy message</span>
              <span className="ml-auto text-xs text-muted-foreground">Ctrl+C</span>
            </button>

            {/* Pin/Unpin */}
            {(onPin || onUnpin) && (
              <>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={() => handleAction(() => isPinned && onUnpin ? onUnpin(message.id) : onPin?.(message.id))}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                >
                  {isPinned ? (
                    <>
                      <PinOff className="w-4 h-4" />
                      <span>Unpin from conversation</span>
                      <span className="ml-auto text-xs text-muted-foreground">P</span>
                    </>
                  ) : (
                    <>
                      <Pin className="w-4 h-4" />
                      <span>Pin to conversation</span>
                      <span className="ml-auto text-xs text-muted-foreground">P</span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* Edit & Delete (own messages only) */}
            {canEdit && (
              <>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={() => handleAction(() => onEdit(message.id, message.content))}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                >
                  <Settings className="w-4 h-4" />
                  <span>Edit message</span>
                  <span className="ml-auto text-xs text-muted-foreground">E</span>
                </button>
                <button
                  onClick={() => handleAction(() => onDelete(message.id))}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
                >
                  <X className="w-4 h-4" />
                  <span>Delete message</span>
                  <span className="ml-auto text-xs text-muted-foreground">delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

