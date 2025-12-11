// ================================
// Typing Indicator Component
// ================================
// Shows when other users are typing

"use client";

import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  users: string[];
  className?: string;
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  // Format the typing message
  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0]} is typing`;
    } else if (users.length === 2) {
      return `${users[0]} and ${users[1]} are typing`;
    } else {
      return `${users[0]} and ${users.length - 1} others are typing`;
    }
  };

  return (
    <div className={cn("flex items-end gap-2 mt-3", className)}>
      {/* Avatar placeholder */}
      <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />

      {/* Typing bubble */}
      <div className="bg-background rounded-2xl rounded-bl-md border border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Animated dots */}
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-dot" />
            <span
              className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-dot"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-dot"
              style={{ animationDelay: "0.4s" }}
            />
          </div>

          {/* Typing text */}
          <span className="text-xs text-muted-foreground">
            {getTypingText()}
          </span>
        </div>
      </div>
    </div>
  );
}

