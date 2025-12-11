// ================================
// Chat Room Search Dialog Component
// ================================
// Search dialog for finding messages in the room

"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Message } from "@/lib/types/message.types";

interface ChatRoomSearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  messages: Message[];
  onSelectMessage: (messageId: string) => void;
}

export function ChatRoomSearchDialog({
  isOpen,
  onOpenChange,
  searchQuery,
  onSearchQueryChange,
  messages,
  onSelectMessage,
}: ChatRoomSearchDialogProps) {
  const filteredMessages = messages.filter((msg) =>
    msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectMessage = (messageId: string) => {
    // Scroll to message
    const messageElement = document.querySelector(
      `[data-message-id="${messageId}"]`
    );
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      onOpenChange(false);
    }
    onSelectMessage(messageId);
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search messages..."
        value={searchQuery}
        onValueChange={onSearchQueryChange}
      />
      <CommandList>
        <CommandEmpty className="py-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">No messages found</p>
            <p className="text-xs text-muted-foreground">Try different search terms</p>
          </div>
        </CommandEmpty>
        <CommandGroup heading="Messages">
          {filteredMessages.map((msg) => (
            <CommandItem
              key={msg.id}
              onSelect={() => handleSelectMessage(msg.id)}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{msg.senderName}</span>
                <span className="text-xs text-muted-foreground">
                  {msg.content?.substring(0, 50)}...
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

