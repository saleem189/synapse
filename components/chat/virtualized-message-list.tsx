// ================================
// Virtualized Message List Component
// ================================
// Uses @tanstack/react-virtual for efficient rendering of large message lists

"use client";

import { useRef, useEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Separator } from "@/components/ui/separator";
import { MessageItem } from "./message-item";
import type { Message } from "@/lib/types/message.types";

interface VirtualizedMessageListProps {
  messages: Message[];
  groupedMessages: Record<string, Message[]>;
  currentUserId: string;
  isGroup: boolean;
  roomId: string;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => Promise<void>;
  onReactionChange: (messageId: string) => Promise<void>;
  onContextMenu: (e: React.MouseEvent, message: Message) => void;
  createLongPressHandlers: (message: Message) => {
    onTouchStart: (e: React.TouchEvent | React.MouseEvent) => void;
    onTouchEnd: (e: React.TouchEvent | React.MouseEvent) => void;
    onMouseDown: (e: React.TouchEvent | React.MouseEvent) => void;
    onMouseUp: (e: React.TouchEvent | React.MouseEvent) => void;
    onMouseLeave: (e: React.TouchEvent | React.MouseEvent) => void;
  };
  containerRef: React.RefObject<HTMLDivElement>;
}

interface VirtualizedItem {
  type: "date" | "message";
  date?: string;
  message?: Message;
  index?: number;
  dateMessages?: Message[];
}

export function VirtualizedMessageList({
  messages,
  groupedMessages,
  currentUserId,
  isGroup,
  roomId,
  onReply,
  onEdit,
  onDelete,
  onReactionChange,
  onContextMenu,
  createLongPressHandlers,
  containerRef,
}: VirtualizedMessageListProps) {
  // Flatten grouped messages into a single array with date separators
  const virtualizedItems = useMemo<VirtualizedItem[]>(() => {
    const items: VirtualizedItem[] = [];
    
    Object.entries(groupedMessages).forEach(([date, dateMessages]) => {
      // Add date separator
      items.push({
        type: "date",
        date,
        dateMessages,
      });
      
      // Add messages for this date
      dateMessages.forEach((message, index) => {
        items.push({
          type: "message",
          message,
          index,
          dateMessages,
        });
      });
    });
    
    return items;
  }, [groupedMessages]);

  // Estimate item heights (in pixels)
  const estimateSize = (index: number) => {
    const item = virtualizedItems[index];
    if (item.type === "date") {
      return 60; // Date separator height
    }
    // Estimate message height based on content
    const message = item.message!;
    const baseHeight = 50; // Base message height
    const contentHeight = message.content ? Math.ceil(message.content.length / 50) * 20 : 0;
    const fileHeight = message.fileUrl ? 200 : 0;
    const replyHeight = message.replyTo ? 60 : 0;
    return baseHeight + contentHeight + fileHeight + replyHeight;
  };

  // Create virtualizer
  const virtualizer = useVirtualizer({
    count: virtualizedItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize,
    overscan: 5, // Render 5 extra items outside viewport
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && virtualizedItems.length > 0) {
      // Check if we're near the bottom (within 100px)
      const scrollElement = containerRef.current;
      if (scrollElement) {
        const isNearBottom =
          scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < 100;
        
        if (isNearBottom) {
          // Scroll to bottom smoothly
          setTimeout(() => {
            virtualizer.scrollToIndex(virtualizedItems.length - 1, {
              align: "end",
              behavior: "smooth",
            });
          }, 100);
        }
      }
    }
  }, [messages.length, virtualizedItems.length, virtualizer, containerRef]);

  // Format date for display
  const formatDate = (date: string) => {
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
    
    if (date === today) return "Today";
    if (date === yesterday) return "Yesterday";
    return date;
  };

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const item = virtualizedItems[virtualItem.index];
        
        if (item.type === "date") {
          return (
            <div
              key={`date-${item.date}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="flex items-center gap-3 my-4">
                <Separator className="flex-1" />
                <div className="px-3 py-1 rounded-full bg-surface-200/50 dark:bg-surface-800/50 text-xs text-surface-500 dark:text-surface-400 font-medium">
                  {formatDate(item.date!)}
                </div>
                <Separator className="flex-1" />
              </div>
            </div>
          );
        }

        // Render message
        const message = item.message!;
        const dateMessages = item.dateMessages!;
        const index = item.index!;
        const isSent = message.senderId === currentUserId;
        const showAvatar =
          !isSent &&
          (index === 0 || dateMessages[index - 1]?.senderId !== message.senderId);
        const showName = isGroup && !isSent && showAvatar;
        const isConsecutive = index > 0 && dateMessages[index - 1]?.senderId === message.senderId;
        const spacing = isConsecutive ? "mt-0.5" : "mt-3";

        return (
          <div
            key={message.id}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <MessageItem
              message={message}
              isSent={isSent}
              showAvatar={showAvatar}
              showName={showName}
              isConsecutive={isConsecutive}
              spacing={spacing}
              isGroup={isGroup}
              roomId={roomId}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReactionChange={() => onReactionChange(message.id)}
              onContextMenu={onContextMenu}
              createLongPressHandlers={createLongPressHandlers}
            />
          </div>
        );
      })}
    </div>
  );
}

