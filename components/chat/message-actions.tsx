// ================================
// Message Actions Component (Edit/Delete)
// ================================

"use client";

import { useState } from "react";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MessageActionsProps {
  messageId: string;
  currentContent: string;
  isSent: boolean;
  isDeleted: boolean;
  onEdit?: (messageId: string, currentContent: string) => void;
  onDelete?: (messageId: string) => void;
  onUpdated?: () => void;
}

export function MessageActions({
  messageId,
  currentContent,
  isSent,
  isDeleted,
  onEdit,
  onDelete,
  onUpdated,
}: MessageActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteForEveryone, setDeleteForEveryone] = useState(false);

  if (!isSent || isDeleted) return null;

  const handleDeleteClick = (forEveryone: boolean) => {
    setDeleteForEveryone(forEveryone);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/messages/${messageId}`, {
        body: JSON.stringify({ deleteForEveryone }),
      });

      onDelete?.(messageId);
      onUpdated?.();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting message:", error);
      // Error toast is handled by API client
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
            "opacity-0 group-hover:opacity-100",
            "hover:scale-110 active:scale-95",
            "bg-white/90 dark:bg-surface-800/90 backdrop-blur-sm",
            "shadow-md border border-surface-200 dark:border-surface-700",
            "hover:bg-white dark:hover:bg-surface-800",
            "text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
          )}
          title="More options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {onEdit && (
          <DropdownMenuItem
            onClick={() => onEdit(messageId, currentContent)}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            <span>Edit message</span>
          </DropdownMenuItem>
        )}
        {onEdit && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={() => handleDeleteClick(false)}
          disabled={isDeleting}
          className="flex items-center gap-2.5 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete for me</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDeleteClick(true)}
          disabled={isDeleting}
          className="flex items-center gap-2.5 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete for everyone</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteForEveryone
                ? "Are you sure you want to delete this message for everyone? This action cannot be undone."
                : "Are you sure you want to delete this message? This will only remove it for you."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}

