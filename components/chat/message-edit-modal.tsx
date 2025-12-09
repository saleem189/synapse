// ================================
// Message Edit Modal Component
// ================================

"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  currentContent: string;
  onSave: (messageId: string, newContent: string) => void;
}

export function MessageEditModal({
  isOpen,
  onClose,
  messageId,
  currentContent,
  onSave,
}: MessageEditModalProps) {
  const [content, setContent] = useState(currentContent);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(currentContent);
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isOpen, currentContent]);

  const handleSave = async () => {
    if (!content.trim() || content.trim() === currentContent.trim()) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.patch(`/messages/${messageId}`, {
        content: content.trim(),
      });

      onSave(messageId, content.trim());
      onClose();
    } catch (error) {
      console.error("Error editing message:", error);
      // Error toast is handled by API client
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
          <DialogDescription>
            Make changes to your message. Press Enter to save or Esc to cancel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Edit your message..."
            className="min-h-[100px]"
            rows={4}
          />
          <p className="text-xs text-surface-500">
            Press Enter to save, Esc to cancel
          </p>
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !content.trim() || content.trim() === currentContent.trim()}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

