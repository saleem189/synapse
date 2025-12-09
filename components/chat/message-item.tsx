// ================================
// Message Item Component
// ================================
// Individual message bubble with React.memo for performance

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Reply } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FileAttachment } from "./file-attachment";
import { MessageReactions } from "./message-reactions";
import { ReadReceipts } from "./read-receipts";
import { MessageActions } from "./message-actions";
import { MessageTime } from "./message-time";
import { LinkPreview } from "./link-preview";
import { ChatRoomContextMenu } from "./chat-room-context-menu";
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
  onReactionChange,
  createLongPressHandlers,
}: MessageItemProps) {
  return (
    <ChatRoomContextMenu
      message={message}
      currentUserId={currentUserId}
      onReply={onReply}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <motion.div
        key={message.id}
        data-message-id={message.id}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.2,
          ease: "easeOut"
        }}
        className={cn(
          "flex items-end gap-2.5",
          isSent ? "justify-end" : "justify-start",
          spacing
        )}
      >
      {/* Avatar (for received messages) */}
      {!isSent && (
        <div className="w-8 flex-shrink-0">
          {showAvatar && (
            <Avatar className="w-8 h-8 bg-gradient-to-br from-primary-400 to-blue-500">
              <AvatarImage src={message.senderAvatar || undefined} alt={message.senderName} />
              <AvatarFallback className="bg-gradient-to-br from-primary-400 to-blue-500 text-white text-xs font-semibold">
                {getInitials(message.senderName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      {/* Message Bubble */}
      <div className={cn("max-w-[70%] flex flex-col", isSent ? "items-end order-1" : "items-start")}>
        {/* Sender name (for group chats) */}
        {showName && (
          <p className="text-xs text-surface-500 dark:text-surface-400 mb-1.5 ml-1 font-medium">
            {message.senderName}
          </p>
        )}

        {/* Bubble Container */}
        <div 
          className="relative group"
          {...createLongPressHandlers(message)}
        >
          {/* Bubble */}
          <div
            className={cn(
              "relative rounded-2xl transition-all duration-200",
              message.fileUrl && (message.fileType?.startsWith("image/") || message.fileType?.startsWith("video/"))
                ? "p-1.5"
                : message.fileType?.startsWith("audio/")
                ? "p-2"
                : "px-4 py-2.5",
              isSent
                ? "bg-primary-600 text-white rounded-br-md shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/35"
                : "bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 rounded-bl-md border border-surface-200 dark:border-surface-700 shadow-md hover:shadow-lg hover:border-surface-300 dark:hover:border-surface-600"
            )}
          >
            {/* Reply Button - Show on hover */}
            {!message.isDeleted && (
              <button
                onClick={() => onReply(message)}
                className={cn(
                  "absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10",
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  "bg-white/90 dark:bg-surface-800/90 backdrop-blur-sm",
                  "shadow-md border border-surface-200 dark:border-surface-700",
                  "hover:bg-white dark:hover:bg-surface-800",
                  "text-surface-600 hover:text-primary-600 dark:text-surface-400 dark:hover:text-primary-400",
                  "hover:scale-110 active:scale-95"
                )}
                title="Reply"
              >
                <Reply className="w-4 h-4" />
              </button>
            )}

            {/* Message Actions (Edit/Delete) - Show on hover */}
            {isSent && !message.isDeleted && (
              <div className={cn(
                "absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
              )}>
                <MessageActions
                  messageId={message.id}
                  currentContent={message.content}
                  isSent={isSent}
                  isDeleted={message.isDeleted || false}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            )}

            {/* Reply Preview */}
            {message.replyTo && (
              <div className={cn(
                "mb-2.5 pl-3 pr-2 py-1.5 border-l-4 rounded-r-md cursor-pointer hover:opacity-90 transition-opacity",
                isSent
                  ? "border-primary-200 bg-primary-500/20 backdrop-blur-sm"
                  : "border-primary-400 dark:border-primary-500 bg-surface-100 dark:bg-surface-800/70"
              )}
              onClick={() => {
                // Scroll to original message
                const originalMessage = document.querySelector(`[data-message-id="${message.replyTo?.id}"]`);
                if (originalMessage) {
                  originalMessage.scrollIntoView({ behavior: "smooth", block: "center" });
                  originalMessage.classList.add("ring-2", "ring-primary-500", "ring-offset-2");
                  setTimeout(() => {
                    originalMessage.classList.remove("ring-2", "ring-primary-500", "ring-offset-2");
                  }, 2000);
                }
              }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Reply className={cn(
                    "w-3 h-3",
                    isSent ? "text-primary-100" : "text-primary-600 dark:text-primary-400"
                  )} />
                  <p className={cn(
                    "text-xs font-semibold",
                    isSent ? "text-primary-100" : "text-primary-700 dark:text-primary-300"
                  )}>
                    {message.replyTo.senderName}
                  </p>
                </div>
                <p className={cn(
                  "text-xs line-clamp-2 leading-tight",
                  isSent ? "text-primary-50/90" : "text-surface-700 dark:text-surface-300"
                )}>
                  {message.replyTo.content || "Media"}
                </p>
              </div>
            )}

            {/* File Attachment */}
            {message.fileUrl && (
              <div className={cn(
                message.fileType?.startsWith("image/") || message.fileType?.startsWith("video/") || message.fileType?.startsWith("audio/")
                  ? "mb-0"
                  : "mb-2"
              )}>
                <FileAttachment
                  fileUrl={message.fileUrl}
                  fileName={message.fileName || "File"}
                  fileSize={message.fileSize || 0}
                  fileType={message.fileType || "application/octet-stream"}
                  isSent={isSent}
                />
              </div>
            )}

            {/* Message Content */}
            {!message.isDeleted && message.content && message.content.trim().length > 0 && (
              <div className={cn(
                message.fileUrl && (message.fileType?.startsWith("image/") || message.fileType?.startsWith("video/") || message.fileType?.startsWith("audio/"))
                  ? "px-3 pb-2 pt-1.5"
                  : message.replyTo ? "mt-0 pb-0" : "pb-0"
              )}>
                <div className={cn(
                  "text-sm leading-relaxed whitespace-pre-wrap break-words"
                )}>
                  {renderFormattedText(
                    parseFormattedText(sanitizeMessageContent(message.content)),
                    isSent ? "text-white" : "text-surface-900 dark:text-white"
                  )}
                  {message.isEdited && (
                    <span className={cn(
                      "text-[10px] ml-1.5 italic opacity-75",
                      isSent ? "text-primary-100" : "text-surface-500 dark:text-surface-400"
                    )}>
                      (edited)
                    </span>
                  )}
                </div>
                
                {/* Link Preview */}
                {getFirstUrl(message.content) && (
                  <LinkPreview
                    url={getFirstUrl(message.content)!}
                    isSent={isSent}
                  />
                )}
              </div>
            )}

            {/* Deleted Message */}
            {message.isDeleted && (
              <p className={cn(
                "text-sm italic opacity-70",
                isSent ? "text-primary-100" : "text-surface-500 dark:text-surface-400"
              )}>
                This message was deleted
              </p>
            )}

            {/* Timestamp and Read Receipt - Below message content */}
            {!message.fileUrl || (!message.fileType?.startsWith("image/") && !message.fileType?.startsWith("video/")) ? (
              <div className={cn(
                "flex items-center gap-1.5 -mt-0.5",
                isSent ? "justify-end" : "justify-start"
              )}>
                <p
                  className={cn(
                    "text-[10px] font-medium",
                    isSent
                      ? "text-primary-100/90"
                      : "text-surface-500 dark:text-surface-400"
                  )}
                >
                  <MessageTime timestamp={message.createdAt} />
                </p>
                {isSent && (
                  <ReadReceipts
                    isSent={isSent}
                    isRead={message.isRead || false}
                    isDelivered={message.isDelivered || false}
                  />
                )}
              </div>
            ) : (
              /* For media messages, overlay timestamp and receipt */
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white flex items-center gap-1.5">
                <p className="text-[10px] font-medium text-white/90">
                  <MessageTime timestamp={message.createdAt} />
                </p>
                {isSent && (
                  <ReadReceipts
                    isSent={isSent}
                    isRead={message.isRead || false}
                    isDelivered={message.isDelivered || false}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Message Reactions - Positioned below bubble */}
        {!message.isDeleted && (
          <div className={cn(
            "mt-1.5",
            isSent ? "flex justify-end" : "flex justify-start"
          )}>
            <MessageReactions
              messageId={message.id}
              roomId={roomId}
              reactions={message.reactions || {}}
              currentUserId={currentUserId}
              isSent={isSent}
              onReactionChange={onReactionChange}
            />
          </div>
        )}
      </div>
    </motion.div>
    </ChatRoomContextMenu>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if these props change
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.isDeleted === nextProps.message.isDeleted &&
    prevProps.message.isEdited === nextProps.message.isEdited &&
    prevProps.message.reactions === nextProps.message.reactions &&
    prevProps.message.isRead === nextProps.message.isRead &&
    prevProps.message.isDelivered === nextProps.message.isDelivered &&
    prevProps.showAvatar === nextProps.showAvatar &&
    prevProps.showName === nextProps.showName &&
    prevProps.isConsecutive === nextProps.isConsecutive
  );
});
