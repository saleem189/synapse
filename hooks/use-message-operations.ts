// ================================
// useMessageOperations Hook
// ================================
// Centralized hook for message operations (send, edit, delete, retry)
// Handles optimistic updates, socket emissions, and API calls

"use client";

import { useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { apiClient } from "@/lib/api-client";
import { useMessagesStore, useUserStore } from "@/lib/store";
import { useOnlineUsers } from "./use-online-users";
import { useSocket } from "./use-socket";
import { useOfflineQueue } from "./use-offline-queue";
import { logger } from "@/lib/logger";
import { createOptimisticMessage } from "@/lib/utils/message-helpers";
import type { Message, MessageType } from "@/lib/types/message.types";
import type { MessagePayload } from "@/lib/socket";

interface FileData {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

interface ReplyTo {
  id: string;
  content: string;
  senderName: string;
  senderAvatar?: string | null;
}

export interface UseMessageOperationsOptions {
  roomId: string;
  participants: Array<{ id: string }>;
  onReplyCleared?: () => void;
}

export interface UseMessageOperationsReturn {
  sendMessage: (
    content: string,
    fileData?: FileData,
    replyTo?: ReplyTo | null
  ) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  retryMessage: (message: Message) => Promise<void>;
}

/**
 * Hook for message operations (send, edit, delete, retry)
 * 
 * @example
 * ```tsx
 * const { sendMessage, editMessage, deleteMessage } = useMessageOperations({
 *   roomId,
 *   participants,
 * });
 * 
 * // Send a message
 * await sendMessage("Hello!", undefined, replyTo);
 * ```
 */
export function useMessageOperations({
  roomId,
  participants,
  onReplyCleared,
}: UseMessageOperationsOptions): UseMessageOperationsReturn {
  const currentUser = useUserStore((state) => state.user);
  const { onlineUserIds } = useOnlineUsers({ autoConnect: false });
  const { addMessage, updateMessage, getMessages } = useMessagesStore();
  const { isConnected } = useSocket({ emitUserConnect: false });
  const { queueAction } = useOfflineQueue();

  /**
   * Determine message type from file data
   */
  const getMessageType = useCallback((fileData?: FileData): MessageType => {
    if (!fileData) return "TEXT";
    if (fileData.fileType.startsWith("image/")) return "IMAGE";
    if (fileData.fileType.startsWith("video/")) return "VIDEO";
    if (fileData.fileType.startsWith("audio/")) return "AUDIO";
    return "FILE";
  }, []);

  /**
   * Send a message
   */
  const sendMessage = useCallback(
    async (
      content: string,
      fileData?: FileData,
      replyTo?: ReplyTo | null
    ): Promise<void> => {
      if (!currentUser) {
        logger.error("Cannot send message: user not available");
        return;
      }

      const messageType = getMessageType(fileData);

      // Check if recipient is online
      const recipientIds = participants
        .filter((p) => p.id !== currentUser.id)
        .map((p) => p.id);
      const recipientOnline = recipientIds.some((id) => onlineUserIds.has(id));

      // Create optimistic message first
      const optimisticMessage = createOptimisticMessage(
        content || "",
        roomId,
        currentUser.id,
        currentUser.name,
        fileData,
        replyTo,
        recipientOnline
      );

      // Add optimistic message to store
      addMessage(roomId, optimisticMessage);

      // Create message payload using the optimistic message's ID for consistency
      const messagePayload: MessagePayload = {
        id: optimisticMessage.id, // Use the same ID as optimistic message
        content: content || "",
        senderId: currentUser.id,
        senderName: currentUser.name,
        roomId,
        type: messageType,
        fileUrl: fileData?.url,
        fileName: fileData?.fileName,
        fileSize: fileData?.fileSize,
        fileType: fileData?.fileType,
        replyToId: replyTo?.id || undefined,
        replyTo: replyTo
          ? {
              id: replyTo.id,
              content: replyTo.content,
              senderName: replyTo.senderName,
              senderAvatar: replyTo.senderAvatar || null,
            }
          : null,
        createdAt: optimisticMessage.createdAt, // Use same timestamp
      };

      // Check if actually online (browser network + socket)
      const isActuallyOnline = typeof navigator !== "undefined" && navigator.onLine && isConnected;

      if (!isActuallyOnline) {
        // Queue the message immediately
        queueAction({
          type: "send-message",
          payload: messagePayload as unknown as Record<string, unknown>,
        });
      } else {
        // Emit via socket for immediate broadcast (optimistic)
        // API will also broadcast after saving with real ID
        const socket = getSocket();
        if (socket.connected) {
          socket.emit("send-message", messagePayload);
        }
      }

      // Save to database (API will also broadcast with real ID)
      try {
        const data = await apiClient.post<{ message: Message }>("/messages", {
          content: content || undefined,
          roomId,
          fileUrl: fileData?.url,
          fileName: fileData?.fileName,
          fileSize: fileData?.fileSize,
          fileType: fileData?.fileType,
          type: messageType.toLowerCase(), // Convert to lowercase for API validation
          replyToId: replyTo?.id || null,
        });

        const currentMessages = getMessages(roomId);

        // Check if message with API ID already exists (socket already replaced it with real ID)
        const existingByApiId = currentMessages.find(
          (msg) => msg.id === data.message.id
        );
        if (existingByApiId) {
          // Socket already replaced optimistic with real ID, just ensure status is correct
          updateMessage(roomId, data.message.id, {
            status: "sent" as const,
            replyTo: existingByApiId.replyTo || data.message.replyTo,
            replyToId: existingByApiId.replyToId || data.message.replyToId,
          });
          return;
        }

        // Find optimistic message by ID first (if socket already updated it with real ID)
        // or by content/timestamp as fallback
        let matchingMsg = currentMessages.find((msg) => msg.id === data.message.id);
        
        // If not found by ID, try to match by optimistic ID pattern or content/timestamp
        if (!matchingMsg) {
          matchingMsg = currentMessages.find((msg) => {
            // Must be from current user
            if (msg.senderId !== currentUser.id) return false;
            
            // Must be in sending or sent status (optimistic or socket message)
            if (msg.status !== "sending" && msg.status !== "sent") return false;
            
            // Match by content
            if (msg.content !== content) return false;
            
            // Match by replyTo
            if ((msg.replyToId || null) !== (replyTo?.id || null)) return false;
            
            // Match by file URL if present
            if (fileData?.url && msg.fileUrl !== fileData.url) return false;
            
            // Match by timestamp (within 5 seconds)
            const timeDiff = Math.abs(
              new Date(msg.createdAt).getTime() - 
              new Date(data.message.createdAt).getTime()
            );
            return timeDiff < 5000; // 5 seconds
          });
        }

        if (matchingMsg) {
          // Replace matching message (optimistic or socket temp) with real API message
          updateMessage(roomId, matchingMsg.id, {
            ...data.message,
            status: "sent" as const,
            isDelivered: data.message.isDelivered ?? recipientOnline,
          });
        } else {
          // No match found - this shouldn't happen, but add as fallback
          logger.warn("No matching message found for API response, adding:", data.message.id);
          addMessage(roomId, {
            ...data.message,
            status: "sent" as const,
            isDelivered: data.message.isDelivered ?? recipientOnline,
          });
        }

        // Clear reply
        if (replyTo && onReplyCleared) {
          onReplyCleared();
        }
      } catch (error) {
        logger.error("Failed to save message:", error);
        
        // Check if it's a network error (offline)
        const isNetworkError = 
          error instanceof Error && (
            error.message.includes("Failed to fetch") ||
            error.message.includes("NetworkError") ||
            error.message.includes("network") ||
            (typeof navigator !== "undefined" && !navigator.onLine)
          ) ||
          (error instanceof TypeError && error.message.includes("fetch"));
        
        // If it's a network error and not already queued, queue it now
        if (isNetworkError && isActuallyOnline) {
          // We thought we were online but got a network error, queue it
          queueAction({
            type: "send-message",
            payload: messagePayload as unknown as Record<string, unknown>,
          });
          return; // Don't mark as failed, it's queued
        }
        
        // If already queued (we knew we were offline), don't mark as failed
        if (!isActuallyOnline) {
          // Message is queued, will be sent when online
          return;
        }
        
        // Mark optimistic message as failed only if it's a real error (not network)
        const currentMessages = getMessages(roomId);
        const failedMsg = currentMessages.find(
          (msg) =>
            msg.status === "sending" &&
            msg.senderId === currentUser.id &&
            msg.replyToId === replyTo?.id &&
            msg.content === content
        );

        if (failedMsg) {
          updateMessage(roomId, failedMsg.id, { status: "failed" as const });
        }
      }
    },
    [
      currentUser,
      roomId,
      participants,
      onlineUserIds,
      getMessageType,
      addMessage,
      updateMessage,
      getMessages,
      onReplyCleared,
      isConnected,
      queueAction,
    ]
  );

  /**
   * Edit a message
   */
  const editMessage = useCallback(
    async (messageId: string, newContent: string): Promise<void> => {
      if (!currentUser) {
        logger.error("Cannot edit message: user not available");
        return;
      }

      // Optimistically update
      updateMessage(roomId, messageId, {
        content: newContent,
        isEdited: true,
      });

      // Check if online
      if (!isConnected) {
        queueAction({
          type: "edit-message",
          payload: {
            messageId,
            content: newContent,
            roomId,
          },
        });
      } else {
        // Emit via socket if connected
        const socket = getSocket();
        socket.emit("message-updated", {
          messageId,
          content: newContent,
          roomId,
        });
      }

      // Save to database
      try {
        await apiClient.patch(`/messages/${messageId}`, {
          content: newContent,
        });
      } catch (error) {
        logger.error("Failed to edit message:", error);
        // Revert optimistic update on error
        const currentMessages = getMessages(roomId);
        const originalMessage = currentMessages.find((msg) => msg.id === messageId);
        if (originalMessage) {
          updateMessage(roomId, messageId, {
            content: originalMessage.content,
            isEdited: false,
          });
        }
      }
    },
    [currentUser, roomId, updateMessage, getMessages, isConnected, queueAction]
  );

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(
    async (messageId: string): Promise<void> => {
      if (!currentUser) {
        logger.error("Cannot delete message: user not available");
        return;
      }

      // Optimistically update
      updateMessage(roomId, messageId, {
        isDeleted: true,
        content: "[This message was deleted]",
      });

      // Check if online
      if (!isConnected) {
        queueAction({
          type: "delete-message",
          payload: {
            messageId,
            roomId,
          },
        });
      } else {
        // Emit via socket if connected
        const socket = getSocket();
        socket.emit("message-deleted", {
          messageId,
          roomId,
        });
      }

      // Save to database
      try {
        await apiClient.delete(`/messages/${messageId}`);
      } catch (error) {
        logger.error("Failed to delete message:", error);
        // Revert optimistic update on error
        const currentMessages = getMessages(roomId);
        const originalMessage = currentMessages.find((msg) => msg.id === messageId);
        if (originalMessage) {
          updateMessage(roomId, messageId, {
            isDeleted: false,
            content: originalMessage.content,
          });
        }
      }
    },
    [currentUser, roomId, updateMessage, getMessages, isConnected, queueAction]
  );

  /**
   * Retry a failed message
   */
  const retryMessage = useCallback(
    async (message: Message): Promise<void> => {
      if (!currentUser) {
        logger.error("Cannot retry message: user not available");
        return;
      }

      const socket = getSocket();
      const messageType = message.type || "text";

      // Update status to sending
      updateMessage(roomId, message.id, { status: "sending" as const });

      // Create message payload
      const messagePayload: MessagePayload = {
        content: message.content || "",
        senderId: currentUser.id,
        senderName: currentUser.name,
        roomId,
        type: messageType,
        fileUrl: message.fileUrl || undefined,
        fileName: message.fileName || undefined,
        fileSize: message.fileSize || undefined,
        fileType: message.fileType || undefined,
        replyToId: message.replyToId || undefined,
        replyTo: message.replyTo || null,
        createdAt: new Date().toISOString(),
      };

      // Emit via socket
      socket.emit("send-message", messagePayload);

      // Save to database
      try {
        const data = await apiClient.post<{ message: Message }>("/messages", {
          content: message.content || undefined,
          roomId,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
          fileType: message.fileType,
          type: messageType,
          replyToId: message.replyToId || null,
        });

        // Update message with real data
        updateMessage(roomId, message.id, {
          ...data.message,
          status: "sent" as const,
        });
      } catch (error) {
        logger.error("Failed to retry message:", error);
        // Mark as failed again
        updateMessage(roomId, message.id, { status: "failed" as const });
      }
    },
    [currentUser, roomId, updateMessage]
  );

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    retryMessage,
  };
}

