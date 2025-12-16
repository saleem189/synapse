// ================================
// Message Item Component - Slack Style
// ================================
// Flat design with hover backgrounds, single-column layout

"use client";

import { memo, useState } from "react";
import { Reply, Pin } from "lucide-react";
import { cn, formatMessageTime } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { FileAttachment } from "./file-attachment";
import { MessageReactions } from "./message-reactions";
import { ReadReceipts } from "./read-receipts";
import { LinkPreview } from "./link-preview";
import { ChatRoomContextMenu } from "./chat-room-context-menu";
import { ReplyCountBadge } from "./reply-count-badge";
import { MessageHoverActions } from "./message-hover-actions";
import { UserProfileCard } from "./user-profile-card";
import { parseFormattedText, renderFormattedText } from "@/lib/text-formatter";
import { sanitizeMessageContent } from "@/lib/sanitize";
import { getFirstUrl } from "@/lib/url-detector";
import type { Message } from "@/lib/types/message.types";

interface MessageItemProps {
  message: Message;
  isSent: boolean;
  showAvatar: boolean;
  showName: boolean;
  isConsecutive: boolean;
  spacing: string;
  isGroup: boolean;
  roomId: string;
  currentUserId: string;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  onReactionChange: () => void;
  createLongPressHandlers: (message: Message) => any;
}

export const MessageItem = memo(function MessageItem({
  message,
  isSent,
  showAvatar,
  showName,
  isConsecutive,
  spacing,
  isGroup,
  roomId,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onUnpin,
  onReactionChange,
  createLongPressHandlers,
}: MessageItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [contextMenuHandler, setContextMenuHandler] = useState<((e: React.MouseEvent) => void) | null>(null);
  
  return (
    <ChatRoomContextMenu
      message={message}
      currentUserId={currentUserId}
      onReply={onReply}
      onEdit={onEdit}
      onDelete={onDelete}
      onPin={onPin}
      onUnpin={onUnpin}
      onOpenContextMenu={(handler) => setContextMenuHandler(() => handler)}
    >
      <div
        data-message-id={message.id}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group relative px-5 transition-base",
          "hover:bg-surface-100 dark:hover:bg-surface-800",
          message.isPinned && "bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-amber-500 pl-4",
          // Slack-style spacing:
          // - Consecutive messages: minimal spacing (py-0.5 + mt-0.5 = 2px total)
          // - New group: moderate spacing (py-1 + mt-2 = 8px total)
          isConsecutive ? "py-0.5 mt-0.5" : "py-1 mt-2"
        )}
        {...createLongPressHandlers(message)}
      >
        {/* Slack-style flat layout */}
        <div className="flex gap-2">
          {/* Avatar (36px - Slack size) */}
          <div className="flex-shrink-0">
            {showAvatar ? (
              <UserAvatar
                name={message.senderName}
                src={message.senderAvatar}
                size="md"
                className="w-9 h-9"
              />
            ) : (
              <div className="w-9 h-9" /> // Placeholder for consistent spacing
            )}
          </div>

          {/* Message content */}
          <div className="flex-1 min-w-0">
            {/* Header: Name + Timestamp (inline, Slack-style) */}
            {showName && (
              <div className="flex items-baseline gap-2 mb-1">
                {/* User name with hover profile card (Slack-style) */}
                <HoverCard openDelay={500} closeDelay={200}>
                  <HoverCardTrigger asChild>
                    <button className="text-[15px] font-bold text-foreground hover:underline cursor-pointer">
                      {message.senderName}
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    side="top"
                    align="start"
                    className="p-0 w-auto"
                    sideOffset={8}
                  >
                    <UserProfileCard
                      user={{
                        id: message.senderId,
                        name: message.senderName,
                        avatar: message.senderAvatar,
                        status: "ONLINE", // You can pass actual status from props
                      }}
                    />
                  </HoverCardContent>
                </HoverCard>
                
                <span className="text-[13px] text-muted-foreground">
                  {formatMessageTime(message.createdAt)}
                </span>
                {message.isPinned && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px] flex items-center gap-0.5">
                    <Pin className="h-2.5 w-2.5" />
                    Pinned
                  </Badge>
                )}
              </div>
            )}
            
            {/* Timestamp on hover for consecutive messages (Slack-style) */}
            {!showName && (
              <div className="flex items-baseline gap-2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[13px] text-muted-foreground">
                  {formatMessageTime(message.createdAt)}
                </span>
              </div>
            )}

            {/* Reply Preview (if replying to another message) */}
            {message.replyTo && (
              <div 
                className="mb-2 pl-3 pr-2 py-1.5 border-l-2 border-muted-foreground/30 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-base"
                data-reply-to-id={message.replyTo.id}
                onClick={() => {
                  const originalMessage = document.querySelector(`[data-message-id="${message.replyTo?.id}"]`);
                  if (originalMessage) {
                    originalMessage.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Reply className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">
                    {message.replyTo.senderName}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {message.replyTo.content || "Media"}
                </p>
              </div>
            )}

            {/* Message Content (Slack-style plain text) */}
            {!message.isDeleted && message.content && message.content.trim().length > 0 && (
              <div className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
                {renderFormattedText(
                  parseFormattedText(sanitizeMessageContent(message.content)),
                  "text-foreground"
                )}
                {message.isEdited && (
                  <span className="text-[12px] ml-1.5 text-muted-foreground">
                    (edited)
                  </span>
                )}
              </div>
            )}

            {/* Deleted Message */}
            {message.isDeleted && (
              <p className="text-[15px] italic text-muted-foreground">
                This message was deleted
              </p>
            )}

            {/* File Attachment */}
            {message.fileUrl && (
              <div className="mt-2">
                <FileAttachment
                  fileUrl={message.fileUrl}
                  fileName={message.fileName || "File"}
                  fileSize={message.fileSize || 0}
                  fileType={message.fileType || "application/octet-stream"}
                  isSent={false} // Always use received style in flat design
                />
              </div>
            )}

            {/* Link Preview */}
            {getFirstUrl(message.content) && (
              <div className="mt-2">
                <LinkPreview
                  url={getFirstUrl(message.content)!}
                  isSent={false}
                />
              </div>
            )}

            {/* Reactions */}
            {message.reactions && Array.isArray(message.reactions) && message.reactions.length > 0 && (
              <div className="mt-2">
                <MessageReactions
                  reactions={message.reactions}
                  currentUserId={currentUserId}
                  messageId={message.id}
                  roomId={roomId}
                  onReactionChange={onReactionChange}
                />
              </div>
            )}

            {/* Reply Count Badge */}
            {message.replyCount && message.replyCount > 0 && (
              <div className="mt-2">
                <ReplyCountBadge 
                  count={message.replyCount} 
                  messageId={message.id}
                  roomId={roomId}
                />
              </div>
            )}

            {/* Read Receipts (for sent messages only) */}
            {isSent && !isConsecutive && (
              <div className="mt-1">
                <ReadReceipts
                  isSent={isSent}
                  isRead={message.isRead || false}
                  isDelivered={message.isDelivered || false}
                />
              </div>
            )}
          </div>

          {/* Hover Actions (right side, Slack-style) */}
          {!message.isDeleted && isHovered && (
            <div className="absolute top-0 right-4 -mt-2">
              <MessageHoverActions
                message={message}
                isSent={isSent}
                currentUserId={currentUserId}
                onReply={onReply}
                onReact={onReactionChange}
                onPin={onPin}
                onUnpin={onUnpin}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpenContextMenu={contextMenuHandler || undefined}
              />
            </div>
          )}
        </div>
      </div>
    </ChatRoomContextMenu>
  );
});
