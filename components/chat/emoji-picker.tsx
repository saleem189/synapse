// ================================
// Emoji Picker Component
// ================================

"use client";

import { useState } from "react";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES = {
  "😀": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗"],
  "😢": ["😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓"],
  "👋": ["👋", "🤚", "🖐", "✋", "🖖", "👌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️"],
  "❤️": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝"],
  "👍": ["👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👏", "🙌", "👐", "🤲", "🤝", "🙏"],
};

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            isOpen
              ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
              : "hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
          )}
          title="Add emoji"
        >
          <Smile className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="end"
        className="w-80 p-4 bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800"
      >
        <ScrollArea className="h-64">
          <div className="pr-2">
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
              <div key={category} className="mb-4">
                <div className="text-xs font-semibold text-surface-500 mb-2 px-2">
                  {category}
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 flex items-center justify-center text-xl transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

