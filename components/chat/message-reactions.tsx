// ================================
// Message Reactions Component
// ================================

"use client";

import { useState } from "react";
import { Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSocket } from "@/lib/socket";
import { apiClient } from "@/lib/api-client";
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
      console.error("Error managing reaction:", error);
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
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Existing Reactions */}
      {reactionEntries.map(([emoji, users]) => {
        const userReacted = hasUserReacted(emoji);
        const count = users.length;

        return (
          <button
            key={emoji}
            onClick={() => handleReactionClick(emoji)}
            disabled={isUpdating}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5 transition-all duration-200",
              "hover:scale-105 active:scale-95",
              userReacted
                ? isSent
                  ? "bg-primary-500/20 border border-primary-400/30 text-primary-100 backdrop-blur-sm"
                  : "bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300"
                : isSent
                ? "bg-white/10 border border-white/20 text-white/90 hover:bg-white/20 backdrop-blur-sm"
                : "bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300"
            )}
            title={users.map((u) => u.name).join(", ")}
          >
            <span className="text-sm leading-none">{emoji}</span>
            <span className="text-[11px] font-semibold leading-none">{count}</span>
          </button>
        );
      })}

      {/* Add Reaction Button - Always visible */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
            "hover:scale-110 active:scale-95",
            isSent
              ? "bg-primary-500/20 border border-primary-400/30 text-primary-700 dark:text-primary-200 hover:bg-primary-500/30 backdrop-blur-sm"
              : "bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
          )}
          title="Add reaction"
        >
          <Smile className="w-4 h-4" />
        </button>

        {showPicker && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPicker(false)}
            />
            <div className={cn(
              "absolute mb-2 p-2.5 bg-white dark:bg-surface-900 rounded-xl shadow-xl border border-surface-200 dark:border-surface-800 z-50 flex items-center gap-1.5",
              "backdrop-blur-sm",
              isSent ? "bottom-full right-0" : "bottom-full left-0"
            )}>
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all duration-200",
                    "hover:scale-110 active:scale-95",
                    "hover:bg-surface-100 dark:hover:bg-surface-800",
                    hasUserReacted(emoji) && "bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-400 dark:ring-primary-600"
                  )}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

