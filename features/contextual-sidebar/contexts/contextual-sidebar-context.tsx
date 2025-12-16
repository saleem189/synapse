// ================================
// Contextual Sidebar Context
// ================================
// Provides chat-specific handlers to ContextualSidebar in layout
// Follows Architecture Rules: Proper context usage, type safety

'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Message } from '@/lib/types/message.types';

/**
 * Context value interface (follows Coding Standards: interfaces for types)
 * Type-safe context for passing room-specific handlers to sidebar
 */
interface ContextualSidebarContextValue {
  roomId: string | null;
  currentUserId: string | null;
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReactionChange?: () => void;
}

const ContextualSidebarContext = createContext<ContextualSidebarContextValue>({
  roomId: null,
  currentUserId: null,
});

export function useContextualSidebarContext() {
  return useContext(ContextualSidebarContext);
}

interface ContextualSidebarProviderProps {
  children: ReactNode;
  roomId: string;
  currentUserId: string;
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReactionChange?: () => void;
}

export function ContextualSidebarProvider({
  children,
  roomId,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReactionChange,
}: ContextualSidebarProviderProps) {
  return (
    <ContextualSidebarContext.Provider
      value={{
        roomId,
        currentUserId,
        onReply,
        onEdit,
        onDelete,
        onReactionChange,
      }}
    >
      {children}
    </ContextualSidebarContext.Provider>
  );
}

