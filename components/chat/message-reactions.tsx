// ================================
// Message Reactions Component
// ================================

"use client";

import { useState } from "react";
import { Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSocket } from "@/lib/socket";
import { apiClient } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MessageReactions } from "@/lib/types";

interface MessageReactionsProps {
  messageId: string;
  roomId: string;
  reactions: Record<string, Array<{ id: string; name: string; avatar: string | null }>>;
  currentUserId: string;
  isSent?: boolean;
  onReactionChange?: () => void;
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function MessageReactions({
  messageId,
  roomId,
  reactions,
  currentUserId,
  isSent = false,
  onReactionChange,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleReactionClick = async (emoji: string) => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      await apiClient.post(`/messages/${messageId}/reactions`, { emoji }, {
        showErrorToast: false, // Don't show toast for reactions
      });

      // Fetch updated reactions
      const data = await apiClient.get<{ reactions: MessageReactions }>(`/messages/${messageId}/reactions`, {
        showErrorToast: false,
      });
      
      // Emit socket event for real-time update
      const socket = getSocket();
      // Note: reaction-updated is handled via server-side event, not client emit
      // The server will broadcast the update to all clients
      
      onReactionChange?.();
    } catch (error) {
      logger.error("Error managing reaction", error instanceof Error ? error : new Error(String(error)), {
        component: 'MessageReactions',
        messageId,
        roomId,
      });
    } finally {
      setIsUpdating(false);
      setShowPicker(false);
    }
  };

  const hasUserReacted = (emoji: string) => {
    return reactions[emoji]?.some((user) => user.id === currentUserId) || false;
  };

  const reactionEntries = Object.entries(reactions);
  const hasReactions = reactionEntries.length > 0;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Existing Reactions */}
        {reactionEntries.map(([emoji, users]) => {
          const userReacted = hasUserReacted(emoji);
          const count = users.length;

          return (
            <Tooltip key={emoji}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleReactionClick(emoji)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-200 h-auto",
                    "hover:scale-105 active:scale-95",
                    userReacted
                      ? isSent
                        ? "bg-primary/20 border border-primary/30 text-primary-foreground backdrop-blur-sm"
                        : "bg-primary/10 border border-primary/20 text-primary"
                      : isSent
                      ? "bg-white/10 border border-white/20 text-white/90 hover:bg-white/20 backdrop-blur-sm"
                      : ""
                  )}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  <Badge variant={userReacted ? "default" : "outline"} className="text-[11px] font-semibold leading-none px-1.5 py-0 h-auto">
                    {count}
                  </Badge>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {users.length > 0 ? users.map((u) => u.name).join(", ") : "No reactions"}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Add Reaction Button - Always visible */}
        <Popover open={showPicker} onOpenChange={setShowPicker}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "w-7 h-7 rounded-full transition-all duration-200",
                    "hover:scale-110 active:scale-95",
                    isSent
                      ? "bg-primary/20 border-primary/30 text-primary hover:bg-primary/30 backdrop-blur-sm"
                      : ""
                  )}
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Add reaction</TooltipContent>
          </Tooltip>
          <PopoverContent
            side={isSent ? "top" : "top"}
            align={isSent ? "end" : "start"}
            className="w-auto p-2.5 flex items-center gap-1.5"
          >
            {COMMON_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="icon"
                onClick={() => handleReactionClick(emoji)}
                className={cn(
                  "w-9 h-9 rounded-lg text-lg transition-all duration-200",
                  "hover:scale-110 active:scale-95",
                  hasUserReacted(emoji) && "bg-primary/10 ring-2 ring-primary"
                )}
                title={emoji}
              >
                {emoji}
              </Button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}

