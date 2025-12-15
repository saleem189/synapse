// ================================
// Message Item Component
// ================================
// Individual message bubble with React.memo for performance

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Reply, Pin } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
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
  return (
    <ChatRoomContextMenu
      message={message}
      currentUserId={currentUserId}
      onReply={onReply}
      onEdit={onEdit}
      onDelete={onDelete}
      onPin={onPin}
      onUnpin={onUnpin}
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
            <HoverCard key={`hover-${message.id}`} openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <button type="button" className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full">
                  <Avatar className="w-8 h-8 bg-gradient-to-br from-primary to-accent">
                    <AvatarImage src={message.senderAvatar || undefined} alt={message.senderName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-semibold">
                      {getInitials(message.senderName)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80" side="right" align="start">
                <div className="flex justify-between space-x-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={message.senderAvatar || undefined} alt={message.senderName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                      {getInitials(message.senderName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm font-semibold">{message.senderName}</h4>
                    <p className="text-xs text-muted-foreground">
                      Synapse User
                    </p>
                    <div className="flex items-center pt-2">
                      <span className="text-xs text-muted-foreground">
                        Hover to view profile
                      </span>
                    </div>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>
      )}

      {/* Message Bubble */}
      <div className={cn("max-w-[70%] flex flex-col", isSent ? "items-end order-1" : "items-start")}>
        {/* Sender name (for group chats) */}
        {showName && (
          <div className="flex items-center gap-1.5 mb-1.5 ml-1">
            <p className="text-xs text-muted-foreground font-medium">
              {message.senderName}
            </p>
            {(message as any).isPinned && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] flex items-center gap-0.5">
                <Pin className="h-2.5 w-2.5" />
                Pinned
              </Badge>
            )}
          </div>
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
                ? "bg-primary text-primary-foreground rounded-br-md shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35"
                : "bg-card text-card-foreground rounded-bl-md border border-border shadow-md hover:shadow-lg hover:border-border/80"
            )}
          >
            {/* Reply Button - Show on hover */}
            {!message.isDeleted && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onReply(message)}
                      className={cn(
                        "absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10",
                        "w-8 h-8 rounded-lg",
                        "bg-card/90 backdrop-blur-sm",
                        "shadow-md border border-border",
                        "hover:scale-110 active:scale-95",
                        "text-foreground hover:text-primary"
                      )}
                    >
                      <Reply className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reply</TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
                  ? "border-primary/30 bg-primary/10 backdrop-blur-sm"
                  : "border-primary/20 bg-muted/70"
              )}
              onClick={() => {
                // Scroll to original message
                const originalMessage = document.querySelector(`[data-message-id="${message.replyTo?.id}"]`);
                if (originalMessage) {
                  originalMessage.scrollIntoView({ behavior: "smooth", block: "center" });
                  originalMessage.classList.add("ring-2", "ring-ring", "ring-offset-2");
                  setTimeout(() => {
                    originalMessage.classList.remove("ring-2", "ring-ring", "ring-offset-2");
                  }, 2000);
                }
              }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Reply className={cn(
                    "w-3 h-3",
                    isSent ? "text-primary-foreground/80" : "text-primary"
                  )} />
                  <p className={cn(
                    "text-xs font-semibold",
                    isSent ? "text-primary-foreground/90" : "text-primary"
                  )}>
                    {message.replyTo.senderName}
                  </p>
                </div>
                <p className={cn(
                  "text-xs line-clamp-2 leading-tight",
                  isSent ? "text-primary-foreground/80" : "text-foreground"
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
                    isSent ? "text-white" : "text-foreground"
                  )}
                  {message.isEdited && (
                    <span className={cn(
                      "text-[10px] ml-1.5 italic opacity-75",
                      isSent ? "text-primary-foreground/70" : "text-muted-foreground"
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
                isSent ? "text-primary-foreground/80" : "text-muted-foreground"
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
                      ? "text-primary-foreground/90"
                      : "text-muted-foreground"
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
