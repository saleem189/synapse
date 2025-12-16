// ================================
// Thread Panel Component
// ================================
// Shows a message and all its replies in the sidebar

'use client';

import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/lib/api-client';
import type { Message } from '@/lib/types/message.types';
import { MessageItem } from '@/components/chat/message-item';

interface ThreadPanelProps {
  messageId: string;
  roomId: string;
  currentUserId: string;
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReactionChange?: () => void;
}

export function ThreadPanel({
  messageId,
  roomId,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReactionChange,
}: ThreadPanelProps) {
  // Fetch the original message
  const { data: originalMessage, isLoading: isLoadingOriginal } = useQuery({
    queryKey: ['message', messageId],
    queryFn: async () => {
      const response = await apiClient.get<Message>(`/messages/${messageId}`);
      return response;
    },
    enabled: !!messageId,
  });

  // Fetch all replies to this message
  const { data: replies = [], isLoading: isLoadingReplies } = useQuery({
    queryKey: ['thread-replies', messageId],
    queryFn: async () => {
      const response = await apiClient.get<Message[]>(`/messages/${messageId}/replies`);
      return response || [];
    },
    enabled: !!messageId,
    refetchInterval: 3000, // Refresh every 3 seconds for new replies
  });

  const isLoading = isLoadingOriginal || isLoadingReplies;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading thread...</p>
        </div>
      </div>
    );
  }

  if (!originalMessage) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <MessageCircle className="w-12 h-12 text-muted-foreground/50 mx-auto" />
          <p className="text-sm text-muted-foreground">Message not found</p>
        </div>
      </div>
    );
  }

  const allMessages = [originalMessage, ...replies];
  const replyCount = replies.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Thread</h3>
            <p className="text-xs text-muted-foreground">
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {allMessages.map((message, index) => (
            <div key={message.id} className="relative">
              {index === 0 && (
                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
              )}
              <MessageItem
                message={message}
                isSent={message.senderId === currentUserId}
                showAvatar={true}
                showName={true}
                isConsecutive={false}
                spacing="mb-3"
                isGroup={true}
                roomId={roomId}
                currentUserId={currentUserId}
                onReply={onReply || (() => {})}
                onEdit={onEdit || (() => {})}
                onDelete={onDelete || (() => {})}
                onReactionChange={onReactionChange || (() => {})}
                createLongPressHandlers={() => ({})}
              />
            </div>
          ))}

          {replyCount === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No replies yet</p>
              <p className="text-xs mt-1">Be the first to reply</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

