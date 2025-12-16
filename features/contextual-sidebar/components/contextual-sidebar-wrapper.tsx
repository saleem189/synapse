// ================================
// Contextual Sidebar Wrapper
// ================================
// Wrapper that gets props from context and passes to ContextualSidebar
// Follows Architecture Rules: Proper separation, error handling

'use client';

import { useContextualSidebarContext } from '../contexts/contextual-sidebar-context';
import { ContextualSidebar } from './contextual-sidebar';
import { MessageCircle } from 'lucide-react';

/**
 * Contextual Sidebar Wrapper Component
 * 
 * Purpose: Bridge between layout context and contextual sidebar
 * Follows: Architecture Rules (proper separation of concerns)
 */
export function ContextualSidebarWrapper() {
  const {
    roomId,
    currentUserId,
    onReply,
    onEdit,
    onDelete,
    onReactionChange,
  } = useContextualSidebarContext();

  // Don't render if required data is missing (null-safe, follows Coding Standards)
  if (!roomId || !currentUserId) {
    return (
      <div 
        className="h-full flex items-center justify-center p-8 text-center"
        role="status"
        aria-label="No active conversation"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-muted/20 p-6">
            <MessageCircle 
              className="h-12 w-12 text-muted-foreground/40" 
              aria-hidden="true"
            />
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">No conversation selected</p>
            <p className="text-xs">Select a channel or DM to view threads</p>
          </div>
        </div>
      </div>
    );
  }

  // Render contextual sidebar with props from context
  return (
    <ContextualSidebar
      roomId={roomId}
      currentUserId={currentUserId}
      onReply={onReply}
      onEdit={onEdit}
      onDelete={onDelete}
      onReactionChange={onReactionChange}
    />
  );
}

