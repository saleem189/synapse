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
        <CommandEmpty>No messages found.</CommandEmpty>
        <CommandGroup heading="Messages">
          {filteredMessages.map((msg) => (
            <CommandItem
              key={msg.id}
              onSelect={() => handleSelectMessage(msg.id)}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{msg.senderName}</span>
                <span className="text-xs text-surface-500">
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

