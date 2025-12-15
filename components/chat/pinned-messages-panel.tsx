'use client';

import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pin, X, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PinnedMessagesPanelProps {
  roomId: string;
  open: boolean;
  onClose: () => void;
  onMessageClick?: (messageId: string) => void;
}

interface PinnedMessage {
  id: string;
  content: string;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  };
  pinnedBy: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  reactions: Array<{
    emoji: string;
    user: {
      id: string;
      name: string;
    };
  }>;
}

export function PinnedMessagesPanel({ 
  roomId, 
  open, 
  onClose,
  onMessageClick 
}: PinnedMessagesPanelProps) {
  const { toast } = useToast();
  const [unpinning, setUnpinning] = useState<string | null>(null);

  const { data: pinnedMessages, isLoading, refetch } = useQuery<PinnedMessage[]>({
    queryKey: ['pinned-messages', roomId],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${roomId}/pinned`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: open
  });

  const unpinMessage = async (messageId: string) => {
    setUnpinning(messageId);
    try {
      const res = await fetch(`/api/messages/${messageId}/pin`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to unpin');
      }
      
      await refetch();
      toast({
        title: 'Message unpinned',
        description: 'The message has been removed from pins'
      });
    } catch (error) {
      console.error('Error unpinning:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to unpin message',
        variant: 'destructive'
      });
    } finally {
      setUnpinning(null);
    }
  };

  const handleMessageClick = (messageId: string) => {
    if (onMessageClick) {
      onMessageClick(messageId);
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-96 sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Pin className="h-4 w-4" />
            Pinned Messages
            {pinnedMessages && pinnedMessages.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pinnedMessages.length}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)] mt-4 pr-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="animate-pulse">Loading...</div>
            </div>
          ) : !pinnedMessages || pinnedMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Pin className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No pinned messages</p>
              <p className="text-xs mt-1">
                Pin important messages to find them easily
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pinnedMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => handleMessageClick(message.id)}
                >
                  {/* Message header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={message.sender.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {message.sender.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm truncate">
                        {message.sender.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        unpinMessage(message.id);
                      }}
                      disabled={unpinning === message.id}
                    >
                      {unpinning === message.id ? (
                        <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  {/* Message content */}
                  <p className="text-sm mb-2 line-clamp-3 break-words">
                    {message.content}
                  </p>

                  {/* Reactions (if any) */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex gap-1 mb-2 flex-wrap">
                      {Object.entries(
                        message.reactions.reduce((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([emoji, count]) => (
                        <Badge key={emoji} variant="secondary" className="text-xs px-1.5 py-0">
                          {emoji} {count}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Message footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Pin className="h-3 w-3" />
                      {message.pinnedBy?.name || 'Unknown'}
                    </span>
                    <span>
                      {message.pinnedAt && formatDistanceToNow(new Date(message.pinnedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

